# backend/function/cn_tra_cuu_trieu_chung.py
"""
NÂNG CẤP: API Tra Cứu Triệu Chứng - AI-Driven (v2)
- ✅ Sử dụng AI phân tích ngữ cảnh y khoa làm chính
- ✅ CSV dùng để kiểm chứng + cung cấp thông tin chi tiết
- ✅ FỐI XỬ MATCHING: Fuzzy match, normalize disease names, fallback descriptions
- ✅ LUÔN TRẢLẠI TIẾNG VIỆT: Fallback Vietnamese descriptions khi CSV không tìm
- ✅ Loại trừ bệnh không phù hợp dựa trên ngữ cảnh
- ✅ Trả về lý do y tế cho từng gợi ý
"""
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.symptom_checker_engine import get_symptom_engine
from database.database import SessionLocal
from database.lich_su_tra_cuu import LichSuTraCuuTrieuChung
from database.nguoi_dung import NguoiDung


router = APIRouter(prefix="/symptom-checker", tags=["Tra Cuu Trieu Chung"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ─────────────────────────────────────────────────────────────────
# Pydantic Models
# ─────────────────────────────────────────────────────────────────

class TraCuuRequest(BaseModel):
    tenDangNhap: str
    trieuChung1: Optional[str] = None
    trieuChung2: Optional[str] = None
    trieuChung3: Optional[str] = None
    trieuChung4: Optional[str] = None
    moTaThem: Optional[str] = ""


class AIDisease(BaseModel):
    disease: str
    confidence: float
    reasoning: Optional[str] = None
    match_rate: float
    severity_risk: Optional[str] = None
    description: Optional[str] = None
    is_high_risk: bool = False
    warning_message: Optional[str] = None
    health_advice: List[str] = []
    diet_recommendations: List[str] = []
    lifestyle_recommendations: List[str] = []


class TraCuuResponse(BaseModel):
    final_symptoms: List[str]
    potential_diseases: List[AIDisease]
    context: Dict[str, Any] = {}
    disclaimer: str


class LichSuTraCuuResponse(BaseModel):
    idTraCuu: int
    ngayTraCuu: datetime
    trieuChung: List[str]
    moTaThem: str
    ketQua: Dict[str, Any]


# ─────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────

def normalize_list(value):
    """Chuẩn hóa list từ response"""
    if not value:
        return []
    if isinstance(value, list):
        return [str(x).strip() for x in value if str(x).strip()]
    return [str(value).strip()] if str(value).strip() else []


# ─────────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────────

@router.post("/analyze", response_model=TraCuuResponse)
async def analyze_symptoms(request: TraCuuRequest, db: Session = Depends(get_db)):
    """
    NÂNG CẤP (v2): Tra cứu triệu chứng bằng AI-driven analysis.
    
    Quy trình:
    1. AI phân tích ngữ cảnh + gợi ý bệnh (chính)
    2. ✅ Resolve tên bệnh bằng fuzzy matching + normalize
    3. CSV kiểm chứng + cung cấp thông tin chi tiết (hoặc fallback Việt)
    4. ✅ Fallback mô tả tự động (tiếng Việt) khi CSV không tìm được
    5. Loại trừ bệnh không phù hợp
    6. Trả về lý do y tế cho mỗi gợi ý
    7. ✅ LUÔN TRẢLẠI TIẾNG VIỆT
    
    Request:
    {
        "tenDangNhap": "user123",
        "trieuChung1": "đau đầu",
        "trieuChung2": "chóng mặt",
        "trieuChung3": "",
        "trieuChung4": "",
        "moTaThem": "từ sáng sớm, sau khi ăn cơm không hoàn toàn chín"
    }
    
    Response:
    {
        "final_symptoms": ["headache", "dizziness"],
        "potential_diseases": [
            {
                "disease": "migraine",
                "confidence": 0.92,
                "reasoning": "Đau đầu + chóng mặt thường gặp trong chứng đau nửa đầu",
                "match_rate": 85.5,
                "severity_risk": "medium",
                "description": "Bệnh đau nửa đầu là...",
                "health_advice": ["Tránh ánh sáng sặc sỡ", "Nghỉ ngơi trong phòng tối"],
                "diet_recommendations": ["Ăn các thực phẩm nhẹ", "Tránh caffeine"],
                "lifestyle_recommendations": ["Ngủ đủ giấc", "Giảm căng thẳng"],
                "is_high_risk": false
            }
        ],
        "context": {
            "is_acute": true,
            "is_chronic": false,
            "severity": "medium",
            "analysis": "Bệnh cấp tính, khả năng cao là đau đầu thông thường hoặc migraine"
        },
        "disclaimer": "Đây là công cụ sàng lọc sơ bộ..."
    }
    """
    
    # ────────────────────────────────────────────────────────────
    # Kiểm tra đăng nhập
    # ────────────────────────────────────────────────────────────
    user = db.query(NguoiDung).filter(NguoiDung.tenDangNhap == request.tenDangNhap).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")

    # ────────────────────────────────────────────────────────────
    # Chuẩn bị triệu chứng
    # ────────────────────────────────────────────────────────────
    selected_symptoms = [
        s for s in [
            request.trieuChung1,
            request.trieuChung2,
            request.trieuChung3,
            request.trieuChung4,
        ]
        if s and str(s).strip()
    ]
    mo_ta_them = (request.moTaThem or "").strip()

    print("📥 DEBUG - Request nhận được:")
    print(f"   tenDangNhap: {request.tenDangNhap}")
    print(f"   trieuChung: {selected_symptoms}")
    print(f"   moTaThem: '{mo_ta_them}'")

    # ────────────────────────────────────────────────────────────
    # Kiểm tra dữ liệu đầu vào
    # ────────────────────────────────────────────────────────────
    if not selected_symptoms and not mo_ta_them:
        print("❌ LỖI: Không có triệu chứng cũng không có mô tả")
        raise HTTPException(
            status_code=400,
            detail="Vui lòng chọn ít nhất 1 triệu chứng hoặc nhập mô tả.",
        )

    if len(selected_symptoms) > 4:
        raise HTTPException(status_code=400, detail="Chỉ được nhập tối đa 4 triệu chứng.")

    # ────────────────────────────────────────────────────────────
    # AI-driven analysis (chính)
    # ────────────────────────────────────────────────────────────
    engine = get_symptom_engine()
    
    # BƯỚC 1: AI phân tích + gợi ý bệnh (đã có csv_disease_name từ engine)
    ai_result = await engine.analyze_symptoms_with_ai(selected_symptoms, mo_ta_them)
    
    if not ai_result or not ai_result.get("ai_diseases"):
        raise HTTPException(
            status_code=400,
            detail="Hệ thống không thể phân tích. Vui lòng cung cấp thông tin chi tiết hơn.",
        )

    final_symptoms = ai_result.get("final_symptoms", [])
    ai_diseases = ai_result.get("ai_diseases", [])
    context = ai_result.get("context", {})

    # BƯỚC 2: ✅ Bổ sung thông tin chi tiết từ CSV (hoặc fallback Việt)
    # Engine sẽ tự động dùng fuzzy matching + fallback mô tả
    enriched_diseases = await engine.enrich_disease_list(ai_diseases)

    # BƯỚC 3: Sắp xếp theo confidence × match_rate
    enriched_diseases.sort(
        key=lambda x: (x.get("confidence", 0) * (x.get("match_rate", 0) / 100)),
        reverse=True
    )

    # BƯỚC 4: Giới hạn top 3 kết quả
    top_diseases = enriched_diseases[:3]

    print(f"✅ AI gợi ý {len(top_diseases)} bệnh:")
    for d in top_diseases:
        print(f"   - {d['disease']}: confidence={d.get('confidence', 0)}, match={d.get('match_rate', 0)}%")
        print(f"     description_length={len(d.get('description', ''))}")
        print(f"     health_advice_count={len(d.get('health_advice', []))}")
        print(f"     diet_count={len(d.get('diet_recommendations', []))}")
        print(f"     lifestyle_count={len(d.get('lifestyle_recommendations', []))}")

    # ────────────────────────────────────────────────────────────
    # Chuẩn bị raw response
    # ────────────────────────────────────────────────────────────
    raw_response = {
        "final_symptoms": final_symptoms,
        "potential_diseases": [
            {
                "disease": d["disease"],
                "confidence": d.get("confidence", 0),
                "reasoning": d.get("reasoning", ""),
                "match_rate": d.get("match_rate", 0),
                "severity_risk": d.get("severity_risk", "medium"),
                "description": d.get("description", ""),
                "is_high_risk": d.get("is_high_risk", False),
                "warning_message": d.get("warning_message", ""),
                "health_advice": normalize_list(d.get("health_advice", [])),
                "diet_recommendations": normalize_list(d.get("diet_recommendations", [])),
                "lifestyle_recommendations": normalize_list(d.get("lifestyle_recommendations", [])),
            }
            for d in top_diseases
        ],
        "context": context,
        "disclaimer": ai_result.get("disclaimer", ""),
    }

    # ────────────────────────────────────────────────────────────
    # ✅ Dịch sang tiếng Việt (hoặc giữ nguyên nếu fallback đã Việt)
    # ────────────────────────────────────────────────────────────
    translated_response = await engine.translate_response_to_vietnamese(raw_response)
    translated_final_symptoms = translated_response.get("final_symptoms", raw_response["final_symptoms"])
    translated_potential_diseases = translated_response.get("potential_diseases", raw_response["potential_diseases"])
    translated_context = translated_response.get("context", raw_response["context"])
    translated_disclaimer = translated_response.get("disclaimer", raw_response["disclaimer"])

    # ────────────────────────────────────────────────────────────
    # Lưu lịch sử vào database
    # ────────────────────────────────────────────────────────────
    try:
        lich_su = LichSuTraCuuTrieuChung(
            idNguoiDung=user.idNguoiDung,
            trieuChung1=request.trieuChung1,
            trieuChung2=request.trieuChung2,
            trieuChung3=request.trieuChung3,
            trieuChung4=request.trieuChung4,
            moTaThem=mo_ta_them,
            ketQuaJSON={
                "final_symptoms": translated_final_symptoms,
                "potential_diseases": translated_potential_diseases,
                "context": translated_context,
                "disclaimer": translated_disclaimer,
            },
        )
        db.add(lich_su)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Lỗi khi lưu lịch sử tra cứu: {e}")

    # ────────────────────────────────────────────────────────────
    # Trả về kết quả
    # ────────────────────────────────────────────────────────────
    return TraCuuResponse(
        final_symptoms=translated_final_symptoms,
        potential_diseases=[
            AIDisease(
                disease=d.get("disease", ""),
                confidence=d.get("confidence", 0),
                reasoning=d.get("reasoning", ""),
                match_rate=d.get("match_rate", 0),
                severity_risk=d.get("severity_risk", "medium"),
                description=d.get("description", ""),
                is_high_risk=d.get("is_high_risk", False),
                warning_message=d.get("warning_message", ""),
                health_advice=normalize_list(d.get("health_advice", [])),
                diet_recommendations=normalize_list(d.get("diet_recommendations", [])),
                lifestyle_recommendations=normalize_list(d.get("lifestyle_recommendations", [])),
            )
            for d in translated_potential_diseases
        ],
        context=translated_context,
        disclaimer=translated_disclaimer,
    )


@router.get("/history/{ten_dang_nhap}", response_model=List[LichSuTraCuuResponse])
async def get_search_history(
    ten_dang_nhap: str,
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """
    Lấy lịch sử tra cứu của người dùng.
    
    Response:
    [
        {
            "idTraCuu": 1,
            "ngayTraCuu": "2024-01-15T10:30:00",
            "trieuChung": ["đau đầu", "chóng mặt"],
            "moTaThem": "từ sáng sớm",
            "ketQua": {
                "final_symptoms": [...],
                "potential_diseases": [...]
            }
        }
    ]
    """
    user = db.query(NguoiDung).filter(NguoiDung.tenDangNhap == ten_dang_nhap).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")

    records = (
        db.query(LichSuTraCuuTrieuChung)
        .filter(LichSuTraCuuTrieuChung.idNguoiDung == user.idNguoiDung)
        .order_by(desc(LichSuTraCuuTrieuChung.ngayTraCuu))
        .limit(limit)
        .all()
    )

    return [
        LichSuTraCuuResponse(
            idTraCuu=record.idTraCuu,
            ngayTraCuu=record.ngayTraCuu,
            trieuChung=[
                symptom
                for symptom in [
                    record.trieuChung1,
                    record.trieuChung2,
                    record.trieuChung3,
                    record.trieuChung4,
                ]
                if symptom and symptom.strip()
            ],
            moTaThem=record.moTaThem or "",
            ketQua=record.ketQuaJSON or {},
        )
        for record in records
    ]


@router.get("/health")
async def health_check():
    """
    Kiểm tra sức khỏe của Symptom Checker Engine.
    
    Response:
    {
        "status": "ok",
        "engine": "AI-Driven",
        "features": ["context_detection", "disease_exclusion", "confidence_scoring"],
        "message": "Engine hoạt động bình thường"
    }
    """
    try:
        engine = get_symptom_engine()
        return {
            "status": "ok",
            "engine": "AI-Driven Symptom Checker (v2)",
            "features": [
                "Context Detection (acute vs chronic)",
                "Disease Exclusion",
                "Confidence Scoring",
                "Fuzzy Disease Matching",
                "Fallback Vietnamese Descriptions",
                "Semantic Reasoning",
                "CSV Verification",
            ],
            "message": "Symptom Checker Engine hoạt động bình thường.",
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Symptom Checker Engine lỗi: {str(e)}",
        )