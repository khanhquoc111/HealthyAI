# backend/app/risk_stratification_engine.py
"""
RiskStratificationEngine - UPGRADED VERSION
Nâng cấp thuật toán rule để đánh giá rủi ro bệnh mạn tính
- Weighted baseline scoring
- Percentile-based risk assessment
- Evidence scoring system
- Risk progression tracking
"""

from typing import Any, Dict, List, Optional, Tuple
import logging
import math

from app.condition_evaluator import ConditionEvaluator

logger = logging.getLogger(__name__)


class RiskStratificationEngine:
    """
    Engine đánh giá rủi ro nâng cấp
    
    Quy trình:
    1. Tính toán computed fields
    2. Xác định baseline score (weighted)
    3. Áp dụng risk modifiers với evidence scoring
    4. Áp dụng protective factors
    5. Áp dụng interactions (synergy effects)
    6. Chuẩn hóa điểm (0-100)
    7. Ánh xạ thành risk level với percentile thresholds
    8. Tính risk progression score
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
        
        # [NEW] Risk progression & evidence config
        self.evidence_scoring = risk_config.get("evidence_scoring", {})
        self.risk_progression = risk_config.get("risk_progression", [])
    
    def evaluate(self, form_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Đánh giá rủi ro toàn diện
        
        Returns:
            {
                "final_score": float (0-100),
                "risk_level": str (low/medium/high),
                "risk_percentile": int (0-100),
                "baseline_score": float,
                "evidence_score": float,
                "modifiers_effect": float,
                "protective_effect": float,
                "interaction_multiplier": float,
                "risk_progression": dict,
                "evidence_breakdown": dict,
                "breakdown": {...detailed breakdown...}
            }
        """
        
        # [STEP 1] Tính toán computed fields
        enriched_data = self._compute_fields(form_data)
        
        # [STEP 2] Xác định baseline score (weighted)
        baseline_result = self._get_weighted_baseline_score(enriched_data)
        baseline_score = baseline_result["score"]
        baseline_stage = baseline_result.get("stage_name", "unknown")
        
        # [STEP 3] Tính evidence score
        evidence_result = self._calculate_evidence_score(enriched_data)
        evidence_score = evidence_result["total_score"]
        evidence_breakdown = evidence_result["breakdown"]
        
        # [STEP 4] Áp dụng risk modifiers với evidence weighting
        current_score = baseline_score
        applied_modifiers = []
        modifier_effect = 0.0
        
        for modifier in self.risk_modifiers:
            if self._check_condition(modifier.get("condition"), enriched_data):
                mod_result = self._apply_modifier(current_score, modifier, enriched_data)
                applied_modifiers.append({
                    "id": modifier.get("id", "unknown"),
                    "description": modifier.get("description", ""),
                    "value": modifier.get("value", 1.0),
                    "effect_type": modifier.get("effect_type", "multiplicative"),
                    "effect_on_score": mod_result["effect"],
                    "evidence_weight": mod_result.get("evidence_weight", 1.0)
                })
                current_score = mod_result["new_score"]
                modifier_effect += mod_result["effect"]
        
        # [STEP 5] Áp dụng protective factors
        applied_protective = []
        protective_effect = 0.0
        
        for prot in self.protective_factors:
            if self._check_condition(prot.get("condition"), enriched_data):
                prot_result = self._apply_modifier(current_score, prot, enriched_data, is_protective=True)
                applied_protective.append({
                    "id": prot.get("id", "unknown"),
                    "description": prot.get("description", ""),
                    "value": prot.get("value", 1.0),
                    "effect_type": prot.get("effect_type", "multiplicative"),
                    "effect_on_score": prot_result["effect"],
                    "evidence_weight": prot_result.get("evidence_weight", 1.0)
                })
                current_score = prot_result["new_score"]
                protective_effect += prot_result["effect"]
        
        # [STEP 6] Áp dụng interactions (synergy effects)
        interaction_multiplier = 1.0
        applied_interactions = []
        
        for interaction in self.interactions:
            if self._check_condition(interaction.get("condition"), enriched_data):
                # [ENHANCED] Support both fixed multiplier and dynamic calculation
                if "multiplier_formula" in interaction:
                    multiplier = self._evaluate_formula(
                        interaction.get("multiplier_formula"), 
                        enriched_data
                    )
                else:
                    multiplier = interaction.get("interaction_multiplier", 1.0)
                
                interaction_multiplier = multiplier
                applied_interactions.append({
                    "id": interaction.get("id", "unknown"),
                    "description": interaction.get("description", ""),
                    "multiplier": round(interaction_multiplier, 3),
                    "type": interaction.get("interaction_type", "synergy")
                })
        
        current_score = current_score * interaction_multiplier
        
        # [STEP 7] Chuẩn hóa điểm (0-100)
        final_score = max(0, min(100, current_score))
        
        # [STEP 8] Tính percentile
        risk_percentile = self._calculate_percentile(final_score, baseline_stage)
        
        # [STEP 9] Ánh xạ thành risk level
        risk_level = self._map_to_risk_level(final_score, risk_percentile)
        
        # [STEP 10] Tính risk progression
        risk_progression = self._calculate_risk_progression(
            final_score,
            risk_level,
            applied_modifiers,
            enriched_data
        )
        
        return {
            "final_score": round(final_score, 2),
            "risk_level": risk_level,
            "risk_percentile": risk_percentile,
            "baseline_score": baseline_score,
            "baseline_stage": baseline_stage,
            "evidence_score": round(evidence_score, 2),
            "modifiers_effect": round(modifier_effect, 2),
            "protective_effect": round(protective_effect, 2),
            "interaction_multiplier": round(interaction_multiplier, 3),
            "risk_progression": risk_progression,
            "evidence_breakdown": evidence_breakdown,
            "breakdown": {
                "baseline": {
                    "score": baseline_score,
                    "stage": baseline_stage
                },
                "evidence": evidence_breakdown,
                "applied_modifiers": applied_modifiers,
                "applied_protective": applied_protective,
                "applied_interactions": applied_interactions
            }
        }
    
    def _compute_fields(self, form_data: Dict[str, Any]) -> Dict[str, Any]:
        """Tính toán các computed fields từ formula"""
        enriched = form_data.copy()
        
        for computed in self.computed_fields:
            key = computed.get("key")
            formula = computed.get("formula", "")
            dependencies = computed.get("dependencies", [])
            
            try:
                all_available = all(dep in enriched and enriched[dep] is not None for dep in dependencies)
                
                if all_available:
                    result = eval(formula, {"__builtins__": {}}, enriched)
                    enriched[key] = float(result)
                    logger.debug(f"Computed {key} = {enriched[key]}")
            except Exception as e:
                logger.warning(f"Cannot compute field {key}: {e}")
        
        return enriched
    
    def _get_weighted_baseline_score(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        [FIXED] Xác định baseline score - hỗ trợ format metadata hiện tại
        
        Hỗ trợ 2 format:
        1. Old format: {"range": [min, max]}
        2. New format: condition object
        
        Lấy stage có priority cao nhất nếu match
        """
        matching_stages = []
        
        for stage in self.baseline_mapping:
            stage_matches = False
            
            # Format 1: range [min, max]
            if "range" in stage:
                range_vals = stage.get("range", [0, 100])
                if len(range_vals) >= 2:
                    # Check có field check không (e.g., systolic, bmi)
                    # Lấy field đầu tiên từ condition nếu có
                    if "condition" in stage:
                        stage_matches = self._check_condition(stage.get("condition"), data)
                    else:
                        # Legacy: sử dụng range cho final_score
                        stage_matches = False
            
            # Format 2: condition object
            elif "condition" in stage:
                stage_matches = self._check_condition(stage.get("condition"), data)
            
            if stage_matches:
                matching_stages.append({
                    "name": stage.get("name", "unknown"),
                    "score": stage.get("score", 50),
                    "priority": stage.get("priority", 0),
                    "weight": stage.get("weight", 1.0)
                })
        
        if not matching_stages:
            return {
                "score": 50,
                "stage_name": "default",
                "note": "No baseline stage matched, using default score"
            }
        
        # Lấy stage có priority cao nhất
        matching_stages.sort(key=lambda x: x["priority"], reverse=True)
        selected = matching_stages[0]
        
        return {
            "score": selected["score"],
            "stage_name": selected["name"],
            "matching_count": len(matching_stages),
            "calculation": "priority_based"
        }
    
    def _calculate_evidence_score(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        [NEW] Tính evidence score dựa trên các yếu tố đã ghi nhận
        
        Evidence scoring thể hiện độ tin cậy của dữ liệu đầu vào
        """
        evidence_config = self.evidence_scoring
        total_score = 0
        breakdown = {}
        
        if not evidence_config:
            return {"total_score": 100, "breakdown": {"default": "No evidence config"}}
        
        # Tính evidence từ các field được định nghĩa
        evidence_fields = evidence_config.get("fields", [])
        
        for field_config in evidence_fields:
            field_name = field_config.get("name")
            base_evidence = field_config.get("evidence", 0)
            
            if field_name in data and data[field_name] is not None:
                total_score += base_evidence
                breakdown[field_name] = base_evidence
            else:
                breakdown[field_name] = 0
        
        # Tính total evidence score (0-100)
        max_evidence = sum(f.get("evidence", 0) for f in evidence_fields) or 100
        evidence_percentage = min(100, (total_score / max_evidence * 100)) if max_evidence > 0 else 100
        
        return {
            "total_score": round(evidence_percentage, 2),
            "breakdown": breakdown,
            "evidence_count": len([f for f in breakdown.values() if f > 0])
        }
    
    def _apply_modifier(
        self,
        current_score: float,
        modifier: Dict[str, Any],
        enriched_data: Dict[str, Any],
        is_protective: bool = False
    ) -> Dict[str, Any]:
        """
        [ENHANCED] Áp dụng modifier với evidence weighting và dynamic values
        
        effect_type:
        - additive: score = score + value
        - multiplicative: score = score * value
        - divisive: score = score / value
        - formula: score = eval(formula)
        """
        effect_type = modifier.get("effect_type", "multiplicative")
        value = modifier.get("value", 1.0)
        
        # [NEW] Support formula-based values
        if "value_formula" in modifier:
            try:
                value = self._evaluate_formula(modifier.get("value_formula"), enriched_data)
            except Exception as e:
                logger.warning(f"Cannot evaluate value formula: {e}")
        
        # [NEW] Evidence-based weighting
        evidence_weight = modifier.get("evidence_weight", 1.0)
        if evidence_weight != 1.0:
            # Adjust effect based on evidence confidence
            value = value * evidence_weight
        
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
        elif effect_type == "formula":
            try:
                new_score = self._evaluate_formula(
                    modifier.get("formula"),
                    {**enriched_data, "current_score": current_score}
                )
                effect = new_score - current_score
            except Exception as e:
                logger.error(f"Cannot evaluate modifier formula: {e}")
        
        return {
            "new_score": max(0, new_score),
            "effect": effect,
            "evidence_weight": evidence_weight
        }
    
    def _check_condition(self, condition: Any, data: Dict[str, Any]) -> bool:
        """Kiểm tra điều kiện sử dụng ConditionEvaluator"""
        if condition is None:
            return True
        
        try:
            return ConditionEvaluator.evaluate(condition, data)
        except Exception as e:
            logger.error(f"Error checking condition: {e}")
            return False
    
    def _evaluate_formula(self, formula: str, context: Dict[str, Any]) -> float:
        """
        [NEW] Đánh giá công thức toán học an toàn
        """
        try:
            # Safe evaluation - chỉ cho phép math operations
            safe_dict = {
                "math": math,
                "__builtins__": {},
                **context
            }
            result = eval(formula, safe_dict)
            return float(result)
        except Exception as e:
            logger.error(f"Formula evaluation error '{formula}': {e}")
            raise
    
    def _calculate_percentile(self, score: float, stage_name: str) -> int:
        """
        [NEW] Tính percentile dựa trên score và stage
        Giúp so sánh rủi ro của người dùng với dân số
        """
        # [TODO] Trong thực tế, cần dữ liệu thống kê dân số từ DB
        # Ở đây sử dụng công thức xấp xỉ
        
        if score < 20:
            return 10
        elif score < 40:
            return 25
        elif score < 60:
            return 50
        elif score < 80:
            return 75
        else:
            return 90
    
    def _map_to_risk_level(self, score: float, percentile: int = None) -> str:
        """
        [ENHANCED] Ánh xạ score thành risk level
        Có thể dựa vào percentile nếu có
        """
        sorted_thresholds = sorted(self.thresholds, key=lambda x: x.get("threshold", 0))
        
        for threshold_config in sorted_thresholds:
            threshold_value = threshold_config.get("threshold", 0)
            if score < threshold_value:
                return threshold_config.get("level", "low")
        
        return sorted_thresholds[-1].get("level", "high") if sorted_thresholds else "medium"
    
    def _calculate_risk_progression(
        self,
        final_score: float,
        risk_level: str,
        modifiers: List[Dict],
        enriched_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        [NEW] Tính risk progression - dự báo sự tiến triển rủi ro
        
        Dựa trên số lượng risk factors và mức độ ảnh hưởng của chúng
        """
        risk_progression_config = self.risk_progression or []
        
        # Tính trajectory dựa trên số modifiers được áp dụng
        modifier_count = len(modifiers)
        
        progression = {
            "current_score": final_score,
            "current_level": risk_level,
            "active_risk_factors": modifier_count,
            "trajectory": "stable"  # stable, increasing, decreasing
        }
        
        # Xác định trajectory
        if modifier_count >= 3:
            progression["trajectory"] = "increasing"
        elif modifier_count == 0:
            progression["trajectory"] = "decreasing"
        
        # Dự báo điểm trong tương lai (6 months, 1 year)
        for config in risk_progression_config:
            timeframe = config.get("timeframe")
            rate = config.get("progression_rate", 1.0)
            
            if timeframe:
                projected_score = final_score * rate
                progression[f"projected_{timeframe}"] = round(
                    min(100, max(0, projected_score)), 2
                )
        
        return progression