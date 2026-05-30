"""
train_kidney.py
---------------
Train model riêng cho plugin Bệnh Thận Mạn Tính (kidney).

Target: KIQ022
    1 = đã được chẩn đoán bệnh thận yếu/suy thận
    2 = chưa

Cách dùng:
    python training/train_kidney.py
"""

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

PLUGIN_ID  = "kidney"
ROOT_DIR   = Path(__file__).parent.parent
PLUGIN_DIR = ROOT_DIR / "plugins" / PLUGIN_ID
OUTPUT_DIR = PLUGIN_DIR

# Khớp đúng với feature_cols trong metadata.json của kidney
FEATURE_COLS = [
    "age", "gender_code", "bmi",
    "fasting_glucose",
    "hypertension", "smoke", "nsaid_use",
]

# ── Load & merge NHANES ──────────────────────────────────────────────────────

def find_data_dir():
    possible = [ROOT_DIR / "data", ROOT_DIR]
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

    exam_cols  = [c for c in ["SEQN", "BMXBMI",
                               "BPXSY1", "BPXSY2",
                               "BPXDI1", "BPXDI2"] if c in exam.columns]
    # KIQ022: chẩn đoán bệnh thận | BPQ020: THA | SMQ020: hút thuốc
    # RXQ510: dùng NSAID thường xuyên | DIQ010: ĐTĐ (proxy fasting_glucose)
    quest_cols = [c for c in ["SEQN", "KIQ022", "BPQ020",
                               "SMQ020", "RXQ510",
                               "DIQ010"] if c in quest.columns]
    labs_cols  = [c for c in ["SEQN", "LBXSCR",
                               "LBXSGL"] if c in labs.columns]

    for src, cols in [(exam, exam_cols), (quest, quest_cols), (labs, labs_cols)]:
        df = df.merge(src[cols], on="SEQN", how="left")

    print(f"Đã gộp: {df.shape[0]} mẫu, {df.shape[1]} cột")
    return df


# ── Feature engineering ──────────────────────────────────────────────────────

def build_features(df):
    """
    Không có cột KIQ022 trong bộ NHANES này.
    Dùng creatinine vượt ngưỡng lâm sàng làm target thay thế.
    Nam > 1.2 mg/dL hoặc Nữ > 1.1 mg/dL → target = 1
    """
    df = df.copy()

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
    df["creatinine"]      = pd.to_numeric(df["LBXSCR"] if "LBXSCR" in df.columns else pd.Series(dtype=float), errors="coerce")
    df["fasting_glucose"] = pd.to_numeric(df["LBXSGL"] if "LBXSGL" in df.columns else pd.Series(dtype=float), errors="coerce")

    # ── Lifestyle / medication ────────────────────────────────────────────────
    smq = pd.to_numeric(df["SMQ020"] if "SMQ020" in df.columns else pd.Series(dtype=float), errors="coerce")
    df["smoke"] = (smq == 1).astype(float)

    rxq = pd.to_numeric(df["RXQ510"] if "RXQ510" in df.columns else pd.Series(dtype=float), errors="coerce")
    df["nsaid_use"] = (rxq == 1).astype(float)

    # ── Target từ creatinine lâm sàng ────────────────────────────────────────
    # Chỉ giữ mẫu có đủ creatinine và gender để tạo target
    df = df.dropna(subset=["creatinine", "gender_code"])
    df["target"] = (
        ((df["gender_code"] == 1) & (df["creatinine"] > 1.2)) |
        ((df["gender_code"] == 2) & (df["creatinine"] > 1.1))
    ).astype(int)

    # ── Lọc features ─────────────────────────────────────────────────────────
    for c in FEATURE_COLS:
        if c not in df.columns:
            print(f"  ⚠ Thiếu feature '{c}' — để NaN, imputer xử lý")
            df[c] = np.nan

    X = df[FEATURE_COLS].copy()
    y = df["target"].copy()

    pos_rate = y.mean()
    print(f"Số mẫu hợp lệ   : {len(df)}")
    print(f"Positive (thận) : {y.sum()} ({pos_rate:.2%})")
    print(f"Negative        : {(1-y).sum()} ({1-pos_rate:.2%})")
    print(f"⚠ Target từ creatinine lâm sàng (không có KIQ022 trong dataset)")
    print()

    return X, y


# ── Train ─────────────────────────────────────────────────────────────────────

def find_optimal_threshold(y_true, y_proba, beta=0.75):
    prec, rec, thresh = precision_recall_curve(y_true, y_proba)
    fbeta    = (1 + beta**2) * (prec * rec) / (beta**2 * prec + rec + 1e-8)
    best_idx = np.argmax(fbeta)
    return float(thresh[best_idx]) if best_idx < len(thresh) else 0.5


def build_models(y_train):
    # pos_weight cao hơn vì bệnh thận rất ít positive samples
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
            scale_pos_weight=pos_weight * 1.2,  # nhân thêm 1.2 vì imbalance cao hơn
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
    print("  TRAIN MODEL — Bệnh Thận Mạn Tính (kidney)")
    print(f"  Features ({len(FEATURE_COLS)}): {FEATURE_COLS}")
    print("=" * 62 + "\n")

    df      = load_and_merge()
    X, y    = build_features(df)
    f1, thr = train_and_save(X, y)
    update_metadata(f1, thr)

    print("\n" + "=" * 62)
    print("  HOÀN TẤT")
    print(f"  model.pkl và threshold.pkl → plugins/kidney/")
    print("=" * 62)


if __name__ == "__main__":
    main()