"""
train_cardiovascular.py
-----------------------
Train model riêng cho plugin Bệnh Tim Mạch (cardiovascular).

Target: MCQ160B (coronary heart disease) hoặc MCQ160E (heart attack)
NHANES: 1 = đã được chẩn đoán, 2 = chưa → target = 1 nếu có 1 trong 2

Cách dùng:
    python train_cardiovascular.py
"""

import os
import json
import warnings
warnings.filterwarnings("ignore")

import numpy as np
import pandas as pd
import joblib

from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.metrics import f1_score, recall_score, precision_score, precision_recall_curve
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, ExtraTreesClassifier

try:
    from xgboost import XGBClassifier
    HAS_XGB = True
except ImportError:
    HAS_XGB = False

# ── Cấu hình plugin ──────────────────────────────────────────────────────────

PLUGIN_ID   = "cardiovascular"
PLUGIN_DIR = Path(__file__).parent.parent / "plugins" / PLUGIN_ID
OUTPUT_DIR  = PLUGIN_DIR  # model.pkl lưu thẳng vào thư mục plugin

# Features đúng với feature_cols trong metadata.json của cardiovascular
FEATURE_COLS = [
    "age", "gender_code", "bmi",
    "total_cholesterol", "ldl",
    "fasting_glucose",
    "hypertension", "smoke", "exercise",
    "family_cardiovascular",
]

# ── Load & merge NHANES ──────────────────────────────────────────────────────

def find_data_dir():
    base_dir = Path(__file__).parent.parent
    possible = [base_dir / "data", base_dir]
    required = ["demographic.csv", "examination.csv",
                "questionnaire.csv", "labs.csv"]
    for d in possible:
        if all((d / f).exists() for f in required):
            return d
    raise FileNotFoundError(
        "Không tìm thấy thư mục data/. "
        "Cần có: demographic.csv, examination.csv, questionnaire.csv, labs.csv"
    )


def read_csv_safe(path):
    for enc in ["utf-8", "utf-8-sig", "latin1", "cp1252"]:
        try:
            return pd.read_csv(path, encoding=enc, low_memory=False)
        except Exception:
            continue
    raise Exception(f"Không đọc được: {path}")


def load_and_merge():
    data_dir = find_data_dir()
    print(f"📂 Đọc dữ liệu từ: {data_dir}\n")

    demo  = read_csv_safe(data_dir / "demographic.csv")
    exam  = read_csv_safe(data_dir / "examination.csv")
    quest = read_csv_safe(data_dir / "questionnaire.csv")
    labs  = read_csv_safe(data_dir / "labs.csv")

    df = demo[["SEQN", "RIDAGEYR", "RIAGENDR"]].copy()

    exam_cols  = [c for c in ["SEQN", "BMXBMI", "BPXSY1", "BPXSY2",
                               "BPXDI1", "BPXDI2"] if c in exam.columns]
    # MCQ160B = Coronary Heart Disease, MCQ160E = Heart Attack
    quest_cols = [c for c in ["SEQN", "MCQ160B", "MCQ160E",
                               "SMQ020", "PAQ650", "BPQ020"] if c in quest.columns]
    labs_cols  = [c for c in ["SEQN", "LBXTC", "LBDLDL",
                               "LBXSGL"] if c in labs.columns]

    for src, cols in [(exam, exam_cols), (quest, quest_cols), (labs, labs_cols)]:
        df = df.merge(src[cols], on="SEQN", how="left")

    print(f"Đã gộp: {df.shape[0]} mẫu, {df.shape[1]} cột")
    return df


# ── Feature engineering ──────────────────────────────────────────────────────

def build_features(df):
    """
    Xây dựng feature space cho bệnh tim mạch.
    Target: MCQ160B==1 (CHD) HOẶC MCQ160E==1 (Heart Attack)
    """
    # Lọc mẫu có nhãn hợp lệ ở ít nhất 1 trong 2 cột target
    mcq_b = pd.to_numeric(df.get("MCQ160B"), errors="coerce")
    mcq_e = pd.to_numeric(df.get("MCQ160E"), errors="coerce")

    valid_mask = mcq_b.isin([1, 2]) | mcq_e.isin([1, 2])
    df = df[valid_mask].copy()

    # Target = 1 nếu có CHD hoặc Heart Attack
    df["target"] = ((mcq_b == 1) | (mcq_e == 1)).astype(int)

    # ── Demographic ──────────────────────────────────────────────────────────
    df["age"]         = pd.to_numeric(df["RIDAGEYR"], errors="coerce")
    df["gender_code"] = pd.to_numeric(df["RIAGENDR"], errors="coerce")

    # ── Body / BP ────────────────────────────────────────────────────────────
    df["bmi"] = pd.to_numeric(df["BMXBMI"], errors="coerce")

    for c in ["BPXSY1", "BPXSY2", "BPXDI1", "BPXDI2"]:
        df[c] = pd.to_numeric(df[c], errors="coerce")
    df["systolic"]     = df[["BPXSY1", "BPXSY2"]].mean(axis=1)
    df["diastolic"]    = df[["BPXDI1", "BPXDI2"]].mean(axis=1)
    df["hypertension"] = ((df["systolic"] >= 130) | (df["diastolic"] >= 80)).astype(float)

    # ── Lab values ───────────────────────────────────────────────────────────
    df["total_cholesterol"] = pd.to_numeric(df.get("LBXTC"),  errors="coerce")
    df["ldl"]               = pd.to_numeric(df.get("LBDLDL"), errors="coerce")
    df["fasting_glucose"]   = pd.to_numeric(df.get("LBXSGL"), errors="coerce")

    # ── Lifestyle ────────────────────────────────────────────────────────────
    smq = pd.to_numeric(df.get("SMQ020"), errors="coerce")
    df["smoke"] = (smq == 1).astype(float)

    paq = pd.to_numeric(df.get("PAQ650"), errors="coerce")
    df["exercise"] = (paq == 1).astype(float)

    # ── Family history proxy ──────────────────────────────────────────────────
    # BPQ020: đã được chẩn đoán THA → proxy family_cardiovascular
    bpq = pd.to_numeric(df.get("BPQ020"), errors="coerce")
    df["family_cardiovascular"] = (bpq == 1).astype(float)

    # ── Lọc features ─────────────────────────────────────────────────────────
    for c in FEATURE_COLS:
        if c not in df.columns:
            print(f"  ⚠ Thiếu feature '{c}' — để NaN, imputer xử lý")
            df[c] = np.nan

    X = df[FEATURE_COLS].copy()
    y = df["target"].copy()

    pos_rate = y.mean()
    print(f"Số mẫu hợp lệ : {len(df)}")
    print(f"Positive (có bệnh tim mạch): {y.sum()} ({pos_rate:.2%})")
    print(f"Negative (không bệnh)       : {(1-y).sum()} ({1-pos_rate:.2%})\n")

    if pos_rate < 0.01:
        print("⚠ Positive rate rất thấp — model có thể bị lệch. Kiểm tra lại cột target.")

    return X, y


# ── Train ────────────────────────────────────────────────────────────────────

def find_optimal_threshold(y_true, y_proba, beta=0.75):
    prec, rec, thresh = precision_recall_curve(y_true, y_proba)
    fbeta = (1 + beta**2) * (prec * rec) / (beta**2 * prec + rec + 1e-8)
    best_idx = np.argmax(fbeta)
    best_th  = float(thresh[best_idx]) if best_idx < len(thresh) else 0.5
    return best_th


def build_models(y_train):
    pos_weight = (len(y_train) - y_train.sum()) / max(y_train.sum(), 1)
    models = {
        "Logistic Regression": LogisticRegression(
            max_iter=2000, class_weight="balanced", C=0.5
        ),
        "Random Forest": RandomForestClassifier(
            n_estimators=500, max_depth=8, min_samples_leaf=3,
            class_weight="balanced", random_state=42, n_jobs=-1
        ),
        "Extra Trees": ExtraTreesClassifier(
            n_estimators=500, max_depth=8, min_samples_leaf=3,
            class_weight="balanced", random_state=42, n_jobs=-1
        ),
    }
    if HAS_XGB:
        models["XGBoost"] = XGBClassifier(
            n_estimators=500, max_depth=5, learning_rate=0.05,
            subsample=0.8, colsample_bytree=0.8,
            scale_pos_weight=pos_weight * 1.1,
            eval_metric="aucpr", random_state=42, n_jobs=-1
        )
    return models


def train_and_save(X, y):
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"Train: {len(X_train)} mẫu | Test: {len(X_test)} mẫu\n")
    print(f"{'Model':<25} {'F1':>6} {'Recall':>8} {'Precision':>10} {'Thresh':>8}")
    print("-" * 62)

    all_models  = build_models(y_train)
    best_f1     = -1
    best_name   = None
    best_pipe   = None
    best_thresh = 0.5

    for name, clf in all_models.items():
        pipe = Pipeline([
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler",  StandardScaler()),
            ("clf",     clf),
        ])
        pipe.fit(X_train, y_train)

        y_proba = pipe.predict_proba(X_test)[:, 1]
        opt_th  = find_optimal_threshold(y_test, y_proba)
        y_pred  = (y_proba >= opt_th).astype(int)

        f1  = f1_score(y_test,  y_pred, zero_division=0)
        rec = recall_score(y_test, y_pred, zero_division=0)
        pre = precision_score(y_test, y_pred, zero_division=0)
        tag = "  ★" if f1 > best_f1 else ""
        print(f"  {name:<23} {f1:>6.4f} {rec:>8.4f} {pre:>10.4f} {opt_th:>8.4f}{tag}")

        if f1 > best_f1:
            best_f1     = f1
            best_name   = name
            best_pipe   = pipe
            best_thresh = opt_th

    # ── Lưu model vào thư mục plugin ─────────────────────────────────────────
    joblib.dump(best_pipe,   OUTPUT_DIR / "model.pkl")
    joblib.dump(best_thresh, OUTPUT_DIR / "threshold.pkl")

    print(f"\n✅ Best: {best_name}  (F1={best_f1:.4f}, threshold={best_thresh:.4f})")
    print(f"✅ Đã lưu: {OUTPUT_DIR / 'model.pkl'}")
    print(f"✅ Đã lưu: {OUTPUT_DIR / 'threshold.pkl'}")

    return best_f1, best_thresh


# ── Cập nhật metadata.json ───────────────────────────────────────────────────

def update_metadata(f1: float, threshold: float):
    meta_path = PLUGIN_DIR / "metadata.json"
    if not meta_path.exists():
        print(f"⚠ Không tìm thấy {meta_path} — bỏ qua cập nhật metadata")
        return

    with open(meta_path, encoding="utf-8") as f:
        meta = json.load(f)

    meta["ml_model"]["enabled"]        = True
    meta["ml_model"]["threshold_file"] = "threshold.pkl"
    meta["ml_model"]["train_f1"]       = round(f1, 4)
    meta["ml_model"]["feature_cols"]   = FEATURE_COLS

    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

    print(f"✅ Đã cập nhật metadata.json: ml_model.enabled = true")


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    print("=" * 62)
    print("  TRAIN MODEL — Bệnh Tim Mạch (cardiovascular)")
    print(f"  Features ({len(FEATURE_COLS)}): {FEATURE_COLS}")
    print("=" * 62 + "\n")

    df       = load_and_merge()
    X, y     = build_features(df)
    f1, thr  = train_and_save(X, y)
    update_metadata(f1, thr)

    print("\n" + "=" * 62)
    print("  HOÀN TẤT")
    print(f"  model.pkl và threshold.pkl → plugins/cardiovascular/")
    print("=" * 62)


if __name__ == "__main__":
    main()