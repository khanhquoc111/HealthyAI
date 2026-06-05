# backend/app/plugin_api.py
import json
import time
from pathlib import Path
from typing import Dict, Any

from fastapi import APIRouter, Body, HTTPException, Query, Depends 
from sqlalchemy.orm import Session 

from app.plugin_loader import PluginLoader
from app.validation_engine import ValidationEngine
from app.risk_stratification_engine import RiskStratificationEngine

from database.database import SessionLocal
from database.nguoi_dung import NguoiDung
from database.lich_su_danh_gia import LichSuDanhGia
from database.cs_suc_khoe import CsSucKhoe

router = APIRouter()

plugin_loader = PluginLoader()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_plugin_metadata(plugin_name: str) -> Dict[str, Any]:
    try:
        return plugin_loader.load_plugin(plugin_name)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Plugin '{plugin_name}' not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading plugin '{plugin_name}': {str(e)}")

def get_validation_engine(plugin_name: str):
    metadata = get_plugin_metadata(plugin_name)
    return ValidationEngine(metadata)

def get_scoring_engine(plugin_name: str):
    metadata = get_plugin_metadata(plugin_name)
    return RiskStratificationEngine(metadata)

@router.get("/plugins")
def list_plugins():
    return {"plugins": plugin_loader.list_plugins()}

@router.get("/plugins/{plugin_name}")
def get_plugin(plugin_name: str):
    return get_plugin_metadata(plugin_name)

@router.post("/plugins/{plugin_name}/validate")
def validate_plugin_form(plugin_name: str, form_data: dict):
    try:
        engine = get_validation_engine(plugin_name)
        result = engine.validate_form(form_data)
        return result.to_dict()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Validation error: {str(e)}")

@router.post("/plugins/{plugin_name}/validate-field/{field_key}")
def validate_plugin_field(plugin_name: str, field_key: str, form_data: dict):
    try:
        engine = get_validation_engine(plugin_name)
        field_errors = engine.get_field_errors(form_data, field_key)
        return {
            "field": field_key,
            "errors": [err.to_dict() for err in field_errors],
            "is_valid": len(field_errors) == 0,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Field validation error: {str(e)}")

@router.post("/plugins/{plugin_name}/normalize")
def normalize_plugin_form(plugin_name: str, form_data: dict):
    try:
        engine = get_validation_engine(plugin_name)
        return engine.normalize_form_data(form_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Normalization error: {str(e)}")

@router.get("/plugins/{plugin_name}/fields")
def get_plugin_all_fields(plugin_name: str):
    try:
        engine = get_validation_engine(plugin_name)
        return {
            "fields": engine.get_all_field_keys(),
            "total": len(engine.get_all_field_keys()),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Field list error: {str(e)}")

@router.post("/plugins/{plugin_name}/score")
def score_plugin_form(
    plugin_name: str, 
    form_data: dict = Body(...),
    ten_dang_nhap: str = Query(None), 
    db: Session = Depends(get_db)   
):
    try:
        # TỪ ĐIỂN MAPPING CỘT DB (Tiếng Việt) VÀ TRƯỜNG PLUGIN (Tiếng Anh)
        db_to_form = {
            "tuoi": "age", "bmi": "bmi", "vongEo": "waist",
            "huyetApTamThu": "systolic", "huyetApTamTruong": "diastolic",
            "duongHuyet": "fasting_glucose", "hba1c": "hba1c",
            "cholesterol": "total_cholesterol", "ldl": "ldl", "hdl": "hdl",
            "creatinine": "creatinine", "soPhutVanDongMoiTuan": "exercise",
            "giaDinhTieuDuong": "family_diabetes",
            "giaDinhCaoHuyetAp": "family_hypertension",
            "giaDinhTimMach": "family_cardiovascular",
            "gioiTinh": "gender_code",
        }
        form_to_db = {v: k for k, v in db_to_form.items()} # Map ngược lại

        # 1. Trích xuất dữ liệu Hồ sơ sức khỏe từ Database để hợp nhất
        health_profile_dict = {}
        if ten_dang_nhap:
            user = db.query(NguoiDung).filter(NguoiDung.tenDangNhap == ten_dang_nhap).first()
            if user:
                profile = db.query(CsSucKhoe).filter(CsSucKhoe.idNguoiDung == user.idNguoiDung).first()
                if profile:
                    for k, v in profile.__dict__.items():
                        if not k.startswith('_') and v is not None:
                            health_profile_dict[k] = v
                            # Bơm thêm key tiếng Anh để Rule Engine có thể đọc được
                            if k in db_to_form:
                                health_profile_dict[db_to_form[k]] = v
                            
                            # Xử lý mapping đặc biệt cho trường Select/Option
                            if k == "hutThuoc":
                                if v == "Đang hút": health_profile_dict["smoking_status"] = "current"
                                elif v == "Đã bỏ": health_profile_dict["smoking_status"] = "former"
                                elif v == "Không": health_profile_dict["smoking_status"] = "never"
                    if "gioiTinh" in health_profile_dict:
                        gt = health_profile_dict["gioiTinh"]
                        health_profile_dict["gender_code"] = 1.0 if gt in ("Nam", "1", 1) else 2.0
                    # Thêm mới — chuyển soPhutVanDong → exercise boolean
                    if "soPhutVanDongMoiTuan" in health_profile_dict:
                        try:
                            health_profile_dict["exercise"] = 1.0 if float(health_profile_dict["soPhutVanDongMoiTuan"]) >= 150 else 0.0
                        except:
                            health_profile_dict["exercise"] = 0.0

                    # Thêm mới — chuyển uongRuouBia → alcohol số
                    if "uongRuouBia" in health_profile_dict and "alcohol" not in health_profile_dict:
                        mapping_ruou = {"Không": 0, "Thỉnh thoảng": 1, "Thường xuyên": 3, "Nhiều": 5}
                        health_profile_dict["alcohol"] = mapping_ruou.get(health_profile_dict["uongRuouBia"], 0)

                    # Thêm mới — chuyển mucDoAnMan → sodium_intake số
                    if "mucDoAnMan" in health_profile_dict and "sodium_intake" not in health_profile_dict:
                        mapping_muoi = {"Nhạt": 1200, "Vừa": 2000, "Mặn": 3500}
                        health_profile_dict["sodium_intake"] = mapping_muoi.get(health_profile_dict["mucDoAnMan"], 2000)

        # Tạo payload hợp nhất (Ưu tiên form hiện tại hơn DB)
        unified_payload = {**health_profile_dict, **form_data}

        # 2. VALIDATION ĐỐI VỚI FORM GỐC (Chỉ validate các trường mà plugin hiện tại quản lý)
        validation_engine = get_validation_engine(plugin_name)
        validation_result = validation_engine.validate_form(form_data)

        if validation_result.has_errors():
            raise HTTPException(
                status_code=400,
                detail={
                    "message": "Dữ liệu không hợp lệ",
                    "errors": [err.to_dict() for err in validation_result.errors]
                }
            )

        normalized_plugin = validation_engine.normalize_form_data(unified_payload)
        normalized_data = {**unified_payload, **normalized_plugin}

        # 3. CALCULATE RISK KÉP DUAL-ENGINE 
        scoring_engine = get_scoring_engine(plugin_name)
        result = scoring_engine.calculate_risk(normalized_data)

        result["validation"] = {
            "is_valid": validation_result.is_valid,
            "warnings": [w.to_dict() for w in validation_result.warnings]
        }

        # 4. TỰ ĐỘNG TÍCH LŨY DỮ LIỆU & LƯU LỊCH SỬ (Ánh xạ ngược Anh -> Việt)
        if ten_dang_nhap:
            user = db.query(NguoiDung).filter(NguoiDung.tenDangNhap == ten_dang_nhap).first()
            if user:
                # Tự động lưu form hiện tại vào Hồ sơ sức khỏe để làm giàu dữ liệu
                profile_record = db.query(CsSucKhoe).filter(CsSucKhoe.idNguoiDung == user.idNguoiDung).first()
                if not profile_record:
                    profile_record = CsSucKhoe(idNguoiDung=user.idNguoiDung)
                    db.add(profile_record)

                for form_key, value in form_data.items():
                    if value in [None, ""]: continue
                    
                    db_key = form_key # Mặc định
                    if form_key in form_to_db:
                        db_key = form_to_db[form_key]
                        
                    # Dịch ngược giá trị từ tiếng Anh của form về DB
                    if form_key == "smoking_status":
                        db_key = "hutThuoc"
                        if value == "current": value = "Đang hút"
                        elif value == "former": value = "Đã bỏ"
                        elif value == "never": value = "Không"

                    # Ghi nhận chỉ số vào DB
                    if hasattr(profile_record, db_key):
                        setattr(profile_record, db_key, value)
                
                # Lưu log phân tích
                metadata = get_plugin_metadata(plugin_name)
                ten_benh = metadata.get("disease_info", {}).get("name", plugin_name)

                lich_su = LichSuDanhGia(
                    idNguoiDung=user.idNguoiDung,
                    tenBenh=ten_benh,
                    diemRule=float(result.get("rule_based", {}).get("score", 0.0)),
                    diemML=float(result.get("ai_based", {}).get("score", 0.0)),
                    diemTong=float(result.get("rule_based", {}).get("score", 0.0)),
                    mucNguyCo=str(result.get("rule_based", {}).get("risk_level", "low")),
                    ketQuaJSON=result  
                )
                db.add(lich_su)
                db.commit()

        return result

    except HTTPException as he:
        raise he
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Scoring error: {str(e)}")

@router.post("/plugins/{plugin_name}/reload")
def reload_plugin(plugin_name: str):
    try:
        if plugin_name in plugin_loader._cache:
            plugin_loader._cache.pop(plugin_name, None)
        
        metadata = plugin_loader.load_plugin(plugin_name, force_reload=True)
        return {
            "status": "success",
            "message": f"Plugin '{plugin_name}' đã được reload thành công",
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))