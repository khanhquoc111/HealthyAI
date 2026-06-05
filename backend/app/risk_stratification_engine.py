# backend/app/risk_stratification_engine.py
from typing import Any, Dict
import logging
import os
import pandas as pd
import joblib
from pathlib import Path

try:
    from app.explanation_engine import ExplanationEngine
    from app.condition_evaluator import ConditionEvaluator
except ImportError:
    from explanation_engine import ExplanationEngine
    from condition_evaluator import ConditionEvaluator

logger = logging.getLogger(__name__)

class RiskStratificationEngine:
    def __init__(self, plugin_metadata: Dict[str, Any]):
        self.metadata = plugin_metadata
        self.risk_config = plugin_metadata.get("risk_config", {})
        
        # PLUGIN_ID LÀ ĐỊNH DANH DUY NHẤT
        self.plugin_id = (
            plugin_metadata.get("disease_info", {}).get("id") or 
            plugin_metadata.get("id", "unknown")
        ).lower().strip()
        
        print(f"🔍 RiskStratificationEngine initialized with plugin_id = '{self.plugin_id}'")

        self.ml_model = None
        self.ml_required_features = []
        self.ml_threshold = 0.5

        self.baseline_mapping = self.risk_config.get("baseline_mapping", [])
        self.risk_modifiers = self.risk_config.get("risk_modifiers", [])
        self.protective_factors = self.risk_config.get("protective_factors", [])
        self.interactions = self.risk_config.get("interactions", [])
        self.thresholds = self.risk_config.get("thresholds", [])

        self._load_ml_model()

    def _load_ml_model(self):
        """Load ML model với nhiều fallback path"""
        try:
            # Tìm thư mục ml theo nhiều cách
            base_dir = Path(__file__).parent.parent
            possible_ml_dirs = [
                base_dir / "ml" / "models",
                base_dir / "ml",
                base_dir.parent / "ml",
                Path("ml"),
                Path("backend/ml"),
            ]

            model_map = {
                "diabetes": "screening_best_model.pkl",
                "hypertension": "hypertension_model.pkl",
            }

            model_filename = model_map.get(self.plugin_id, f"{self.plugin_id}_model.pkl")
            features_path = None
            threshold_path = None

            for ml_dir in possible_ml_dirs:
                model_path = ml_dir / model_filename
                if model_path.exists():
                    self.ml_model = joblib.load(model_path)
                    print(f"✅ Loaded ML model: {model_path}")

                    # Load features
                    for fpath in [ml_dir / "feature_cols.pkl", base_dir / "feature_cols.pkl"]:
                        if fpath.exists():
                            self.ml_required_features = list(joblib.load(fpath))
                            features_path = fpath
                            break
                    
                    # Load threshold
                    thresh_file = ml_dir / f"{self.plugin_id}_threshold.pkl"
                    if thresh_file.exists():
                        self.ml_threshold = float(joblib.load(thresh_file))
                    
                    print(f"✅ ML Engine ready for '{self.plugin_id}' ({len(self.ml_required_features)} features)")
                    return

            # Nếu không tìm thấy model
            self.ml_model = None
            print(f"⚠️ No ML model found for plugin_id '{self.plugin_id}'. Running Rule-based only.")
            print(f"   (Tìm kiếm tại: {[str(p) for p in possible_ml_dirs]})")

        except Exception as e:
            self.ml_model = None
            print(f"⚠️ Failed to load ML model for {self.plugin_id}: {e}")

    # Các hàm còn lại giữ nguyên (calculate_risk, _convert_to_ml_format, ...)
    def _convert_to_ml_format(self, unified_data: Dict) -> Dict:
        ml_data = {}
        mapping = {
            "age": "age", "tuoi": "age",
            "bmi": "bmi",
            "waist": "waist", "vongEo": "waist",
            "systolic": "systolic", "huyetApTamThu": "systolic",
            "diastolic": "diastolic", "huyetApTamTruong": "diastolic",
            "fasting_glucose": "fasting_glucose", "duongHuyet": "fasting_glucose",
            "hba1c": "hba1c",
            "total_cholesterol": "total_cholesterol", "cholesterol": "total_cholesterol",
            "ldl": "ldl", "hdl": "hdl",
            "creatinine": "creatinine",
            "gender_code": "gender_code", "gioiTinh": "gender_code",
            "smoke": "smoke", "hutThuoc": "smoke",
            "exercise": "exercise", "soPhutVanDongMoiTuan": "exercise",
            "family_hypertension": "family_hypertension", "giaDinhCaoHuyetAp": "family_hypertension",
        }
        
        for src, tgt in mapping.items():
            if src in unified_data and unified_data[src] not in (None, "", None):
                ml_data[tgt] = unified_data[src]

        # Ưu tiên exact match
        for col in self.ml_required_features:
            if col in unified_data and unified_data[col] not in (None, ""):
                ml_data[col] = unified_data[col]

        # Xử lý đặc biệt
        if "hutThuoc" in unified_data:
            val = str(unified_data["hutThuoc"]).strip().lower()
            ml_data["smoke"] = 1.0 if val in ["đang hút", "current", "yes", "1"] else 0.0

        # Convert to float
        final = {}
        for k, v in ml_data.items():
            if isinstance(v, bool):
                final[k] = 1.0 if v else 0.0
            else:
                try:
                    final[k] = float(v)
                except (ValueError, TypeError):
                    final[k] = 0.0
        return final

    def calculate_risk(self, unified_data: Dict[str, Any]) -> Dict[str, Any]:
        # RULE-BASED
        baseline_score = self._calculate_baseline_risk(unified_data)
        modified_score = self._apply_risk_modifiers(baseline_score, unified_data)
        protected_score = self._apply_protective_factors(modified_score, unified_data)
        rule_score = self._apply_interactions(protected_score, unified_data)
        rule_score = float(min(round(rule_score, 2), 100))
        rule_risk_level = self._stratify_risk_level(rule_score)

        # ML-BASED
        ai_status = "UNAVAILABLE"
        ai_score = 0.0
        ai_risk_level = "N/A"
        ai_proba = 0.0
        missing_fields = []

        if self.ml_model and self.ml_required_features:
            ml_ready = self._convert_to_ml_format(unified_data)
            missing_fields = [f for f in self.ml_required_features if f not in ml_ready]

            if not missing_fields:
                try:
                    df_input = pd.DataFrame([ml_ready])
                    proba = self.ml_model.predict_proba(df_input)[0, 1]
                    ai_score = round(proba * 100, 2)
                    ai_proba = round(proba, 4)
                    ai_status = "READY"
                    ai_risk_level = "high" if proba >= 0.7 else "medium" if proba >= 0.4 else "low"
                except Exception as e:
                    ai_status = "PARTIAL"
                    ai_risk_level = f"Lỗi AI: {str(e)}"
            else:
                ai_status = "PARTIAL"
                ai_risk_level = "Thiếu dữ liệu"
        else:
            ai_risk_level = "Chưa có mô hình AI"

        # Explanation
        explanation_engine = ExplanationEngine(self.metadata)
        explanation = explanation_engine.generate_explanation({
            "risk_level": rule_risk_level,
            "final_score": rule_score,
            "form_data": unified_data
        })

        return {
            "rule_based": {
                "score": rule_score,
                "risk_level": rule_risk_level,
            },
            "ai_based": {
                "status": ai_status,
                "score": ai_score,
                "risk_level": ai_risk_level,
                "probability": ai_proba,
                "missing_features": missing_fields[:5]  # giới hạn
            },
            "final_score": rule_score,
            **explanation
        }

    # === Các helper rule-based giữ nguyên từ code cũ của bạn ===
    def _calculate_baseline_risk(self, form_data):
        matching = [s for s in self.baseline_mapping if ConditionEvaluator.evaluate(s.get("condition"), form_data)]
        if not matching:
            return 30.0
        best = max(matching, key=lambda x: (x.get("priority", 0), x.get("score", 0)))
        return float(best.get("score", 30))

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
        effect = rule.get("effect_type", "multiplicative")
        value = rule.get("value", 1.0)
        if effect == "additive":
            return score + value
        if effect == "multiplicative":
            return score * value
        return score

    def _apply_interactions(self, score, form_data):
        result = score
        for inter in self.interactions:
            if self._evaluate_interaction(inter, form_data):
                result *= inter.get("interaction_multiplier", 1.0)
        return result

    def _evaluate_interaction(self, interaction: Dict, form_data: Dict) -> bool:
        cond = interaction.get("condition")
        return ConditionEvaluator.evaluate(cond, form_data) if cond else False

    def _stratify_risk_level(self, score):
        for t in self.thresholds:
            r = t.get("range", [0, 100])
            if r[0] <= score < r[1]:
                return t.get("level", "medium")
        return "high" if score >= 70 else "medium"