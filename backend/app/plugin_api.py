# backend/app/plugin_api.py
import time
import warnings
import numpy as np
import joblib
import os
import pandas as pd
from typing import Dict, Any

from fastapi import APIRouter, Body, HTTPException, Query, Depends
from sqlalchemy.orm import Session

from app.plugin_loader import PluginLoader
from app.validation_engine import ValidationEngine
from app.risk_stratification_engine import RiskStratificationEngine

from database.database import SessionLocal
from database.nguoi_dung import NguoiDung
from database.lich_su_danh_gia import LichSuDanhGia
from database.hs_suckhoe import HoSoSucKhoe
from database.cs_suckhoe import ChiSoSucKhoe

router = APIRouter()

plugin_loader = PluginLoader()

# ── Hằng số phân loại field DB ───────────────────────────────────────────────

# Cột cứng thuộc bảng hoSoSucKhoe
HO_SO_COLS = {
    "tuoi", "gioiTinh", "chieuCao", "canNang", "bmi", "vongEo",
    "huyetApTamThu", "huyetApTamTruong", "hutThuoc", "uongRuouBia",
    "soPhutVanDongMoiTuan", "anMan"
}

# EAV fields cần ép kiểu khi đọc
BOOLEAN_FIELDS = {
    "caoHuyetAp", "tieuDuong", "benhTimMach", "gout",
    "giaDinhCaoHuyetAp", "giaDinhTieuDuong", "giaDinhTimMach", "giaDinhGout",
}
NUMBER_FIELDS = {
    "duongHuyet", "hba1c", "cholesterol", "ldl", "hdl",
    "triglyceride", "creatinine", "acidUric",
}

# Mapping cột DB (tiếng Việt) → key plugin (tiếng Anh)
DB_TO_FORM = {
    "tuoi":              "age",
    "bmi":               "bmi",
    "vongEo":            "waist",
    "huyetApTamThu":     "systolic",
    "huyetApTamTruong":  "diastolic",
    "duongHuyet":        "fasting_glucose",
    "hba1c":             "hba1c",
    "cholesterol":       "total_cholesterol",
    "ldl":               "ldl",
    "hdl":               "hdl_cholesterol",
    "creatinine":        "creatinine",
    "giaDinhTieuDuong":  "family_diabetes",
    "giaDinhCaoHuyetAp": "family_hypertension",
    "giaDinhTimMach":    "family_cardiovascular",
    "gioiTinh":          "gender_code",
}
FORM_TO_DB = {v: k for k, v in DB_TO_FORM.items()}


# ── Helpers ───────────────────────────────────────────────────────────────────

def convert_to_serializable(obj):
    """Chuyển numpy types về Python native types để JSON serialize được."""
    if isinstance(obj, dict):
        return {k: convert_to_serializable(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_to_serializable(i) for i in obj]
    elif isinstance(obj, (np.float32, np.float64)):
        return float(obj)
    elif isinstance(obj, (np.int32, np.int64)):
        return int(obj)
    elif isinstance(obj, np.bool_):
        return bool(obj)
    return obj


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


def _load_health_profile(user_id: int, db: Session) -> dict:
    """Đọc hồ sơ sức khỏe từ hoSoSucKhoe + chiSoSucKhoe, trả về dict phẳng."""
    profile = {}

    # Cột cứng
    hoso = db.query(HoSoSucKhoe).filter(HoSoSucKhoe.idNguoiDung == user_id).first()
    if hoso:
        for k, v in hoso.__dict__.items():
            if not k.startswith("_") and v is not None:
                profile[k] = v

    # EAV — ép kiểu khi đọc
    chisos = db.query(ChiSoSucKhoe).filter(ChiSoSucKhoe.idNguoiDung == user_id).all()
    for cs in chisos:
        if cs.giaTri is None:
            continue
        if cs.maChiSo in BOOLEAN_FIELDS:
            profile[cs.maChiSo] = cs.giaTri.lower() in ("true", "1", "yes", "có")
        elif cs.maChiSo in NUMBER_FIELDS:
            try:
                profile[cs.maChiSo] = float(cs.giaTri)
            except ValueError:
                profile[cs.maChiSo] = cs.giaTri
        else:
            profile[cs.maChiSo] = cs.giaTri

    return profile


def _enrich_profile(profile: dict) -> dict:
    """Bơm thêm các key tiếng Anh và convert các giá trị đặc biệt để engine đọc được."""
    enriched = dict(profile)

    # Bơm key tiếng Anh song song với tiếng Việt
    for db_key, form_key in DB_TO_FORM.items():
        if db_key in enriched and form_key not in enriched:
            enriched[form_key] = enriched[db_key]

    # hutThuoc → smoking_status
    if "hutThuoc" in enriched:
        mapping = {"Đang hút": "current", "Đã bỏ": "former", "Không": "never",
                   "Chưa bao giờ": "never"}
        enriched["smoking_status"] = mapping.get(enriched["hutThuoc"], "never")

    # gioiTinh → gender_code (float)
    if "gioiTinh" in enriched:
        gt = enriched["gioiTinh"]
        enriched["gender_code"] = 1.0 if gt in ("Nam", "1", 1) else 2.0

    # soPhutVanDongMoiTuan → exercise (boolean float)
    if "soPhutVanDongMoiTuan" in enriched:
        try:
            enriched["exercise_flag"] = 1.0 if float(enriched["soPhutVanDongMoiTuan"]) >= 150 else 0.0
        except (ValueError, TypeError):
            enriched["exercise_flag"] = 0.0

    # uongRuouBia → alcohol (0/1 float)
    if "uongRuouBia" in enriched and "alcohol" not in enriched:
        mapping = {"Không": 0, "Thỉnh thoảng": 0, "Thường xuyên": 1, "Nhiều": 1}
        enriched["alcohol"] = float(mapping.get(enriched["uongRuouBia"], 0))

    # mucDoAnMan → sodium_intake (mg/ngày)
    # anMan → sodium_intake (mg/ngày) để model AI đọc được
    if "anMan" in enriched and "sodium_intake" not in enriched:
        mapping = {"Nhạt": 1200, "Vừa": 2000, "Mặn": 3500}
        enriched["sodium_intake"] = mapping.get(enriched["anMan"], 2000)

    # tieuDuong (bool) → diabetes_status ("yes"/"no")
    if "tieuDuong" in enriched and "diabetes_status" not in enriched:
        enriched["diabetes_status"] = "yes" if enriched["tieuDuong"] else "no"

    return enriched


def _save_form_to_profile(user_id: int, form_data: dict, db: Session):
    """Ghi ngược form_data vào hoSoSucKhoe + chiSoSucKhoe."""
    hoso_updates: dict = {}
    chiso_updates: dict = {}

    for form_key, value in form_data.items():
        if value in [None, ""]:
            continue

        # Dịch ngược giá trị đặc biệt
        if form_key == "smoking_status":
            db_key = "hutThuoc"
            value = {"current": "Đang hút", "former": "Đã bỏ", "never": "Không"}.get(value, value)
        elif form_key == "alcohol":
            # MAP NGƯỢC LẠI BẢNG CỨNG THAY VÌ LƯU VÀO EAV
            db_key = "uongRuouBia"
            value = "Thường xuyên" if str(value) in ["1", "1.0"] else "Không"
        else:
            db_key = FORM_TO_DB.get(form_key, form_key)

        if db_key in HO_SO_COLS:
            hoso_updates[db_key] = value
        else:
            chiso_updates[db_key] = value

    # Lưu hoSoSucKhoe
    if hoso_updates:
        existing = db.query(HoSoSucKhoe).filter(HoSoSucKhoe.idNguoiDung == user_id).first()
        if existing:
            for k, v in hoso_updates.items():
                setattr(existing, k, v)
        else:
            db.add(HoSoSucKhoe(idNguoiDung=user_id, **hoso_updates))

    # Lưu chiSoSucKhoe (EAV)
    for key, value in chiso_updates.items():
        str_value = ("true" if value else "false") if isinstance(value, bool) else str(value)
        existing = db.query(ChiSoSucKhoe).filter(
            ChiSoSucKhoe.idNguoiDung == user_id,
            ChiSoSucKhoe.maChiSo == key,
        ).first()
        if existing:
            existing.giaTri = str_value
        else:
            db.add(ChiSoSucKhoe(idNguoiDung=user_id, maChiSo=key, giaTri=str_value))


# ── Endpoints ─────────────────────────────────────────────────────────────────

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
    db: Session = Depends(get_db),
):
    try:
        # ── 1. Đọc hồ sơ sức khỏe từ DB ─────────────────────────────────────
        health_profile_dict = {}
        user = None

        if ten_dang_nhap:
            user = db.query(NguoiDung).filter(NguoiDung.tenDangNhap == ten_dang_nhap).first()
            if user:
                raw_profile = _load_health_profile(user.idNguoiDung, db)
                health_profile_dict = _enrich_profile(raw_profile)

        # ── 2. Hợp nhất: profile DB + form người dùng (form ưu tiên) ─────────
        unified_payload = {**health_profile_dict, **form_data}

        # ── 3. Validation chỉ trên form gốc (không validate data từ DB) ──────
        validation_engine = get_validation_engine(plugin_name)
        validation_result = validation_engine.validate_form(form_data)

        if validation_result.has_errors():
            raise HTTPException(
                status_code=400,
                detail={
                    "message": "Dữ liệu không hợp lệ",
                    "errors": [err.to_dict() for err in validation_result.errors],
                },
            )

        normalized_plugin = validation_engine.normalize_form_data(unified_payload)
        normalized_data = {**unified_payload, **normalized_plugin}

        # ── 4. Dual-engine scoring ────────────────────────────────────────────
        scoring_engine = get_scoring_engine(plugin_name)
        result = scoring_engine.calculate_risk(normalized_data)

        result["validation"] = {
            "is_valid": validation_result.is_valid,
            "warnings": [w.to_dict() for w in validation_result.warnings],
        }

        # ── 5. Lưu DB ─────────────────────────────────────────────────────────
        if user:
            # Ghi ngược form_data vào hồ sơ sức khỏe
            _save_form_to_profile(user.idNguoiDung, form_data, db)

            # Lưu lịch sử đánh giá
            lich_su = LichSuDanhGia(
                idNguoiDung=user.idNguoiDung,
                maBenh=plugin_name,
                diemRule=float(result.get("rule_based", {}).get("score", 0.0)),
                diemML=float(result.get("ai_based", {}).get("score", 0.0)),
                diemTong=float(result.get("rule_based", {}).get("score", 0.0)),
                mucNguyCo=str(result.get("rule_based", {}).get("risk_level", "low")),
                ketQuaJSON=convert_to_serializable(result),
            )
            db.add(lich_su)
            db.commit()

        return convert_to_serializable(result)

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Scoring error: {str(e)}")


@router.post("/plugins/{plugin_name}/reload")
def reload_plugin(plugin_name: str):
    try:
        plugin_loader._cache.pop(plugin_name, None)
        plugin_loader.load_plugin(plugin_name, force_reload=True)
        return {
            "status": "success",
            "message": f"Plugin '{plugin_name}' đã được reload thành công",
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/plugins/{plugin_name}/compare-risk")
def compare_risk(
    plugin_name: str,
    scenarios: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
):
    """
    So sánh nhiều kịch bản nguy cơ cho cùng 1 plugin.

    Body:
    {
        "current":   { ...form_data kịch bản hiện tại... },
        "improved":  { ...form_data kịch bản cải thiện... }
    }

    Response:
    {
        "current":  { "score": 45.0, "risk_level": "medium" },
        "improved": { "score": 22.0, "risk_level": "low", "score_difference": 23.0, "improvement_percentage": 51.1 }
    }
    """
    try:
        metadata = get_plugin_metadata(plugin_name)
        validation_engine = ValidationEngine(metadata)
        scoring_engine = get_scoring_engine(plugin_name)

        results = {}
        for scenario_name, scenario_data in scenarios.items():
            try:
                normalized = validation_engine.normalize_form_data(scenario_data)
                unified = {**scenario_data, **normalized}
                risk = scoring_engine.calculate_risk(unified)
                results[scenario_name] = {
                    "score":      float(risk.get("rule_based", {}).get("score", 0.0)),
                    "risk_level": risk.get("rule_based", {}).get("risk_level", "unknown"),
                }
            except Exception as e:
                results[scenario_name] = {"error": str(e)}

        # Tính chênh lệch so với kịch bản "current" nếu có
        if "current" in results and not results["current"].get("error"):
            current_score = results["current"]["score"]
            for name, sc in results.items():
                if name != "current" and not sc.get("error"):
                    diff = round(current_score - sc["score"], 2)
                    sc["score_difference"] = diff
                    sc["improvement_percentage"] = round(
                        (diff / current_score * 100) if current_score > 0 else 0.0, 1
                    )

        return {"plugin": plugin_name, "scenarios": results}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Compare risk error: {str(e)}")