"""
train_cardiovascular_final.py
-----------------------------
Train model Bệnh Tim Mạch từ cardio_final.csv
Cách dùng: python backend/ml/train_cardiovascular_final.py
"""
import os, warnings
warnings.filterwarnings("ignore")
import numpy as np
import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.metrics import f1_score, recall_score, precision_score, precision_recall_curve
from sklearn.ensemble import RandomForestClassifier
try:
    from xgboost import XGBClassifier; HAS_XGB = True
except ImportError:
    HAS_XGB = False

DISEASE_NAME    = "cardiovascular"
MODEL_FILENAME  = "cardiovascular_model.pkl"
THRESH_FILENAME = "cardiovascular_threshold.pkl"
COLS_FILENAME   = "cardiovascular_feature_cols.pkl"

FEATURE_COLS = [
    "age", "gender_code", "bmi", "waist", "systolic", "diastolic", "hypertension",
    "fasting_glucose", "hba1c", "total_cholesterol", "ldl", "creatinine",
    "smoke", "exercise", "alcohol", "sodium_intake",
    "family_hypertension", "family_cardiovascular",
]

# positive rate ~50% → scale_pos_weight=1
EXPERIMENTS = [
    {"name": "RF | Balanced", "model": RandomForestClassifier(
        n_estimators=800, max_depth=None, class_weight="balanced",
        random_state=42, n_jobs=-1)},
    *([ 
        {"name": "XGB | depth6", "model": XGBClassifier(
            n_estimators=800, max_depth=6, learning_rate=0.05,
            subsample=0.85, colsample_bytree=0.8, scale_pos_weight=1,
            eval_metric="logloss", random_state=42, n_jobs=-1)},
        {"name": "XGB | depth8 strong", "model": XGBClassifier(
            n_estimators=600, max_depth=8, learning_rate=0.04,
            subsample=0.82, colsample_bytree=0.78, gamma=0.3,
            eval_metric="logloss", random_state=42, n_jobs=-1)},
        {"name": "XGB | depth5 fast", "model": XGBClassifier(
            n_estimators=500, max_depth=5, learning_rate=0.08,
            eval_metric="logloss", random_state=42, n_jobs=-1)},
    ] if HAS_XGB else []),
]

def find_csv():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    root = os.path.dirname(script_dir)
    for p in [os.path.join(root,"data","cardio_final.csv"),
              os.path.join(script_dir,"data","cardio_final.csv"),
              os.path.join(root,"cardio_final.csv"),
              os.path.join(script_dir,"cardio_final.csv")]:
        if os.path.exists(p): return p
    raise FileNotFoundError("❌ Không tìm thấy cardio_final.csv")

def load_and_build():
    df = pd.read_csv(find_csv())
    print(f"✅ Đọc: {df.shape[0]} mẫu\n")
    df["age"]          = pd.to_numeric(df["Age"], errors="coerce")
    df["gender_code"]  = pd.to_numeric(df["Gender"], errors="coerce")  # 1=Nam,2=Nữ
    df["bmi"]          = pd.to_numeric(df["BMI"], errors="coerce")
    df["systolic"]     = pd.to_numeric(df["BloodPressure_Systolic"], errors="coerce")
    df["diastolic"]    = pd.to_numeric(df["BloodPressure_Diastolic"], errors="coerce")
    df["hypertension"] = ((df["systolic"] >= 130) | (df["diastolic"] >= 80)).astype(float)
    df["smoke"]        = pd.to_numeric(df["Smoked_Status"], errors="coerce")
    df["alcohol"]      = pd.to_numeric(df["Alcohol_Use"], errors="coerce")
    df["exercise"]     = pd.to_numeric(df["Physical_Activity"], errors="coerce")

    # Cholesterol: 1=bình thường, 2=trên bình thường, 3=cao → mg/dL proxy
    chol_map = {1: 185.0, 2: 220.0, 3: 260.0}
    df["total_cholesterol"] = pd.to_numeric(df["Cholesterol"], errors="coerce").map(chol_map)

    # Glucose: 1=bình thường, 2=trên bình thường, 3=cao → mg/dL proxy
    gluc_map = {1: 90.0, 2: 115.0, 3: 160.0}
    df["fasting_glucose"] = pd.to_numeric(df["Glucose"], errors="coerce").map(gluc_map)

    # Không có trong dataset → NaN
    for col in ["waist","hba1c","ldl","creatinine","sodium_intake",
                "family_hypertension","family_cardiovascular"]:
        df[col] = np.nan

    X = df[FEATURE_COLS].copy()
    y = df["Target_Label"].astype(int)
    pos = y.mean()
    print(f"📊 Mẫu: {len(df)} | Positive: {y.sum()} ({pos:.2%}) | Negative: {(1-y).sum()}\n")
    return X, y

def find_optimal_threshold(y_true, y_proba, beta=0.75):
    prec, rec, thresh = precision_recall_curve(y_true, y_proba)
    fbeta = (1+beta**2)*(prec*rec)/(beta**2*prec+rec+1e-8)
    idx = np.argmax(fbeta)
    return float(thresh[idx]) if idx < len(thresh) else 0.5

def run_experiments(X, y):
    models_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
    os.makedirs(models_dir, exist_ok=True)
    X_train,X_test,y_train,y_test = train_test_split(X,y,test_size=0.2,random_state=42,stratify=y)
    print(f"Train: {len(X_train)} | Test: {len(X_test)}\n")
    W=28
    print(f"{'Thí nghiệm':<{W}} {'F1':>6} {'Recall':>8} {'Precision':>10} {'Thresh':>8}")
    print("-"*(W+40))
    best_f1=-1; best_pipe=None; best_thresh=0.5; best_name=""; best_rec=0
    for exp in EXPERIMENTS:
        pipe = Pipeline([("imputer",SimpleImputer(strategy="median")),
                         ("scaler",StandardScaler()),("clf",exp["model"])])
        pipe.fit(X_train,y_train)
        yp = pipe.predict_proba(X_test)[:,1]
        th = find_optimal_threshold(y_test,yp)
        ypred = (yp>=th).astype(int)
        f1=f1_score(y_test,ypred,zero_division=0)
        rec=recall_score(y_test,ypred,zero_division=0)
        pre=precision_score(y_test,ypred,zero_division=0)
        tag=" ★" if f1>best_f1 else ""
        print(f" {exp['name']:<{W}} {f1:>6.4f} {rec:>8.4f} {pre:>10.4f} {th:>8.4f}{tag}")
        if f1>best_f1: best_f1=f1;best_pipe=pipe;best_thresh=th;best_name=exp["name"];best_rec=rec
    joblib.dump(best_pipe,  os.path.join(models_dir,MODEL_FILENAME))
    joblib.dump(best_thresh,os.path.join(models_dir,THRESH_FILENAME))
    joblib.dump(FEATURE_COLS,os.path.join(models_dir,COLS_FILENAME))
    print(f"\n🏆 BEST: {best_name} | F1={best_f1:.4f} | Recall={best_rec:.4f} | Threshold={best_thresh:.4f}")
    print(f"✅ Đã lưu: {os.path.join(models_dir,MODEL_FILENAME)}")

def main():
    print("="*70)
    print(f"  TRAIN MODEL — Bệnh Tim Mạch ({DISEASE_NAME})")
    print(f"  Dataset: cardio_final.csv | Features: {len(FEATURE_COLS)}")
    print("="*70+"\n")
    X,y = load_and_build()
    run_experiments(X,y)

if __name__ == "__main__":
    main()