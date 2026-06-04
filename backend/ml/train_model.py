# ============================================================
# PATCH: backend/ml/train_model.py - Fix predict_risk_ml function
# ============================================================
# Add or REPLACE the predict_risk_ml function with this:

import pickle
import numpy as np
import os
from typing import Dict, Any

# ============================================================
# ✅ MAIN PREDICTION FUNCTION (được gọi từ plugin_api.py)
# ============================================================

def predict_risk_ml(plugin_name: str, user_data: Dict[str, Any]) -> float:
    """
    ✅ Predict risk probability using ML model
    
    Args:
        plugin_name: "diabetes", "hypertension", "gout"
        user_data: Dictionary with user metrics
    
    Returns:
        probability: float between 0 and 1
    """
    try:
        # ✅ 1. Load model từ file
        model = load_model(plugin_name)
        if model is None:
            print(f"⚠️ Model for {plugin_name} not found, returning 0.0")
            return 0.0
        
        # ✅ 2. Load feature columns để đúng thứ tự
        feature_cols = load_feature_columns(plugin_name)
        if not feature_cols:
            print(f"⚠️ Feature columns for {plugin_name} not found")
            return 0.0
        
        # ✅ 3. Prepare features từ user_data
        X = prepare_features(user_data, feature_cols, plugin_name)
        
        if X is None or len(X) == 0:
            print(f"⚠️ Failed to prepare features for {plugin_name}")
            return 0.0
        
        # ✅ 4. Make prediction
        try:
            # Ensure X is 2D array for sklearn models
            if X.ndim == 1:
                X = X.reshape(1, -1)
            
            probability = model.predict_proba(X)[0][1]  # Class 1 probability
            probability = float(probability)
            
            # Clamp to 0-1 range
            probability = max(0.0, min(1.0, probability))
            
            print(f"✅ ML Prediction for {plugin_name}: {probability:.3f}")
            return probability
        
        except AttributeError:
            # Model doesn't have predict_proba, try predict
            prediction = model.predict(X)[0]
            return float(prediction)
    
    except Exception as e:
        print(f"❌ ML prediction error for {plugin_name}: {e}")
        return 0.0


# ============================================================
# ✅ HELPER FUNCTION: Load Model
# ============================================================

def load_model(plugin_name: str):
    """
    Load ML model from pickle file
    """
    try:
        model_path = f"backend/ml/models/{plugin_name}_best_model.pkl"
        
        # Try different path variations
        if not os.path.exists(model_path):
            model_path = f"ml/models/{plugin_name}_best_model.pkl"
        
        if not os.path.exists(model_path):
            model_path = f"app/../ml/models/{plugin_name}_best_model.pkl"
        
        if not os.path.exists(model_path):
            print(f"❌ Model file not found: {model_path}")
            return None
        
        with open(model_path, 'rb') as f:
            model = pickle.load(f)
        
        print(f"✅ Loaded model from {model_path}")
        return model
    
    except Exception as e:
        print(f"❌ Error loading model: {e}")
        return None


# ============================================================
# ✅ HELPER FUNCTION: Load Feature Columns
# ============================================================

def load_feature_columns(plugin_name: str):
    """
    Load feature column names from pickle file
    """
    try:
        # Try different path variations
        paths = [
            f"backend/ml/models/feature_cols.pkl",
            f"ml/models/feature_cols.pkl",
            f"backend/ml/models/{plugin_name}_feature_cols.pkl",
        ]
        
        feature_path = None
        for path in paths:
            if os.path.exists(path):
                feature_path = path
                break
        
        if not feature_path:
            print(f"⚠️ Feature columns file not found")
            return None
        
        with open(feature_path, 'rb') as f:
            feature_cols = pickle.load(f)
        
        print(f"✅ Loaded {len(feature_cols)} feature columns")
        return feature_cols
    
    except Exception as e:
        print(f"❌ Error loading feature columns: {e}")
        return None


# ============================================================
# ✅ HELPER FUNCTION: Prepare Features
# ============================================================

def prepare_features(user_data: Dict[str, Any], feature_cols: list, plugin_name: str) -> np.ndarray:
    """
    Convert user input dict to feature array matching model's expected columns
    
    Maps Vietnamese field names to English feature names
    """
    try:
        # ✅ Vietnamese to English field mapping
        field_mapping = {
            "tuoi": "age",
            "gioi": "gender",
            "bmi": "bmi",
            "vongEo": "waist_circumference",
            "huyetApTamThu": "systolic_bp",
            "huyetApTamTruong": "diastolic_bp",
            "caoHuyetAp": "hypertension",
            "tieuDuong": "diabetes",
            "hutThuoc": "smoking",
            "soPhutVanDongMoiTuan": "physical_activity_minutes",
            "giaDinhCaoHuyetAp": "family_hypertension",
            "giaDinhTieuDuong": "family_diabetes",
            "giaDinhTimMach": "family_heart_disease",
            "canNang": "weight",
            "chieuCao": "height",
        }
        
        # ✅ Map fields and handle missing values
        X = []
        for feature in feature_cols:
            # Try to find the Vietnamese field name
            vietnamese_name = None
            for vn_name, en_name in field_mapping.items():
                if en_name == feature or feature == vn_name:
                    vietnamese_name = vn_name
                    break
            
            # Get value from user_data
            if vietnamese_name and vietnamese_name in user_data:
                value = user_data[vietnamese_name]
            elif feature in user_data:
                value = user_data[feature]
            else:
                # ❌ Missing feature - use default
                print(f"⚠️ Missing feature: {feature}, using default")
                value = 0 if feature not in ["gender"] else 0
            
            # Convert boolean to int if needed
            if isinstance(value, bool):
                value = int(value)
            
            # Convert to float
            try:
                value = float(value) if value is not None else 0.0
            except:
                value = 0.0
            
            X.append(value)
        
        return np.array([X])  # Return 2D array
    
    except Exception as e:
        print(f"❌ Error preparing features: {e}")
        return None


# ============================================================
# Legacy functions (keep existing code):
# - train_model(...)
# - evaluate_model(...)
# - save_model(...)
# ============================================================
# These should remain unchanged