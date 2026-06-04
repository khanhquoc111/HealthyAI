from typing import Dict, Any, List

try:
    from app.condition_evaluator import ConditionEvaluator
except ImportError:
    from condition_evaluator import ConditionEvaluator


class ExplanationEngine:
    def __init__(self, plugin_metadata: Dict[str, Any]):
        self.metadata = plugin_metadata
        self.recommendations = plugin_metadata.get("recommendations", [])
        self.explanation_templates = plugin_metadata.get("explanation_templates", [])
        self.risk_levels = plugin_metadata.get("risk_levels", {})

    def generate_explanation(self, score_result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate comprehensive explanation including:
        - Summary (risk level summary)
        - Explanations (detailed explanations for each matched rule)
        - Risk factors (only risk modifiers)
        - Protective factors (only protective factors)
        - Key factors (top contributing factors, prioritized by impact)
        - Recommendations (actionable advice)
        - Scoring breakdown (detailed calculation steps)
        """
        form_data = score_result.get("form_data", {})
        matched_rules = score_result.get("matched_rules", [])
        final_score = score_result.get("final_score", 0)
        risk_level = score_result.get("risk_level", "medium")
        
        # Separate risk factors and protective factors
        risk_factors = [r for r in matched_rules if r.get("category") == "modifier"]
        protective_factors = [r for r in matched_rules if r.get("category") == "protective"]
        
        # Generate components
        explanations = self._generate_detailed_explanations(matched_rules, form_data)
        key_factors = self._extract_key_factors(risk_factors, protective_factors)
        summary = self._generate_summary(risk_level)
        recommendations = self._generate_recommendations(form_data, final_score)
        
        # Add scoring breakdown information (from score_result)
        scoring_breakdown = score_result.get("scoring_breakdown", {})

        return {
            "summary": summary,
            "explanations": explanations,
            "risk_factors": [
                {
                    "id": f.get("id"),
                    "description": f.get("description"),
                    "priority": f.get("priority", 10)
                }
                for f in risk_factors
            ],
            "protective_factors": [
                {
                    "id": f.get("id"),
                    "description": f.get("description"),
                    "priority": f.get("priority", 10)
                }
                for f in protective_factors
            ],
            "key_factors": key_factors,
            "recommendations": recommendations,
            "risk_level": risk_level,
            "final_score": final_score,
            "scoring_breakdown": scoring_breakdown
        }

    def _generate_detailed_explanations(self, matched_rules: List[Dict], form_data: Dict) -> List[str]:
        """
        Generate detailed explanations for each matched rule.
        Includes contextual information based on rule type.
        """
        explanations = []
        
        for rule in matched_rules:
            rule_id = rule.get("id")
            category = rule.get("category", "modifier")
            
            # Look for template first
            template = next((t for t in self.explanation_templates if t["rule_id"] == rule_id), None)
            
            if template:
                text = self._interpolate_template(template["template"], form_data)
            else:
                # Fallback: use description with category hint
                description = rule.get("description", "")
                if category == "protective":
                    text = f"✓ {description} (yếu tố bảo vệ)"
                else:
                    text = f"⚠ {description} (yếu tố nguy cơ)"
            
            explanations.append(text)
        
        return explanations

    def _interpolate_template(self, template: str, form_data: Dict) -> str:
        """Thay thế {field} trong template bằng giá trị thực từ form_data"""
        result = template
        for key, value in form_data.items():
            result = result.replace(f"{{{key}}}", str(value))
        return result

    def _extract_key_factors(self, risk_factors: List[Dict], protective_factors: List[Dict]) -> List[Dict]:
        """
        Extract top contributing factors with clear indication of type.
        
        Priority:
        1. Risk factors (sorted by priority DESC)
        2. Protective factors (sorted by priority DESC)
        
        Returns: List of top 5 factors with type indication
        """
        all_factors = []
        
        # Add risk factors with marker
        for rf in sorted(risk_factors, key=lambda x: x.get("priority", 10), reverse=True):
            all_factors.append({
                "type": "risk",
                "id": rf.get("id"),
                "description": rf.get("description"),
                "priority": rf.get("priority", 10),
                "effect_type": rf.get("effect_type", "multiplicative"),
                "value": rf.get("value", 1.0)
            })
        
        # Add protective factors with marker
        for pf in sorted(protective_factors, key=lambda x: x.get("priority", 10), reverse=True):
            all_factors.append({
                "type": "protective",
                "id": pf.get("id"),
                "description": pf.get("description"),
                "priority": pf.get("priority", 10),
                "effect_type": pf.get("effect_type", "divisive"),
                "value": pf.get("value", 1.0)
            })
        
        # Return top 5 (or fewer if less available)
        return all_factors[:5]

    def _generate_summary(self, risk_level: str) -> str:
        """Generate summary based on risk level"""
        level_config = self.risk_levels.get(risk_level, {})
        return level_config.get("summary", f"Mức nguy cơ: {risk_level}")

    def _generate_recommendations(self, form_data: Dict, final_score: float) -> List[Dict]:
        """
        Generate actionable recommendations based on form data and score.
        
        Returns:
        List of recommendations sorted by priority, each with:
        - id: recommendation ID
        - text: actionable text
        - priority: order of importance
        - action_type: category (lifestyle, monitoring, medication, referral)
        """
        recs = []
        
        for rule in self.recommendations:
            condition = rule.get("condition")
            
            # Check condition against form_data OR final_score
            should_include = False
            
            if condition:
                # If condition field is "final_score", check against score
                if condition.get("field") == "final_score":
                    should_include = ConditionEvaluator.evaluate(condition, {"final_score": final_score})
                else:
                    # Otherwise check against form data
                    should_include = ConditionEvaluator.evaluate(condition, form_data)
            
            if should_include:
                recs.append({
                    "id": rule["id"],
                    "text": rule["text"],
                    "priority": rule.get("priority", 1),
                    "action_type": rule.get("action_type", "lifestyle")
                })
        
        return sorted(recs, key=lambda x: x["priority"])
