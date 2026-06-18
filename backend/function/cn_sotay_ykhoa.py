from fastapi import APIRouter, Query, HTTPException
from typing import Dict, Any, List, Optional
from pydantic import BaseModel

# Import engine
from app.medical_handbook_engine import get_handbook_engine, DiseaseExplanation


# ─────────────────── Pydantic Models ───────────────────
class DiseaseExplanationResponse(BaseModel):
    """Response model cho giải thích y khoa"""
    tenbenhISO: str
    tenbenh: str
    tenkhoa: str
    mota: str
    trieuchinh: str
    nguynhan: str
    dieutri: str
    phongngua: str


class EnrichedAssessmentRequest(BaseModel):
    """Request để match kết quả đánh giá với cẩm nang"""
    disease: str
    risk: Optional[str] = None
    confidence: Optional[float] = None
    additional_data: Optional[Dict[str, Any]] = None


class EnrichedAssessmentResponse(BaseModel):
    """Response cho assessment enriched với medical explanation"""
    disease: str
    risk: Optional[str] = None
    confidence: Optional[float] = None
    handbook_found: bool
    y_te_explanation: Optional[DiseaseExplanationResponse] = None


class DiseaseListItem(BaseModel):
    """Item trong danh sách bệnh"""
    tenbenhISO: str
    tenbenh: str
    tenkhoa: str


# ─────────────────── Router ───────────────────
router = APIRouter(prefix="/api/medical-handbook", tags=["Medical Handbook"])


@router.get("/explanation/{disease_name}", 
            response_model=Optional[DiseaseExplanationResponse],
            summary="Lấy giải thích y khoa cho một bệnh")
async def get_disease_explanation(disease_name: str):
    """
    Lấy giải thích y khoa chi tiết cho một bệnh cụ thể
    
    Args:
        disease_name: Tên bệnh (ISO hoặc tiếng Việt)
    
    Returns:
        DiseaseExplanationResponse hoặc None
    
    Example:
        GET /api/medical-handbook/explanation/DIABETES
        GET /api/medical-handbook/explanation/Tiểu đường
    """
    engine = get_handbook_engine()
    explanation = engine.get_explanation(disease_name)
    
    if not explanation:
        raise HTTPException(
            status_code=404,
            detail=f"Không tìm thấy giải thích cho bệnh: {disease_name}"
        )
    
    return explanation.to_dict()


@router.get("/diseases", 
            response_model=List[DiseaseListItem],
            summary="Lấy danh sách tất cả bệnh")
async def get_all_diseases():
    """
    Lấy danh sách tất cả các bệnh có trong cẩm nang y khoa
    
    Returns:
        Danh sách DiseaseListItem
    
    Example:
        GET /api/medical-handbook/diseases
    """
    engine = get_handbook_engine()
    diseases = engine.get_all_diseases()
    return diseases


@router.get("/search", 
            response_model=List[DiseaseExplanationResponse],
            summary="Tìm kiếm bệnh theo từ khóa")
async def search_diseases(keyword: str = Query(..., min_length=1)):
    """
    Tìm kiếm các bệnh theo từ khóa
    
    Args:
        keyword: Từ khóa tìm kiếm (bắt buộc)
    
    Returns:
        Danh sách DiseaseExplanationResponse
    
    Example:
        GET /api/medical-handbook/search?keyword=tiểu
        GET /api/medical-handbook/search?keyword=tim
    """
    engine = get_handbook_engine()
    results = engine.search_diseases(keyword)
    
    if not results:
        raise HTTPException(
            status_code=404,
            detail=f"Không tìm thấy bệnh nào với từ khóa: {keyword}"
        )
    
    return [result.to_dict() for result in results]


@router.post("/enrich-assessment", 
             response_model=EnrichedAssessmentResponse,
             summary="Enriched kết quả đánh giá với giải thích y khoa")
async def enrich_assessment(request: EnrichedAssessmentRequest):
    """
    Dùng để match kết quả dự đoán bệnh (từ rule-based hoặc ML engine)
    với cẩm nang y khoa tự động
    
    Args:
        request: EnrichedAssessmentRequest chứa disease name
    
    Returns:
        EnrichedAssessmentResponse với y_te_explanation đính kèm
    
    Example:
        POST /api/medical-handbook/enrich-assessment
        {
            "disease": "DIABETES",
            "risk": "HIGH",
            "confidence": 0.85
        }
    """
    engine = get_handbook_engine()
    
    # Chuẩn bị dữ liệu
    assessment_dict = {
        "disease": request.disease,
        "risk": request.risk,
        "confidence": request.confidence,
    }
    
    if request.additional_data:
        assessment_dict.update(request.additional_data)
    
    # Enrich với handbook
    enriched = engine.match_and_enrich(assessment_dict, disease_field="disease")
    
    # Build response
    y_te_data = enriched.get("y_te_explanation")
    
    return EnrichedAssessmentResponse(
        disease=enriched["disease"],
        risk=enriched.get("risk"),
        confidence=enriched.get("confidence"),
        handbook_found=enriched.get("handbook_found", False),
        y_te_explanation=y_te_data
    )


@router.get("/health", 
            summary="Check sức khỏe của Medical Handbook Engine")
async def health_check():
    """
    Kiểm tra xem engine có chạy bình thường không
    và bao nhiêu bệnh đã được load
    
    Returns:
        Status và số lượng bệnh
    
    Example:
        GET /api/medical-handbook/health
    """
    try:
        engine = get_handbook_engine()
        num_diseases = len(engine.handbook_data)
        return {
            "status": "ok",
            "diseases_loaded": num_diseases,
            "message": f"Medical Handbook Engine hoạt động bình thường. Đã load {num_diseases} bệnh."
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Medical Handbook Engine lỗi: {str(e)}"
        )