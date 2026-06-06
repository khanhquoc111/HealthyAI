# debug_ai_model.py
"""
Script để debug AI model - kiểm tra predict_proba() có hoạt động đúng
Chạy: python debug_ai_model.py
"""

import pandas as pd
import numpy as np
import joblib
from pathlib import Path

# Dữ liệu test từ debug logs
test_data = {
    'age': 23.0,
    'bmi': 29.4,
    'waist': 100.0,
    'fasting_glucose': 80.0,
    'hba1c': 5.0,
    'total_cholesterol': 180.0,
    'ldl': 109.8,
    'hdl': 70.0,
    'triglyceride': 5.0,
    'creatinine': 1.0,
    'systolic': 165.0,
    'diastolic': 120.0,
    'gender_code': 1.0,  # Nam
    'smoke': 0.0,  # Không hút
    'exercise': 450.0,  # 450 phút/tuần
    'family_history_diabetes': 1.0,  # Có
}

def debug_ai_model(disease: str):
    """Debug AI model cho bệnh cụ thể"""
    print(f"\n{'='*70}")
    print(f"🔍 DEBUG: {disease.upper()}")
    print(f"{'='*70}")
    
    # Load model
    model_path = Path(f"ml/models/{disease}_risk_model.pkl")
    features_path = Path(f"ml/models/{disease}_features.pkl")
    threshold_path = Path(f"ml/models/{disease}_threshold.pkl")
    
    if not model_path.exists():
        print(f"❌ Model không tìm thấy: {model_path}")
        return
    
    print(f"✓ Load model: {model_path}")
    model = joblib.load(model_path)
    
    print(f"✓ Load features: {features_path}")
    features = joblib.load(features_path) if features_path.exists() else []
    
    print(f"✓ Load threshold: {threshold_path}")
    threshold = joblib.load(threshold_path) if threshold_path.exists() else 0.5
    
    print(f"\n📊 Model info:")
    print(f"  - Features required: {len(features)}")
    print(f"  - Threshold: {threshold:.4f}")
    print(f"  - Model type: {type(model).__name__}")
    
    # Chuẩn bị input
    print(f"\n📥 Preparing input...")
    input_data = {}
    missing = []
    
    for feat in features:
        if feat in test_data:
            input_data[feat] = test_data[feat]
            print(f"  ✓ {feat:35} = {test_data[feat]}")
        else:
            missing.append(feat)
            print(f"  ❌ {feat:35} = MISSING")
    
    if missing:
        print(f"\n⚠️  Missing {len(missing)} features: {missing}")
        return
    
    # Predict
    print(f"\n🤖 Predicting...")
    try:
        df_input = pd.DataFrame([input_data])
        print(f"  Input shape: {df_input.shape}")
        print(f"  Input dtypes:\n{df_input.dtypes}")
        
        # Check for NaN
        if df_input.isnull().any().any():
            print(f"  ⚠️  WARNING: Input contains NaN values!")
            print(f"  {df_input.isnull().sum()}")
        
        # Get prediction
        predictions = model.predict_proba(df_input)
        print(f"  Predictions shape: {predictions.shape}")
        print(f"  Predictions: {predictions}")
        
        proba = predictions[0, 1]  # Positive class probability
        print(f"\n📈 Results:")
        print(f"  Probability (raw): {proba}")
        print(f"  Probability (clamped): {max(0.0, min(1.0, proba))}")
        print(f"  Threshold: {threshold}")
        print(f"  Score: {proba * 100:.2f}")
        
        # Check edge cases
        if pd.isna(proba):
            print(f"  ❌ ERROR: NaN probability!")
        elif np.isinf(proba):
            print(f"  ❌ ERROR: Inf probability!")
        elif proba < 0 or proba > 1:
            print(f"  ⚠️  WARNING: Probability out of range [0,1]!")
        else:
            print(f"  ✓ Probability valid")
        
        # Risk level
        if proba >= threshold:
            risk = "HIGH"
        elif proba >= threshold * 0.6:
            risk = "MEDIUM"
        else:
            risk = "LOW"
        
        print(f"  Risk level: {risk}")
        
    except Exception as e:
        print(f"  ❌ ERROR: {e}")
        import traceback
        traceback.print_exc()

# Main
if __name__ == "__main__":
    print("🚀 Debugging AI Models...")
    
    for disease in ["diabetes", "hypertension", "cardiovascular", "ckd"]:
        debug_ai_model(disease)
    
    print(f"\n{'='*70}")
    print("✅ Debug hoàn thành!")
    print(f"{'='*70}")