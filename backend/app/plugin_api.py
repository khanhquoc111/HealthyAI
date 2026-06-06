# backend/app/plugin_api.py
"""
Plugin API - METADATA-DRIVEN VERSION

Key changes:
  1. GET /diseases/{disease_id} now returns full fields including health_profile_key
     so frontend can generically map any disease fields to/from the health profile.
  2. POST /diseases/{disease_id}/assess auto-saves form_data back to the health
     profile after a successful assessment (fields that have health_profile_key).
  3. No hard-coded disease mappings anywhere in this file.
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Any, Dict, Optional
from sqlalchemy.orm import Session
import logging

from app.plugin_loader import get_plugin
from app.validation_engine import ValidationEngine
from app.risk_stratification_engine import RiskStratificationEngine
from app.explanation_engine import ExplanationEngine
from app.condition_evaluator import ConditionEvaluator

logger = logging.getLogger(__name__)
# Trong _save_form_data_to_profile

router = APIRouter(prefix="/api/plugins", tags=["plugins"])


# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

def _get_db():
    """Lazily import DB session to avoid circular imports."""
    from database.database import SessionLocal
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _save_form_data_to_profile(
    tenDangNhap: str,
    form_data: Dict[str, Any],
    plugin_fields: list,
    db: Session,
):
    """
    Persist form_data values back to the health profile tables.
    - Ưu tiên health_profile_key từ metadata
    - FALLBACK_MAP đầy đủ theo schema database hiện tại
    """
    from database.nguoi_dung import NguoiDung
    from database.hs_suckhoe import HoSoSucKhoe
    from database.cs_suckhoe import ChiSoSucKhoe

    user = db.query(NguoiDung).filter(
        NguoiDung.tenDangNhap == tenDangNhap
    ).first()
    if not user:
        logger.warning("auto-save: user %s not found", tenDangNhap)
        return

    HO_SO_COLS = {
        "tuoi", "gioiTinh", "chieuCao", "canNang", "bmi", "vongEo",
        "huyetApTamThu", "huyetApTamTruong", "hutThuoc", "uongRuouBia",
        "soPhutVanDongMoiTuan",
    }

    # FALLBACK MAP ĐẦY ĐỦ - THEO DATABASE SCHEMA
    FALLBACK_MAP = {
        # hoSoSucKhoe columns
        "age": "tuoi",
        "tuoi": "tuoi",
        "gioiTinh": "gioiTinh",
        "chieuCao": "chieuCao",
        "canNang": "canNang",
        "bmi": "bmi",
        "vongEo": "vongEo",
        "systolic": "huyetApTamThu",
        "huyetApTamThu": "huyetApTamThu",
        "diastolic": "huyetApTamTruong",
        "huyetApTamTruong": "huyetApTamTruong",
        "hutThuoc": "hutThuoc",
        "smoking_status": "hutThuoc",
        "uongRuouBia": "uongRuouBia",
        "soPhutVanDongMoiTuan": "soPhutVanDongMoiTuan",
        "exercise_minutes_per_week": "soPhutVanDongMoiTuan",

        # chiSoSucKhoe (EAV)
        "duongHuyet": "duongHuyet",
        "fasting_glucose": "duongHuyet",
        "hba1c": "hba1c",
        "cholesterol": "cholesterol",
        "total_cholesterol": "cholesterol",
        "ldl": "ldl",
        "hdl": "hdl",
        "triglyceride": "triglyceride",
        "creatinine": "creatinine",
        "acidUric": "acidUric",

        # Medical History
        "caoHuyetAp": "caoHuyetAp",
        "tieuDuong": "tieuDuong",
        "benhTimMach": "benhTimMach",
        "gout": "gout",

        # Family History
        "family_history_diabetes": "giaDinhTieuDuong",
        "family_history_hypertension": "giaDinhCaoHuyetAp",
        "family_history_cardiovascular": "giaDinhTimMach",
        "giaDinhCaoHuyetAp": "giaDinhCaoHuyetAp",
        "giaDinhTieuDuong": "giaDinhTieuDuong",
        "giaDinhTimMach": "giaDinhTimMach",
        "giaDinhGout": "giaDinhGout",
    }

    hoso_updates: Dict[str, Any] = {}
    chiso_updates: Dict[str, Any] = {}

    saved_count = 0

    for field in plugin_fields:
        plugin_key = field.get("key") or field.get("code")
        if not plugin_key or plugin_key not in form_data:
            continue

        value = form_data[plugin_key]
        if value is None or value == "":
            continue

        # --- [BỔ SUNG] REVERSE MAPPING: Dịch từ Plugin (Tiếng Anh) về DB (Tiếng Việt) ---
        if plugin_key == "smoking_status":
            smoke_map = {"never": "Chưa bao giờ", "former": "Đã bỏ", "current": "Đang hút"}
            value = smoke_map.get(value, value)
            
        if plugin_key == "alcohol_status":
            alc_map = {"never": "Chưa bao giờ", "occasional": "Thỉnh thoảng", "frequent": "Thường xuyên"}
            value = alc_map.get(value, value)

        if plugin_key in ["diabetes_status", "htn_status"]:
            # Plugin dùng "yes"/"no", Database dùng Boolean (True/False)
            if value in ["yes", "no"]:
                value = True if value == "yes" else False
        # --------------------------------------------------------------------------------

        # Ưu tiên metadata → fallback map
        hp_key = field.get("health_profile_key") or FALLBACK_MAP.get(plugin_key)

        if not hp_key:
            logger.debug(f"Skip field {plugin_key} - no mapping")
            continue

        if hp_key in HO_SO_COLS:
            hoso_updates[hp_key] = value
        else:
            chiso_updates[hp_key] = value

        saved_count += 1

    # === Save to hoSoSucKhoe ===
    if hoso_updates:
        existing = db.query(HoSoSucKhoe).filter(
            HoSoSucKhoe.idNguoiDung == user.idNguoiDung
        ).first()
        if existing:
            for k, v in hoso_updates.items():
                setattr(existing, k, v)
        else:
            db.add(HoSoSucKhoe(idNguoiDung=user.idNguoiDung, **hoso_updates))

    # === Save to chiSoSucKhoe (EAV) ===
    for key, value in chiso_updates.items():
        str_value = ("true" if value else "false") if isinstance(value, bool) else str(value)

        existing = db.query(ChiSoSucKhoe).filter(
            ChiSoSucKhoe.idNguoiDung == user.idNguoiDung,
            ChiSoSucKhoe.maChiSo == key,
        ).first()
        if existing:
            existing.giaTri = str_value
        else:
            db.add(ChiSoSucKhoe(
                idNguoiDung=user.idNguoiDung,
                maChiSo=key,
                giaTri=str_value,
            ))

    try:
        db.commit()
        logger.info(f"✅ Auto-save thành công cho user {tenDangNhap} | {saved_count} fields")
        if hoso_updates:
            logger.info(f"   hoSoSucKhoe: {list(hoso_updates.keys())}")
        if chiso_updates:
            logger.info(f"   chiSoSucKhoe: {list(chiso_updates.keys())}")
    except Exception as exc:
        db.rollback()
        logger.error(f"❌ Auto-save commit failed for user {tenDangNhap}: {exc}")


# ──────────────────────────────────────────────────────────────────────────────
# GET /diseases
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/diseases")
async def get_available_diseases():
    from app.plugin_loader import get_plugin_loader
    loader = get_plugin_loader()
    diseases = loader.list_diseases()

    disease_info = []
    for disease in diseases:
        plugin = loader.load_plugin(disease)
        if plugin:
            disease_info.append({
                "id": disease,
                "name": plugin.get("disease_info", {}).get("name", disease),
                "description": plugin.get("disease_info", {}).get("description", ""),
                "icon": plugin.get("disease_info", {}).get("icon", ""),
            })

    return {"diseases": disease_info}


# ──────────────────────────────────────────────────────────────────────────────
# GET /diseases/{disease_id}
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/diseases/{disease_id}")
async def get_disease_plugin(disease_id: str):
    """
    Returns the full plugin descriptor including every field's health_profile_key
    so the frontend can build the mapping dynamically without hard-coded logic.
    """
    plugin = get_plugin(disease_id)
    if not plugin:
        raise HTTPException(status_code=404, detail=f"Disease plugin '{disease_id}' not found")

    return {
        "id": disease_id,
        "disease_info": plugin.get("disease_info", {}),
        # Return full field objects; frontend reads health_profile_key from each field
        "fields": plugin.get("fields", []),
        "risk_config": {
            "baseline_mapping": plugin.get("risk_config", {}).get("baseline_mapping", []),
            "thresholds": plugin.get("risk_config", {}).get("thresholds", []),
        },
    }


# ──────────────────────────────────────────────────────────────────────────────
# POST /diseases/{disease_id}/assess
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/diseases/{disease_id}/assess")
async def assess_risk(
    disease_id: str,
    payload: Dict[str, Any],
    db: Session = Depends(_get_db),
):
    """
    Assess disease risk.

    Payload:
    {
        "form_data":            {...user input...},
        "health_profile":       {...optional cached profile...},
        "tenDangNhap":          "username",          // optional; enables auto-save
        "include_breakdown":    bool,
        "calculate_progression": bool
    }
    """
    plugin_metadata = get_plugin(disease_id)
    if not plugin_metadata:
        raise HTTPException(status_code=404, detail=f"Disease plugin '{disease_id}' not found")

    form_data = payload.get("form_data", {})
    health_profile = payload.get("health_profile", {})
    tenDangNhap: Optional[str] = payload.get("tenDangNhap")
    include_breakdown = payload.get("include_breakdown", True)
    calculate_progression = payload.get("calculate_progression", True)

    # Merge: form_data overrides health_profile
    unified_data = {**health_profile, **form_data}

    # Validate
    val_engine = ValidationEngine(plugin_metadata)
    val_result = val_engine.validate_form(unified_data)

    if val_result.has_errors():
        raise HTTPException(
            status_code=400,
            detail={
                "errors": [e.to_dict() for e in val_result.errors],
                "message": "Validation failed",
            },
        )

    if val_result.has_warnings():
        logger.warning(
            "Validation warnings for %s: %s",
            disease_id,
            [w.to_dict() for w in val_result.warnings],
        )

    normalized = val_engine.normalize_form_data(unified_data)

    # Risk evaluation
    risk_engine = RiskStratificationEngine(plugin_metadata.get("risk_config", {}))
    risk_result = risk_engine.evaluate(normalized)

    # Explanation
    explanation_engine = ExplanationEngine(plugin_metadata, risk_result)
    explanation = explanation_engine.generate_explanation()

    # Auto-save form_data back to health profile (only fields that have health_profile_key)
    if tenDangNhap:
        try:
            _save_form_data_to_profile(
                tenDangNhap,
                form_data,
                plugin_metadata.get("fields", []),
                db,
            )
        except Exception as exc:
            # Non-blocking: log and continue
            logger.error("Auto-save health profile failed: %s", exc)

    # Build response
    response = {
        "disease_id": disease_id,
        "final_score": risk_result.get("final_score"),
        "risk_level": risk_result.get("risk_level"),
        "risk_percentile": risk_result.get("risk_percentile"),
        "data_quality_score": val_result.data_quality_score,
        "explanation": explanation,
        "recommendations": _generate_recommendations(risk_result, plugin_metadata, normalized),
    }

    if include_breakdown:
        response["breakdown"] = risk_result.get("breakdown", {})
        response["evidence_breakdown"] = risk_result.get("evidence_breakdown", {})

    if calculate_progression:
        response["risk_progression"] = risk_result.get("risk_progression", {})

    response["quality_metrics"] = {
        "data_quality": val_result.data_quality_score,
        "confidence_level": _calculate_confidence(val_result, risk_result),
        "fields_provided": sum(1 for v in normalized.values() if v is not None),
    }

    return response


# ──────────────────────────────────────────────────────────────────────────────
# POST /diseases/{disease_id}/validate
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/diseases/{disease_id}/validate")
async def validate_form(disease_id: str, form_data: Dict[str, Any]):
    """Validate only — no risk calculation. Used for real-time field validation."""
    plugin_metadata = get_plugin(disease_id)
    if not plugin_metadata:
        raise HTTPException(status_code=404, detail=f"Disease plugin '{disease_id}' not found")

    val_engine = ValidationEngine(plugin_metadata)
    val_result = val_engine.validate_form(form_data)

    return {
        "is_valid": val_result.is_valid,
        "errors": [e.to_dict() for e in val_result.errors],
        "warnings": [w.to_dict() for w in val_result.warnings],
        "data_quality_score": val_result.data_quality_score,
    }


# ──────────────────────────────────────────────────────────────────────────────
# POST /diseases/{disease_id}/batch-assess
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/diseases/{disease_id}/batch-assess")
async def batch_assess_risk(disease_id: str, payloads: list, db: Session = Depends(_get_db)):
    results = []
    for payload in payloads:
        try:
            result = await assess_risk(disease_id, payload, db)
            results.append({"success": True, "data": result})
        except HTTPException as e:
            results.append({"success": False, "error": str(e.detail)})
        except Exception as e:
            results.append({"success": False, "error": str(e)})
    return {"results": results}


# ──────────────────────────────────────────────────────────────────────────────
# POST /diseases/{disease_id}/compare-risk
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/diseases/{disease_id}/compare-risk")
async def compare_risk_scenarios(disease_id: str, scenarios: Dict[str, Dict[str, Any]]):
    plugin_metadata = get_plugin(disease_id)
    if not plugin_metadata:
        raise HTTPException(status_code=404, detail=f"Disease plugin '{disease_id}' not found")

    val_engine = ValidationEngine(plugin_metadata)
    risk_engine = RiskStratificationEngine(plugin_metadata.get("risk_config", {}))

    comparison = {}
    for scenario_name, scenario_data in scenarios.items():
        try:
            normalized = val_engine.normalize_form_data(scenario_data)
            result = risk_engine.evaluate(normalized)
            comparison[scenario_name] = {
                "score": result.get("final_score"),
                "risk_level": result.get("risk_level"),
                "percentile": result.get("risk_percentile"),
            }
        except Exception as e:
            logger.error("Error evaluating scenario '%s': %s", scenario_name, e)
            comparison[scenario_name] = {"error": str(e)}

    if "current" in comparison and len(comparison) > 1:
        current_score = comparison["current"].get("score", 0) or 0
        for name, sc_result in comparison.items():
            if name != "current":
                other = sc_result.get("score", 0) or 0
                sc_result["score_difference"] = round(current_score - other, 2)
                sc_result["improvement_percentage"] = round(
                    ((current_score - other) / current_score * 100) if current_score > 0 else 0, 2
                )

    return {"scenarios": comparison}


# ──────────────────────────────────────────────────────────────────────────────
# GET /diseases/{disease_id}/field-metadata/{field_key}
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/diseases/{disease_id}/field-metadata/{field_key}")
async def get_field_metadata(disease_id: str, field_key: str):
    plugin = get_plugin(disease_id)
    if not plugin:
        raise HTTPException(status_code=404, detail=f"Disease plugin '{disease_id}' not found")

    fields = plugin.get("fields", [])
    field = next((f for f in fields if f.get("key") == field_key), None)
    if not field:
        raise HTTPException(status_code=404, detail=f"Field '{field_key}' not found")

    return {
        "key": field.get("key"),
        "label": field.get("label"),
        "type": field.get("type"),
        "required": field.get("required", False),
        "description": field.get("description", ""),
        "hint": field.get("hint", ""),
        "min": field.get("min"),
        "max": field.get("max"),
        "options": field.get("options", []),
        "icon": field.get("icon", ""),
        "health_profile_key": field.get("health_profile_key"),
    }


# ──────────────────────────────────────────────────────────────────────────────
# HELPERS
# ──────────────────────────────────────────────────────────────────────────────

def _generate_recommendations(
    risk_result: Dict, plugin_metadata: Dict, form_data: Dict = None
) -> list:
    recommendations = []

    context = {}
    if form_data:
        context.update(form_data)
    context["risk_level"] = risk_result.get("risk_level", "medium")
    context["final_score"] = risk_result.get("final_score", 50)

    disease_recommendations = plugin_metadata.get("recommendations", [])

    if isinstance(disease_recommendations, list):
        for rule in disease_recommendations:
            if not isinstance(rule, dict):
                continue
            condition = rule.get("condition")
            text = rule.get("text")
            try:
                if condition is None or ConditionEvaluator.evaluate(condition, context):
                    if text and text not in recommendations:
                        recommendations.append(text)
            except Exception as e:
                logger.warning("Skipping recommendation rule: %s", e)

    elif isinstance(disease_recommendations, dict):
        risk_level = risk_result.get("risk_level", "medium")
        for level_name, level_recs in disease_recommendations.items():
            if level_name == risk_level and isinstance(level_recs, list):
                for rec in level_recs:
                    if isinstance(rec, str):
                        recommendations.append(rec)
                    elif isinstance(rec, dict) and "text" in rec:
                        recommendations.append(rec["text"])

    active_modifiers = risk_result.get("breakdown", {}).get("applied_modifiers", [])
    for modifier in active_modifiers:
        rec_text = modifier.get("recommendation")
        if rec_text and rec_text not in recommendations:
            recommendations.append(rec_text)

    return recommendations[:5]


def _calculate_confidence(val_result: Any, risk_result: Dict) -> str:
    quality_score = val_result.data_quality_score
    if quality_score >= 90:
        return "high"
    elif quality_score >= 70:
        return "moderate"
    return "low"