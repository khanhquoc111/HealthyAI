from fastapi import APIRouter, HTTPException, Query
from .plugin_loader import PluginLoader
from .validation_engine import ValidationEngine
from .risk_stratification_engine import RiskStratificationEngine

router = APIRouter()
plugin_loader = PluginLoader()

@router.get("/plugins")
async def list_plugins():
    return {"plugins": plugin_loader.list_plugins()}

@router.get("/plugins/{plugin_name}")
async def get_plugin(plugin_name: str):
    return plugin_loader.load_plugin(plugin_name)

@router.post("/plugins/{plugin_name}/score")
async def score_plugin(
    plugin_name: str, 
    form_data: dict,
    ten_dang_nhap: str = Query(None)
):
    try:
        metadata = plugin_loader.load_plugin(plugin_name)
        validation = ValidationEngine(metadata)
        
        # Validate
        val_result = validation.validate_form(form_data)
        if val_result.has_errors():
            raise HTTPException(400, {"errors": [e.to_dict() for e in val_result.errors]})

        normalized = validation.normalize_form_data(form_data)

        # Tính risk (đã có merge Health Profile bên trong)
        engine = RiskStratificationEngine(metadata)
        result = engine.calculate_risk(normalized, None)  # Health profile sẽ tự fetch bên trong nếu cần

        return result

    except Exception as e:
        raise HTTPException(500, str(e))