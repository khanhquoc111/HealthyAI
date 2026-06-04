import os
import warnings
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
    from xgboost import XGBClassifier
    HAS_XGB = True
    print("✅ XGBoost đã sẵn sàng")
except ImportError:
    HAS_XGB = False
    print("⚠️ Cài XGBoost: pip install xgboost")


FEATURE_COLS = [
    "age", "gender_code", "bmi", "waist", "systolic", "diastolic", "hypertension",
    "fasting_glucose", "hba1c", "total_cholesterol", "ldl", "creatinine",
    "smoke", "exercise", "alcohol", "sodium_intake",
    "family_hypertension", "family_cardiovascular",
]

# ══════════════════════════════════════════════════════════════════════════════
# EXPERIMENTS SIÊU MẠNH - TẬP TRUNG CAO CHO Y TẾ
# ══════════════════════════════════════════════════════════════════════════════

EXPERIMENTS = [
    # Random Forest mạnh
    {"name": "RF | Ultra Strong",
     "model": RandomForestClassifier(n_estimators=1200, max_depth=None, min_samples_leaf=1,
                                     class_weight="balanced", random_state=42, n_jobs=-1)},

    # XGBoost Heavy Tuning (ưu tiên Recall + F1 cao)
    *([
        {"name": "XGB | scale=15 - depth7",
         "model": XGBClassifier(n_estimators=1000, max_depth=7, learning_rate=0.04,
                                subsample=0.82, colsample_bytree=0.78, scale_pos_weight=15,
                                gamma=0.4, min_child_weight=2, reg_lambda=1.2,
                                eval_metric="aucpr", random_state=42, n_jobs=-1)},

        {"name": "XGB | scale=18 - depth6",
         "model": XGBClassifier(n_estimators=800, max_depth=6, learning_rate=0.05,
                                subsample=0.85, colsample_bytree=0.8, scale_pos_weight=18,
                                gamma=0.3, min_child_weight=3,
                                eval_metric="aucpr", random_state=42, n_jobs=-1)},

        {"name": "XGB | scale=12 - depth8",
         "model": XGBClassifier(n_estimators=900, max_depth=8, learning_rate=0.03,
                                subsample=0.8, colsample_bytree=0.75, scale_pos_weight=12,
                                gamma=0.5, min_child_weight=2,
                                eval_metric="aucpr", random_state=42, n_jobs=-1)},

        {"name": "XGB | High Recall",
         "model": XGBClassifier(n_estimators=700, max_depth=5, learning_rate=0.06,
                                subsample=0.78, colsample_bytree=0.82, scale_pos_weight=20,
                                eval_metric="aucpr", random_state=42, n_jobs=-1)},

        {"name": "XGB | Balanced Best",
         "model": XGBClassifier(n_estimators=850, max_depth=7, learning_rate=0.045,
                                subsample=0.83, colsample_bytree=0.79, scale_pos_weight=14,
                                gamma=0.4, min_child_weight=2.5,
                                eval_metric="aucpr", random_state=42, n_jobs=-1)},
    ] if HAS_XGB else []),
]


# (Phần code bên dưới giữ nguyên như phiên bản trước - find_data_dir, load_and_merge_data, build_features, run_experiments, main)

def find_data_dir():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    possible_dirs = [os.path.join(project_root, "data"), os.path.join(script_dir, "data"), project_root]
    required = ["demographic.csv", "diet.csv", "examination.csv", "questionnaire.csv", "labs.csv", "medications.csv"]
    for d in possible_dirs:
        if all(os.path.exists(os.path.join(d, f)) for f in required):
            print(f"✅ Tìm thấy dữ liệu tại: {d}")
            return d
    raise FileNotFoundError("❌ Không tìm thấy thư mục data!")


def read_csv_safe(path):
    for enc in ["utf-8", "utf-8-sig", "latin1", "cp1252"]:
        try:
            return pd.read_csv(path, encoding=enc, low_memory=False)
        except Exception:
            continue
    raise Exception(f"Không đọc được file: {path}")


def load_and_merge_data():
    data_dir = find_data_dir()
    print(f"Đọc dữ liệu từ: {data_dir}")
    demo = read_csv_safe(os.path.join(data_dir, "demographic.csv"))
    diet = read_csv_safe(os.path.join(data_dir, "diet.csv"))
    exam = read_csv_safe(os.path.join(data_dir, "examination.csv"))
    quest = read_csv_safe(os.path.join(data_dir, "questionnaire.csv"))
    labs = read_csv_safe(os.path.join(data_dir, "labs.csv"))
    
    df = demo[["SEQN", "RIDAGEYR", "RIAGENDR"]].copy()
    for src, cols in [
        (diet, ["SEQN", "DR1TSODI"]),
        (exam, ["SEQN", "BMXBMI", "BMXWAIST", "BPXSY1", "BPXSY2", "BPXDI1", "BPXDI2"]),
        (quest, ["SEQN", "DIQ010", "SMQ020", "ALQ130", "BPQ020", "MCQ160A", "PAQ650"]),
        (labs, ["SEQN", "LBXSGL", "LBXGH", "LBXTC", "LBDLDL", "LBXSCR"]),
    ]:
        df = df.merge(src[cols], on="SEQN", how="left")
    print(f"✅ Đã gộp: {df.shape[0]} mẫu, {df.shape[1]} cột")
    return df


def build_features(df):
    df = df[df["DIQ010"].isin([1, 2, 3])].copy()
    df["Target"] = (df["DIQ010"] == 1).astype(int)
    df["age"] = pd.to_numeric(df["RIDAGEYR"], errors="coerce")
    df["gender_code"] = pd.to_numeric(df["RIAGENDR"], errors="coerce")
    df["bmi"] = pd.to_numeric(df["BMXBMI"], errors="coerce")
    df["waist"] = pd.to_numeric(df["BMXWAIST"], errors="coerce")
    for c in ["BPXSY1", "BPXSY2", "BPXDI1", "BPXDI2"]:
        df[c] = pd.to_numeric(df[c], errors="coerce")
    df["systolic"] = df[["BPXSY1", "BPXSY2"]].mean(axis=1)
    df["diastolic"] = df[["BPXDI1", "BPXDI2"]].mean(axis=1)
    df["hypertension"] = ((df["systolic"] >= 130) | (df["diastolic"] >= 80)).astype(float)
    df["fasting_glucose"] = pd.to_numeric(df.get("LBXSGL"), errors="coerce")
    df["hba1c"] = pd.to_numeric(df.get("LBXGH"), errors="coerce")
    df["total_cholesterol"] = pd.to_numeric(df.get("LBXTC"), errors="coerce")
    df["ldl"] = pd.to_numeric(df.get("LBDLDL"), errors="coerce")
    df["creatinine"] = pd.to_numeric(df.get("LBXSCR"), errors="coerce")
    df["smoke"] = (pd.to_numeric(df.get("SMQ020"), errors="coerce") == 1).astype(float)
    df["exercise"] = (pd.to_numeric(df.get("PAQ650"), errors="coerce") == 1).astype(float)
    df["alcohol"] = pd.to_numeric(df.get("ALQ130"), errors="coerce").fillna(0)
    df["sodium_intake"] = pd.to_numeric(df.get("DR1TSODI"), errors="coerce")
    df["family_hypertension"] = (pd.to_numeric(df.get("BPQ020"), errors="coerce") == 1).astype(float)
    df["family_cardiovascular"] = (pd.to_numeric(df.get("MCQ160A"), errors="coerce") == 1).astype(float)

    X = df[FEATURE_COLS].copy()
    y = df["Target"].copy()
    print(f"📊 Số mẫu: {len(df)} | Positive rate: {y.mean():.4f}\n")
    return X, y


def find_optimal_threshold(y_true, y_proba, beta=0.75):
    prec, rec, thresh = precision_recall_curve(y_true, y_proba)
    fbeta = (1 + beta**2) * (prec * rec) / (beta**2 * prec + rec + 1e-8)
    best_idx = np.argmax(fbeta)
    return float(thresh[best_idx]) if best_idx < len(thresh) else 0.5


def run_experiments(X, y):
    script_dir = os.path.dirname(os.path.abspath(__file__))
    models_dir = os.path.join(script_dir, "models")
    os.makedirs(models_dir, exist_ok=True)

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    print(f"Train: {len(X_train)} | Test: {len(X_test)}\n")

    W = 45
    print(f"{'Thí nghiệm':<{W}} {'F1':>6} {'Recall':>8} {'Precision':>10} {'Thresh':>8}")
    print("-" * (W + 40))

    best_f1 = -1
    best_pipe = None
    best_thresh = 0.5
    best_name = ""
    results = []

    for exp in EXPERIMENTS:
        name = exp["name"]
        clf = exp["model"]

        pipe = Pipeline([("imputer", SimpleImputer(strategy="median")),
                         ("scaler", StandardScaler()),
                         ("clf", clf)])
        pipe.fit(X_train, y_train)

        y_proba = pipe.predict_proba(X_test)[:, 1]
        opt_th = find_optimal_threshold(y_test, y_proba)
        y_pred = (y_proba >= opt_th).astype(int)

        f1 = f1_score(y_test, y_pred, zero_division=0)
        rec = recall_score(y_test, y_pred, zero_division=0)
        pre = precision_score(y_test, y_pred, zero_division=0)

        tag = " ★" if f1 > best_f1 else ""
        print(f" {name:<{W}} {f1:>6.4f} {rec:>8.4f} {pre:>10.4f} {opt_th:>8.4f}{tag}")

        results.append({"Thí nghiệm": name, "F1": round(f1,4), "Recall": round(rec,4), 
                       "Precision": round(pre,4), "Threshold": round(opt_th,4)})

        if f1 > best_f1:
            best_f1 = f1
            best_pipe = pipe
            best_thresh = opt_th
            best_name = name

    joblib.dump(best_pipe, os.path.join(models_dir, "screening_best_model.pkl"))
    joblib.dump(best_thresh, os.path.join(models_dir, "screening_best_threshold.pkl"))
    joblib.dump(FEATURE_COLS, os.path.join(models_dir, "feature_cols.pkl"))

    df_res = pd.DataFrame(results).sort_values("F1", ascending=False)
    df_res.to_csv(os.path.join(models_dir, "experiment_results.csv"), index=False, encoding="utf-8-sig")

    print("\n" + "="*90)
    print(f"🏆 BEST MODEL: {best_name}")
    print(f"    F1 = {best_f1:.4f} | Recall = {rec:.4f} | Threshold = {best_thresh:.4f}")
    print(f"✅ Model đã lưu tại: {models_dir}")


def main():
    print("🚀 Training mô hình sàng lọc tiểu đường - Phiên bản SIÊU MẠNH\n")
    df = load_and_merge_data()
    X, y = build_features(df)
    print(f"Tổng số thí nghiệm: {len(EXPERIMENTS)}")
    print("="*90)
    run_experiments(X, y)


if __name__ == "__main__":
    main()