"""
ml_engine.py  –  LuanVanKTPM
==============================
MLEngine tích hợp vào hệ thống Plugin-Based hiện có.

Nguyên tắc:
  1. Rule Engine LUÔN chạy trước (plugin_api.py gọi RiskStratificationEngine).
  2. MLEngine chạy SAU khi có đủ ml_required_features.
  3. Nếu thiếu features → trả về ai_status = "PARTIAL" kèm danh sách
     các field còn thiếu (ml_missing_fields) để frontend hỏi thêm.

Artifact path convention:
  ml/models/{disease}_risk_model.pkl
  ml/models/{disease}_features.pkl
  ml/models/{disease}_threshold.pkl
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

import joblib
import numpy as np
import pandas as pd

log = logging.getLogger(__name__)

# Thư mục model mặc định – tương đối so với file này (ml/)
_DEFAULT_MODEL_DIR = Path(__file__).parent / "models"


class MLEngine:
    """
    Chạy dự đoán ML cho một bệnh cụ thể.

    Sử dụng:
        engine = MLEngine("diabetes")
        result = engine.predict(unified_data)
        # result["ai_status"] in ["OK", "PARTIAL", "NO_MODEL"]
    """

    # Mapping từ các field trong health profile/form sang tên feature của model
    FEATURE_MAPPING = {
        # Demographic
        "tuoi": "age",
        "age": "age",
        "gioiTinh": "gender_code",
        "gender": "gender_code",
        "gender_code": "gender_code",
        
        # Anthropometric
        "bmi": "bmi",
        "vongEo": "waist",
        "waist": "waist",
        "chieuCao": "height",
        "canNang": "weight",
        
        # Blood pressure
        "huyetApTamThu": "systolic",
        "systolic": "systolic",
        "huyetApTamTruong": "diastolic",
        "diastolic": "diastolic",
        
        # Lifestyle
        "hutThuoc": "smoke",
        "smoking_status": "smoke",
        "smoke": "smoke",
        "uongRuouBia": "alcohol_use",
        "alcohol_use": "alcohol_use",
        "alcohol_use_status": "alcohol_use",
        "soPhutVanDongMoiTuan": "physical_activity",
        "exercise_minutes_per_week": "physical_activity",
        "physical_activity": "physical_activity",
        "mucDoAnMan": "salt_intake",
        "salt_intake": "salt_intake",
        "salt_intake_level": "salt_intake",
        
        # Lab values
        "duongHuyet": "fasting_glucose",
        "fasting_glucose": "fasting_glucose",
        "hba1c": "hba1c",
        "cholesterol": "total_cholesterol",
        "total_cholesterol": "total_cholesterol",
        "ldl": "ldl",
        "hdl": "hdl",
        "triglyceride": "triglyceride",
        "creatinine": "creatinine",
        "acidUric": "uric_acid",
        
        # Medical history
        "caoHuyetAp": "hypertension_status",
        "tieuDuong": "diabetes_status",
        "diabetes_status": "diabetes_status",
        "benhTimMach": "heart_disease_status",
        "gout": "gout_status",
        
        # Family history
        "giaDinhTieuDuong": "family_history_diabetes",
        "family_history_diabetes": "family_history_diabetes",
        "giaDinhCaoHuyetAp": "family_history_hypertension",
        "family_history_hypertension": "family_history_hypertension",
        "giaDinhTimMach": "family_history_cardiovascular",
        "family_history_cardiovascular": "family_history_cardiovascular",
        "giaDinhGout": "family_history_gout",
    }

    def __init__(
        self,
        disease_id: str,
        model_dir: Optional[Path] = None,
    ):
        self.disease_id = disease_id
        self.model_dir = model_dir or _DEFAULT_MODEL_DIR

        self._model = None
        self._features: List[str] = []
        self._threshold: float = 0.5
        self._loaded = False

        self._load_artifacts()

    # ──────────────────────────────────────────────────────────────────────────
    # Load
    # ──────────────────────────────────────────────────────────────────────────

    def _load_artifacts(self) -> None:
        model_path = self.model_dir / f"{self.disease_id}_risk_model.pkl"
        features_path = self.model_dir / f"{self.disease_id}_features.pkl"
        threshold_path = self.model_dir / f"{self.disease_id}_threshold.pkl"

        if not model_path.exists():
            log.warning(
                "[MLEngine][%s] Model chưa được train: %s",
                self.disease_id, model_path,
            )
            return

        try:
            self._model = joblib.load(model_path)
            self._features = joblib.load(features_path) if features_path.exists() else []
            self._threshold = float(joblib.load(threshold_path)) if threshold_path.exists() else 0.5
            self._loaded = True
            log.info(
                "[MLEngine][%s] Loaded | features=%d | threshold=%.4f",
                self.disease_id, len(self._features), self._threshold,
            )
        except Exception as exc:
            log.error("[MLEngine][%s] Lỗi load artifact: %s", self.disease_id, exc)

    # ──────────────────────────────────────────────────────────────────────────
    # Predict
    # ──────────────────────────────────────────────────────────────────────────

    def predict(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Chạy dự đoán ML.

        Args:
            data: unified_data đã merge (health_profile + form_data).
                  Key tên field theo plugin (ví dụ "age", "bmi", "systolic"...).

        Returns:
            {
                "ai_status":       "OK" | "PARTIAL" | "NO_MODEL",
                "ai_score":        float | None,       # 0-100
                "ai_probability":  float | None,       # 0-1
                "ai_risk_level":   str | None,         # "low"/"medium"/"high"
                "ml_missing_fields": list[str],        # field keys còn thiếu
                "ml_provided_fields": list[str],       # field keys đã có
                "threshold":       float,
            }
        """
        if not self._loaded:
            log.warning(f"[MLEngine][{self.disease_id}] Model not loaded")
            return self._no_model_result()

        if not self._features:
            log.warning(f"[MLEngine][{self.disease_id}] No features defined")
            return self._no_model_result()

        # Log để debug
        log.info(f"[MLEngine][{self.disease_id}] Checking {len(self._features)} required features")
        log.info(f"[MLEngine][{self.disease_id}] Model features: {self._features}")
        log.info(f"[MLEngine][{self.disease_id}] Available data keys: {list(data.keys())}")

        # Map data to model features
        mapped_data = self._map_to_model_features(data)
        log.info(f"[MLEngine][{self.disease_id}] Mapped data: {mapped_data}")

        # Kiểm tra features
        missing = []
        for f in self._features:
            val = mapped_data.get(f)
            if val is None:
                missing.append(f)
                log.info(f"[MLEngine][{self.disease_id}] Missing feature: {f}")

        provided = [f for f in self._features if mapped_data.get(f) is not None]

        if missing:
            log.info(f"[MLEngine][{self.disease_id}] Missing {len(missing)} features: {missing}")
            return {
                "ai_status": "PARTIAL",
                "ai_score": None,
                "ai_probability": None,
                "ai_risk_level": None,
                "ml_missing_fields": missing,
                "ml_provided_fields": provided,
                "threshold": self._threshold,
                "message": (
                    f"Cần thêm {len(missing)} chỉ số để chạy AI: "
                    + ", ".join(missing)
                ),
            }

        # Build input vector
        input_dict = {f: mapped_data[f] for f in self._features}
        log.info(f"[MLEngine][{self.disease_id}] Final input dict: {input_dict}")

        try:
            df_input = pd.DataFrame([input_dict])
            log.info(f"[MLEngine][{self.disease_id}] DataFrame shape: {df_input.shape}")
            
            # Kiểm tra xem model có method predict_proba không
            if hasattr(self._model, "predict_proba"):
                proba = float(self._model.predict_proba(df_input)[0, 1])
            else:
                # Fallback cho model không có predict_proba
                proba = float(self._model.predict(df_input)[0])
                log.warning(f"[MLEngine][{self.disease_id}] Using predict() instead of predict_proba()")
            
            proba = max(0.0, min(1.0, proba))
            log.info(f"[MLEngine][{self.disease_id}] Probability: {proba}")
        except Exception as exc:
            log.error(f"[MLEngine][{self.disease_id}] predict_proba error: {exc}", exc_info=True)
            return self._no_model_result()

        ai_score = round(proba * 100, 2)
        ai_risk = self._map_risk(proba)

        log.info(f"[MLEngine][{self.disease_id}] Result: score={ai_score}, risk={ai_risk}")

        return {
            "ai_status": "OK",
            "ai_score": ai_score,
            "ai_probability": round(proba, 4),
            "ai_risk_level": ai_risk,
            "ml_missing_fields": [],
            "ml_provided_fields": provided,
            "threshold": self._threshold,
            "message": "Dự đoán ML thành công",
        }

    # ──────────────────────────────────────────────────────────────────────────
    # Properties
    # ──────────────────────────────────────────────────────────────────────────

    @property
    def required_features(self) -> List[str]:
        return list(self._features)

    @property
    def is_available(self) -> bool:
        return self._loaded

    # ──────────────────────────────────────────────────────────────────────────
    # Private Helpers - Mapping
    # ──────────────────────────────────────────────────────────────────────────

    def _map_to_model_features(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Chuyển đổi dữ liệu từ health profile/form sang tên feature mà model yêu cầu.
        """
        mapped = {}
        
        # Log tất cả data để debug
        log.info(f"[MLEngine] Mapping from data keys: {list(data.keys())}")
        
        for feature in self._features:
            found_value = None
            
            # Thử tìm trực tiếp
            if feature in data and data[feature] is not None:
                found_value = data[feature]
                log.info(f"[MLEngine] Direct mapping: {feature} = {found_value}")
            
            # Tìm qua mapping
            else:
                for src_key, target_key in self.FEATURE_MAPPING.items():
                    # Case 1: src_key là key trong data, target_key là feature cần
                    if target_key == feature and src_key in data and data[src_key] is not None:
                        found_value = data[src_key]
                        log.info(f"[MLEngine] Mapped via {src_key} -> {feature} = {found_value}")
                        break
                    
                    # Case 2: feature là src_key, tìm target_key trong data
                    if src_key == feature and target_key in data and data[target_key] is not None:
                        found_value = data[target_key]
                        log.info(f"[MLEngine] Mapped via {target_key} -> {feature} = {found_value}")
                        break
            
            if found_value is not None:
                mapped[feature] = self._normalize_value(feature, found_value)
            else:
                mapped[feature] = None
                
        return mapped

    def _normalize_value(self, feature: str, value: Any) -> Optional[float]:
        """
        Chuẩn hóa giá trị theo từng feature cụ thể.
        """
        if value is None or value == "":
            return None
            
        # Xử lý gender_code
        if feature == "gender_code":
            if isinstance(value, (int, float)):
                return float(value)
            if isinstance(value, str):
                value_lower = value.lower().strip()
                if value_lower in ["nam", "male", "m", "1"]:
                    return 1.0
                elif value_lower in ["nu", "nữ", "female", "f", "2"]:
                    return 2.0
            return 1.0  # Default to male
        
        # Xử lý smoke - chuyển đổi từ smoking_status
        if feature == "smoke":
            if isinstance(value, (int, float)):
                return 1.0 if value > 0 else 0.0
            if isinstance(value, str):
                value_lower = value.lower()
                if value_lower in ["current", "đang hút", "hút", "yes", "có"]:
                    return 1.0
                else:
                    return 0.0
            return 0.0
        
        # Xử lý alcohol_use
        if feature == "alcohol_use":
            if isinstance(value, (int, float)):
                return 1.0 if value > 0 else 0.0
            if isinstance(value, str):
                value_lower = value.lower()
                if value_lower in ["frequent", "thường xuyên", "có", "yes", "uống"]:
                    return 1.0
                else:
                    return 0.0
            return 0.0
        
        # Xử lý physical_activity - từ số phút
        if feature == "physical_activity":
            try:
                minutes = float(value)
                # Nếu > 150 phút/tuần thì active
                return 1.0 if minutes >= 150 else 0.0
            except:
                return 0.0
        
        # Xử lý salt_intake
        if feature == "salt_intake":
            if isinstance(value, (int, float)):
                return 1.0 if value > 0 else 0.0
            if isinstance(value, str):
                value_lower = value.lower()
                if value_lower in ["cao", "high", "mặn", "nhiều"]:
                    return 1.0
                else:
                    return 0.0
            return 0.0
        
        # Xử lý waist (vòng eo)
        if feature == "waist":
            try:
                return float(value)
            except:
                return None
        
        # Xử lý boolean fields
        if isinstance(value, bool):
            return 1.0 if value else 0.0
        
        # Xử lý string boolean
        if isinstance(value, str):
            if value.lower() in ["true", "yes", "có", "1"]:
                return 1.0
            elif value.lower() in ["false", "no", "không", "0"]:
                return 0.0
        
        # Mặc định: cố gắng chuyển sang float
        try:
            return float(value)
        except (ValueError, TypeError):
            return None

    def _get_value(self, data: Dict[str, Any], key: str) -> Optional[float]:
        """
        Lấy giá trị từ data, trả về None nếu không có hoặc không thể cast sang float.
        Hỗ trợ boolean (True→1, False→0).
        """
        val = data.get(key)
        if val is None or val == "":
            return None
        if isinstance(val, bool):
            return float(val)
        try:
            return float(val)
        except (ValueError, TypeError):
            return None

    def _map_risk(self, proba: float) -> str:
        """Ánh xạ xác suất sang risk level dựa trên ngưỡng."""
        if proba >= self._threshold:
            return "high"
        elif proba >= self._threshold * 0.6:
            return "medium"
        return "low"

    def _no_model_result(self) -> Dict[str, Any]:
        return {
            "ai_status": "NO_MODEL",
            "ai_score": None,
            "ai_probability": None,
            "ai_risk_level": None,
            "ml_missing_fields": [],
            "ml_provided_fields": [],
            "threshold": self._threshold,
            "message": f"Chưa có mô hình ML cho bệnh '{self.disease_id}'",
        }


# ─────────────────────────────────────────────────────────────────────────────
# Cache toàn cục (1 instance per disease)
# ─────────────────────────────────────────────────────────────────────────────

_engine_cache: Dict[str, MLEngine] = {}


def get_ml_engine(disease_id: str, model_dir: Optional[Path] = None) -> MLEngine:
    """
    Lấy (hoặc tạo) MLEngine instance cho disease_id.
    Dùng cache để tránh load model nhiều lần.
    """
    cache_key = f"{disease_id}:{model_dir}"
    if cache_key not in _engine_cache:
        _engine_cache[cache_key] = MLEngine(disease_id, model_dir)
    return _engine_cache[cache_key]


def reload_engine(disease_id: str, model_dir: Optional[Path] = None) -> MLEngine:
    """Reload model từ disk (dùng sau khi train lại)."""
    cache_key = f"{disease_id}:{model_dir}"
    engine = MLEngine(disease_id, model_dir)
    _engine_cache[cache_key] = engine
    return engine