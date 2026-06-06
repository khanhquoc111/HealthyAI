# backend/app/explanation_engine.py
"""
ExplanationEngine - Sinh giải thích chi tiết cho kết quả đánh giá
Cung cấp:
- Risk factors (yếu tố tăng nguy cơ)
- Protective factors (yếu tố bảo vệ)
- Recommendations (khuyến nghị)
- Scoring breakdown (chi tiết điểm số)
"""

from typing import Any, Dict, List
import logging

logger = logging.getLogger(__name__)


class ExplanationEngine:
    """Sinh giải thích từ metadata plugin và dữ liệu nhập"""

    def __init__(self, plugin_metadata: Dict[str, Any]):
        self.metadata = plugin_metadata
        self.disease_info = plugin_metadata.get("disease_info", {})
        self.recommendations = plugin_metadata.get("recommendations", [])
        self.explanation_templates = plugin_metadata.get("explanation_templates", {})
        self.risk_config = plugin_metadata.get("risk_config", {})

    def generate_explanation(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Tạo giải thích toàn diện cho kết quả
        
        Args:
            result: {
                "risk_level": "high/medium/low",
                "final_score": float (0-100),
                "form_data": dict của dữ liệu nhập
            }
            
        Returns:
            {
                "risk_factors": [...],
                "protective_factors": [...],
                "recommendations": [...],
                "summary": "...",
                "explanation": "..."
            }
        """
        risk_level = result.get("risk_level", "medium")
        final_score = result.get("final_score", 50)
        form_data = result.get("form_data", {})

        risk_factors = self._identify_risk_factors(form_data)
        protective_factors = self._identify_protective_factors(form_data)
        recommendations = self._get_recommendations(risk_level, form_data)
        summary = self._generate_summary(risk_level, final_score, len(risk_factors))
        explanation = self._generate_explanation(risk_level, risk_factors, protective_factors)

        return {
            "risk_factors": risk_factors,
            "protective_factors": protective_factors,
            "recommendations": recommendations,
            "summary": summary,
            "explanation": explanation,
            "disease_name": self.disease_info.get("name", "Bệnh"),
        }

    def _identify_risk_factors(self, form_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Xác định các yếu tố tăng nguy cơ từ dữ liệu
        """
        risk_factors = []

        risk_modifiers = self.risk_config.get("risk_modifiers", [])
        baseline_mapping = self.risk_config.get("baseline_mapping", [])

        # Kiểm tra với risk_modifiers
        for modifier in risk_modifiers:
            if self._check_condition(modifier.get("condition"), form_data):
                factor = {
                    "name": modifier.get("name", "Yếu tố nguy cơ"),
                    "description": modifier.get("description", ""),
                    "effect": modifier.get("value", 0),
                    "effect_type": modifier.get("effect_type", "multiplicative"),
                }
                risk_factors.append(factor)

        # Kiểm tra baseline_mapping
        for baseline in baseline_mapping:
            if self._check_condition(baseline.get("condition"), form_data):
                if baseline.get("score", 0) > 50:
                    factor = {
                        "name": baseline.get("name", "Tình trạng cơ bản"),
                        "description": baseline.get("description", ""),
                        "effect": baseline.get("score", 0),
                        "effect_type": "baseline",
                    }
                    risk_factors.append(factor)

        return risk_factors[:5]  # Giới hạn 5 yếu tố chính

    def _identify_protective_factors(self, form_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Xác định các yếu tố bảo vệ từ dữ liệu
        """
        protective_factors = []

        factors = self.risk_config.get("protective_factors", [])

        for factor in factors:
            if self._check_condition(factor.get("condition"), form_data):
                prot = {
                    "name": factor.get("name", "Yếu tố bảo vệ"),
                    "description": factor.get("description", ""),
                    "effect": factor.get("value", 0),
                    "effect_type": factor.get("effect_type", "multiplicative"),
                }
                protective_factors.append(prot)

        return protective_factors[:5]

    def _get_recommendations(
        self, risk_level: str, form_data: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Lấy khuyến nghị dựa trên mức nguy cơ
        """
        recommendations = []

        for rec in self.recommendations:
            # Khuyến nghị dựa trên mức nguy cơ
            if risk_level.lower() in str(rec.get("risk_level", "")).lower():
                recommendations.append({
                    "priority": rec.get("priority", "medium"),
                    "action": rec.get("action", ""),
                    "description": rec.get("description", ""),
                })

        return recommendations[:5]

    def _generate_summary(self, risk_level: str, score: float, num_risk_factors: int) -> str:
        """
        Tạo tóm tắt ngắn gọn
        """
        risk_labels = {
            "high": "CAO ⚠️",
            "medium": "TRUNG BÌNH ⚡",
            "low": "THẤP ✓",
        }

        label = risk_labels.get(risk_level.lower(), risk_level)

        if risk_level.lower() == "high":
            return f"Nguy cơ {label}. Điểm số: {score:.1f}/100. Phát hiện {num_risk_factors} yếu tố nguy cơ chính. Cần tư vấn y tế sớm."
        elif risk_level.lower() == "medium":
            return f"Nguy cơ {label}. Điểm số: {score:.1f}/100. Nên theo dõi định kỳ và cải thiện lối sống."
        else:
            return f"Nguy cơ {label}. Điểm số: {score:.1f}/100. Tiếp tục duy trì lối sống lành mạnh."

    def _generate_explanation(
        self, risk_level: str, risk_factors: List[Dict], protective_factors: List[Dict]
    ) -> str:
        """
        Sinh giải thích chi tiết
        """
        explanation = ""

        if risk_level.lower() == "high":
            explanation = "Kết quả cho thấy nguy cơ cao. "
        elif risk_level.lower() == "medium":
            explanation = "Kết quả cho thấy nguy cơ trung bình. "
        else:
            explanation = "Kết quả cho thấy nguy cơ thấp. "

        if risk_factors:
            factor_names = [f["name"] for f in risk_factors[:3]]
            explanation += f"Các yếu tố chính: {', '.join(factor_names)}. "

        if protective_factors:
            prot_names = [f["name"] for f in protective_factors[:3]]
            explanation += f"Các yếu tố bảo vệ: {', '.join(prot_names)}. "

        explanation += "Vui lòng tư vấn với bác sĩ để có đánh giá chuyên sâu hơn."

        return explanation

    def _check_condition(self, condition: Any, form_data: Dict[str, Any]) -> bool:
        """
        Kiểm tra điều kiện (sử dụng ConditionEvaluator)
        """
        if condition is None:
            return True

        try:
            from app.condition_evaluator import ConditionEvaluator

            return ConditionEvaluator.evaluate(condition, form_data)
        except Exception as e:
            logger.error(f"Error checking condition: {e}")
            return False