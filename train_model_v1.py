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
    f1_score, recall_score, precision_score, precision_recall_curve
)
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, ExtraTreesClassifier

try:
    from xgboost import XGBClassifier
    HAS_XGB = True
except ImportError:
    HAS_XGB = False


FEATURE_COLS = [
    "age", "gender_code",
    "bmi", "waist", "systolic", "diastolic", "hypertension",
    "fasting_glucose", "hba1c", "total_cholesterol", "ldl", "creatinine",
    "smoke", "exercise", "alcohol", "sodium_intake",
    "family_hypertension", "family_cardiovascular",
]


def find_data_dir():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    possible_dirs = [os.path.join(base_dir, "data"), base_dir]
    required = ["demographic.csv", "diet.csv", "examination.csv",
                "questionnaire.csv", "labs.csv", "medications.csv"]
    for d in possible_dirs:
        if all(os.path.exists(os.path.join(d, f)) for f in required):
            return d
    raise FileNotFoundError("Không tìm thấy thư mục data!")


def read_csv_safe(path):
    for enc in ["utf-8", "utf-8-sig", "latin1", "cp1252"]:
        try:
            return pd.read_csv(path, encoding=enc, low_memory=False)
        except Exception:
            continue
    raise Exception(f"Không đọc được file: {path}")


def ensure_models_dir():
    os.makedirs("models", exist_ok=True)
    return "models"


def load_and_merge_data():
    data_dir = find_data_dir()
    print(f"Đọc dữ liệu từ: {data_dir}")

    demo  = read_csv_safe(os.path.join(data_dir, "demographic.csv"))
    diet  = read_csv_safe(os.path.join(data_dir, "diet.csv"))
    exam  = read_csv_safe(os.path.join(data_dir, "examination.csv"))
    quest = read_csv_safe(os.path.join(data_dir, "questionnaire.csv"))
    labs  = read_csv_safe(os.path.join(data_dir, "labs.csv"))

    df = demo[["SEQN", "RIDAGEYR", "RIAGENDR"]].copy()

    diet_cols  = [c for c in ["SEQN", "DR1TSODI"] if c in diet.columns]
    exam_cols  = [c for c in ["SEQN", "BMXBMI", "BMXWAIST",
                               "BPXSY1", "BPXSY2", "BPXDI1", "BPXDI2"] if c in exam.columns]
    quest_cols = [c for c in ["SEQN", "DIQ010", "SMQ020", "ALQ130",
                               "BPQ020", "MCQ160A", "PAQ650"] if c in quest.columns]
    labs_cols  = [c for c in ["SEQN", "LBXSGL", "LBXGH", "LBXTC",
                               "LBDLDL", "LBXSCR"] if c in labs.columns]

    for src, cols in [(diet, diet_cols), (exam, exam_cols),
                      (quest, quest_cols), (labs, labs_cols)]:
        df = df.merge(src[cols], on="SEQN", how="left")

    print(f"Đã gộp: {df.shape[0]} mẫu, {df.shape[1]} cột")
    return df


def build_features(df):
    """
    Biến đổi dữ liệu NHANES thành đúng feature space mà app dùng.
    Mỗi feature tương ứng 1-1 với field trong FEATURE_COLS.
    """
    # Chỉ giữ mẫu có nhãn hợp lệ (1=ĐTĐ, 2=tiền ĐTĐ, 3=không)
    df = df[df["DIQ010"].isin([1, 2, 3])].copy()
    df["Target"] = (df["DIQ010"] == 1).astype(int)

    # ── age, gender ──────────────────────────────────────────────────────────
    df["age"]         = pd.to_numeric(df["RIDAGEYR"], errors="coerce")
    # NHANES: 1=Nam, 2=Nữ — giữ nguyên mã số (app sẽ map "Nam"→1, "Nữ"→2 lúc predict)
    df["gender_code"] = pd.to_numeric(df["RIAGENDR"], errors="coerce")

    # ── body / BP ────────────────────────────────────────────────────────────
    df["bmi"]   = pd.to_numeric(df["BMXBMI"],   errors="coerce")
    df["waist"] = pd.to_numeric(df["BMXWAIST"], errors="coerce")

    for c in ["BPXSY1", "BPXSY2", "BPXDI1", "BPXDI2"]:
        df[c] = pd.to_numeric(df[c], errors="coerce")

    df["systolic"]  = df[["BPXSY1", "BPXSY2"]].mean(axis=1)
    df["diastolic"] = df[["BPXDI1", "BPXDI2"]].mean(axis=1)
    df["hypertension"] = ((df["systolic"] >= 130) | (df["diastolic"] >= 80)).astype(float)

    # ── lab values ───────────────────────────────────────────────────────────
    df["fasting_glucose"]   = pd.to_numeric(df.get("LBXSGL"), errors="coerce")
    df["hba1c"]             = pd.to_numeric(df.get("LBXGH"),  errors="coerce")
    df["total_cholesterol"] = pd.to_numeric(df.get("LBXTC"),  errors="coerce")
    df["ldl"]               = pd.to_numeric(df.get("LBDLDL"), errors="coerce")
    df["creatinine"]        = pd.to_numeric(df.get("LBXSCR"), errors="coerce")

    # ── lifestyle ────────────────────────────────────────────────────────────
    # SMQ020: 1=đã từng hút, 2=chưa bao giờ → smoke=1 nếu hút
    smq = pd.to_numeric(df.get("SMQ020"), errors="coerce")
    df["smoke"]    = (smq == 1).astype(float)

    # PAQ650: 1=có vận động vigorous, 2=không → exercise=1 nếu có
    paq = pd.to_numeric(df.get("PAQ650"), errors="coerce")
    df["exercise"] = (paq == 1).astype(float)

    # ALQ130: số ly rượu/ngày trung bình; NaN (không uống) → 0
    alq = pd.to_numeric(df.get("ALQ130"), errors="coerce")
    df["alcohol"] = alq.fillna(0)

    # DR1TSODI: lượng sodium mg/ngày
    df["sodium_intake"] = pd.to_numeric(df.get("DR1TSODI"), errors="coerce")

    # ── family history proxy ─────────────────────────────────────────────────
    # BPQ020: 1=đã được chẩn đoán cao HA → dùng làm proxy family_hypertension
    bpq = pd.to_numeric(df.get("BPQ020"), errors="coerce")
    df["family_hypertension"] = (bpq == 1).astype(float)

    # MCQ160A: 1=đã được chẩn đoán bệnh tim → proxy family_cardiovascular
    mcq = pd.to_numeric(df.get("MCQ160A"), errors="coerce")
    df["family_cardiovascular"] = (mcq == 1).astype(float)

    # ── Lọc features & target ────────────────────────────────────────────────
    available = [c for c in FEATURE_COLS if c in df.columns]
    missing   = [c for c in FEATURE_COLS if c not in df.columns]
    if missing:
        print(f"⚠ Thiếu features (sẽ để NaN, imputer xử lý): {missing}")
        for c in missing:
            df[c] = np.nan

    X = df[FEATURE_COLS].copy()
    y = df["Target"].copy()

    print(f"Số mẫu: {len(df)} | Features: {len(FEATURE_COLS)} | "
          f"Positive rate (ĐTĐ): {y.mean():.4f}")
    return X, y


def build_models(y_train):
    models = {
        "Logistic Regression": LogisticRegression(
            max_iter=2000, class_weight="balanced", C=0.5
        ),
        "Random Forest": RandomForestClassifier(
            n_estimators=800, max_depth=10, min_samples_leaf=3,
            random_state=42, class_weight="balanced", n_jobs=-1
        ),
        "Extra Trees": ExtraTreesClassifier(
            n_estimators=600, max_depth=10, min_samples_leaf=3,
            random_state=42, class_weight="balanced", n_jobs=-1
        ),
    }
    if HAS_XGB:
        pos_weight = (len(y_train) - y_train.sum()) / y_train.sum()
        print(f"[XGBoost] scale_pos_weight = {pos_weight:.2f}")
        models["XGBoost"] = XGBClassifier(
            n_estimators=600, max_depth=5, learning_rate=0.05,
            subsample=0.8, colsample_bytree=0.8,
            scale_pos_weight=pos_weight * 1.1,
            eval_metric="aucpr", random_state=42, n_jobs=-1
        )
    return models


def find_optimal_threshold(y_true, y_proba):
    """Tối ưu F-beta (beta=0.75: ưu tiên recall hơn precision một chút)."""
    prec, rec, thresh = precision_recall_curve(y_true, y_proba)
    beta = 0.75
    fbeta = (1 + beta**2) * (prec * rec) / (beta**2 * prec + rec + 1e-8)
    best_idx = np.argmax(fbeta)
    best_th  = float(thresh[best_idx]) if best_idx < len(thresh) else 0.5
    print(f"  → Optimal threshold: {best_th:.4f}  (F{beta} = {fbeta[best_idx]:.4f})")
    return best_th


def train_and_save(X, y):
    models_dir = ensure_models_dir()
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    all_models  = build_models(y_train)
    best_f1     = -1
    best_name   = None
    best_pipe   = None
    best_thresh = 0.5

    for name, clf in all_models.items():
        print(f"\n=== {name} ===")
        pipe = Pipeline([
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler",  StandardScaler()),
            ("clf",     clf),
        ])
        pipe.fit(X_train, y_train)

        y_proba = pipe.predict_proba(X_test)[:, 1]

        # Tìm threshold tối ưu
        opt_th  = find_optimal_threshold(y_test, y_proba)
        y_pred  = (y_proba >= opt_th).astype(int)

        f1  = f1_score(y_test, y_pred, zero_division=0)
        rec = recall_score(y_test, y_pred, zero_division=0)
        pre = precision_score(y_test, y_pred, zero_division=0)
        print(f"  F1={f1:.4f}  Recall={rec:.4f}  Precision={pre:.4f}  (threshold={opt_th:.4f})")

        # Lưu từng model
        slug = name.lower().replace(" ", "_")
        joblib.dump(pipe,   os.path.join(models_dir, f"screening_{slug}.pkl"))
        joblib.dump(opt_th, os.path.join(models_dir, f"screening_{slug}_threshold.pkl"))

        if f1 > best_f1:
            best_f1     = f1
            best_name   = name
            best_pipe   = pipe
            best_thresh = opt_th

    # Lưu best model
    joblib.dump(best_pipe,   os.path.join(models_dir, "screening_best_model.pkl"))
    joblib.dump(best_thresh, os.path.join(models_dir, "screening_best_threshold.pkl"))
    # Lưu danh sách features để predict đúng thứ tự
    joblib.dump(FEATURE_COLS, os.path.join(models_dir, "feature_cols.pkl"))

    print(f"\n✅ Best model: {best_name}  (F1={best_f1:.4f}, threshold={best_thresh:.4f})")
    print(f"✅ Đã lưu feature_cols.pkl — {len(FEATURE_COLS)} features")
    return best_name


def build_user_input(user_data: dict) -> pd.DataFrame:
    """
    Chuyển dict từ app (user_data) sang DataFrame đúng FEATURE_COLS
    để đưa vào model.predict_proba().

    Gọi hàm này trong healthyai_app.py hoặc ui_danh_gia.py khi predict.
    """
    gender_code = 1 if user_data.get("gender", "Nam") == "Nam" else 2

    row = {
        "age":                  user_data.get("age", 40),
        "gender_code":          gender_code,
        "bmi":                  user_data.get("bmi", 22.0),
        "waist":                user_data.get("waist", 85),
        "systolic":             user_data.get("systolic", 120),
        "diastolic":            user_data.get("diastolic", 80),
        "hypertension":         int(user_data.get("hypertension", False)),
        "fasting_glucose":      user_data.get("fasting_glucose", 95),
        "hba1c":                user_data.get("hba1c", 5.4),
        "total_cholesterol":    user_data.get("total_cholesterol", 185),
        "ldl":                  user_data.get("ldl", 110),
        "creatinine":           user_data.get("creatinine", 0.9),
        "smoke":                int(user_data.get("smoke", False)),
        "exercise":             int(user_data.get("exercise", True)),
        "alcohol":              user_data.get("alcohol", 0),
        "sodium_intake":        user_data.get("sodium_intake", 2000),
        "family_hypertension":  int(user_data.get("family_hypertension", False)),
        "family_cardiovascular": int(user_data.get("family_cardiovascular", False)),
    }
    return pd.DataFrame([row], columns=FEATURE_COLS)


def main():
    df = load_and_merge_data()
    X, y = build_features(df)

    print("\n" + "=" * 70)
    print("TRAIN SCREENING MODEL")
    print("Features:", FEATURE_COLS)
    print("=" * 70)

    best = train_and_save(X, y)

    print("\n" + "=" * 70)
    print(f"HOÀN TẤT — Best model: {best}")
    print("Các file đã lưu trong thư mục models/:")
    for f in os.listdir("models"):
        print(f"  {f}")


if __name__ == "__main__":
    main()