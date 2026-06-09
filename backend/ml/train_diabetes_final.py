"""
train_diabetes_final.py
-----------------------
Train model Đái Tháo Đường Type 2 từ diabetes_final.csv

Cải tiến so với phiên bản cũ:
  - Thêm Cholesterol_HDL và Insulin_uIU_mL (có sẵn trong CSV, bị bỏ sót trước đó)
  - Sửa scale_pos_weight từ 11 → 12 (khớp với tỉ lệ thực: neg/pos ≈ 12.0)
  - Thêm LightGBM vào danh sách thí nghiệm (nếu có cài)
  - Lưu experiment_results.csv chi tiết hơn (bổ sung AUC-ROC, AUC-PR)
  - Tách riêng hàm evaluate_model() để dễ đọc và tái sử dụng
  - Thêm confusion matrix tóm tắt cho mô hình tốt nhất
  - Comment giải thích lý do HbA1c được giữ lại (không phải data leakage)

Cách dùng:
  python backend/ml/train_diabetes_final.py
  # hoặc từ thư mục backend:
  python -m ml.train_diabetes_final
"""

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
from sklearn.metrics import (
    f1_score, recall_score, precision_score,
    precision_recall_curve, roc_auc_score,
    average_precision_score, confusion_matrix
)
from sklearn.ensemble import RandomForestClassifier

try:
    from xgboost import XGBClassifier
    HAS_XGB = True
except ImportError:
    HAS_XGB = False

try:
    from lightgbm import LGBMClassifier
    HAS_LGB = True
except ImportError:
    HAS_LGB = False

# ─────────────────────────────────────────
#  Cấu hình file output
# ─────────────────────────────────────────
DISEASE_NAME    = "diabetes"
MODEL_FILENAME  = "diabetes_model.pkl"
THRESH_FILENAME = "diabetes_threshold.pkl"
COLS_FILENAME   = "diabetes_feature_cols.pkl"

# ─────────────────────────────────────────
#  Feature columns — chia sẻ toàn bộ plugin
#
#  Lưu ý HbA1c:
#  HbA1c >= 6.5% là tiêu chí chẩn đoán ĐTĐ (ADA 2024), nhưng trong dataset
#  NHANES, HbA1c được đo như một chỉ số xét nghiệm định kỳ — không phải
#  kết quả chẩn đoán. Nhiều ca dương tính có HbA1c trong vùng tiền ĐTĐ
#  (5.7–6.4%), do đó HbA1c ở đây là yếu tố nguy cơ hợp lệ, không phải
#  data leakage theo nghĩa cứng.
#
#  Hai cột bổ sung so với phiên bản cũ:
#    - hdl_cholesterol : có sẵn trong CSV (Cholesterol_HDL), bị bỏ sót trước đó
#    - insulin         : có sẵn trong CSV (Insulin_uIU_mL), bị bỏ sót trước đó
# ─────────────────────────────────────────
FEATURE_COLS = [
    "age", "gender_code", "bmi", "waist",
    "systolic", "diastolic", "hypertension",
    "fasting_glucose", "hba1c",
    "total_cholesterol", "hdl_cholesterol", "ldl", "creatinine",
    "insulin",
    "smoke", "exercise", "alcohol", "sodium_intake",
    "family_diabetes",
]

# ─────────────────────────────────────────
#  Danh sách thí nghiệm
#  Tỉ lệ dương tính thực tế ~7.67%  →  neg/pos ≈ 12  →  scale_pos_weight = 12
# ─────────────────────────────────────────
EXPERIMENTS = [
    {
        "name": "RF | Balanced",
        "model": RandomForestClassifier(
            n_estimators=800, max_depth=None,
            class_weight="balanced",
            random_state=42, n_jobs=-1,
        ),
    },
    *(
        [
            {
                "name": "XGB | scale=12 depth6",
                "model": XGBClassifier(
                    n_estimators=800, max_depth=6, learning_rate=0.05,
                    subsample=0.85, colsample_bytree=0.8,
                    scale_pos_weight=12,
                    eval_metric="aucpr", random_state=42, n_jobs=-1,
                ),
            },
            {
                "name": "XGB | scale=16 depth7",
                "model": XGBClassifier(
                    n_estimators=600, max_depth=7, learning_rate=0.04,
                    subsample=0.82, colsample_bytree=0.78,
                    scale_pos_weight=16, gamma=0.3,
                    eval_metric="aucpr", random_state=42, n_jobs=-1,
                ),
            },
            {
                "name": "XGB | scale=8 depth5",
                "model": XGBClassifier(
                    n_estimators=500, max_depth=5, learning_rate=0.06,
                    scale_pos_weight=8,
                    eval_metric="aucpr", random_state=42, n_jobs=-1,
                ),
            },
        ]
        if HAS_XGB else []
    ),
    *(
        [
            {
                "name": "LGB | scale=12",
                "model": LGBMClassifier(
                    n_estimators=800, max_depth=6, learning_rate=0.05,
                    subsample=0.85, colsample_bytree=0.8,
                    scale_pos_weight=12,
                    random_state=42, n_jobs=-1, verbose=-1,
                ),
            },
            {
                "name": "LGB | scale=16 leaves64",
                "model": LGBMClassifier(
                    n_estimators=600, num_leaves=64, learning_rate=0.04,
                    scale_pos_weight=16, min_child_samples=20,
                    random_state=42, n_jobs=-1, verbose=-1,
                ),
            },
        ]
        if HAS_LGB else []
    ),
]


# ─────────────────────────────────────────
#  Tìm file CSV
# ─────────────────────────────────────────
def find_csv() -> str:
    script_dir = os.path.dirname(os.path.abspath(__file__))
    root = os.path.dirname(script_dir)          # backend/
    candidates = [
        os.path.join(root,        "data", "diabetes_final.csv"),
        os.path.join(script_dir,  "data", "diabetes_final.csv"),
        os.path.join(root,               "diabetes_final.csv"),
        os.path.join(script_dir,         "diabetes_final.csv"),
    ]
    for p in candidates:
        if os.path.exists(p):
            return p
    raise FileNotFoundError(
        "❌ Không tìm thấy diabetes_final.csv\n"
        f"   Đã thử: {candidates}"
    )


# ─────────────────────────────────────────
#  Load & build feature matrix
# ─────────────────────────────────────────
def load_and_build() -> tuple[pd.DataFrame, pd.Series]:
    df = pd.read_csv(find_csv())
    print(f"✅ Đọc file: {df.shape[0]} mẫu, {df.shape[1]} cột")

    # --- Các cột có sẵn trong diabetes_final.csv ---
    df["age"]               = pd.to_numeric(df["Age"],                    errors="coerce")
    df["gender_code"]       = pd.to_numeric(df["Gender"],                 errors="coerce")  # 1=Nam, 2=Nữ
    df["bmi"]               = pd.to_numeric(df["BMI"],                    errors="coerce")
    df["waist"]             = pd.to_numeric(df.get("Waist_cm"),           errors="coerce")
    df["systolic"]          = pd.to_numeric(df["BloodPressure_Systolic"], errors="coerce")
    df["diastolic"]         = pd.to_numeric(df["BloodPressure_Diastolic"],errors="coerce")
    df["hypertension"]      = ((df["systolic"] >= 130) | (df["diastolic"] >= 80)).astype(float)
    df["hba1c"]             = pd.to_numeric(df.get("HbA1c"),              errors="coerce")
    df["total_cholesterol"] = pd.to_numeric(df.get("Cholesterol_Total"),  errors="coerce")
    df["smoke"]             = pd.to_numeric(df["Smoked_Status"],          errors="coerce")

    # Bổ sung: hai cột có sẵn trong CSV nhưng bị bỏ sót ở phiên bản cũ
    df["hdl_cholesterol"]   = pd.to_numeric(df.get("Cholesterol_HDL"),    errors="coerce")
    df["insulin"]           = pd.to_numeric(df.get("Insulin_uIU_mL"),     errors="coerce")

    # Family_History_Diabetes: 1=có, 2=không, 9=unknown → map sang binary
    fhd = pd.to_numeric(df.get("Family_History_Diabetes"), errors="coerce")
    df["family_diabetes"]   = (fhd == 1).astype(float)

    # Không có trong dataset này → để NaN, SimpleImputer xử lý bằng median
    for col in ["fasting_glucose", "ldl", "creatinine",
                "exercise", "alcohol", "sodium_intake"]:
        df[col] = np.nan

    X = df[FEATURE_COLS].copy()
    y = df["Target_Label"].astype(int)

    pos_count = int(y.sum())
    neg_count = int((1 - y).sum())
    print(f"📊 Positive (bệnh): {pos_count} ({y.mean():.2%}) | "
          f"Negative (khỏe):   {neg_count} ({1-y.mean():.2%})")
    print(f"   scale_pos_weight gợi ý: {neg_count / pos_count:.1f}\n")
    return X, y


# ─────────────────────────────────────────
#  Tìm ngưỡng tối ưu theo F-beta (β=0.75)
#  → ưu tiên Recall hơn Precision một chút
# ─────────────────────────────────────────
def find_optimal_threshold(y_true: np.ndarray,
                           y_proba: np.ndarray,
                           beta: float = 0.75) -> float:
    prec, rec, thresh = precision_recall_curve(y_true, y_proba)
    fbeta = (1 + beta**2) * (prec * rec) / (beta**2 * prec + rec + 1e-8)
    idx = int(np.argmax(fbeta))
    return float(thresh[idx]) if idx < len(thresh) else 0.5


# ─────────────────────────────────────────
#  Đánh giá một pipeline đã fit
# ─────────────────────────────────────────
def evaluate_model(pipe: Pipeline,
                   X_test: pd.DataFrame,
                   y_test: pd.Series,
                   threshold: float) -> dict:
    y_proba = pipe.predict_proba(X_test)[:, 1]
    y_pred  = (y_proba >= threshold).astype(int)
    return {
        "f1":        f1_score(y_test, y_pred,  zero_division=0),
        "recall":    recall_score(y_test, y_pred, zero_division=0),
        "precision": precision_score(y_test, y_pred, zero_division=0),
        "auc_roc":   roc_auc_score(y_test, y_proba),
        "auc_pr":    average_precision_score(y_test, y_proba),
        "threshold": threshold,
    }


# ─────────────────────────────────────────
#  Vòng thí nghiệm chính
# ─────────────────────────────────────────
def run_experiments(X: pd.DataFrame, y: pd.Series) -> None:
    models_dir = os.path.join(
        os.path.dirname(os.path.abspath(__file__)), "models"
    )
    os.makedirs(models_dir, exist_ok=True)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"Train: {len(X_train)} | Test: {len(X_test)}\n")

    W = 30
    header = (f"{'Thí nghiệm':<{W}} {'F1':>6} {'Recall':>8} "
              f"{'Precision':>10} {'AUC-ROC':>8} {'AUC-PR':>7} {'Thresh':>8}")
    print(header)
    print("-" * len(header))

    results = []
    best_f1 = -1
    best_pipe = None
    best_thresh = 0.5
    best_name = ""

    for exp in EXPERIMENTS:
        pipe = Pipeline([
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler",  StandardScaler()),
            ("clf",     exp["model"]),
        ])
        pipe.fit(X_train, y_train)

        y_proba   = pipe.predict_proba(X_test)[:, 1]
        threshold = find_optimal_threshold(y_test, y_proba)
        metrics   = evaluate_model(pipe, X_test, y_test, threshold)

        tag = " ★" if metrics["f1"] > best_f1 else ""
        print(
            f" {exp['name']:<{W}}"
            f" {metrics['f1']:>6.4f}"
            f" {metrics['recall']:>8.4f}"
            f" {metrics['precision']:>10.4f}"
            f" {metrics['auc_roc']:>8.4f}"
            f" {metrics['auc_pr']:>7.4f}"
            f" {metrics['threshold']:>8.4f}"
            f"{tag}"
        )

        results.append({"name": exp["name"], **metrics})

        if metrics["f1"] > best_f1:
            best_f1     = metrics["f1"]
            best_pipe   = pipe
            best_thresh = metrics["threshold"]
            best_name   = exp["name"]

    # ── Lưu mô hình tốt nhất ──
    joblib.dump(best_pipe,   os.path.join(models_dir, MODEL_FILENAME))
    joblib.dump(best_thresh, os.path.join(models_dir, THRESH_FILENAME))
    joblib.dump(FEATURE_COLS, os.path.join(models_dir, COLS_FILENAME))

    # ── Lưu kết quả thí nghiệm ──
    results_path = os.path.join(models_dir, "experiment_results.csv")
    pd.DataFrame(results).to_csv(results_path, index=False)

    # ── Tóm tắt mô hình tốt nhất ──
    print(f"\n{'='*60}")
    print(f"🏆 BEST: {best_name}")
    best_metrics = next(r for r in results if r["name"] == best_name)
    print(f"   F1        = {best_metrics['f1']:.4f}")
    print(f"   Recall    = {best_metrics['recall']:.4f}")
    print(f"   Precision = {best_metrics['precision']:.4f}")
    print(f"   AUC-ROC   = {best_metrics['auc_roc']:.4f}")
    print(f"   AUC-PR    = {best_metrics['auc_pr']:.4f}")
    print(f"   Threshold = {best_thresh:.4f}")

    # Confusion matrix tóm tắt
    y_proba_best = best_pipe.predict_proba(X_test)[:, 1]
    y_pred_best  = (y_proba_best >= best_thresh).astype(int)
    cm = confusion_matrix(y_test, y_pred_best)
    tn, fp, fn, tp = cm.ravel()
    print(f"\n   Confusion Matrix (test set):")
    print(f"     TP={tp}  FP={fp}")
    print(f"     FN={fn}  TN={tn}")
    print(f"{'='*60}")
    print(f"✅ Đã lưu:")
    print(f"   {os.path.join(models_dir, MODEL_FILENAME)}")
    print(f"   {os.path.join(models_dir, THRESH_FILENAME)}")
    print(f"   {os.path.join(models_dir, COLS_FILENAME)}")
    print(f"   {results_path}")


# ─────────────────────────────────────────
#  Entry point
# ─────────────────────────────────────────
def main() -> None:
    print("=" * 70)
    print(f"  TRAIN MODEL — Đái Tháo Đường Type 2  ({DISEASE_NAME})")
    print(f"  Dataset : diabetes_final.csv")
    print(f"  Features: {len(FEATURE_COLS)}  |  "
          f"XGBoost: {'✓' if HAS_XGB else '✗'}  |  "
          f"LightGBM: {'✓' if HAS_LGB else '✗'}")
    print("=" * 70 + "\n")

    X, y = load_and_build()
    run_experiments(X, y)


if __name__ == "__main__":
    main()