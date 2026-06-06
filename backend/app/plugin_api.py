# backend/app/plugin_api.py
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
import logging

from database.database import get_db
from database.nguoi_dung import NguoiDung
from database.hs_suckhoe import HoSoSucKhoe
from database.cs_suckhoe import ChiSoSucKhoe

from app.plugin_loader import get_plugin
from app.validation_engine import ValidationEngine
from app.risk_stratification_engine import RiskStratificationEngine

router = APIRouter(prefix="/api/plugins", tags=["Plugins"])
logger = logging.getLogger(__name__)

class FormSubmission(BaseModel):
    ten_dang_nhap: Optional[str] = None
    form_data: Dict[str, Any] = {}

# Mapping DB (VN) → Plugin (EN) - CHÍNH XÁC
DB_TO_FORM = {
    "tuoi": "age",
    "gioiTinh": "gender",
    "bmi": "bmi",
    "vongEo": "waist_circumference",
    "huyetApTamThu": "systolic_bp",
    "huyetApTamTruong": "diastolic_bp",
    "duongHuyet": "fasting_blood_glucose",
    "hba1c": "hba1c",
    "cholesterol": "total_cholesterol",
    "hdl": "hdl_cholesterol",
    "ldl": "ldl_cholesterol",
    "triglyceride": "triglycerides",
    "creatinine": "serum_creatinine",
    "soPhutVanDongMoiTuan": "physical_activity_minutes",
    "giaDinhTieuDuong": "family_history_diabetes",
    "giaDinhCaoHuyetAp": "family_history_hypertension",
}

FORM_TO_DB = {v: k for k, v in DB_TO_FORM.items()}

@router.get("/")
def list_plugins():
    from app.plugin_loader import get_plugin_loader
    plugins = get_plugin_loader().list_diseases()
    return {"available_plugins": [{"id": p, "name": p.capitalize()} for p in plugins]}

@router.get("/{plugin_id}")
def get_plugin_metadata(plugin_id: str):
    """Lấy toàn bộ metadata (schema) của một plugin để frontend render form"""
    plugin_metadata = get_plugin(plugin_id)
    if not plugin_metadata:
        raise HTTPException(status_code=404, detail=f"Plugin {plugin_id} not found")
    return plugin_metadata

@router.post("/{plugin_id}/validate-field/{field_key}")
def validate_single_field(plugin_id: str, field_key: str, payload: Dict[str, Any]):
    """Validate từng field realtime khi user nhập liệu (on blur/change)"""
    plugin_metadata = get_plugin(plugin_id)
    if not plugin_metadata:
        raise HTTPException(status_code=404, detail=f"Plugin {plugin_id} not found")
    
    val_engine = ValidationEngine(plugin_metadata)
    errors = val_engine.get_field_errors(payload, field_key)
    
    if errors:
        return {"is_valid": False, "errors": [e.to_dict() for e in errors]}
    return {"is_valid": True}

@router.post("/{plugin_id}/calculate")
def calculate_disease_risk(plugin_id: str, payload: FormSubmission, db: Session = Depends(get_db)):
    plugin_metadata = get_plugin(plugin_id)
    if not plugin_metadata:
        raise HTTPException(status_code=404, detail=f"Plugin {plugin_id} not found")

    ten_dang_nhap = payload.ten_dang_nhap
    form_data = payload.form_data or {}

    # 1. Lấy dữ liệu từ DB
    health_profile = {}
    if ten_dang_nhap:
        user = db.query(NguoiDung).filter(NguoiDung.tenDangNhap == ten_dang_nhap).first()
        if user:
            # HoSoSucKhoe (cột cứng)
            hoso = db.query(HoSoSucKhoe).filter(HoSoSucKhoe.idNguoiDung == user.idNguoiDung).first()
            if hoso:
                for k, v in hoso.__dict__.items():
                    if not k.startswith('_') and v is not None:
                        form_key = DB_TO_FORM.get(k, k)
                        health_profile[form_key] = v

            # ChiSoSucKhoe (EAV)
            chisos = db.query(ChiSoSucKhoe).filter(ChiSoSucKhoe.idNguoiDung == user.idNguoiDung).all()
            for cs in chisos:
                form_key = DB_TO_FORM.get(cs.maChiSo, cs.maChiSo)
                try:
                    health_profile[form_key] = float(cs.giaTri) if '.' in str(cs.giaTri) or str(cs.giaTri).isdigit() else cs.giaTri
                except:
                    health_profile[form_key] = cs.giaTri

    # 2. Merge: form_data ưu tiên cao hơn DB
    unified_data = {**health_profile, **form_data}

    # 3. Validation & Normalize
    val_engine = ValidationEngine(plugin_metadata)
    val_result = val_engine.validate_form(unified_data)
    if val_result.has_errors():
        raise HTTPException(400, detail={"errors": [e.to_dict() for e in val_result.errors]})

    normalized = val_engine.normalize_form_data(unified_data)

    # 4. Tính risk (rule-based)
    risk_engine = RiskStratificationEngine(plugin_metadata)
    
    # [FIX] Changed calculate_risk to evaluate to match the class method definition
    result = risk_engine.evaluate(normalized)

    return result