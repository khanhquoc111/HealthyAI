# backend/app/risk_stratification_engine.py
"""
RiskStratificationEngine - Đánh giá rủi ro dựa trên rule từ metadata plugin
Hoạt động 100% generic, không hard-code logic bệnh cụ thể nào
"""

from typing import Any, Dict, List, Optional, Tuple
import logging
from app.condition_evaluator import ConditionEvaluator

logger = logging.getLogger(__name__)


class RiskStratificationEngine:
    """
    Engine đánh giá rủi ro - hoàn toàn dựa vào metadata plugin
    
    Quy trình:
    1. Lấy baseline score từ baseline_mapping (điều kiện nào match, lấy score đó)
    2. Áp dụng risk_modifiers (nhân/cộng điểm)
    3. Áp dụng protective_factors (giảm điểm)
    4. Áp dụng interactions (nhân lên nếu có)
    5. Chuẩn hóa thành 0-100
    6. Map thành risk_level theo thresholds
    """
    
    def __init__(self, risk_config: Dict[str, Any]):
        """
        Args:
            risk_config: Config từ metadata.json -> risk_config
        """
        self.risk_config = risk_config
        self.baseline_mapping = risk_config.get("baseline_mapping", [])
        self.risk_modifiers = risk_config.get("risk_modifiers", [])
        self.protective_factors = risk_config.get("protective_factors", [])
        self.interactions = risk_config.get("interactions", [])
        self.thresholds = risk_config.get("thresholds", [])
        self.computed_fields = risk_config.get("computed_fields", [])
    
    def evaluate(self, form_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Đánh giá rủi ro cho người dùng dựa trên dữ liệu nhập + baseline + modifiers
        
        Returns:
            {
                "final_score": float (0-100),
                "risk_level": str (low/medium/high),
                "baseline_score": float,
                "modifiers_effect": float,
                "protective_effect": float,
                "interaction_multiplier": float,
                "breakdown": {
                    "baseline": {...},
                    "applied_modifiers": [...],
                    "applied_protective": [...],
                    "applied_interactions": [...]
                }
            }
        """
        
        # [STEP 1] Tính toán computed fields
        enriched_data = self._compute_fields(form_data)
        
        # [STEP 2] Xác định baseline score
        baseline_result = self._get_baseline_score(enriched_data)
        baseline_score = baseline_result["score"]
        baseline_stage = baseline_result.get("stage_name", "unknown")
        
        # [STEP 3] Áp dụng risk modifiers
        current_score = baseline_score
        applied_modifiers = []
        modifier_effect = 0.0
        
        for modifier in self.risk_modifiers:
            if self._check_condition(modifier.get("condition"), enriched_data):
                mod_result = self._apply_modifier(current_score, modifier)
                applied_modifiers.append({
                    "id": modifier.get("id", "unknown"),
                    "description": modifier.get("description", ""),
                    "value": modifier.get("value", 1.0),
                    "effect_type": modifier.get("effect_type", "multiplicative"),
                    "effect_on_score": mod_result["effect"]
                })
                current_score = mod_result["new_score"]
                modifier_effect += mod_result["effect"]
        
        # [STEP 4] Áp dụng protective factors
        applied_protective = []
        protective_effect = 0.0
        
        for prot in self.protective_factors:
            if self._check_condition(prot.get("condition"), enriched_data):
                prot_result = self._apply_modifier(current_score, prot, is_protective=True)
                applied_protective.append({
                    "id": prot.get("id", "unknown"),
                    "description": prot.get("description", ""),
                    "value": prot.get("value", 1.0),
                    "effect_type": prot.get("effect_type", "multiplicative"),
                    "effect_on_score": prot_result["effect"]
                })
                current_score = prot_result["new_score"]
                protective_effect += prot_result["effect"]
        
        # [STEP 5] Áp dụng interactions
        interaction_multiplier = 1.0
        applied_interactions = []
        
        for interaction in self.interactions:
            if self._check_condition(interaction.get("condition"), enriched_data):
                interaction_multiplier = interaction.get("interaction_multiplier", 1.0)
                applied_interactions.append({
                    "id": interaction.get("id", "unknown"),
                    "description": interaction.get("description", ""),
                    "multiplier": interaction_multiplier
                })
        
        current_score = current_score * interaction_multiplier
        
        # [STEP 6] Chuẩn hóa điểm (0-100)
        final_score = max(0, min(100, current_score))
        
        # [STEP 7] Ánh xạ thành risk level
        risk_level = self._map_to_risk_level(final_score)
        
        return {
            "final_score": round(final_score, 2),
            "risk_level": risk_level,
            "baseline_score": baseline_score,
            "baseline_stage": baseline_stage,
            "modifiers_effect": round(modifier_effect, 2),
            "protective_effect": round(protective_effect, 2),
            "interaction_multiplier": round(interaction_multiplier, 2),
            "breakdown": {
                "baseline": {
                    "score": baseline_score,
                    "stage": baseline_stage
                },
                "applied_modifiers": applied_modifiers,
                "applied_protective": applied_protective,
                "applied_interactions": applied_interactions
            }
        }
    
    def _compute_fields(self, form_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Tính toán các field được định nghĩa trong computed_fields
        
        Ví dụ: 
        {
            "key": "bmi",
            "formula": "weight / ((height / 100) ** 2)",
            "dependencies": ["weight", "height"]
        }
        """
        enriched = form_data.copy()
        
        for computed in self.computed_fields:
            key = computed.get("key")
            formula = computed.get("formula", "")
            dependencies = computed.get("dependencies", [])
            
            try:
                # Kiểm tra tất cả dependencies có giá trị không
                all_available = all(dep in enriched and enriched[dep] is not None for dep in dependencies)
                
                if all_available:
                    # Tính toán giá trị
                    result = eval(formula, {"__builtins__": {}}, enriched)
                    enriched[key] = float(result)
                    logger.debug(f"Computed {key} = {enriched[key]}")
            except Exception as e:
                logger.warning(f"Cannot compute field {key}: {e}")
        
        return enriched
    
    def _get_baseline_score(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Tìm baseline stage nào match với dữ liệu
        Trả về score của stage đó
        
        Nếu nhiều stage match, lấy cái có priority cao nhất
        Nếu không có stage nào match, trả về 50 (điểm mặc định)
        """
        matching_stages = []
        
        for stage in self.baseline_mapping:
            if self._check_condition(stage.get("condition"), data):
                matching_stages.append({
                    "name": stage.get("name", "unknown"),
                    "score": stage.get("score", 50),
                    "priority": stage.get("priority", 0)
                })
        
        if not matching_stages:
            return {
                "score": 50,
                "stage_name": "default",
                "note": "No baseline stage matched, using default score"
            }
        
        # Sắp xếp theo priority (cao nhất trước)
        matching_stages.sort(key=lambda x: x["priority"], reverse=True)
        selected = matching_stages[0]
        
        return {
            "score": selected["score"],
            "stage_name": selected["name"],
            "matching_count": len(matching_stages)
        }
    
    def _apply_modifier(
        self, 
        current_score: float, 
        modifier: Dict[str, Any],
        is_protective: bool = False
    ) -> Dict[str, float]:
        """
        Áp dụng một modifier (risk hoặc protective) lên điểm hiện tại
        
        effect_type:
        - additive: score = score + value
        - multiplicative: score = score * value
        - divisive: score = score / value
        """
        effect_type = modifier.get("effect_type", "multiplicative")
        value = modifier.get("value", 1.0)
        
        new_score = current_score
        effect = 0.0
        
        if effect_type == "additive":
            effect = -value if is_protective else value
            new_score = current_score + effect
        elif effect_type == "multiplicative":
            multiplier = 1.0 / value if is_protective else value
            effect = current_score * (multiplier - 1)
            new_score = current_score * multiplier
        elif effect_type == "divisive":
            effect = current_score * (1 - 1/value) if is_protective else current_score * (value - 1)
            new_score = current_score / value if is_protective else current_score * value
        
        return {
            "new_score": max(0, new_score),
            "effect": effect
        }
    
    def _check_condition(self, condition: Any, data: Dict[str, Any]) -> bool:
        """
        Kiểm tra điều kiện sử dụng ConditionEvaluator
        """
        if condition is None:
            return True
        
        try:
            return ConditionEvaluator.evaluate(condition, data)
        except Exception as e:
            logger.error(f"Error checking condition: {e}")
            return False
    
    def _map_to_risk_level(self, score: float) -> str:
        """
        Ánh xạ điểm thành risk level dựa trên thresholds
        
        thresholds format:
        [
            {"threshold": 30, "level": "low"},
            {"threshold": 70, "level": "medium"},
            {"threshold": 100, "level": "high"}
        ]
        
        Logic: score < 30 -> low, 30-70 -> medium, >= 70 -> high
        """
        # Sắp xếp thresholds theo giá trị tăng dần
        sorted_thresholds = sorted(self.thresholds, key=lambda x: x.get("threshold", 0))
        
        for threshold_config in sorted_thresholds:
            threshold_value = threshold_config.get("threshold", 0)
            if score < threshold_value:
                return threshold_config.get("level", "low")
        
        # Nếu vượt qua tất cả thresholds, lấy level cao nhất
        return sorted_thresholds[-1].get("level", "high") if sorted_thresholds else "medium"