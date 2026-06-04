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

from database.database import SessionLocal
from database.nguoi_dung import NguoiDung
from database.cs_suc_khoe import CsSucKhoe

DEBUG_MODE = os.environ.get("DEBUG_CONDITION_EVAL", "").lower() in ("1", "true", "yes")
logger = logging.getLogger(__name__)

FEATURE_COLS = [
    "age", "gender_code", "bmi", "waist", "systolic", "diastolic", "hypertension",
    "fasting_glucose", "hba1c", "total_cholesterol", "ldl", "creatinine",
    "smoke", "exercise", "alcohol", "sodium_intake",
    "family_hypertension", "family_cardiovascular",
]

DEFAULT_FEATURES = {
    "age": 45.0, "gender_code": 1.0, "bmi": 24.0, "waist": 85.0,
    "systolic": 120.0, "diastolic": 80.0, "hypertension": 0.0,
    "fasting_glucose": 92.0, "hba1c": 5.4, "total_cholesterol": 180.0,
    "ldl": 100.0, "creatinine": 0.9, "smoke": 0.0, "exercise": 1.0,
    "alcohol": 0.0, "sodium_intake": 3200.0,
    "family_hypertension": 0.0, "family_cardiovascular": 0.0,
}

COMMON_FIELD_MAPPING = {
    "tuoi": "age",
    "bmi": "bmi",
    "vongEo": "waist",
    "huyetApTamThu": "systolic",
    "huyetApTamTruong": "diastolic",
    "hutThuoc": "smoke",
    "giaDinhCaoHuyetAp": "family_hypertension",
    "giaDinhTimMach": "family_cardiovascular",
    "caoHuyetAp": "hypertension",
    "tieuDuong": "hypertension",
    "giaDinhTieuDuong": "family_cardiovascular",
}


class RiskStratificationEngine:
    def __init__(self, plugin_metadata: Dict[str, Any]):
        self.metadata = plugin_metadata
        self.risk_config = plugin_metadata.get("risk_config", {})
        
        self.baseline_mapping = self.risk_config.get("baseline_mapping", [])
        self.risk_modifiers = self.risk_config.get("risk_modifiers", [])
        self.protective_factors = self.risk_config.get("protective_factors", [])
        self.interactions = self.risk_config.get("interactions", [])
        self.thresholds = self.risk_config.get("thresholds", [])

        self.ml_model = None
        self._load_ml_model()

    def _load_ml_model(self):
        try:
            ml_dir = os.path.join(os.path.dirname(__file__), "..", "ml", "models")
            model_path = os.path.join(ml_dir, "screening_best_model.pkl")
            if os.path.exists(model_path):
                self.ml_model = joblib.load(model_path)
                print("✅ ML Model loaded successfully!")
            else:
                print("⚠️ ML Model not found - using rule-based only")
        except Exception as e:
            print(f"⚠️ Failed to load ML model: {e}")

    def _merge_with_health_profile(self, form_data: Dict, health_profile: Dict = None) -> Dict:
        merged = form_data.copy()
        health_profile = health_profile or {}

        # Merge fields từ Health Profile
        for db_key, ml_key in COMMON_FIELD_MAPPING.items():
            if db_key in health_profile and ml_key and ml_key not in merged:
                merged[ml_key] = health_profile[db_key]

        # Convert special fields
        merged = self._convert_special_fields(merged)

        # Fill defaults cho đủ 18 features
        for col in FEATURE_COLS:
            if col not in merged or merged[col] is None:
                merged[col] = DEFAULT_FEATURES.get(col, 0.0)

        return merged

    def _convert_special_fields(self, data: Dict) -> Dict:
        """Convert string sang numeric cho ML"""
        converted = data.copy()
        
        # hutThuoc -> smoke
        if "hutThuoc" in converted:
            val = str(converted.get("hutThuoc", "")).strip().lower()
            converted["smoke"] = 1.0 if val in ["đang hút", "current", "yes", "1"] else 0.0

        # soPhutVanDongMoiTuan -> exercise (1 nếu >= 150 phút)
        if "soPhutVanDongMoiTuan" in converted:
            try:
                mins = float(converted["soPhutVanDongMoiTuan"])
                converted["exercise"] = 1.0 if mins >= 150 else 0.0
            except:
                converted["exercise"] = 0.0

        # Boolean fields
        for field in ["caoHuyetAp", "tieuDuong", "giaDinhCaoHuyetAp", "giaDinhTimMach", "giaDinhTieuDuong"]:
            if field in converted:
                val = converted[field]
                if isinstance(val, bool):
                    converted[field] = 1.0 if val else 0.0
                elif isinstance(val, str):
                    converted[field] = 1.0 if val.lower() in ["true", "yes", "1"] else 0.0
                else:
                    converted[field] = float(val) if val else 0.0

        return converted

    def _predict_with_ml(self, form_data: Dict) -> Dict:
        if not self.ml_model:
            return {"probability": 0.0, "score": 0.0, "risk_level": "low", "confidence": 0.0}

        try:
            input_dict = {}
            for col in FEATURE_COLS:
                val = form_data.get(col)
                try:
                    input_dict[col] = float(val) if val is not None else DEFAULT_FEATURES.get(col, 0.0)
                except (ValueError, TypeError):
                    input_dict[col] = DEFAULT_FEATURES.get(col, 0.0)

            df_input = pd.DataFrame([input_dict])
            proba = self.ml_model.predict_proba(df_input)[0, 1]
            score = round(proba * 100, 2)
            
            return {
                "probability": round(proba, 4),
                "score": score,
                "risk_level": "high" if score >= 60 else "medium" if score >= 30 else "low",
                "confidence": 80
            }
        except Exception as e:
            print(f"ML Error: {e}")
            return {"probability": 0.0, "score": 0.0, "risk_level": "low", "confidence": 0.0}

    def calculate_risk(self, form_data: Dict[str, Any], health_profile: Dict[str, Any] = None) -> Dict[str, Any]:
        """Pipeline tính toán nguy cơ hoàn chỉnh - Đánh giá Kép (Dual-Engine)
        
        Auto fetch health profile từ user để augment dữ liệu cho ML model
        - Form data: từ JSON của doctor (có thể thiếu dữ liệu)
        - Health profile: dữ liệu cá nhân đã lưu (đầy đủ 18 chỉ số)
        - Merged data: form_data + health_profile (ưu tiên form_data)
        """
        # Step 1: Merge với health profile để đủ 18 features cho ML
        enriched_data = self._merge_with_health_profile(form_data, health_profile or {})
        
        # 1. ĐÁNH GIÁ TỪ CHUYÊN GIA (RULE-BASED)
        baseline_score = self._calculate_baseline_risk(enriched_data)
        modified_score = self._apply_risk_modifiers(baseline_score, enriched_data)
        protected_score = self._apply_protective_factors(modified_score, enriched_data)
        rule_score = self._apply_interactions(protected_score, enriched_data)
        
        # [SỬA Ở ĐÂY] Ép kiểu float() gốc của Python để tránh lỗi JSON
        rule_score = float(min(round(rule_score, 2), 100))
        rule_risk_level = self._stratify_risk_level(rule_score)

        # 2. ĐÁNH GIÁ TỪ AI (MACHINE LEARNING)
        if self.ml_model:
            ml_result = self._predict_with_ml(enriched_data)
            
            # ml_result là dict: {"probability": 0.42, "score": 42, "risk_level": "low", "confidence": 80}
            ai_score = float(ml_result.get("score", 0.0))
            ai_risk_level = ml_result.get("risk_level", "low")
            has_ai = True
            ai_confidence = ml_result.get("confidence", 0)
        else:
            ai_score = 0.0
            ai_risk_level = "Chưa có dữ liệu để xác minh"
            has_ai = False
            ai_confidence = 0

        all_matched_rules = self._get_matched_rules(enriched_data)

        # Giải thích kết quả
        explanation_engine = ExplanationEngine(self.metadata)
        explanation = explanation_engine.generate_explanation({
            "matched_rules": all_matched_rules,
            "risk_level": rule_risk_level,
            "final_score": rule_score,
            "form_data": enriched_data
        })

        # TRẢ VỀ CẤU TRÚC KÉP RÕ RÀNG
        return {
            "rule_based": {
                "score": rule_score,
                "risk_level": rule_risk_level,
                "matched_rules": all_matched_rules
            },
            "ai_based": {
                "model_available": has_ai,
                "score": ai_score,
                "risk_level": ai_risk_level,
                "confidence": ai_confidence if has_ai else 0
            },
            "matched_rules": all_matched_rules,
            **explanation
        }

    # ==================== CÁC HÀM CŨ ====================
    def _calculate_baseline_risk(self, form_data):
        matching_stages = [stage for stage in self.baseline_mapping if ConditionEvaluator.evaluate(stage.get("condition"), form_data)]
        if not matching_stages:
            return 0
        if len(matching_stages) == 1:
            return float(matching_stages[0].get("score", 0))
        selected = max(matching_stages, key=lambda s: s.get("priority", 0) or float(s.get("score", 0)))
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
        if effect_type == "additive": return score + value
        if effect_type == "multiplicative": return score * value
        if effect_type == "divisive": return score / value if value != 0 else score
        return score

    def _apply_interactions(self, score, form_data):
        result = score
        for interaction in self.interactions:
            if self._evaluate_interaction(interaction, form_data):
                result *= interaction.get("interaction_multiplier", 1.0)
        return result

    def _evaluate_interaction(self, interaction: Dict, form_data: Dict) -> bool:
        cond = interaction.get("condition") or interaction.get("conditions")
        if isinstance(cond, list):
            return all(ConditionEvaluator.evaluate(c, form_data) for c in cond)
        return ConditionEvaluator.evaluate(cond, form_data) if cond else False

    def _stratify_risk_level(self, score):
        for threshold in self.thresholds:
            r = threshold.get("range", [0, 100])
            if r[0] <= score < r[1]:
                return threshold.get("level", "medium")
        return "high"

    def _get_matched_rules(self, form_data):
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