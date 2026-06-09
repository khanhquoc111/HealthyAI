# backend/app/risk_stratification_engine.py
from typing import Any, Dict, List, Optional
import logging
import os
import pandas as pd
import joblib

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
        self.ml_required_features = plugin_metadata.get("ml_required_features", [])
        
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
            plugin_id = self.metadata.get("disease_info", {}).get("id", "")
            
            specific_path = os.path.join(ml_dir, f"{plugin_id}_model.pkl")
            generic_path  = os.path.join(ml_dir, "screening_best_model.pkl")
            
            model_path = specific_path if os.path.exists(specific_path) else generic_path
            
            if os.path.exists(model_path):
                self.ml_model = joblib.load(model_path)
                print(f"✅ ML Model loaded: {os.path.basename(model_path)}")
            else:
                print(f"⚠️ ML Model not found for plugin '{plugin_id}'")
        except Exception as e:
            print(f"⚠️ Failed to load ML model: {e}")

    def _convert_to_ml_format(self, unified_data: Dict) -> Dict:
        """Chuyển đổi dữ liệu thô (tiếng Việt/tiếng Anh) sang định dạng thuộc tính ML định kiểu số"""
        ml_data = {}
        
        # Mapping từ form DB/tiếng Việt sang thuộc tính tiếng Anh của ML
        mapping = {
            "tuoi": "age", "bmi": "bmi", "vongEo": "waist",
            "huyetApTamThu": "systolic", "huyetApTamTruong": "diastolic",
            "duongHuyet": "fasting_glucose", "hba1c": "hba1c",
            "cholesterol": "total_cholesterol", "ldl": "ldl", "creatinine": "creatinine",
            "caoHuyetAp": "hypertension", "tieuDuong": "diabetes"
        }
        
        for src_key, target_key in mapping.items():
            if src_key in unified_data and unified_data[src_key] not in [None, ""]:
                ml_data[target_key] = unified_data[src_key]

        # Giữ nguyên nếu có sẵn key tiếng Anh hợp lệ
        for col in self.ml_required_features:
            if col in unified_data and unified_data[col] not in [None, ""]:
                ml_data[col] = unified_data[col]

        # Chuẩn hóa các trường thói quen & phân loại
        if "gioiTinh" in unified_data:
            ml_data["gender_code"] = 1.0 if unified_data["gioiTinh"] == "Nam" else 2.0
        
        if "gender_code" in unified_data and "gender_code" not in ml_data:
            try:
                ml_data["gender_code"] = float(unified_data["gender_code"])
            except (ValueError, TypeError):
                ml_data["gender_code"] = 1.0
            
        if "hutThuoc" in unified_data:
            ml_data["smoke"] = 1.0 if str(unified_data["hutThuoc"]).strip().lower() in ["đang hút", "yes", "1"] else 0.0

        # if "soPhutVanDongMoiTuan" in unified_data:
        #     try:
        #         ml_data["exercise"] = 1.0 if float(unified_data["soPhutVanDongMoiTuan"]) >= 150 else 0.0
        #     except:
        #         ml_data["exercise"] = 0.0

        if "smoking_status" in unified_data and "smoke" not in ml_data:
            ml_data["smoke"] = 1.0 if unified_data["smoking_status"] == "current" else 0.0
        
        if "alcohol" in unified_data and "alcohol" not in ml_data:
            try:
                ml_data["alcohol"] = float(unified_data["alcohol"])
            except (ValueError, TypeError):
                ml_data["alcohol"] = 0.0
        
        # if "exercise_minutes_per_week" in unified_data and "exercise" not in ml_data:
        #     try:
        #         ml_data["exercise"] = 1.0 if float(unified_data["exercise_minutes_per_week"]) >= 150 else 0.0
        #     except (ValueError, TypeError):
        #         ml_data["exercise"] = 0.0
        
        if "diabetes_status" in unified_data and "diabetes" not in ml_data:
            ml_data["diabetes"] = 1.0 if unified_data["diabetes_status"] == "yes" else 0.0

        if "creatinine" in unified_data and "creatinine" not in ml_data:
            try:
                ml_data["creatinine"] = float(unified_data["creatinine"])
            except (ValueError, TypeError):
                pass

        # Ép kiểu dữ liệu về số thực (Float)
        final_ml = {}
        for k, v in ml_data.items():
            if v is True: final_ml[k] = 1.0
            elif v is False: final_ml[k] = 0.0
            else:
                try: final_ml[k] = float(v)
                except (ValueError, TypeError): continue
                
        return final_ml

    def calculate_risk(self, unified_data: Dict[str, Any]) -> Dict[str, Any]:
        """Luồng tính toán mới xử lý phân tầng trạng thái ML"""
        
        # 1. TÍNH ĐIỂM CHUYÊN GIA (RULE-BASED ENGINE)
        baseline_score = self._calculate_baseline_risk(unified_data)
        modified_score = self._apply_risk_modifiers(baseline_score, unified_data)
        protected_score = self._apply_protective_factors(modified_score, unified_data)
        rule_score = self._apply_interactions(protected_score, unified_data)
        
        rule_score = float(min(round(rule_score, 2), 100))
        rule_risk_level = self._stratify_risk_level(rule_score)

        # 2. XÁC THỰC TRẠNG THÁI MÔ HÌNH HỌC MÁY (ML ENGINE)
        ai_status = "UNAVAILABLE"
        ai_score = 0.0
        ai_risk_level = "N/A"
        ai_proba = 0.0
        ai_confidence = 0
        missing_fields = []

        # Nghịch đảo mapping để hiển thị lỗi thân thiện
        inverse_mapping = {
            "age": "Tuổi", "bmi": "Chỉ số BMI", "waist": "Vòng eo",
            "systolic": "Huyết áp tâm thu", "diastolic": "Huyết áp tâm trương",
            "fasting_glucose": "Đường huyết đói", "hba1c": "Chỉ số HbA1c",
            "total_cholesterol": "Cholesterol toàn phần", "ldl": "Chỉ số LDL",
            "creatinine": "Chỉ số Creatinine máu", "smoke": "Tình trạng hút thuốc",
            "exercise": "Thời gian vận động thể chất",
            "gender_code": "Giới tính"
        }

        if self.ml_model and self.ml_required_features:
            ml_ready_features = self._convert_to_ml_format(unified_data)
            
            # Kiểm đếm các feature bị thiếu
            for feature in self.ml_required_features:
                if feature not in ml_ready_features:
                    missing_fields.append(inverse_mapping.get(feature, feature))

            if len(missing_fields) == 0:
                ai_status = "READY"
                try:
                    import warnings, traceback
        
                    # DEBUG 1: kiểm tra feature_cols load được không
                    plugin_id = self.metadata.get('disease_info', {}).get('id', '')
                    feature_cols_path = os.path.join(
                        os.path.dirname(__file__), "..", "ml", "models",
                        f"{plugin_id}_feature_cols.pkl"
                    )
                    print(f"🔍 feature_cols_path exists: {os.path.exists(feature_cols_path)}")
                    
                    all_feature_cols = joblib.load(feature_cols_path)
                    print(f"🔍 all_feature_cols ({len(all_feature_cols)}): {all_feature_cols}")
                    
                    # DEBUG 2: kiểm tra row trước khi tạo DataFrame
                    row = {col: ml_ready_features.get(col, float("nan")) for col in all_feature_cols}
                    print(f"🔍 row: {row}")
                    
                    df_input = pd.DataFrame([row])
                    print(f"🔍 df_input shape: {df_input.shape}, columns: {list(df_input.columns)}")
                    print(f"🔍 df_input NaN count: {df_input.isna().sum().to_dict()}")
                    
                    # DEBUG 3: thử predict với warnings tắt
                    with warnings.catch_warnings():
                        warnings.simplefilter("ignore")
                        proba = self.ml_model.predict_proba(df_input)[0, 1]
                    
                    print(f"✅ proba = {proba}")
                    ai_score = round(proba * 100, 2)
                    ai_proba = round(proba, 4)
                    ai_confidence = 85
                    ai_risk_level = "high" if ai_score >= 60 else "medium" if ai_score >= 30 else "low"
                except Exception as e:
                    ai_status = "PARTIAL"
                    ai_risk_level = f"Lỗi thực thi mô hình AI: {str(e)}"
                    print(f"❌ EXCEPTION type: {type(e).__name__}")
                    print(f"❌ EXCEPTION message: {e}")
                    traceback.print_exc()
            else:
                ai_status = "PARTIAL"
                ai_risk_level = "Thiếu dữ liệu để thực hiện đánh giá bằng AI"
        else:
            ai_risk_level = "Chưa có mô hình trí tuệ nhân tạo được huấn luyện cho bệnh này"

        all_matched_rules = self._get_matched_rules(unified_data)

        explanation_engine = ExplanationEngine(self.metadata)
        explanation = explanation_engine.generate_explanation({
            "matched_rules": all_matched_rules,
            "risk_level": rule_risk_level,
            "final_score": rule_score,
            "form_data": unified_data
        })

        return {
            "rule_based": {
                "score": float(rule_score),
                "risk_level": rule_risk_level,
                "matched_rules": all_matched_rules
            },
            "ai_based": {
                "status": ai_status,
                "score": float(ai_score),
                "risk_level": ai_risk_level,
                "probability": float(ai_proba),
                "confidence": int(ai_confidence),
                "missing_features": missing_fields
            },
            "final_score": float(rule_score),
            "matched_rules": all_matched_rules,
            **explanation
        }

    # CÁC HÀM XỬ LÝ RULE-BASED GIỮ NGUYÊN BÊN DƯỚI
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