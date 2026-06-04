import json
import time
from pathlib import Path
from typing import Dict, Any

from fastapi import APIRouter, HTTPException

from app.plugin_loader import PluginLoader
from app.validation_engine import ValidationEngine
from app.risk_stratification_engine import RiskStratificationEngine

router = APIRouter()

# Initialize Plugin Loader
plugin_loader = PluginLoader()


# =========================
# PLUGIN LOADING
# =========================
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


# =========================
# ROUTES
# =========================

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
def score_plugin_form(plugin_name: str, form_data: dict):
    """
    Pipeline chuẩn: VALIDATION → NORMALIZATION → SCORING + EXPLANATION
    """
    try:
        # === 1. VALIDATION TRƯỚC KHI TÍNH ĐIỂM ===
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

        # === 2. NORMALIZE DATA ===
        normalized_data = validation_engine.normalize_form_data(form_data)

        # === 3. CALCULATE RISK + EXPLANATION ===
        scoring_engine = get_scoring_engine(plugin_name)
        result = scoring_engine.calculate_risk(normalized_data)

        # Thêm thông tin validation vào response
        result["validation"] = {
            "is_valid": validation_result.is_valid,
            "warnings": [w.to_dict() for w in validation_result.warnings]
        }

        return result

    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scoring error: {str(e)}")


# =========================
# HOT RELOAD
# =========================
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