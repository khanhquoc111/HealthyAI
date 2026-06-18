# backend/app/symptom_checker_engine.py
"""
AI-Driven Symptom Checker Engine (NÂNG CẤP)
- AI phân tích ngữ cảnh y khoa, gợi ý bệnh với confidence score
- Loại trừ bệnh mạn tính khi không phù hợp
- CSV dùng để kiểm chứng, không phải nguồn gốc gợi ý
- HỖ TRỢ LÝ DO Y TẾ cho từng gợi ý
- ✅ FỐI XỬ MATCHING BỆNH: Fuzzy match + Disease name mapping (Anh ↔ Việt)
- ✅ LUÔN TRẢLẠI TIẾNG VIỆT: Normalize + translate fallback
"""
import difflib
import json
import re
import unicodedata
from pathlib import Path
from typing import Any, Dict, List, Tuple, Optional

import httpx
import pandas as pd


class SymptomCheckerEngine:
    def __init__(
        self,
        ollama_url: str = "http://localhost:11434/api/generate",
        model_name: str = "qwen2.5:7b",
    ):
        self.ollama_url = ollama_url
        self.model_name = model_name

        # ─────────────────────────────────────────────────────────────
        # Load CSV files
        # ─────────────────────────────────────────────────────────────
        base_dir = Path(__file__).resolve().parent.parent / "data" / "trathuoc"
        self.trieu_chung_df = pd.read_csv(base_dir / "trieu-chung.csv")
        self.mo_ta_df = pd.read_csv(base_dir / "mo-ta.csv")
        self.dinh_duong_df = pd.read_csv(base_dir / "dinh-duong.csv")
        self.sinh_hoat_df = pd.read_csv(base_dir / "sinh-hoat.csv")
        self.cham_soc_df = pd.read_csv(base_dir / "cham-soc.csv")

        # Normalize column names
        self.trieu_chung_df.columns = [
            str(col).replace("\ufeff", "").strip().lower()
            for col in self.trieu_chung_df.columns
        ]
        self.mo_ta_df.columns = [
            str(col).replace("\ufeff", "").strip().lower()
            for col in self.mo_ta_df.columns
        ]
        self.dinh_duong_df.columns = [
            str(col).replace("\ufeff", "").strip().lower()
            for col in self.dinh_duong_df.columns
        ]
        self.sinh_hoat_df.columns = [
            str(col).replace("\ufeff", "").strip().lower()
            for col in self.sinh_hoat_df.columns
        ]
        self.cham_soc_df.columns = [
            str(col).replace("\ufeff", "").strip().lower()
            for col in self.cham_soc_df.columns
        ]

        self.all_symptoms = self.trieu_chung_df.columns[1:].tolist()

        # ─────────────────────────────────────────────────────────────
        # Disease Name Mapping: Anh ↔ Việt + Alias variants
        # Xây dựng từ tên bệnh có sẵn trong CSV
        # ─────────────────────────────────────────────────────────────
        self.disease_name_map = self._build_disease_name_map()
        self.disease_aliases = self._build_disease_aliases()

        # Danh sách bệnh mạn tính cần phát hiện ngữ cảnh
        self.chronic_diseases = {
            "tiểu đương", "đái tháo đường", "diabetes",
            "cao huyết áp", "hypertension",
            "tim mạch", "cardiovascular", "heart",
            "bệnh thận", "kidney",
            "đột quỵ", "stroke"
        }
        self.acute_disease_keywords = {
            "cảm lạnh", "cold", "cơm", "influenza", "cúm", "flu",
            "viêm họng", "pharyngitis", "viêm amidan", "tonsillitis",
            "hội chứng cảm lạnh", "common cold syndrome"
        }

    def _normalize_string(self, text: str) -> str:
        """
        Normalize string: lowercase, trim, remove diacritics, extra spaces.
        "  Tiểu Đường  " → "tieu duong"
        """
        if not text:
            return ""
        
        # Loại bỏ diacritics (ả ă ơ ... → a)
        nfd = unicodedata.normalize("NFD", text.strip().lower())
        without_diacritic = "".join(
            char for char in nfd if unicodedata.category(char) != "Mn"
        )
        
        # Loại bỏ ký tự đặc biệt, giữ lại chữ cái + số + space
        cleaned = re.sub(r"[^a-z0-9\s]", " ", without_diacritic)
        
        # Loại bỏ khoảng trắng dư thừa
        return " ".join(cleaned.split())

    def _build_disease_name_map(self) -> Dict[str, str]:
        """
        Xây dựng bản đồ tên bệnh từ CSV.
        Key = normalized name, Value = tên bệnh gốc từ CSV (cho query sau này)
        """
        disease_map = {}
        
        # Lấy danh sách bệnh duy nhất từ các CSV (nếu có cột 'disease' hoặc 'Disease')
        disease_sources = []
        
        # Từ trieu_chung_df
        if "diseases" in self.trieu_chung_df.columns:
            disease_sources.extend(self.trieu_chung_df["diseases"].unique())
        
        # Từ mo_ta_df
        if "disease" in self.mo_ta_df.columns:
            disease_sources.extend(self.mo_ta_df["disease"].unique())
        
        # Từ dinh_duong_df
        if "disease" in self.dinh_duong_df.columns:
            disease_sources.extend(self.dinh_duong_df["disease"].unique())
        
        # Từ sinh_hoat_df
        if "disease" in self.sinh_hoat_df.columns:
            disease_sources.extend(self.sinh_hoat_df["disease"].unique())
        
        # Từ cham_soc_df
        if "disease" in self.cham_soc_df.columns:
            disease_sources.extend(self.cham_soc_df["disease"].unique())

        # Build map
        for disease in disease_sources:
            if pd.isna(disease) or not str(disease).strip():
                continue
            
            disease_str = str(disease).strip()
            normalized = self._normalize_string(disease_str)
            
            if normalized and normalized not in disease_map:
                disease_map[normalized] = disease_str
        
        print(f"[DEBUG] Loaded {len(disease_map)} diseases from CSV")
        return disease_map

    def _build_disease_aliases(self) -> Dict[str, List[str]]:
        """
        Xây dựng các alias cho bệnh (thay thế cho nhau).
        VD: "diabetes" = ["tiểu đương", "đái tháo đường", "diabetes mellitus"]
        """
        aliases = {
            "diabetes": ["tiểu đương", "đái tháo đường", "diabetes mellitus", "blood sugar"],
            "hypertension": ["cao huyết áp", "huyết áp cao", "high blood pressure"],
            "cardiovascular": ["tim mạch", "bệnh tim", "heart disease", "bệnh tim mạch"],
            "kidney": ["bệnh thận", "thận mạn", "kidney disease", "chronic kidney"],
            "stroke": ["đột quỵ", "tai biến", "tai biến mạch máu", "cerebral"],
            "asthma": ["hen suyễn", "xuyễn", "asthma"],
            "arthritis": ["viêm khớp", "gout", "arthritis"],
            "pneumonia": ["viêm phổi", "viêm phế quản", "pneumonia"],
            "bronchitis": ["viêm phế quản", "viêm phế quản cấp", "bronchitis"],
            "gastritis": ["viêm dạ dày", "viêm vị", "gastritis"],
            "ulcer": ["loét dạ dày", "loét tá tràng", "peptic ulcer"],
            "hepatitis": ["viêm gan", "hepatitis"],
            "cirrhosis": ["xơ gan", "cirrhosis"],
            "thyroid": ["tuyến giáp", "bệnh tuyến giáp", "thyroid disease"],
            "anemia": ["thiếu máu", "anemia"],
            "migraine": ["đau nửa đầu", "migraine", "đau đầu thần kinh"],
            "depression": ["trầm cảm", "depression", "bệnh trầm cảm"],
            "anxiety": ["lo âu", "anxiety", "bệnh lo âu"],
        }
        return aliases

    def _find_best_disease_match(self, ai_disease_name: str) -> Tuple[str, float]:
        """
        Tìm tên bệnh tốt nhất từ CSV để query.
        - Cố gắng exact match (với normalization)
        - Fallback fuzzy match
        - Return: (csv_disease_name, confidence_score)
        """
        ai_norm = self._normalize_string(ai_disease_name)
        
        # BƯỚC 1: Exact match với normalized name
        if ai_norm in self.disease_name_map:
            csv_name = self.disease_name_map[ai_norm]
            print(f"[MATCH] '{ai_disease_name}' → '{csv_name}' (exact match, norm)")
            return csv_name, 1.0
        
        # BƯỚC 2: Kiểm tra aliases
        for key, aliases_list in self.disease_aliases.items():
            for alias in aliases_list:
                alias_norm = self._normalize_string(alias)
                if alias_norm == ai_norm:
                    # Tìm tên bệnh canonical từ disease_name_map
                    for map_key, map_value in self.disease_name_map.items():
                        if self._normalize_string(map_value) == ai_norm or key in map_key:
                            print(f"[MATCH] '{ai_disease_name}' → '{map_value}' (via alias)")
                            return map_value, 0.95
                    # Nếu không tìm được, trả về key gốc
                    print(f"[MATCH] '{ai_disease_name}' → '{key}' (alias key, fallback)")
                    return key, 0.95
        
        # BƯỚC 3: Fuzzy match với disease_name_map keys
        candidates = difflib.get_close_matches(
            ai_norm,
            list(self.disease_name_map.keys()),
            n=1,
            cutoff=0.6
        )
        
        if candidates:
            csv_name = self.disease_name_map[candidates[0]]
            print(f"[MATCH] '{ai_disease_name}' → '{csv_name}' (fuzzy match, {candidates[0]})")
            return csv_name, 0.75
        
        # BƯỚC 4: Fallback - trả về tên gốc từ AI (có thể không match CSV)
        print(f"[NO MATCH] '{ai_disease_name}' → Sẽ sử dụng fallback description")
        return ai_disease_name, 0.5

    def _parse_list_value(self, raw_value: Any) -> List[str]:
        """Parse list từ CSV cell"""
        if raw_value is None or (isinstance(raw_value, float) and pd.isna(raw_value)):
            return []
        if isinstance(raw_value, list):
            return [str(item).strip() for item in raw_value if str(item).strip()]

        text = str(raw_value).strip()
        if not text or text == "[]":
            return []

        candidates = [text, text.replace("'", '"')]
        for candidate in candidates:
            try:
                parsed = json.loads(candidate)
                if isinstance(parsed, list):
                    return [str(item).strip() for item in parsed if str(item).strip()]
            except Exception:
                continue

        if text.startswith("[") and text.endswith("]"):
            text = text[1:-1]
        return [item.strip().strip('"').strip("'") for item in text.split(",") if item.strip()]

    def _extract_json_blob(self, raw_text: str) -> str:
        """Extract JSON từ LLM response"""
        text = (raw_text or "").strip()
        if not text:
            return ""

        if text.startswith("{") or text.startswith("["):
            return text

        match = re.search(r"(\{.*\}|\[.*\])", text, re.DOTALL)
        return match.group(1).strip() if match else text

    def _to_json_safe(self, value: Any) -> Any:
        """Convert object to JSON-serializable"""
        if isinstance(value, dict):
            return {str(k): self._to_json_safe(v) for k, v in value.items()}
        if isinstance(value, list):
            return [self._to_json_safe(item) for item in value]
        if isinstance(value, tuple):
            return [self._to_json_safe(item) for item in value]
        if isinstance(value, (str, int, float, bool)) or value is None:
            return value
        return str(value)

    # ═══════════════════════════════════════════════════════════════════════════
    # AI ANALYSIS
    # ═══════════════════════════════════════════════════════════════════════════

    async def analyze_symptoms_with_ai(
        self, selected_symptoms: List[str], mo_ta_them: str
    ) -> Dict[str, Any]:
        """
        NÂNG CẤP: AI phân tích ngữ cảnh y khoa, gợi ý bệnh với confidence score.
        
        Returns:
        {
            "final_symptoms": [...],
            "ai_diseases": [
                {
                    "disease": "diabetes",
                    "confidence": 0.85,
                    "reasoning": "...",
                    "match_rate": 95,
                    "csv_disease_name": "Diabetes"  # ← For CSV lookup
                }
            ],
            "context": {...},
            "disclaimer": "..."
        }
        """
        safe_selected = [str(s).strip() for s in selected_symptoms if s and str(s).strip()]

        # BƯỚC 1: AI phân tích ngữ cảnh + gợi ý bệnh
        ai_result = await self._ai_analyze_context_and_diseases(safe_selected, mo_ta_them)
        
        if not ai_result:
            return {
                "final_symptoms": [],
                "ai_diseases": [],
                "context": {"is_acute": False, "is_chronic": False, "severity": "unknown"},
                "disclaimer": "Hệ thống không thể phân tích. Vui lòng cung cấp thông tin chi tiết hơn.",
            }

        ai_diseases = ai_result.get("diseases", [])
        final_symptoms = ai_result.get("symptoms", [])
        context = ai_result.get("context", {})

        # BƯỚC 2: Chuẩn hóa triệu chứng bằng fuzzy matching với CSV
        normalized_symptoms = await self._normalize_symptoms_with_csv(final_symptoms)

        # BƯỚC 3: Resolve tên bệnh + Calculate match_rate từ CSV
        for disease in ai_diseases:
            ai_disease_name = disease.get("disease", "")
            disease_vi = disease.get("disease_vi", "")
            
            # GIẢI QUYẾT VĐ 1: Gộp tên Tiếng Anh (Tiếng Việt)
            if disease_vi:
                disease["display_name"] = f"{ai_disease_name} ({disease_vi})"
            else:
                disease["display_name"] = ai_disease_name
                
            csv_disease_name, match_confidence = self._find_best_disease_match(ai_disease_name)
            
            disease["csv_disease_name"] = csv_disease_name
            
            match_rate = self._calculate_match_rate_from_csv(csv_disease_name, normalized_symptoms)
            disease["match_rate"] = match_rate

        # BƯỚC 4: Sắp xếp theo confidence × match_rate
        ai_diseases.sort(
            key=lambda x: (x.get("confidence", 0) * (x.get("match_rate", 0) / 100)),
            reverse=True
        )

        return {
            "final_symptoms": normalized_symptoms,
            "ai_diseases": ai_diseases[:5],
            "context": context,
            "disclaimer": "Đây là công cụ sàng lọc sơ bộ. Không thay thế chẩn đoán y khoa chính thức từ bác sĩ.",
        }

    async def _ai_analyze_context_and_diseases(
        self, symptoms: List[str], description: str
    ) -> Dict[str, Any]:
        """
        AI phân tích ngữ cảnh + gợi ý bệnh.
        Trả về JSON với context (acute/chronic/severity) + diseases list.
        """
        prompt = f"""
Bạn là chuyên gia y khoa sử dụng phương pháp sàng lọc lâm sàng.
TRIỆU CHỨNG BỆNH NHÂN (Tiếng Việt): {", ".join(symptoms) if symptoms else "Không có"}
MÔ TẢ CHI TIẾT: {description if description else "Không có"}

HƯỚNG DẪN PHÂN TÍCH:
1. Xác định NGỮ CẢNH: Cấp tính hay mạn tính? Mức độ nghiêm trọng?

2. GỢI Ý BỆNH (Tối đa 5):
   - Chỉ đề xuất bệnh PHÙ HỢP với triệu chứng.
   - CHÚ Ý: Cung cấp 3 mảng lời khuyên CHUYÊN SÂU, CỤ THỂ cho TỪNG BỆNH (Không nói chung chung):
     * ai_diet: 3-4 lời khuyên dinh dưỡng cực kỳ đặc thù cho bệnh này.
     * ai_lifestyle: 3-4 lời khuyên sinh hoạt đặc thù.
     * ai_care: 3-4 hướng dẫn theo dõi/chăm sóc y tế tại nhà.

TRẢ VỀ JSON (không markdown, không preamble):
{{
    "context": {{
        "is_acute": bool,
        "is_chronic": bool,
        "severity": "low|medium|high",
        "analysis": "mô tả ngữ cảnh ngắn (tiếng Việt)"
    }},
    "symptoms": ["symptom1", "symptom2"],
    "diseases": [
        {{
            "disease": "tên bệnh tiếng Anh (VD: influenza)",
            "disease_vi": "tên bệnh tiếng Việt (VD: Cảm cúm)",
            "confidence": 0.85,
            "reasoning": "lý do y tế (tiếng Việt)",
            "severity_risk": "medium",
            "ai_description": "Giới thiệu ngắn gọn nhưng chuẩn xác về bệnh này (tiếng Việt)",
            "ai_diet": ["lời khuyên ăn uống 1", "lời khuyên ăn uống 2"],
            "ai_lifestyle": ["lời khuyên sinh hoạt 1", "lời khuyên sinh hoạt 2"],
            "ai_care": ["lời khuyên chăm sóc 1", "lời khuyên chăm sóc 2"]
        }}
    ]
}}
"""

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.ollama_url,
                    json={
                        "model": self.model_name,
                        "prompt": prompt,
                        "format": "json",
                        "stream": False,
                    },
                    timeout=60.0,
                )

                data = response.json()
                raw_text = data.get("response", "").strip()
                clean_json_str = self._extract_json_blob(raw_text)

                try:
                    result = json.loads(clean_json_str)
                    return result if isinstance(result, dict) else {}
                except json.JSONDecodeError:
                    return {}
        except Exception as e:
            print(f"[Error] AI analysis error: {e}")
            return {}

    async def _normalize_symptoms_with_csv(self, ai_symptoms: List[str]) -> List[str]:
        """
        Chuẩn hóa triệu chứng từ AI bằng fuzzy matching với CSV.
        """
        normalized = []
        for symptom in ai_symptoms:
            symptom_lower = symptom.strip().lower()
            
            # Exact match
            if symptom_lower in self.all_symptoms:
                if symptom_lower not in normalized:
                    normalized.append(symptom_lower)
                continue
            
            # Fuzzy match
            matches = difflib.get_close_matches(symptom_lower, self.all_symptoms, n=1, cutoff=0.75)
            if matches and matches[0] not in normalized:
                normalized.append(matches[0])
        
        return normalized

    def _calculate_match_rate_from_csv(self, disease_name: str, normalized_symptoms: List[str]) -> float:
        """
        Tính match_rate: % triệu chứng user khớp với CSV.
        """
        if not normalized_symptoms:
            return 0.0

        # Tìm hàng bệnh trong CSV (với normalization)
        disease_rows = []
        for _, row in self.trieu_chung_df.iterrows():
            if "diseases" in row.index:
                csv_disease = str(row["diseases"]).strip()
                if self._normalize_string(csv_disease) == self._normalize_string(disease_name):
                    disease_rows.append(row)
        
        if not disease_rows:
            return 0.0

        # Đếm triệu chứng khớp
        match_count = 0
        for symptom in normalized_symptoms:
            for row in disease_rows:
                if symptom in row.index and row[symptom] == 1:
                    match_count += 1
                    break
        
        if not normalized_symptoms:
            return 0.0
        
        match_rate = (match_count / len(normalized_symptoms)) * 100
        return round(match_rate, 1)

    # ═══════════════════════════════════════════════════════════════════════════
    # GET DISEASE INFO (✅ CÁCH MỚI: LUÔN TRẢ VỀ DỮ LIỆU)
    # ═══════════════════════════════════════════════════════════════════════════

    def get_disease_info(self, disease_name: str, ai_data: Dict = None) -> Dict[str, Any]:
        """
        Lấy thông tin chi tiết bệnh từ CSV. 
        Nếu CSV không có, ưu tiên sử dụng tri thức chuyên sâu từ AI sinh ra (ai_data).
        """
        if ai_data is None:
            ai_data = {}
            
        disease_norm = self._normalize_string(disease_name)
        info = {"disease": disease_name}

        # ────────────────────────────────────────────────────────────
        # Tìm dòng dữ liệu bệnh trong mo_ta_df (Phần bị thiếu gây lỗi)
        # ────────────────────────────────────────────────────────────
        mo_ta_row = None
        for _, row in self.mo_ta_df.iterrows():
            if "disease" in row.index and self._normalize_string(str(row["disease"])) == disease_norm:
                mo_ta_row = row
                break

        # ────────────────────────────────────────────────────────────
        # Description (Mô tả bệnh)
        # ────────────────────────────────────────────────────────────
        if mo_ta_row is not None and "description" in mo_ta_row.index and pd.notna(mo_ta_row["description"]):
            info["description"] = str(mo_ta_row["description"]).strip()
        else:
            # Dùng mô tả xịn của AI thay vì fallback chung chung
            info["description"] = ai_data.get("ai_description", self._get_fallback_description(disease_name))

        # ────────────────────────────────────────────────────────────
        # Diet Recommendations (Dinh dưỡng)
        # ────────────────────────────────────────────────────────────
        dinh_duong_row = None
        for _, row in self.dinh_duong_df.iterrows():
            if "disease" in row.index and self._normalize_string(str(row["disease"])) == disease_norm:
                dinh_duong_row = row
                break
        
        if dinh_duong_row is not None and "diet" in dinh_duong_row.index and pd.notna(dinh_duong_row["diet"]):
            info["diet_recommendations"] = self._parse_list_value(dinh_duong_row["diet"])
        else:
            # Dùng lời khuyên dinh dưỡng cực chi tiết của AI
            info["diet_recommendations"] = ai_data.get("ai_diet", self._get_fallback_diet(disease_name))

        # ────────────────────────────────────────────────────────────
        # Lifestyle Recommendations (Sinh hoạt)
        # ────────────────────────────────────────────────────────────
        sinh_hoat_row = None
        for _, row in self.sinh_hoat_df.iterrows():
            if "disease" in row.index and self._normalize_string(str(row["disease"])) == disease_norm:
                sinh_hoat_row = row
                break
        
        if sinh_hoat_row is not None and "workouts" in sinh_hoat_row.index and pd.notna(sinh_hoat_row["workouts"]):
            info["lifestyle_recommendations"] = self._parse_list_value(sinh_hoat_row["workouts"])
        else:
            info["lifestyle_recommendations"] = ai_data.get("ai_lifestyle", self._get_fallback_lifestyle(disease_name))

        # ────────────────────────────────────────────────────────────
        # Health Advice (Chăm sóc)
        # ────────────────────────────────────────────────────────────
        cham_soc_row = None
        for _, row in self.cham_soc_df.iterrows():
            if "disease" in row.index and self._normalize_string(str(row["disease"])) == disease_norm:
                cham_soc_row = row
                break
        
        health_advice = []
        if cham_soc_row is not None:
            for i in range(1, 5):
                col_name = f"precaution_{i}"
                if col_name in cham_soc_row.index and pd.notna(cham_soc_row[col_name]):
                    advice_text = str(cham_soc_row[col_name]).strip()
                    if advice_text:
                        health_advice.append(advice_text)
        
        if not health_advice:
            health_advice = ai_data.get("ai_care", self._get_fallback_health_advice(disease_name))
        
        info["health_advice"] = health_advice
        info["reference_note"] = "Thông tin tham khảo từ hệ thống y tế và AI."
        
        return info

    def _get_fallback_description(self, disease_name: str) -> str:
        """
        Fallback: Tạo mô tả tự động bằng tiếng Việt khi không tìm được CSV.
        """
        disease_lower = disease_name.lower()
        
        fallback_descriptions = {
            "diabetes": "Bệnh tiểu đường là tình trạng rối loạn chuyển hóa glucose trong máu, dẫn đến tăng đường huyết cao. Cần kiểm soát chế độ ăn và theo dõi lượng đường huyết thường xuyên.",
            "hypertension": "Cao huyết áp là tình trạng huyết áp cao hơn mức bình thường, có nguy cơ gây biến chứng tim mạch. Cần theo dõi huyết áp định kỳ và kiểm soát chế độ ăn mặn.",
            "cardiovascular": "Bệnh tim mạch bao gồm các rối loạn hoạt động của tim và mạch máu. Cần tránh căng thẳng và duy trì hoạt động thể chất nhẹ nhàng.",
            "heart": "Bệnh tim mạch bao gồm các rối loạn hoạt động của tim và mạch máu. Cần tránh căng thẳng và duy trì hoạt động thể chất nhẹ nhàng.",
            "kidney": "Bệnh thận mạn là tình trạng thận không hoạt động bình thường, dẫn đến tích tụ chất thải trong cơ thể. Cần kiểm soát protein và nước trong chế độ ăn.",
            "stroke": "Đột quỵ là tình trạng máu không lưu thông đến não, gây tổn thương não bộ. Đây là tình trạng cấp cứu y tế cần được can thiệp ngay.",
            "asthma": "Hen suyễn là bệnh viêm đường hô hấp mạn tính, gây khó thở khi lối đi của không khí bị hẹp. Cần tránh những tác nhân kích thích như khí ô nhiễm.",
            "pneumonia": "Viêm phổi là bệnh nhiễm trùng phổi gây ho, sốt và khó thở. Cần nghỉ ngơi đầy đủ và theo dõi sức khỏe.",
            "gastritis": "Viêm dạ dày là bệnh viêm niêm mạc dạ dày gây đau, buồn nôn. Cần tránh thức ăn cay nóng và căng thẳng.",
            "depression": "Trầm cảm là rối loạn tâm lý gây cảm xúc buồn bã kéo dài. Cần hỗ trợ tâm lý và có thể cần dùng thuốc.",
        }
        
        for key, desc in fallback_descriptions.items():
            if key in disease_lower:
                return desc
        
        # Default fallback (tiếng Việt)
        return f"Bệnh {disease_name} là một tình trạng y tế cần được theo dõi. Vui lòng tham khảo ý kiến bác sĩ để có chẩn đoán chính xác."

    def _get_fallback_diet(self, disease_name: str) -> List[str]:
        """Fallback: Lời khuyên dinh dưỡng tự động (tiếng Việt)"""
        disease_lower = disease_name.lower()
        
        fallback_diet = {
            "diabetes": ["Giảm tinh bột và đường", "Ăn nhiều rau xanh", "Chọn bánh mỳ nguyên cám", "Tránh đồ uống có chứa đường"],
            "hypertension": ["Giảm muối ăn", "Tăng tiêu thụ kali (chuối, khoai tây)", "Tránh thực phẩm chế biến sẵn", "Ăn cá béo giàu omega-3"],
            "cardiovascular": ["Giảm chất béo bão hòa", "Ăn nhiều chất xơ", "Tránh chất béo trans", "Chia nhỏ các bữa ăn"],
            "kidney": ["Giới hạn protein", "Giảm muối", "Uống nước vừa phải", "Tránh thực phẩm giàu kali"],
            "gastritis": ["Ăn nhiều bữa nhỏ", "Tránh thức ăn cay", "Tránh caffeine", "Tránh thức ăn nhiều dầu"],
            "asthma": ["Tránh những thức ăn gây dị ứng", "Ăn các thực phẩm giàu kháng oxy hóa", "Tránh thức ăn chứa sulfite", "Uống nước đầy đủ"],
        }
        
        for key, diet_list in fallback_diet.items():
            if key in disease_lower:
                return diet_list
        
        return ["Ăn cân bằng các nhóm dinh dưỡng", "Tăng tiêu thụ rau xanh", "Giảm thức ăn chế biến sẵn"]

    def _get_fallback_lifestyle(self, disease_name: str) -> List[str]:
        """Fallback: Lời khuyên sinh hoạt tự động (tiếng Việt)"""
        disease_lower = disease_name.lower()
        
        fallback_lifestyle = {
            "diabetes": ["Tập thể dục thường xuyên 30 phút/ngày", "Duy trì cân nặng lý tưởng", "Ngủ đủ 7-8 giờ/ngày", "Giảm căng thẳng"],
            "hypertension": ["Tập thể dục nhẹ nhàng 30 phút/ngày", "Giảm căng thẳng", "Ngủ đủ 7-8 giờ/ngày", "Tránh rượu bia"],
            "cardiovascular": ["Đi bộ hoặc tập yoga nhẹ", "Tránh tập luyện cường độ cao", "Giảm căng thẳng", "Ngủ đủ giấc"],
            "kidney": ["Tập thể dục nhẹ nhàng", "Tránh nâng vật nặng", "Kiểm soát huyết áp", "Ngủ đủ 7-8 giờ/ngày"],
            "gastritis": ["Tránh nằm ngay sau ăn cơm", "Ăn chậm và nhai kỹ", "Giảm căng thẳng", "Tránh hút thuốc"],
            "asthma": ["Tránh những tác nhân kích thích", "Tập thể dục phù hợp (bơi lội)", "Tránh không khí ô nhiễm", "Kiểm soát allergen"],
        }
        
        for key, lifestyle_list in fallback_lifestyle.items():
            if key in disease_lower:
                return lifestyle_list
        
        return ["Duy trì hoạt động thể chất nhẹ nhàng", "Giảm căng thẳng", "Ngủ đủ giấc", "Tránh thói quen xấu"]

    def _get_fallback_health_advice(self, disease_name: str) -> List[str]:
        """Fallback: Lời khuyên chăm sóc tự động (tiếng Việt)"""
        disease_lower = disease_name.lower()
        
        fallback_advice = {
            "diabetes": ["Kiểm tra đường huyết thường xuyên", "Khám định kỳ với bác sĩ", "Mang thẻ bệnh nhân", "Chuẩn bị insulin nếu cần"],
            "hypertension": ["Đo huyết áp hàng ngày", "Dùng thuốc huyết áp đều đặn", "Khám định kỳ", "Ghi nhận huyết áp"],
            "cardiovascular": ["Tránh hoạt động cường độ cao", "Ghi nhớ triệu chứng cảnh báo", "Luôn mang thuốc tim", "Khám tim định kỳ"],
            "kidney": ["Kiểm tra chức năng thận định kỳ", "Theo dõi lượng nước uống", "Kiểm tra huyết áp", "Tính toán lượng protein"],
            "asthma": ["Luôn mang bình xịt cứu cáp", "Tránh allergen đã biết", "Kiểm tra chức năng phổi định kỳ", "Ghi nhận những tác nhân kích thích"],
            "depression": ["Tìm kiếm hỗ trợ tâm lý", "Duy trì liên lạc xã hội", "Tập thể dục thường xuyên", "Dùng thuốc theo đơn"],
        }
        
        for key, advice_list in fallback_advice.items():
            if key in disease_lower:
                return advice_list
        
        return ["Tham khảo ý kiến bác sĩ định kỳ", "Theo dõi triệu chứng", "Ghi chép lịch sử bệnh", "Tuân thủ hướng dẫn điều trị"]

    def _check_high_risk(self, disease_name: str) -> Dict[str, Any]:
        """
        Phát hiện bệnh nguy cơ cao.
        ✅ NÂNG CẤP: Normalize disease_name trước khi check
        """
        name_norm = self._normalize_string(disease_name)
        
        risk_mapping = {
            "diabetes": {"plugin": "diabetes", "name": "tiểu đường", "warning": "CẢNH BÁO: Triệu chứng gợi ý bệnh tiểu đường. Vui lòng khám ngay."},
            "hypertension": {"plugin": "hypertension", "name": "cao huyết áp", "warning": "CẢNH BÁO: Triệu chứng gợi ý cao huyết áp. Vui lòng khám ngay."},
            "cardiovascular": {"plugin": "cardiovascular", "name": "bệnh tim mạch", "warning": "CẢNH BÁO: Triệu chứng gợi ý bệnh tim mạch. Vui lòng khám ngay."},
            "heart": {"plugin": "cardiovascular", "name": "bệnh tim mạch", "warning": "CẢNH BÁO: Triệu chứng gợi ý bệnh tim mạch. Vui lòng khám ngay."},
            "kidney": {"plugin": "kidney", "name": "bệnh thận mạn", "warning": "CẢNH BÁO: Triệu chứng gợi ý bệnh thận. Vui lòng khám ngay."},
            "stroke": {"plugin": "stroke", "name": "đột quỵ", "warning": "CẢNH BÁO: Triệu chứng gợi ý đột quỵ. ĐÂY LÀ TÌNH HUỐNG CẤP CỨU - Gọi 115 ngay!"},
        }

        for key, info in risk_mapping.items():
            key_norm = self._normalize_string(key)
            if key_norm in name_norm or key in name_norm:
                return {
                    "is_high_risk": True,
                    "plugin_suggestion": info["plugin"],
                    "risk_level": "high",
                    "warning_message": info["warning"],
                }

        return {"is_high_risk": False, "risk_level": "common"}

    async def enrich_disease_list(self, ai_diseases: List[Dict]) -> List[Dict]:
        """
        Bổ sung thông tin chi tiết cho từng bệnh từ CSV (hoặc từ chính AI sinh ra)
        """
        enriched = []
        for disease_info in ai_diseases:
            csv_lookup_name = disease_info.get("csv_disease_name", disease_info.get("disease", ""))
            
            # Truyền toàn bộ AI data vào để làm nguồn dự phòng chuyên sâu
            detailed = self.get_disease_info(csv_lookup_name, ai_data=disease_info)
            risk = self._check_high_risk(disease_info.get("disease", ""))
            
            enriched.append({
                **disease_info,
                **detailed,
                **risk,
                # Chốt xuất ra tên bệnh bằng tên đã gộp Anh (Việt)
                "disease": disease_info.get("display_name", disease_info.get("disease", ""))
            })
        
        return enriched

    async def translate_response_to_vietnamese(
        self, response_payload: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Việt hóa kết quả trả về cho người dùng.
        ✅ NÂNG CẤP: Fallback vẫn trả về tiếng Việt
        """
        safe_payload = self._to_json_safe(response_payload)
        prompt = f"""
Bạn là công cụ dịch y khoa sang tiếng Việt.
Hãy dịch toàn bộ nội dung người dùng nhìn thấy trong JSON bên dưới sang tiếng Việt tự nhiên, rõ ràng và ngắn gọn.

RÀNG BUỘC:
- Giữ nguyên tên khóa JSON.
- Giữ nguyên các giá trị số, boolean và cấu trúc mảng/object.
- Dịch các trường mô tả văn bản như final_symptoms, disease, reasoning, description, warning_message, health_advice, diet_recommendations, lifestyle_recommendations, context.analysis, disclaimer.
- Nếu trường nào đã là tiếng Việt thì giữ nguyên.
- Trả về DUY NHẤT JSON hợp lệ, không markdown, không giải thích.

JSON CẦN DỊCH:
{json.dumps(safe_payload, ensure_ascii=False)}
"""

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.ollama_url,
                    json={
                        "model": self.model_name,
                        "prompt": prompt,
                        "format": "json",
                        "stream": False,
                    },
                    timeout=60.0,
                )

                data = response.json()
                raw_text = data.get("response", "").strip()
                clean_json_str = self._extract_json_blob(raw_text)

                try:
                    translated = json.loads(clean_json_str)
                    if isinstance(translated, dict):
                        return translated
                except json.JSONDecodeError:
                    pass
        except Exception as e:
            print(f"[Error] Translate response error: {e}")

        # ✅ FALLBACK: Nếu translation thất bại, vẫn trả về payload gốc (có thể đã là Việt)
        print("[Fallback] Using original payload (may already be Vietnamese)")
        return safe_payload


_symptom_engine_instance = None


def get_symptom_engine():
    global _symptom_engine_instance
    if _symptom_engine_instance is None:
        _symptom_engine_instance = SymptomCheckerEngine()
    return _symptom_engine_instance