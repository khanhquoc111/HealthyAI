import json
from datetime import datetime
from typing import Any, Dict, List, Optional
from collections import Counter

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import desc, asc
from sqlalchemy.orm import Session

from database.database import SessionLocal
from database.lich_su_danh_gia import LichSuDanhGia
from database.lich_su_tra_cuu import LichSuTraCuuTrieuChung
from database.nguoi_dung import NguoiDung
from fuzzywuzzy import fuzz
from difflib import SequenceMatcher

router = APIRouter(tags=["Lich Su Tra Benh"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ✅ FIX 1: Thêm hàm xử lý an toàn để parse JSON từ Database
def _parse_json_field(data: Any) -> Dict[str, Any]:
    if not data:
        return {}
    if isinstance(data, dict):
        return data
    if isinstance(data, str):
        try:
            return json.loads(data)
        except json.JSONDecodeError:
            return {}
    return {}

def _safe_json(value):
    if isinstance(value, dict):
        return {k: _safe_json(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_safe_json(v) for v in value]
    return value

# ─────────────────────────────────────────────────────────────────
# Pydantic Models (Schemas)
# ─────────────────────────────────────────────────────────────────
class TrendAnalysis(BaseModel):
    trend: str  
    change: float
    change_percent: float
    volatility: float = 0.0  # ✅ FIX 2: Bổ sung trường volatility bị thiếu
    insight: str

class LichSuDanhGiaResponse(BaseModel):
    idDanhGia: int
    ngayDanhGia: datetime
    maBenh: str
    diemRule: Optional[float] = None
    diemML: Optional[float] = None
    diemTong: Optional[float] = None
    mucNguyCo: Optional[str] = None
    ketQua: Dict[str, Any] = Field(default_factory=dict)
    trend_analysis: Optional[TrendAnalysis] = None

class LichSuTraCuuResponse(BaseModel):
    idTraCuu: int
    ngayTraCuu: datetime
    trieuChung: List[str]
    moTaThem: str
    ketQua: Dict[str, Any]

class TraCuuInsight(BaseModel):
    loai_insight: str      
    tieu_de: str
    insight: str
    chi_tiet: Optional[Dict[str, Any]] = None

class LichSuTraCuuWithInsightResponse(BaseModel):
    insights: List[TraCuuInsight]
    history: List[LichSuTraCuuResponse]

class CanhBaoChuDongResponse(BaseModel):
    maBenh: str
    tieuDe: str
    loaiCanhBao: str
    noiDung: str
    loiKhuyen: str
    lichSuDiem: List[float]

# ─────────────────────────────────────────────────────────────────
# API Endpoints (Lấy dữ liệu)
# ─────────────────────────────────────────────────────────────────

@router.get("/assessment/history/{ten_dang_nhap}", response_model=List[LichSuDanhGiaResponse])
def get_assessment_history(
    ten_dang_nhap: str,
    limit: int = Query(20, ge=1, le=100),
    skip: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    user = db.query(NguoiDung).filter(NguoiDung.tenDangNhap == ten_dang_nhap).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")

    all_records = (
        db.query(LichSuDanhGia)
        .filter(LichSuDanhGia.idNguoiDung == user.idNguoiDung)
        .order_by(asc(LichSuDanhGia.ngayDanhGia))
        .all()
    )

    disease_groups = {}
    for record in all_records:
        ma_benh = record.maBenh or "unknown"
        if ma_benh not in disease_groups:
            disease_groups[ma_benh] = []
        disease_groups[ma_benh].append(record)

    record_with_trends = []
    for ma_benh, records_asc in disease_groups.items():
        for i, record in enumerate(records_asc):
            trend_data = _calculate_trend(i, records_asc)
            setattr(record, "trend_analysis", trend_data)
            record_with_trends.append(record)

    record_with_trends.sort(key=lambda x: x.ngayDanhGia, reverse=True)
    paginated_records = record_with_trends[skip : skip + limit]

    return [
        LichSuDanhGiaResponse(
            idDanhGia=record.idDanhGia,
            ngayDanhGia=record.ngayDanhGia,
            maBenh=record.maBenh or "unknown",
            diemRule=record.diemRule,
            diemML=record.diemML,
            diemTong=record.diemTong,
            mucNguyCo=record.mucNguyCo,
            ketQua=_safe_json(_parse_json_field(record.ketQuaJSON)), # ✅ FIX 3: Parse JSON an toàn
            trend_analysis=getattr(record, "trend_analysis", None)
        )
        for record in paginated_records
    ]

@router.get("/symptom-checker/history/{ten_dang_nhap}", response_model=LichSuTraCuuWithInsightResponse)
def get_search_history(
    ten_dang_nhap: str,
    limit: int = Query(20, ge=1, le=100),
    skip: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    user = db.query(NguoiDung).filter(NguoiDung.tenDangNhap == ten_dang_nhap).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")

    all_recent_records = (
        db.query(LichSuTraCuuTrieuChung)
        .filter(LichSuTraCuuTrieuChung.idNguoiDung == user.idNguoiDung)
        .order_by(desc(LichSuTraCuuTrieuChung.ngayTraCuu))
        .limit(30)
        .all()
    )
    
    all_insights = []
    disease_insights = _generate_repeated_disease_insight(all_recent_records)
    all_insights.extend(disease_insights)
    
    symptom_insights = _generate_symptom_insights(all_recent_records)
    all_insights.extend(symptom_insights)

    paginated_records = all_recent_records[skip : skip + limit]

    history_list = [
        LichSuTraCuuResponse(
            idTraCuu=record.idTraCuu,
            ngayTraCuu=record.ngayTraCuu,
            trieuChung=[
                symptom.strip()
                for symptom in [record.trieuChung1, record.trieuChung2, record.trieuChung3, record.trieuChung4]
                if symptom and isinstance(symptom, str) and symptom.strip()
            ],
            moTaThem=record.moTaThem or "",
            ketQua=_parse_json_field(record.ketQuaJSON), # ✅ FIX 3: Parse JSON an toàn
        )
        for record in paginated_records
    ]

    return LichSuTraCuuWithInsightResponse(
        insights=all_insights,
        history=history_list
    )

# ─────────────────────────────────────────────────────────────────
# Helper Functions
# ─────────────────────────────────────────────────────────────────

def _generate_repeated_disease_insight(records: List[Any]) -> List[TraCuuInsight]:
    if not records:
        return []
    
    disease_counter = Counter()
    recent_records = records[:10]
    
    for record in recent_records:
        ket_qua = _parse_json_field(record.ketQuaJSON) # ✅ FIX 3: Parse JSON an toàn
        if not ket_qua:
            continue
        
        potential_diseases = ket_qua.get("potential_diseases", [])
        if not isinstance(potential_diseases, list):
            continue
        
        for d in potential_diseases:
            if not isinstance(d, dict):
                continue
            
            disease_name = d.get("disease")
            confidence = d.get("confidence", 0.0)
            
            if disease_name and isinstance(confidence, (int, float)) and confidence > 0.5:
                disease_counter[disease_name] += 1
    
    insights = []
    for disease, count in disease_counter.most_common(3):
        if count >= 3:
            insights.append(
                TraCuuInsight(
                    loai_insight="repeated_disease",
                    tieu_de=f"Cảnh báo lặp lại: {disease}",
                    insight=f"Các triệu chứng gần đây thường xuyên được AI liên hệ tới bệnh {disease} (xuất hiện {count} lần). Bạn nên xem xét thăm khám chuyên khoa.",
                    chi_tiet={"disease": disease, "count": count, "confidence": round(disease_counter[disease] / len(recent_records) * 100, 1)}
                )
            )
    return insights


SYMPTOM_CATEGORIES = {
    "Hô hấp": ["ho", "sổ mũi", "đau họng", "khó thở", "viêm họng", "viêm phổi", "cảm cúm", "asthma", "pneumonia"],
    "Rối loạn chuyển hóa & Nội tiết": ["tiểu nhiều", "khát nước", "sụt cân", "mệt mỏi", "tiểu đường", "diabetes", "đường huyết"],
    "Tim mạch": ["đau ngực", "hồi hộp", "đánh trống ngực", "cao huyết áp", "hypertension", "cardiovascular"],
    "Tiêu hóa": ["đau bụng", "buồn nôn", "tiêu chảy", "táo bón", "gastritis", "ulcer", "dạ dày"],
    "Thần kinh & Tâm lý": ["đau đầu", "chóng mặt", "mất ngủ", "lo âu", "trầm cảm", "migraine", "anxiety"]
}

def _generate_symptom_insights(records: List[Any]) -> List[TraCuuInsight]:
    if not records:
        return []
    
    category_counter = Counter()
    
    def _fuzzy_match(text: str, keywords: list, threshold: int = 75) -> bool:
        text_lower = text.lower().strip()
        for kw in keywords:
            kw_lower = kw.lower().strip()
            if fuzz.token_set_ratio(text_lower, kw_lower) >= threshold:
                return True
        return False
    
    for record in records:
        symptoms = [s.strip() for s in [record.trieuChung1, record.trieuChung2, record.trieuChung3, record.trieuChung4] 
                   if s and isinstance(s, str)]
        
        ket_qua = _parse_json_field(record.ketQuaJSON) # ✅ FIX 3: Parse JSON an toàn
        predicted_diseases = []
        if isinstance(ket_qua, dict):
            potential_diseases = ket_qua.get("potential_diseases", [])
            if isinstance(potential_diseases, list):
                predicted_diseases = [d.get("disease", "") for d in potential_diseases if isinstance(d, dict) and d.get("disease")]

        all_items = symptoms + predicted_diseases
        
        matched_categories = set()
        for item in all_items:
            if not item:
                continue
            for category, keywords in SYMPTOM_CATEGORIES.items():
                if _fuzzy_match(item, keywords):
                    matched_categories.add(category)
                    break
                    
        for cat in matched_categories:
            category_counter[cat] += 1

    insights = []
    for category, count in category_counter.most_common(2):
        if count >= 2:
            insight_text = ""
            if category == "Rối loạn chuyển hóa & Nội tiết":
                insight_text = "🔍 Nhiều lần tra cứu gần đây của bạn liên quan đến chuyển hóa. Bạn nên kiểm tra đường huyết đói và HbA1c."
            elif category == "Hô hấp":
                insight_text = "🌡️ Bạn thường xuyên tra cứu các triệu chứng hô hấp. Lưu ý bảo vệ mũi họng và tránh tác nhân kích hoạt."
            elif category == "Tim mạch":
                insight_text = "💓 Các triệu chứng liên quan tim mạch xuất hiện thường xuyên. Khuyến nghị kiểm tra huyết áp, mỡ máu và điện tâm đồ."
            elif category == "Tiêu hóa":
                insight_text = "🍽️ Các vấn đề tiêu hóa được ghi nhận thường xuyên. Cần xem xét chế độ ăn và xét nghiệm nội soi dạ dày."
            elif category == "Thần kinh & Tâm lý":
                insight_text = "🧠 Bạn thường xuyên gặp các vấn đề thần kinh/tâm lý. Cân nhắc tư vấn với bác sĩ chuyên khoa."
            else:
                insight_text = f"📊 Hệ thống ghi nhận sự lặp lại của các vấn đề liên quan đến {category}."
                
            insights.append(
                TraCuuInsight(
                    loai_insight="symptom_group",
                    tieu_de=f"Nhóm triệu chứng: {category}",
                    insight=insight_text,
                    chi_tiet={"nhom_benh_chinh": category, "tan_suat": count, "ty_le": f"{round(count / len(records) * 100, 1)}%"}
                )
            )
            
    return insights

def _calculate_trend(current_idx: int, records_asc: List[Any]) -> dict:
    if current_idx == 0:
        return {
            "trend": "none",
            "change": 0.0,
            "change_percent": 0.0,
            "volatility": 0.0,
            "insight": ""
        }

    current = records_asc[current_idx]
    previous = records_asc[current_idx - 1]

    curr_score = current.diemTong or 0.0
    prev_score = previous.diemTong or 0.0

    change = curr_score - prev_score
    
    if prev_score > 0:
        change_percent = (change / prev_score) * 100
    else:
        change_percent = 100.0 if change > 0 else 0.0

    trend_status = "stable"
    if change > 0:
        trend_status = "increase"
    elif change < 0:
        trend_status = "decrease"

    volatility_window = records_asc[max(0, current_idx-4):current_idx+1]
    if len(volatility_window) > 1:
        scores = [r.diemTong or 0.0 for r in volatility_window]
        max_score = max(scores)
        min_score = min(scores)
        avg_score = sum(scores) / len(scores)
        
        if avg_score > 0:
            volatility = (max_score - min_score) / avg_score
        else:
            volatility = 0.0
    else:
        volatility = 0.0

    continuous_increase = 0
    for i in range(current_idx, 0, -1):
        if (records_asc[i].diemTong or 0) > (records_asc[i-1].diemTong or 0):
            continuous_increase += 1
        else:
            break

    insight = ""
    if continuous_increase >= 3: 
        insight = f"🚨 Nguy cơ {current.maBenh} đang tăng liên tục trong {continuous_increase + 1} lần đánh giá gần nhất. Cần có biện pháp can thiệp ngay!"
    elif trend_status == "increase" and change_percent >= 20:
        insight = f"⚠️ Cảnh báo: Mức độ nguy cơ tăng vọt {round(change_percent)}% so với lần kiểm tra trước."
    elif trend_status == "decrease" and change_percent <= -10:
        insight = "✅ Tín hiệu tốt! Sức khỏe của bạn đang cải thiện so với lần đánh giá trước."
    
    if volatility > 0.5 and continuous_increase < 3:
        insight += f"\n⚡ Chú ý: Điểm số dao động lớn - có thể do yếu tố ngoài như stress, thiếu ngủ."

    return {
        "trend": trend_status,
        "change": round(abs(change), 2),
        "change_percent": round(abs(change_percent), 1),
        "volatility": round(volatility, 2),  
        "insight": insight
    }

def save_assessment_history(db: Session, id_nguoi_dung: int, ma_benh: str, result_data: dict, safe_json_func=None):
    try:
        ket_qua = safe_json_func(result_data) if safe_json_func else _safe_json(result_data)
        lich_su = LichSuDanhGia(
            idNguoiDung=id_nguoi_dung,
            maBenh=ma_benh,
            diemRule=float(result_data.get("rule_based", {}).get("score", 0.0)),
            diemML=float(result_data.get("ai_based", {}).get("score", 0.0)),
            diemTong=float(result_data.get("rule_based", {}).get("score", 0.0)),
            mucNguyCo=str(result_data.get("rule_based", {}).get("risk_level", "low")),
            ketQuaJSON=ket_qua,
        )
        db.add(lich_su)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Lỗi khi lưu lịch sử đánh giá: {e}")

def save_symptom_history(db: Session, id_nguoi_dung: int, trieu_chung: list, mo_ta: str, result_data: dict):
    try:
        tc1 = trieu_chung[0] if len(trieu_chung) > 0 else None
        tc2 = trieu_chung[1] if len(trieu_chung) > 1 else None
        tc3 = trieu_chung[2] if len(trieu_chung) > 2 else None
        tc4 = trieu_chung[3] if len(trieu_chung) > 3 else None

        lich_su = LichSuTraCuuTrieuChung(
            idNguoiDung=id_nguoi_dung,
            trieuChung1=tc1,
            trieuChung2=tc2,
            trieuChung3=tc3,
            trieuChung4=tc4,
            moTaThem=mo_ta,
            ketQuaJSON=result_data,
        )
        db.add(lich_su)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Lỗi khi lưu lịch sử tra cứu: {e}")

@router.get("/assessment/alerts/{ten_dang_nhap}", response_model=List[CanhBaoChuDongResponse])
def get_proactive_alerts(ten_dang_nhap: str, db: Session = Depends(get_db)):
    user = db.query(NguoiDung).filter(NguoiDung.tenDangNhap == ten_dang_nhap).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")

    all_records = (
        db.query(LichSuDanhGia)
        .filter(LichSuDanhGia.idNguoiDung == user.idNguoiDung)
        .order_by(desc(LichSuDanhGia.ngayDanhGia))
        .all()
    )

    disease_groups = {}
    for record in all_records:
        ma_benh = record.maBenh or "unknown"
        if ma_benh not in disease_groups:
            disease_groups[ma_benh] = []
        disease_groups[ma_benh].append(record)

    DISEASE_NAMES = {
        "diabetes": "tiểu đường",
        "hypertension": "cao huyết áp",
        "cardiovascular": "tim mạch",
        "stroke": "đột quỵ",
        "kidney": "bệnh thận mạn tính",
        "chronic_kidney_disease": "bệnh thận mạn tính",
        "ckd": "bệnh thận mạn tính",
        "asthma": "hen suyễn",
        "copd": "bệnh phổi tắc nghẽn mạn tính",
        "pneumonia": "viêm phổi",
        "gout": "bệnh gút",
        "arthritis": "viêm khớp",
        "osteoporosis": "loãng xương",
        "obesity": "béo phì",
        "fatty_liver": "gan nhiễm mỡ",
        "thyroid": "rối loạn tuyến giáp",
    }

    ADVICE_MAPPING = {
        "diabetes": "Bạn nên kiểm tra đường huyết đói và chỉ số HbA1c mỗi 3 tháng. Hạn chế cấp nước đường và tăng cường vận động.",
        "hypertension": "Hãy theo dõi huyết áp hàng ngày tại nhà (sáng sớm, tối) và giảm lượng muối trong khẩu phần ăn (<5g/ngày).",
        "cardiovascular": "Khuyến nghị kiểm tra mỡ máu (Cholesterol, LDL, Triglyceride) mỗi 6 tháng. Thực hiện điện tâm đồ (ECG) nếu có triệu chứng.",
        "stroke": "Cần tầm soát các mảng xơ vữa động mạch (Carotid ultrasound). Duy trì huyết áp < 130/80 mmHg.",
        "kidney": "Thực hiện xét nghiệm Creatinine máu và tính độ lọc cầu thận (eGFR) mỗi 3-6 tháng. Giảm protid và muối.",
        "chronic_kidney_disease": "Kiểm tra GFR, Creatinine, Albumin/Protein niệu định kỳ. Kiểm soát glucose và huyết áp chặt chẽ.",
        "ckd": "Kiểm tra GFR, Creatinine, Albumin/Protein niệu định kỳ. Kiểm soát glucose và huyết áp chặt chẽ.",
        "asthma": "Tránh các tác nhân kích hoạt (bụi, khí lạnh, thuốc lá) và sử dụng inhaler phòng ngừa định kỳ. Làm xét nghiệm chức năng phổi (FEV1).",
        "copd": "Bỏ hút thuốc ngay. Thực hiện kiểm tra chức năng phổi (Spirometry) hàng năm và tiêm vắc-xin (Pneumococcal, Influenza).",
        "pneumonia": "Hoàn thành đợt điều trị kháng sinh theo đơn. Thực hiện X-quang ngực lại sau 2 tuần để xác nhận hết bệnh.",
        "gout": "Hạn chế thực phẩm giàu purin (gan, đậu, rượu, nước ngọt). Uống đủ nước (2-3L/ngày) và duy trì BMI lành mạnh.",
        "arthritis": "Thực hiện vật lý trị liệu nhẹ nhàng và bơi lội. Kiểm tra yếu tố Rheumatoid Factor (RF) và Anti-CCP nếu viêm liên tục.",
        "osteoporosis": "Bổ sung Calcium (1000-1200mg) và Vitamin D3 (800-1000 IU/ngày). Tập các bài tập chịu tải và giảm alcohol.",
        "obesity": "Bắt đầu chương trình giảm cân dần dần (0.5-1kg/tuần). Tăng hoạt động thể chất lên 150 phút/tuần và theo dõi BMI.",
        "fatty_liver": "Giảm cân, hạn chế rượu, tăng cường vận động. Kiểm tra men gan (ALT, AST) mỗi 3-6 tháng.",
        "thyroid": "Kiểm tra TSH, Free T3, Free T4 theo định kỳ. Theo dõi các triệu chứng như mệt mỏi, sụt/tăng cân, thay đổi ngoại hình.",
    }

    alerts = []

    for ma_benh, records_desc in disease_groups.items():
        if len(records_desc) >= 3:
            score_newest = records_desc[0].diemTong or 0
            score_mid = records_desc[1].diemTong or 0
            score_oldest = records_desc[2].diemTong or 0

            if score_oldest < score_mid < score_newest:
                ten_benh_vi = DISEASE_NAMES.get(ma_benh, ma_benh)
                loi_khuyen = ADVICE_MAPPING.get(ma_benh, "Bạn nên sắp xếp lịch khám tổng quát sớm.")
                alerts.append(
                    CanhBaoChuDongResponse(
                        maBenh=ma_benh,
                        tieuDe="⚠ Cảnh báo sớm",
                        loaiCanhBao="tang_lien_tuc",
                        noiDung=f"Nguy cơ {ten_benh_vi} tăng liên tục trong 3 lần đánh giá gần nhất.",
                        loiKhuyen=loi_khuyen,
                        lichSuDiem=[score_oldest, score_mid, score_newest] 
                    )
                )
            elif score_newest >= 75 and score_mid < 75:
                ten_benh_vi = DISEASE_NAMES.get(ma_benh, ma_benh)
                alerts.append(
                    CanhBaoChuDongResponse(
                        maBenh=ma_benh,
                        tieuDe="🚨 Cảnh báo nguy hiểm",
                        loaiCanhBao="vuot_nguong",
                        noiDung=f"Nguy cơ {ten_benh_vi} vừa chuyển sang mức Rủi ro cao.",
                        loiKhuyen="Bạn cần đặt lịch khám chuyên khoa ngay lập tức.",
                        lichSuDiem=[score_mid, score_newest]
                    )
                )

    return alerts