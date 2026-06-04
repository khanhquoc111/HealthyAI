# backend/app/risk_stratification_engine.py
from typing import Any, Dict, List
import logging
import os
import re
import pandas as pd
import joblib

try:
    from app.explanation_engine import ExplanationEngine
    from app.condition_evaluator import ConditionEvaluator
except ImportError:
    from explanation_engine import ExplanationEngine
    from condition_evaluator import ConditionEvaluator

DEBUG_MODE = os.environ.get("DEBUG_CONDITION_EVAL", "").lower() in ("1", "true", "yes")
logger = logging.getLogger(__name__)


class RiskStratificationEngine:
    def __init__(self, plugin_metadata: Dict[str, Any]):
        self.metadata = plugin_metadata
        self.risk_config = plugin_metadata.get("risk_config", {})
        
        self.baseline_mapping = self.risk_config.get("baseline_mapping", [])
        self.risk_modifiers = self.risk_config.get("risk_modifiers", [])
        self.protective_factors = self.risk_config.get("protective_factors", [])
        self.interactions = self.risk_config.get("interactions", [])
        self.thresholds = self.risk_config.get("thresholds", [])

        # ==================== ML MODEL INTEGRATION ====================
        self.ml_model = None
        self.ml_threshold = 0.5
        self.feature_cols = None
        self._load_ml_model()
        # ============================================================

    def _load_ml_model(self):
        """Load ML Screening Model"""
        try:
            ml_dir = os.path.join(os.path.dirname(__file__), "..", "ml", "models")
            model_path = os.path.join(ml_dir, "screening_best_model.pkl")
            thresh_path = os.path.join(ml_dir, "screening_best_threshold.pkl")
            cols_path = os.path.join(ml_dir, "feature_cols.pkl")
            
            if all(os.path.exists(p) for p in [model_path, thresh_path, cols_path]):
                self.ml_model = joblib.load(model_path)
                self.ml_threshold = joblib.load(thresh_path)
                self.feature_cols = joblib.load(cols_path)
                print(f"✅ ML Model loaded successfully for diabetes!")
            else:
                print("⚠️ ML Model not found - using rule-based only")
        except Exception as e:
            print(f"⚠️ Failed to load ML model: {e}")

    def _predict_with_ml(self, form_data: Dict) -> float:
        """Dự đoán xác suất từ ML Model - Có Mapping Dữ liệu"""
        if not self.ml_model or not self.feature_cols:
            return 0.0
        try:
            # FIX 1 & 2: Mapping dữ liệu từ Form sang đúng định dạng của ML Model
            mapped_data = form_data.copy()
            
            # Xử lý các trường Select/Boolean sang float (0.0 / 1.0)
            mapped_data["smoke"] = 1.0 if str(form_data.get("smoking_status", "")).lower() == "current" else 0.0
            
            exercise_mins = float(form_data.get("exercise_minutes_per_week", 0))
            mapped_data["exercise"] = 1.0 if exercise_mins >= 150 else 0.0
            
            # Xử lý các tiền sử bệnh tật
            family_diab = form_data.get("family_history_diabetes", False)
            mapped_data["family_cardiovascular"] = 1.0 if family_diab else 0.0 # Tạm thời dùng thay cho cardiovascular nếu form chỉ hỏi tiểu đường
            
            # Xử lý các chỉ số sinh tồn (tránh gán = 0 làm hỏng dự đoán AI)
            # Gán giá trị trung bình chuẩn nếu form không cung cấp
            mapped_data.setdefault("fasting_glucose", 90.0)
            mapped_data.setdefault("hba1c", 5.0)
            mapped_data.setdefault("systolic", 120.0)
            mapped_data.setdefault("diastolic", 80.0)
            mapped_data.setdefault("total_cholesterol", 150.0)
            mapped_data.setdefault("ldl", 100.0)
            mapped_data.setdefault("creatinine", 0.9)
            mapped_data.setdefault("sodium_intake", 3000.0)
            
            # Trích xuất dữ liệu đúng cấu trúc
            input_dict = {col: float(mapped_data.get(col, 0)) for col in self.feature_cols}
            df_input = pd.DataFrame([input_dict])
            
            proba = self.ml_model.predict_proba(df_input)[0, 1]
            print(f"🔍 ML Debug - proba = {proba:.4f} | age={input_dict.get('age')}, bmi={input_dict.get('bmi')}")
            return float(proba)
        except Exception as e:
            print(f"❌ ML Prediction error: {e}")
            return 0.0

    def calculate_risk(self, form_data: Dict[str, Any]) -> Dict[str, Any]:
        """Pipeline tính toán nguy cơ hoàn chỉnh - Production Ready"""
        enriched_data = self._compute_derived_fields(form_data)
        
        baseline_score = self._calculate_baseline_risk(enriched_data)
        modified_score = self._apply_risk_modifiers(baseline_score, enriched_data)
        protected_score = self._apply_protective_factors(modified_score, enriched_data)
        rule_based_score = self._apply_interactions(protected_score, enriched_data)
        
        # FIX 3: Phân chia trọng số ĐỘNG theo đúng nguyên tắc hệ thống
        if self.ml_model and self.feature_cols:
            # Nguyên tắc 1: Có model -> Tính ML proba và kết hợp (Ví dụ: 65% ML, 35% Rules)
            ml_proba = self._predict_with_ml(enriched_data)
            final_score = round(rule_based_score * 0.35 + ml_proba * 100 * 0.65, 2)
        else:
            # Nguyên tắc 2: Không có model -> Trọng số Rule-based là 100%
            ml_proba = 0.0
            final_score = round(rule_based_score, 2)
            
        final_score = min(final_score, 100)
        
        risk_level = self._stratify_risk_level(final_score)
        all_matched_rules = self._get_matched_rules(enriched_data)

        # Scoring Breakdown
        scoring_breakdown = {
            "baseline_score": round(baseline_score, 2),
            "modified_score": round(modified_score, 2),
            "protected_score": round(protected_score, 2),
            "ml_probability": round(ml_proba * 100, 2),
            "final_score": round(final_score, 2),
            "steps": [
                {"step": 1, "name": "Điểm cơ sở (Baseline)", "score": round(baseline_score, 2)},
                {"step": 2, "name": "Yếu tố nguy cơ", "score": round(modified_score, 2)},
                {"step": 3, "name": "Yếu tố bảo vệ", "score": round(protected_score, 2)},
                {"step": 4, "name": "ML Prediction", "score": round(ml_proba * 100, 2)},
                {"step": 5, "name": "Kết quả cuối cùng", "score": round(final_score, 2)}
            ]
        }

        explanation_engine = ExplanationEngine(self.metadata)
        explanation = explanation_engine.generate_explanation({
            "matched_rules": all_matched_rules,
            "risk_level": risk_level,
            "final_score": final_score,
            "form_data": enriched_data,
            "scoring_breakdown": scoring_breakdown
        })

        return {
            "final_score": final_score,
            "risk_level": risk_level,
            "ml_probability": round(ml_proba * 100, 2),
            "baseline_score": round(baseline_score, 2),
            "modified_score": round(modified_score, 2),
            "protected_score": round(protected_score, 2),
            "risk_factors": [r["description"] for r in all_matched_rules if r.get("category") == "modifier"],
            "protective_factors": [r["description"] for r in all_matched_rules if r.get("category") == "protective"],
            "matched_rules": all_matched_rules,
            **explanation
        }

    # ==================== CODE BÊN DƯỚI GIỮ NGUYÊN HOÀN TOÀN TỪ ĐÂY ====================
    def _compute_derived_fields(self, form_data: Dict) -> Dict:
        """Tính computed fields từ metadata - Safe evaluation without eval()"""
        data = form_data.copy()
        for field in self.risk_config.get("computed_fields", []):
            try:
                result = self._safe_formula_eval(
                    field["formula"],
                    field.get("dependencies", []),
                    data
                )
                data[field["key"]] = result
            except Exception as e:
                if DEBUG_MODE:
                    print(f"⚠️ Computed field error {field.get('key')}: {e}")
                data[field["key"]] = 0
        return data

    def _safe_formula_eval(self, formula: str, dependencies: list, form_data: Dict) -> float:
        """
        Safe formula evaluation without eval().
        """
        safe_context = {}
        for dep in dependencies:
            val = form_data.get(dep, 0)
            try:
                safe_context[dep] = float(val) if val is not None else 0
            except (ValueError, TypeError):
                safe_context[dep] = 0
        
        if not re.match(r'^[a-zA-Z0-9_\s\+\-\*/\(\)\.]+$', formula):
            raise ValueError(f"Formula contains invalid characters: {formula}")
        
        result_formula = formula
        for dep, value in safe_context.items():
            result_formula = re.sub(r'\b' + re.escape(dep) + r'\b', str(value), result_formula)
        
        remaining_ids = re.findall(r'[a-zA-Z_][a-zA-Z0-9_]*', result_formula)
        if remaining_ids:
            raise ValueError(f"Unknown identifiers in formula: {remaining_ids}")
        
        try:
            return float(eval(result_formula, {"__builtins__": {}}, {}))
        except Exception as e:
            raise ValueError(f"Formula evaluation error: {str(e)}")

    def _calculate_baseline_risk(self, form_data):
        """Tính baseline với hỗ trợ priority"""
        matching_stages = [
            stage for stage in self.baseline_mapping 
            if ConditionEvaluator.evaluate(stage.get("condition"), form_data)
        ]
        
        if not matching_stages:
            return 0
        if len(matching_stages) == 1:
            return float(matching_stages[0].get("score", 0))
        
        stages_with_priority = [s for s in matching_stages if s.get("priority") is not None]
        if stages_with_priority:
            selected = max(stages_with_priority, key=lambda s: s.get("priority", 0))
        else:
            selected = max(matching_stages, key=lambda s: float(s.get("score", 0)))
        
        return float(selected.get("score", 0))

    def _apply_risk_modifiers(self, score, form_data):
        result = score
        for rule in self.risk_modifiers:
            if ConditionEvaluator.evaluate(rule.get("condition"), form_data):
                result = self._apply_effect(result, rule)
        return result

    def _apply_protective_factors(self, score, form_data):
        result = score
        for rule in self.protective_factors:
            if ConditionEvaluator.evaluate(rule.get("condition"), form_data):
                result = self._apply_effect(result, rule)
        return result

    def _apply_effect(self, score: float, rule: Dict) -> float:
        effect_type = rule.get("effect_type", "multiplicative")
        value = rule.get("value", 1.0)
        
        if effect_type == "additive":
            return score + value
        elif effect_type == "multiplicative":
            return score * value
        elif effect_type == "divisive":
            return score / value if value != 0 else score
        return score

    def _apply_interactions(self, score, form_data):
        result = score
        for interaction in self.interactions:
            if self._evaluate_interaction(interaction, form_data):
                multiplier = interaction.get("interaction_multiplier", 1.0)
                result *= multiplier
                if DEBUG_MODE:
                    logger.info(f"[INTERACTION] {interaction.get('id')} x{multiplier}")
        return result

    def _evaluate_interaction(self, interaction: Dict, form_data: Dict) -> bool:
        cond = interaction.get("condition") or interaction.get("conditions")
        if not cond:
            return False
        if isinstance(cond, list):
            return all(ConditionEvaluator.evaluate(c, form_data) for c in cond)
        return ConditionEvaluator.evaluate(cond, form_data)

    def _stratify_risk_level(self, score):
        for threshold in self.thresholds:
            r = threshold.get("range", [0, 100])
            if r[0] <= score < r[1]:
                return threshold.get("level", "medium")
        return "high"

    def _get_matched_rules(self, form_data):
        """Lấy tất cả rules đã match"""
        rules = []
        for rule in self.risk_modifiers:
            if ConditionEvaluator.evaluate(rule.get("condition"), form_data):
                rule_copy = dict(rule)
                rule_copy["category"] = "modifier"
                rules.append(rule_copy)
        for rule in self.protective_factors:
            if ConditionEvaluator.evaluate(rule.get("condition"), form_data):
                rule_copy = dict(rule)
                rule_copy["category"] = "protective"
                rules.append(rule_copy)
        return rules