# backend/app/risk_stratification_engine.py
"""
RiskStratificationEngine - FIXED VERSION
BUG FIX CHÍNH:
  1. __init__ vẫn nhận risk_config (đúng), nhưng caller (plugin_api) đã được sửa
     để truyền plugin_metadata["risk_config"] sau khi đã normalize đúng.
  2. Interaction multiplier: tích lũy (nhân dồn) tất cả interaction match,
     thay vì chỉ lấy cái cuối cùng (ghi đè biến interaction_multiplier).
  3. _get_weighted_baseline_score: log rõ ràng khi không có stage nào match.
"""

from typing import Any, Dict, List, Optional
import logging
import math

from app.condition_evaluator import ConditionEvaluator

logger = logging.getLogger(__name__)


class RiskStratificationEngine:
    """
    Engine đánh giá rủi ro.

    Quy trình:
    1. Tính computed fields
    2. Xác định baseline score (priority-based)
    3. Áp dụng risk modifiers (multiplicative / additive / divisive)
    4. Áp dụng protective factors
    5. Áp dụng interactions (tích lũy tất cả match)
    6. Clamp [0, 100]
    7. Map sang risk level
    """

    def __init__(self, risk_config: Dict[str, Any]):
        """
        Args:
            risk_config: plugin_metadata["risk_config"]
        """
        self.risk_config = risk_config
        self.baseline_mapping = risk_config.get("baseline_mapping", [])
        self.risk_modifiers = risk_config.get("risk_modifiers", [])
        self.protective_factors = risk_config.get("protective_factors", [])
        self.interactions = risk_config.get("interactions", [])
        self.thresholds = risk_config.get("thresholds", [])
        self.computed_fields = risk_config.get("computed_fields", [])
        self.evidence_scoring = risk_config.get("evidence_scoring", {})
        self.risk_progression_config = risk_config.get("risk_progression", [])

    # ──────────────────────────────────────────────────────────────────────────
    # PUBLIC
    # ──────────────────────────────────────────────────────────────────────────

    def evaluate(self, form_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Đánh giá rủi ro toàn diện.

        Returns dict với final_score, risk_level, breakdown, ...
        """
        # Bước 1: computed fields
        enriched = self._compute_fields(form_data)

        # Bước 2: baseline score
        baseline_result = self._get_weighted_baseline_score(enriched)
        baseline_score: float = baseline_result["score"]
        baseline_stage: str = baseline_result.get("stage_name", "unknown")

        # Bước 3: evidence score (informational)
        evidence_result = self._calculate_evidence_score(enriched)
        evidence_score = evidence_result["total_score"]
        evidence_breakdown = evidence_result["breakdown"]

        # Bước 4: risk modifiers
        current_score = baseline_score
        applied_modifiers: List[Dict] = []
        modifier_effect = 0.0

        for modifier in self.risk_modifiers:
            if self._check_condition(modifier.get("condition"), enriched):
                mod_result = self._apply_modifier(current_score, modifier, enriched)
                effect = mod_result["effect"]
                applied_modifiers.append({
                    "id": modifier.get("id", "unknown"),
                    "description": modifier.get("description", ""),
                    "value": modifier.get("value", 1.0),
                    "effect_type": modifier.get("effect_type", "multiplicative"),
                    "effect_on_score": round(effect, 3),
                    "note": modifier.get("note", ""),
                })
                current_score = mod_result["new_score"]
                modifier_effect += effect

        # Bước 5: protective factors
        applied_protective: List[Dict] = []
        protective_effect = 0.0

        for prot in self.protective_factors:
            if self._check_condition(prot.get("condition"), enriched):
                prot_result = self._apply_modifier(current_score, prot, enriched, is_protective=True)
                effect = prot_result["effect"]
                applied_protective.append({
                    "id": prot.get("id", "unknown"),
                    "description": prot.get("description", ""),
                    "value": prot.get("value", 1.0),
                    "effect_type": prot.get("effect_type", "divisive"),
                    "effect_on_score": round(effect, 3),
                    "note": prot.get("note", ""),
                })
                current_score = prot_result["new_score"]
                protective_effect += effect

        # Bước 6: interactions - [FIX] nhân DỒN tất cả multiplier match
        combined_interaction_multiplier = 1.0
        applied_interactions: List[Dict] = []

        for interaction in self.interactions:
            if self._check_condition(interaction.get("condition"), enriched):
                multiplier = interaction.get("interaction_multiplier", 1.0)
                combined_interaction_multiplier *= multiplier        # tích lũy
                applied_interactions.append({
                    "id": interaction.get("id", "unknown"),
                    "description": interaction.get("description", ""),
                    "multiplier": round(multiplier, 3),
                    "type": interaction.get("interaction_type", "synergy"),
                })

        current_score = current_score * combined_interaction_multiplier

        # Bước 7: clamp
        final_score = max(0.0, min(100.0, current_score))

        # Bước 8: risk level
        risk_level = self._map_to_risk_level(final_score)

        # Bước 9: percentile (xấp xỉ)
        risk_percentile = self._calculate_percentile(final_score)

        # Bước 10: progression
        risk_progression = self._calculate_risk_progression(
            final_score, risk_level, applied_modifiers, enriched
        )

        return {
            "final_score": round(final_score, 2),
            "risk_level": risk_level,
            "risk_percentile": risk_percentile,
            "baseline_score": round(baseline_score, 2),
            "baseline_stage": baseline_stage,
            "evidence_score": round(evidence_score, 2),
            "modifiers_effect": round(modifier_effect, 2),
            "protective_effect": round(protective_effect, 2),
            "interaction_multiplier": round(combined_interaction_multiplier, 3),
            "risk_progression": risk_progression,
            "evidence_breakdown": evidence_breakdown,
            "breakdown": {
                "baseline": {
                    "score": round(baseline_score, 2),
                    "stage": baseline_stage,
                },
                "evidence": evidence_breakdown,
                "applied_modifiers": applied_modifiers,
                "applied_protective": applied_protective,
                "applied_interactions": applied_interactions,
            },
        }

    # ──────────────────────────────────────────────────────────────────────────
    # PRIVATE
    # ──────────────────────────────────────────────────────────────────────────

    def _compute_fields(self, form_data: Dict[str, Any]) -> Dict[str, Any]:
        enriched = form_data.copy()
        for computed in self.computed_fields:
            key = computed.get("key")
            formula = computed.get("formula", "")
            dependencies = computed.get("dependencies", [])
            try:
                if all(dep in enriched and enriched[dep] is not None for dep in dependencies):
                    result = eval(formula, {"__builtins__": {}}, enriched)  # noqa: S307
                    enriched[key] = float(result)
            except Exception as e:
                logger.warning(f"Cannot compute field {key}: {e}")
        return enriched

    def _get_weighted_baseline_score(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Chọn baseline stage có priority cao nhất trong số các stage match điều kiện.
        Nếu không có stage nào match → default 50.
        """
        matching: List[Dict] = []

        for stage in self.baseline_mapping:
            if "condition" in stage:
                if self._check_condition(stage["condition"], data):
                    matching.append({
                        "name": stage.get("name", "unknown"),
                        "score": stage.get("score", 50),
                        "priority": stage.get("priority", 0),
                    })
            elif "range" in stage:
                # Legacy format (không dùng trong metadata hiện tại)
                if "condition" in stage and self._check_condition(stage["condition"], data):
                    matching.append({
                        "name": stage.get("name", "unknown"),
                        "score": stage.get("score", 50),
                        "priority": stage.get("priority", 0),
                    })

        if not matching:
            logger.warning(
                "_get_weighted_baseline_score: no stage matched data=%s – using default score 50",
                {k: v for k, v in data.items() if v is not None},
            )
            return {"score": 50.0, "stage_name": "default"}

        matching.sort(key=lambda x: x["priority"], reverse=True)
        selected = matching[0]
        return {
            "score": float(selected["score"]),
            "stage_name": selected["name"],
            "matching_count": len(matching),
        }

    def _calculate_evidence_score(self, data: Dict[str, Any]) -> Dict[str, Any]:
        evidence_config = self.evidence_scoring
        if not evidence_config:
            return {"total_score": 100, "breakdown": {}}

        total = 0
        breakdown = {}
        evidence_fields = evidence_config.get("fields", [])

        for fc in evidence_fields:
            fname = fc.get("name")
            base = fc.get("evidence", 0)
            if fname in data and data[fname] is not None:
                total += base
                breakdown[fname] = base
            else:
                breakdown[fname] = 0

        max_ev = sum(f.get("evidence", 0) for f in evidence_fields) or 100
        pct = min(100.0, total / max_ev * 100) if max_ev > 0 else 100.0

        return {
            "total_score": round(pct, 2),
            "breakdown": breakdown,
            "evidence_count": sum(1 for v in breakdown.values() if v > 0),
        }

    def _apply_modifier(
        self,
        current_score: float,
        modifier: Dict[str, Any],
        enriched_data: Dict[str, Any],
        is_protective: bool = False,
    ) -> Dict[str, Any]:
        """
        Áp dụng modifier / protective factor vào current_score.

        effect_type:
          - multiplicative : score * value  (risk) / score / value  (protective)
          - divisive       : score / value  (risk) / score * value  (protective) — đảo ngược
          - additive       : score + value  (risk) / score - value  (protective)
        """
        effect_type = modifier.get("effect_type", "multiplicative")
        value = float(modifier.get("value", 1.0))

        new_score = current_score
        effect = 0.0

        if effect_type == "additive":
            delta = -value if is_protective else value
            new_score = current_score + delta
            effect = delta

        elif effect_type == "multiplicative":
            # risk: nhân lên; protective: chia ra
            multiplier = (1.0 / value) if is_protective else value
            new_score = current_score * multiplier
            effect = new_score - current_score

        elif effect_type == "divisive":
            # divisive dùng cho protective factors: score / value (giảm)
            # risk dùng divisive hiếm, nhưng xử lý: score * value (tăng)
            if is_protective:
                new_score = current_score / value
            else:
                new_score = current_score * value
            effect = new_score - current_score

        return {
            "new_score": max(0.0, new_score),
            "effect": effect,
        }

    def _check_condition(self, condition: Any, data: Dict[str, Any]) -> bool:
        if condition is None:
            return True
        try:
            return ConditionEvaluator.evaluate(condition, data)
        except Exception as e:
            logger.error(f"Error checking condition: {e}")
            return False

    def _evaluate_formula(self, formula: str, context: Dict[str, Any]) -> float:
        safe = {"math": math, "__builtins__": {}, **context}
        return float(eval(formula, safe))  # noqa: S307

    def _calculate_percentile(self, score: float) -> int:
        if score < 20:
            return 10
        elif score < 35:
            return 25
        elif score < 60:
            return 50
        elif score < 80:
            return 75
        else:
            return 90

    def _map_to_risk_level(self, score: float) -> str:
        """
        Ánh xạ score thành risk level dựa trên thresholds trong metadata.
        Format: [{"range": [min, max], "level": "low"}, ...]
        Dùng min <= score < max, trừ range cuối (inclusive cả max).
        """
        for i, tc in enumerate(self.thresholds):
            if "range" not in tc:
                continue
            rv = tc["range"]
            if len(rv) < 2:
                continue
            lo, hi = rv[0], rv[1]
            is_last = (i == len(self.thresholds) - 1)
            if is_last:
                if lo <= score <= hi:
                    return tc.get("level", "high")
            else:
                if lo <= score < hi:
                    return tc.get("level", "low")

        # Fallback: dùng level của threshold cuối
        if self.thresholds:
            return self.thresholds[-1].get("level", "high")
        return "medium"

    def _calculate_risk_progression(
        self,
        final_score: float,
        risk_level: str,
        modifiers: List[Dict],
        enriched_data: Dict[str, Any],
    ) -> Dict[str, Any]:
        modifier_count = len(modifiers)
        trajectory = "stable"
        if modifier_count >= 3:
            trajectory = "increasing"
        elif modifier_count == 0:
            trajectory = "decreasing"

        progression = {
            "current_score": final_score,
            "current_level": risk_level,
            "active_risk_factors": modifier_count,
            "trajectory": trajectory,
        }

        for config in (self.risk_progression_config or []):
            timeframe = config.get("timeframe")
            rate = config.get("progression_rate", 1.0)
            if timeframe:
                progression[f"projected_{timeframe}"] = round(
                    min(100.0, max(0.0, final_score * rate)), 2
                )

        return progression