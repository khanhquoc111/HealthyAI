# backend/app/plugin_api.py
"""
Plugin API - UPGRADED VERSION
Sử dụng các feature mới từ upgraded validation và risk engines
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any, Optional
import logging

from app.plugin_loader import get_plugin
from app.validation_engine import ValidationEngine
from app.risk_stratification_engine import RiskStratificationEngine
from app.explanation_engine import ExplanationEngine
from app.condition_evaluator import ConditionEvaluator

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/plugins", tags=["plugins"])


@router.get("/diseases")
async def get_available_diseases():
    """
    Lấy danh sách các bệnh khả dụng
    """
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
                "icon": plugin.get("disease_info", {}).get("icon", "🏥")
            })
    
    return {"diseases": disease_info}


@router.get("/diseases/{disease_id}")
async def get_disease_plugin(disease_id: str):
    """
    Lấy thông tin chi tiết plugin của một bệnh
    """
    plugin = get_plugin(disease_id)
    
    if not plugin:
        raise HTTPException(status_code=404, detail=f"Disease plugin '{disease_id}' not found")
    
    # [ENHANCED] Return simplified metadata for frontend
    return {
        "id": disease_id,
        "disease_info": plugin.get("disease_info", {}),
        "fields": plugin.get("fields", []),
        "risk_config": {
            "baseline_mapping": plugin.get("risk_config", {}).get("baseline_mapping", []),
            "thresholds": plugin.get("risk_config", {}).get("thresholds", [])
        }
    }


@router.post("/diseases/{disease_id}/assess")
async def assess_risk(disease_id: str, payload: Dict[str, Any]):
    """
    [ENHANCED] Đánh giá nguy cơ bệnh
    
    Payload:
    {
        "form_data": {...user input...},
        "health_profile": {...optional existing data...},
        "include_breakdown": bool,
        "calculate_progression": bool
    }
    """
    
    # [STEP 1] Load plugin
    plugin_metadata = get_plugin(disease_id)
    
    if not plugin_metadata:
        raise HTTPException(status_code=404, detail=f"Disease plugin '{disease_id}' not found")
    
    # [STEP 2] Extract payloads
    form_data = payload.get("form_data", {})
    health_profile = payload.get("health_profile", {})
    include_breakdown = payload.get("include_breakdown", True)
    calculate_progression = payload.get("calculate_progression", True)
    
    # [STEP 3] Merge data: form_data ưu tiên cao hơn health_profile
    unified_data = {**health_profile, **form_data}
    
    # [STEP 4] Validation & Quality Assessment
    val_engine = ValidationEngine(plugin_metadata.get("risk_config", {}))
    val_result = val_engine.validate_form(unified_data)
    
    # Return validation errors
    if val_result.has_errors():
        raise HTTPException(
            status_code=400,
            detail={
                "errors": [e.to_dict() for e in val_result.errors],
                "message": "Validation failed"
            }
        )
    
    # [NEW] Log warnings if any
    if val_result.has_warnings():
        logger.warning(f"Validation warnings for {disease_id}: {[w.to_dict() for w in val_result.warnings]}")
    
    # [STEP 5] Normalize form data
    normalized = val_engine.normalize_form_data(unified_data)
    
    # [STEP 6] Calculate risk using upgraded engine
    risk_engine = RiskStratificationEngine(plugin_metadata.get("risk_config", {}))
    risk_result = risk_engine.evaluate(normalized)
    
    # [STEP 7] Generate explanation
    explanation_engine = ExplanationEngine(plugin_metadata, risk_result)
    explanation = explanation_engine.generate_explanation()
    
    # [STEP 8] Build response
    # [FIX] Trọng yếu: Truyền thêm normalized payload vào function _generate_recommendations 
    response = {
        "disease_id": disease_id,
        "final_score": risk_result.get("final_score"),
        "risk_level": risk_result.get("risk_level"),
        "risk_percentile": risk_result.get("risk_percentile"),
        "data_quality_score": val_result.data_quality_score,
        "explanation": explanation,
        "recommendations": _generate_recommendations(risk_result, plugin_metadata, normalized),
    }
    
    # [NEW] Include detailed breakdown if requested
    if include_breakdown:
        response["breakdown"] = risk_result.get("breakdown", {})
        response["evidence_breakdown"] = risk_result.get("evidence_breakdown", {})
    
    # [NEW] Include risk progression if requested
    if calculate_progression:
        response["risk_progression"] = risk_result.get("risk_progression", {})
    
    # [NEW] Include quality metrics
    response["quality_metrics"] = {
        "data_quality": val_result.data_quality_score,
        "confidence_level": _calculate_confidence(val_result, risk_result),
        "fields_provided": sum(1 for k, v in normalized.items() if v is not None)
    }
    
    return response


@router.post("/diseases/{disease_id}/batch-assess")
async def batch_assess_risk(disease_id: str, payloads: list):
    """
    [NEW] Đánh giá nguy cơ cho nhiều người dùng cùng một lúc
    """
    results = []
    
    for payload in payloads:
        try:
            result = await assess_risk(disease_id, payload)
            results.append({
                "success": True,
                "data": result
            })
        except HTTPException as e:
            results.append({
                "success": False,
                "error": str(e.detail)
            })
        except Exception as e:
            results.append({
                "success": False,
                "error": str(e)
            })
    
    return {"results": results}


@router.post("/diseases/{disease_id}/validate")
async def validate_form(disease_id: str, form_data: Dict[str, Any]):
    """
    [NEW] Chỉ validate form data, không tính risk
    Hữu ích cho real-time validation trong frontend
    """
    plugin_metadata = get_plugin(disease_id)
    
    if not plugin_metadata:
        raise HTTPException(status_code=404, detail=f"Disease plugin '{disease_id}' not found")
    
    val_engine = ValidationEngine(plugin_metadata.get("risk_config", {}))
    val_result = val_engine.validate_form(form_data)
    
    return {
        "is_valid": val_result.is_valid,
        "errors": [e.to_dict() for e in val_result.errors],
        "warnings": [w.to_dict() for w in val_result.warnings],
        "data_quality_score": val_result.data_quality_score
    }


@router.get("/diseases/{disease_id}/field-metadata/{field_key}")
async def get_field_metadata(disease_id: str, field_key: str):
    """
    [NEW] Lấy metadata của một field cụ thể
    Hữu ích cho dynamic form rendering
    """
    plugin = get_plugin(disease_id)
    
    if not plugin:
        raise HTTPException(status_code=404, detail=f"Disease plugin '{disease_id}' not found")
    
    fields = plugin.get("fields", [])
    field = next((f for f in fields if f.get("key") == field_key), None)
    
    if not field:
        raise HTTPException(status_code=404, detail=f"Field '{field_key}' not found")
    
    # [ENHANCED] Return rich field metadata
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
        "validation_rules": field.get("validation_rules", []),
        "icon": field.get("icon", "")
    }


@router.post("/diseases/{disease_id}/compare-risk")
async def compare_risk_scenarios(disease_id: str, scenarios: Dict[str, Dict[str, Any]]):
    """
    [NEW] So sánh rủi ro giữa nhiều kịch bản
    """
    plugin_metadata = get_plugin(disease_id)
    
    if not plugin_metadata:
        raise HTTPException(status_code=404, detail=f"Disease plugin '{disease_id}' not found")
    
    risk_engine = RiskStratificationEngine(plugin_metadata.get("risk_config", {}))
    val_engine = ValidationEngine(plugin_metadata.get("risk_config", {}))
    
    comparison = {}
    
    for scenario_name, scenario_data in scenarios.items():
        try:
            normalized = val_engine.normalize_form_data(scenario_data)
            result = risk_engine.evaluate(normalized)
            
            comparison[scenario_name] = {
                "score": result.get("final_score"),
                "risk_level": result.get("risk_level"),
                "percentile": result.get("risk_percentile")
            }
        except Exception as e:
            logger.error(f"Error evaluating scenario '{scenario_name}': {e}")
            comparison[scenario_name] = {
                "error": str(e)
            }
    
    # [NEW] Calculate score differences
    if "current" in comparison and len(comparison) > 1:
        current_score = comparison["current"].get("score", 0)
        
        for scenario_name, scenario_result in comparison.items():
            if scenario_name != "current":
                other_score = scenario_result.get("score", 0)
                scenario_result["score_difference"] = round(current_score - other_score, 2)
                scenario_result["improvement_percentage"] = round(
                    ((current_score - other_score) / current_score * 100) if current_score > 0 else 0, 2
                )
    
    return {"scenarios": comparison}


def _generate_recommendations(risk_result: Dict, plugin_metadata: Dict, form_data: Dict = None) -> list:
    """
    [NEW] Phân tích list condition trong metadata json để xuất ra recommendation chính xác.
    """
    recommendations = []
    
    # Setup context đánh giá logic (đưa mọi params cần thiết vào context eval)
    context = {}
    if form_data:
        context.update(form_data)
    context["risk_level"] = risk_result.get("risk_level", "medium")
    context["final_score"] = risk_result.get("final_score", 50)
    
    # Recommendation từ JSON trả về sẽ là một Array(List)
    disease_recommendations = plugin_metadata.get("recommendations", [])
    
    if isinstance(disease_recommendations, list):
        for rule in disease_recommendations:
            if isinstance(rule, dict):
                condition = rule.get("condition")
                text = rule.get("text")
                try:
                    # Rất nhiều JSON rule sẽ null condition mặc định là apply luôn.
                    # Hoặc có condition, nếu pass evaluate sẽ apply.
                    if (condition is None) or ConditionEvaluator.evaluate(condition, context):
                        if text and text not in recommendations:
                            recommendations.append(text)
                except Exception as e:
                    logger.warning(f"Bỏ qua recommendation rule vì lỗi phân tích condition: {e}")
    elif isinstance(disease_recommendations, dict):
        # Fallback phòng trường hợp version cũ dùng object/dict để format
        risk_level = risk_result.get("risk_level", "medium")
        for level_name, level_recs in disease_recommendations.items():
            if level_name == risk_level and isinstance(level_recs, list):
                for rec in level_recs:
                    if isinstance(rec, str):
                        recommendations.append(rec)
                    elif isinstance(rec, dict) and "text" in rec:
                        recommendations.append(rec["text"])
    
    # [NEW] Add specific recommendations dựa trên các modifiers đã match (nếu có)
    active_modifiers = risk_result.get("breakdown", {}).get("applied_modifiers", [])
    for modifier in active_modifiers:
        rec_text = modifier.get("recommendation")
        if rec_text and rec_text not in recommendations:
            recommendations.append(rec_text)
            
    return recommendations[:5]  # Limit to top 5 recommendations để tránh UI bị quá tải chữ


def _calculate_confidence(val_result: Any, risk_result: Dict) -> str:
    """
    [NEW] Tính độ tin cậy của kết quả
    """
    quality_score = val_result.data_quality_score
    
    if quality_score >= 90:
        return "high"
    elif quality_score >= 70:
        return "moderate"
    else:
        return "low"