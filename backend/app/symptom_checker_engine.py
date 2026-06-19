# backend/app/symptom_checker_engine.py
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
        # ─────────────────────────────────────────────────────────────
        self.disease_name_map = self._build_disease_name_map()
        self.disease_aliases = self._build_disease_aliases()

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
        if not text:
            return ""
        nfd = unicodedata.normalize("NFD", text.strip().lower())
        without_diacritic = "".join(
            char for char in nfd if unicodedata.category(char) != "Mn"
        )
        cleaned = re.sub(r"[^a-z0-9\s]", " ", without_diacritic)
        return " ".join(cleaned.split())

    def _build_disease_name_map(self) -> Dict[str, str]:
        disease_map = {}
        disease_sources = []
        
        if "diseases" in self.trieu_chung_df.columns:
            disease_sources.extend(self.trieu_chung_df["diseases"].unique())
        if "disease" in self.mo_ta_df.columns:
            disease_sources.extend(self.mo_ta_df["disease"].unique())
        if "disease" in self.dinh_duong_df.columns:
            disease_sources.extend(self.dinh_duong_df["disease"].unique())
        if "disease" in self.sinh_hoat_df.columns:
            disease_sources.extend(self.sinh_hoat_df["disease"].unique())
        if "disease" in self.cham_soc_df.columns:
            disease_sources.extend(self.cham_soc_df["disease"].unique())

        for disease in disease_sources:
            if pd.isna(disease) or not str(disease).strip():
                continue
            disease_str = str(disease).strip()
            normalized = self._normalize_string(disease_str)
            if normalized and normalized not in disease_map:
                disease_map[normalized] = disease_str
        
        return disease_map

    def _build_disease_aliases(self) -> Dict[str, List[str]]:
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
        ai_norm = self._normalize_string(ai_disease_name)
        
        if ai_norm in self.disease_name_map:
            return self.disease_name_map[ai_norm], 1.0
        
        for key, aliases_list in self.disease_aliases.items():
            for alias in aliases_list:
                alias_norm = self._normalize_string(alias)
                if alias_norm == ai_norm:
                    for map_key, map_value in self.disease_name_map.items():
                        if self._normalize_string(map_value) == ai_norm or key in map_key:
                            return map_value, 0.95
                    return key, 0.95
        
        candidates = difflib.get_close_matches(ai_norm, list(self.disease_name_map.keys()), n=1, cutoff=0.6)
        if candidates:
            return self.disease_name_map[candidates[0]], 0.75
        
        return ai_disease_name, 0.5

    def _parse_list_value(self, raw_value: Any) -> List[str]:
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
        text = (raw_text or "").strip()
        if not text:
            return ""

        if text.startswith("{") or text.startswith("["):
            return text

        match = re.search(r"(\{.*\}|\[.*\])", text, re.DOTALL)
        return match.group(1).strip() if match else text

    def _to_json_safe(self, value: Any) -> Any:
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
        safe_selected = [str(s).strip() for s in selected_symptoms if s and str(s).strip()]

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

        normalized_symptoms = await self._normalize_symptoms_with_csv(final_symptoms)

        for disease in ai_diseases:
            ai_disease_name = disease.get("disease", "")
            disease_vi = disease.get("disease_vi", "")
            
            if disease_vi:
                disease["display_name"] = f"{ai_disease_name} ({disease_vi})"
            else:
                disease["display_name"] = ai_disease_name
                
            csv_disease_name, match_confidence = self._find_best_disease_match(ai_disease_name)
            disease["csv_disease_name"] = csv_disease_name
            
            match_rate = self._calculate_match_rate_from_csv(csv_disease_name, normalized_symptoms)
            disease["match_rate"] = match_rate

        ai_diseases.sort(
            key=lambda x: (x.get("confidence", 0) * (x.get("match_rate", 0) / 100)),
            reverse=True
        )

        return {
            "final_symptoms": normalized_symptoms,
            "ai_diseases": ai_diseases[:3], # Cập nhật: Luôn trả về tối đa 3 bệnh
            "context": context,
            "disclaimer": "Đây là công cụ sàng lọc sơ bộ. Không thay thế chẩn đoán y khoa chính thức từ bác sĩ.",
        }

    async def _ai_analyze_context_and_diseases(
        self, symptoms: List[str], description: str
    ) -> Dict[str, Any]:
        prompt = f"""
Bạn là chuyên gia y khoa sử dụng phương pháp sàng lọc lâm sàng.
TRIỆU CHỨNG BỆNH NHÂN (Tiếng Việt): {", ".join(symptoms) if symptoms else "Không có"}
MÔ TẢ CHI TIẾT: {description if description else "Không có"}

HƯỚNG DẪN PHÂN TÍCH:
1. Xác định NGỮ CẢNH: Cấp tính hay mạn tính? Mức độ nghiêm trọng?

2. GỢI Ý BỆNH (BẮT BUỘC ĐỀ XUẤT ĐÚNG 3 BỆNH CÓ KHẢ NĂNG XẢY RA NHẤT):
   - Đề xuất 3 bệnh lý khác nhau liên quan chặt chẽ đến triệu chứng.
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
                    json={"model": self.model_name, "prompt": prompt, "format": "json", "stream": False},
                    timeout=120.0,
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
        normalized = []
        for symptom in ai_symptoms:
            symptom_lower = symptom.strip().lower()
            if symptom_lower in self.all_symptoms:
                if symptom_lower not in normalized:
                    normalized.append(symptom_lower)
                continue
            matches = difflib.get_close_matches(symptom_lower, self.all_symptoms, n=1, cutoff=0.75)
            if matches and matches[0] not in normalized:
                normalized.append(matches[0])
        return normalized

    def _calculate_match_rate_from_csv(self, disease_name: str, normalized_symptoms: List[str]) -> float:
        if not normalized_symptoms:
            return 0.0

        disease_rows = []
        for _, row in self.trieu_chung_df.iterrows():
            if "diseases" in row.index:
                csv_disease = str(row["diseases"]).strip()
                if self._normalize_string(csv_disease) == self._normalize_string(disease_name):
                    disease_rows.append(row)
        
        if not disease_rows:
            return 0.0

        match_count = 0
        for symptom in normalized_symptoms:
            for row in disease_rows:
                if symptom in row.index and row[symptom] == 1:
                    match_count += 1
                    break
        
        match_rate = (match_count / len(normalized_symptoms)) * 100
        return round(match_rate, 1)

    # ═══════════════════════════════════════════════════════════════════════════
    # GET DISEASE INFO (✅ Ưu tiên AI)
    # ═══════════════════════════════════════════════════════════════════════════

    def get_disease_info(self, disease_name: str, ai_data: Dict = None) -> Dict[str, Any]:
        """
        Lấy thông tin chi tiết bệnh.
        ✅ ƯU TIÊN SỬ DỤNG: Tri thức chuyên sâu tiếng Việt từ AI (ai_data).
        ✅ FALLBACK 1: CSV dữ liệu.
        ✅ FALLBACK 2: Hàm tạo mô tả tự động nội bộ.
        """
        if ai_data is None:
            ai_data = {}
            
        disease_norm = self._normalize_string(disease_name)
        info = {"disease": disease_name}

        # 1. Description (Mô tả bệnh)
        mo_ta_row = None
        for _, row in self.mo_ta_df.iterrows():
            if "disease" in row.index and self._normalize_string(str(row["disease"])) == disease_norm:
                mo_ta_row = row
                break

        if ai_data.get("ai_description"):
            info["description"] = ai_data["ai_description"]
        elif mo_ta_row is not None and "description" in mo_ta_row.index and pd.notna(mo_ta_row["description"]):
            info["description"] = str(mo_ta_row["description"]).strip()
        else:
            info["description"] = self._get_fallback_description(disease_name)

        # 2. Diet Recommendations (Dinh dưỡng)
        dinh_duong_row = None
        for _, row in self.dinh_duong_df.iterrows():
            if "disease" in row.index and self._normalize_string(str(row["disease"])) == disease_norm:
                dinh_duong_row = row
                break
        
        if ai_data.get("ai_diet"):
            info["diet_recommendations"] = ai_data["ai_diet"]
        elif dinh_duong_row is not None and "diet" in dinh_duong_row.index and pd.notna(dinh_duong_row["diet"]):
            info["diet_recommendations"] = self._parse_list_value(dinh_duong_row["diet"])
        else:
            info["diet_recommendations"] = self._get_fallback_diet(disease_name)

        # 3. Lifestyle Recommendations (Sinh hoạt)
        sinh_hoat_row = None
        for _, row in self.sinh_hoat_df.iterrows():
            if "disease" in row.index and self._normalize_string(str(row["disease"])) == disease_norm:
                sinh_hoat_row = row
                break
        
        if ai_data.get("ai_lifestyle"):
            info["lifestyle_recommendations"] = ai_data["ai_lifestyle"]
        elif sinh_hoat_row is not None and "workouts" in sinh_hoat_row.index and pd.notna(sinh_hoat_row["workouts"]):
            info["lifestyle_recommendations"] = self._parse_list_value(sinh_hoat_row["workouts"])
        else:
            info["lifestyle_recommendations"] = self._get_fallback_lifestyle(disease_name)

        # 4. Health Advice (Chăm sóc)
        cham_soc_row = None
        for _, row in self.cham_soc_df.iterrows():
            if "disease" in row.index and self._normalize_string(str(row["disease"])) == disease_norm:
                cham_soc_row = row
                break
        
        csv_health_advice = []
        if cham_soc_row is not None:
            for i in range(1, 5):
                col_name = f"precaution_{i}"
                if col_name in cham_soc_row.index and pd.notna(cham_soc_row[col_name]):
                    advice_text = str(cham_soc_row[col_name]).strip()
                    if advice_text:
                        csv_health_advice.append(advice_text)
        
        if ai_data.get("ai_care"):
            info["health_advice"] = ai_data["ai_care"]
        elif csv_health_advice:
            info["health_advice"] = csv_health_advice
        else:
            info["health_advice"] = self._get_fallback_health_advice(disease_name)
        
        info["reference_note"] = "Thông tin tham khảo từ hệ thống y tế và AI."
        return info

    def _get_fallback_description(self, disease_name: str) -> str:
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
        return f"Bệnh {disease_name} là một tình trạng y tế cần được theo dõi. Vui lòng tham khảo ý kiến bác sĩ để có chẩn đoán chính xác."

    def _get_fallback_diet(self, disease_name: str) -> List[str]:
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

    def _check_high_risk(self, disease_name: str, ai_severity: str = "", user_text: str = "") -> Dict[str, Any]:
        name_norm = self._normalize_string(disease_name)
        user_text_norm = self._normalize_string(user_text)
        
        # --- LỚP BẢO VỆ 1: QUÉT TỪ KHÓA TÌNH TRẠNG NGƯỜI DÙNG ---
        emergency_keywords = [
            "ngất", "bất tỉnh", "đau dữ dội", "đau khủng khiếp", "nôn ra máu", 
            "khó thở dữ dội", "co giật", "không thở được", "liệt", "rất đau", "chảy máu nhiều"
        ]
        for kw in emergency_keywords:
            if self._normalize_string(kw) in user_text_norm:
                return {
                    "is_high_risk": True,
                    "plugin_suggestion": "emergency",
                    "risk_level": "critical",
                    "warning_message": f"CẢNH BÁO KHẨN CẤP: Ghi nhận triệu chứng nguy hiểm ({kw.upper()}). ĐÂY LÀ TÌNH HUỐNG CẤP CỨU - Vui lòng gọi 115 hoặc đến bệnh viện gần nhất ngay lập tức!"
                }

        # --- LỚP BẢO VỆ 2: DANH SÁCH BỆNH ĐỊNH NGHĨA SẴN ---
        risk_mapping = {
            "diabetes": {"plugin": "diabetes", "name": "tiểu đường", "warning": "CẢNH BÁO: Triệu chứng gợi ý bệnh tiểu đường. Vui lòng đi khám chuyên khoa nội tiết ngay."},
            "hypertension": {"plugin": "hypertension", "name": "cao huyết áp", "warning": "CẢNH BÁO: Triệu chứng gợi ý cao huyết áp. Cần kiểm tra huyết áp và đi khám sớm."},
            "cardiovascular": {"plugin": "cardiovascular", "name": "bệnh tim mạch", "warning": "CẢNH BÁO: Triệu chứng gợi ý bệnh tim mạch. Vui lòng khám chuyên khoa tim mạch."},
            "heart": {"plugin": "cardiovascular", "name": "bệnh tim mạch", "warning": "CẢNH BÁO: Triệu chứng gợi ý bệnh tim mạch. Vui lòng khám ngay."},
            "kidney": {"plugin": "kidney", "name": "bệnh thận mạn", "warning": "CẢNH BÁO: Triệu chứng gợi ý bệnh thận. Vui lòng khám chuyên khoa tiết niệu/thận."},
            "stroke": {"plugin": "stroke", "name": "đột quỵ", "warning": "CẢNH BÁO KHẨN CẤP: Triệu chứng gợi ý ĐỘT QUỴ. Gọi cấp cứu 115 ngay!"},
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

        # --- LỚP BẢO VỆ 3: ĐÁNH GIÁ ĐỘNG TỪ AI (XỬ LÝ BỆNH LẠ) ---
        if ai_severity and ai_severity.strip().lower() == "high":
            return {
                "is_high_risk": True,
                "plugin_suggestion": "general_hospital",
                "risk_level": "high",
                "warning_message": "CẢNH BÁO: Trí tuệ nhân tạo đánh giá tình trạng bệnh lý này có mức độ rủi ro CAO. Vui lòng sắp xếp đi khám bác sĩ trong thời gian sớm nhất."
            }

        return {"is_high_risk": False, "risk_level": "common"}

    async def enrich_disease_list(self, ai_diseases: List[Dict], user_text: str = "") -> List[Dict]:
        enriched = []
        for disease_info in ai_diseases:
            csv_lookup_name = disease_info.get("csv_disease_name", disease_info.get("disease", ""))
            detailed = self.get_disease_info(csv_lookup_name, ai_data=disease_info)
            
            risk = self._check_high_risk(
                disease_name=disease_info.get("disease", ""),
                ai_severity=disease_info.get("severity_risk", ""),
                user_text=user_text
            )
            
            enriched.append({
                **disease_info,
                **detailed,
                **risk,
                "disease": disease_info.get("display_name", disease_info.get("disease", ""))
            })
        
        return enriched

    async def translate_response_to_vietnamese(
        self, response_payload: Dict[str, Any]
    ) -> Dict[str, Any]:
        # (Dự phòng cho các tính năng khác nếu cần, đã loại bỏ yêu cầu dịch "disease")
        safe_payload = self._to_json_safe(response_payload)
        prompt = f"""
Bạn là công cụ dịch y khoa sang tiếng Việt.
Hãy dịch toàn bộ nội dung người dùng nhìn thấy trong JSON bên dưới sang tiếng Việt tự nhiên, rõ ràng và ngắn gọn.

RÀNG BUỘC:
- Giữ nguyên tên khóa JSON.
- Giữ nguyên các giá trị số, boolean và cấu trúc mảng/object.
- Dịch các trường mô tả văn bản như: final_symptoms, reasoning, description, warning_message, health_advice, diet_recommendations, lifestyle_recommendations, context.analysis, disclaimer.
- KHÔNG dịch hoặc thay đổi trường "disease" (bắt buộc giữ nguyên giá trị gốc).
- Nếu trường nào đã là tiếng Việt thì giữ nguyên.
- Trả về DUY NHẤT JSON hợp lệ, không markdown, không giải thích.

JSON CẦN DỊCH:
{json.dumps(safe_payload, ensure_ascii=False)}
"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.ollama_url,
                    json={"model": self.model_name, "prompt": prompt, "format": "json", "stream": False},
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

        return safe_payload


_symptom_engine_instance = None


def get_symptom_engine():
    global _symptom_engine_instance
    if _symptom_engine_instance is None:
        _symptom_engine_instance = SymptomCheckerEngine()
    return _symptom_engine_instance