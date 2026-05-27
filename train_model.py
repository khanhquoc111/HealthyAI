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

# ══════════════════════════════════════════════════════════════════════════════
# DANH SÁCH THÍ NGHIỆM — thêm/bớt/sửa tham số tại đây
# Mỗi dict = 1 lần train độc lập
# ══════════════════════════════════════════════════════════════════════════════

EXPERIMENTS = [

    # ── Random Forest: thay đổi số cây ──────────────────────────────────────
    {"name": "RF | n_estimators=100",
     "model": RandomForestClassifier(n_estimators=100,  max_depth=10, min_samples_leaf=3,
                                     class_weight="balanced", random_state=42, n_jobs=-1)},
    {"name": "RF | n_estimators=300",
     "model": RandomForestClassifier(n_estimators=300,  max_depth=10, min_samples_leaf=3,
                                     class_weight="balanced", random_state=42, n_jobs=-1)},
    {"name": "RF | n_estimators=500",
     "model": RandomForestClassifier(n_estimators=500,  max_depth=10, min_samples_leaf=3,
                                     class_weight="balanced", random_state=42, n_jobs=-1)},
    {"name": "RF | n_estimators=700",
     "model": RandomForestClassifier(n_estimators=700,  max_depth=10, min_samples_leaf=3,
                                     class_weight="balanced", random_state=42, n_jobs=-1)},
    {"name": "RF | n_estimators=1000",
     "model": RandomForestClassifier(n_estimators=1000, max_depth=10, min_samples_leaf=3,
                                     class_weight="balanced", random_state=42, n_jobs=-1)},

    # ── Random Forest: thay đổi độ sâu cây ──────────────────────────────────
    {"name": "RF | max_depth=5",
     "model": RandomForestClassifier(n_estimators=500, max_depth=5,    min_samples_leaf=3,
                                     class_weight="balanced", random_state=42, n_jobs=-1)},
    {"name": "RF | max_depth=10",
     "model": RandomForestClassifier(n_estimators=500, max_depth=10,   min_samples_leaf=3,
                                     class_weight="balanced", random_state=42, n_jobs=-1)},
    {"name": "RF | max_depth=15",
     "model": RandomForestClassifier(n_estimators=500, max_depth=15,   min_samples_leaf=3,
                                     class_weight="balanced", random_state=42, n_jobs=-1)},
    {"name": "RF | max_depth=None",
     "model": RandomForestClassifier(n_estimators=500, max_depth=None, min_samples_leaf=3,
                                     class_weight="balanced", random_state=42, n_jobs=-1)},

    # ── Random Forest: thay đổi min_samples_leaf ────────────────────────────
    {"name": "RF | min_samples_leaf=1",
     "model": RandomForestClassifier(n_estimators=500, max_depth=10, min_samples_leaf=1,
                                     class_weight="balanced", random_state=42, n_jobs=-1)},
    {"name": "RF | min_samples_leaf=3",
     "model": RandomForestClassifier(n_estimators=500, max_depth=10, min_samples_leaf=3,
                                     class_weight="balanced", random_state=42, n_jobs=-1)},
    {"name": "RF | min_samples_leaf=5",
     "model": RandomForestClassifier(n_estimators=500, max_depth=10, min_samples_leaf=5,
                                     class_weight="balanced", random_state=42, n_jobs=-1)},
    {"name": "RF | min_samples_leaf=10",
     "model": RandomForestClassifier(n_estimators=500, max_depth=10, min_samples_leaf=10,
                                     class_weight="balanced", random_state=42, n_jobs=-1)},

    # ── Extra Trees: thay đổi số cây ────────────────────────────────────────
    {"name": "ET | n_estimators=100",
     "model": ExtraTreesClassifier(n_estimators=100,  max_depth=10, min_samples_leaf=3,
                                   class_weight="balanced", random_state=42, n_jobs=-1)},
    {"name": "ET | n_estimators=300",
     "model": ExtraTreesClassifier(n_estimators=300,  max_depth=10, min_samples_leaf=3,
                                   class_weight="balanced", random_state=42, n_jobs=-1)},
    {"name": "ET | n_estimators=500",
     "model": ExtraTreesClassifier(n_estimators=500,  max_depth=10, min_samples_leaf=3,
                                   class_weight="balanced", random_state=42, n_jobs=-1)},
    {"name": "ET | n_estimators=700",
     "model": ExtraTreesClassifier(n_estimators=700,  max_depth=10, min_samples_leaf=3,
                                   class_weight="balanced", random_state=42, n_jobs=-1)},
    {"name": "ET | n_estimators=1000",
     "model": ExtraTreesClassifier(n_estimators=1000, max_depth=10, min_samples_leaf=3,
                                   class_weight="balanced", random_state=42, n_jobs=-1)},

    # ── Extra Trees: thay đổi max_depth ─────────────────────────────────────
    {"name": "ET | max_depth=5",
     "model": ExtraTreesClassifier(n_estimators=500, max_depth=5,    min_samples_leaf=3,
                                   class_weight="balanced", random_state=42, n_jobs=-1)},
    {"name": "ET | max_depth=10",
     "model": ExtraTreesClassifier(n_estimators=500, max_depth=10,   min_samples_leaf=3,
                                   class_weight="balanced", random_state=42, n_jobs=-1)},
    {"name": "ET | max_depth=15",
     "model": ExtraTreesClassifier(n_estimators=500, max_depth=15,   min_samples_leaf=3,
                                   class_weight="balanced", random_state=42, n_jobs=-1)},
    {"name": "ET | max_depth=None",
     "model": ExtraTreesClassifier(n_estimators=500, max_depth=None, min_samples_leaf=3,
                                   class_weight="balanced", random_state=42, n_jobs=-1)},

    # ── Extra Trees: thay đổi min_samples_leaf ───────────────────────────────
    {"name": "ET | min_samples_leaf=1",
     "model": ExtraTreesClassifier(n_estimators=500, max_depth=10, min_samples_leaf=1,
                                   class_weight="balanced", random_state=42, n_jobs=-1)},
    {"name": "ET | min_samples_leaf=3",
     "model": ExtraTreesClassifier(n_estimators=500, max_depth=10, min_samples_leaf=3,
                                   class_weight="balanced", random_state=42, n_jobs=-1)},
    {"name": "ET | min_samples_leaf=5",
     "model": ExtraTreesClassifier(n_estimators=500, max_depth=10, min_samples_leaf=5,
                                   class_weight="balanced", random_state=42, n_jobs=-1)},
    {"name": "ET | min_samples_leaf=10",
     "model": ExtraTreesClassifier(n_estimators=500, max_depth=10, min_samples_leaf=10,
                                   class_weight="balanced", random_state=42, n_jobs=-1)},

    # ── Logistic Regression: thay đổi C ─────────────────────────────────────
    {"name": "LR | C=0.01",
     "model": LogisticRegression(C=0.01, max_iter=3000, class_weight="balanced", solver="saga")},
    {"name": "LR | C=0.1",
     "model": LogisticRegression(C=0.1,  max_iter=3000, class_weight="balanced", solver="saga")},
    {"name": "LR | C=0.5",
     "model": LogisticRegression(C=0.5,  max_iter=3000, class_weight="balanced", solver="saga")},
    {"name": "LR | C=1.0",
     "model": LogisticRegression(C=1.0,  max_iter=3000, class_weight="balanced", solver="saga")},
    {"name": "LR | C=5.0",
     "model": LogisticRegression(C=5.0,  max_iter=3000, class_weight="balanced", solver="saga")},

    # ── XGBoost: thay đổi learning_rate ─────────────────────────────────────
    *([
        {"name": "XGB | learning_rate=0.01",
         "model": XGBClassifier(n_estimators=500, max_depth=5, learning_rate=0.01,
                                subsample=0.8, colsample_bytree=0.8, scale_pos_weight=3,
                                eval_metric="aucpr", random_state=42, n_jobs=-1)},
        {"name": "XGB | learning_rate=0.05",
         "model": XGBClassifier(n_estimators=500, max_depth=5, learning_rate=0.05,
                                subsample=0.8, colsample_bytree=0.8, scale_pos_weight=3,
                                eval_metric="aucpr", random_state=42, n_jobs=-1)},
        {"name": "XGB | learning_rate=0.1",
         "model": XGBClassifier(n_estimators=500, max_depth=5, learning_rate=0.1,
                                subsample=0.8, colsample_bytree=0.8, scale_pos_weight=3,
                                eval_metric="aucpr", random_state=42, n_jobs=-1)},
        {"name": "XGB | learning_rate=0.2",
         "model": XGBClassifier(n_estimators=500, max_depth=5, learning_rate=0.2,
                                subsample=0.8, colsample_bytree=0.8, scale_pos_weight=3,
                                eval_metric="aucpr", random_state=42, n_jobs=-1)},

        # ── XGBoost: thay đổi max_depth ─────────────────────────────────────
        {"name": "XGB | max_depth=3",
         "model": XGBClassifier(n_estimators=500, max_depth=3, learning_rate=0.05,
                                subsample=0.8, colsample_bytree=0.8, scale_pos_weight=3,
                                eval_metric="aucpr", random_state=42, n_jobs=-1)},
        {"name": "XGB | max_depth=5",
         "model": XGBClassifier(n_estimators=500, max_depth=5, learning_rate=0.05,
                                subsample=0.8, colsample_bytree=0.8, scale_pos_weight=3,
                                eval_metric="aucpr", random_state=42, n_jobs=-1)},
        {"name": "XGB | max_depth=8",
         "model": XGBClassifier(n_estimators=500, max_depth=8, learning_rate=0.05,
                                subsample=0.8, colsample_bytree=0.8, scale_pos_weight=3,
                                eval_metric="aucpr", random_state=42, n_jobs=-1)},

        # ── XGBoost: thay đổi n_estimators ──────────────────────────────────
        {"name": "XGB | n_estimators=200",
         "model": XGBClassifier(n_estimators=200, max_depth=5, learning_rate=0.05,
                                subsample=0.8, colsample_bytree=0.8, scale_pos_weight=3,
                                eval_metric="aucpr", random_state=42, n_jobs=-1)},
        {"name": "XGB | n_estimators=500",
         "model": XGBClassifier(n_estimators=500, max_depth=5, learning_rate=0.05,
                                subsample=0.8, colsample_bytree=0.8, scale_pos_weight=3,
                                eval_metric="aucpr", random_state=42, n_jobs=-1)},
        {"name": "XGB | n_estimators=800",
         "model": XGBClassifier(n_estimators=800, max_depth=5, learning_rate=0.05,
                                subsample=0.8, colsample_bytree=0.8, scale_pos_weight=3,
                                eval_metric="aucpr", random_state=42, n_jobs=-1)},
    ] if HAS_XGB else []),
]


# ══════════════════════════════════════════════════════════════════════════════
# DATA LOADING
# ══════════════════════════════════════════════════════════════════════════════
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
    df = df[df["DIQ010"].isin([1, 2, 3])].copy()
    df["Target"] = (df["DIQ010"] == 1).astype(int)
    df["age"]         = pd.to_numeric(df["RIDAGEYR"], errors="coerce")
    df["gender_code"] = pd.to_numeric(df["RIAGENDR"], errors="coerce")
    df["bmi"]         = pd.to_numeric(df["BMXBMI"],   errors="coerce")
    df["waist"]       = pd.to_numeric(df["BMXWAIST"], errors="coerce")
    for c in ["BPXSY1", "BPXSY2", "BPXDI1", "BPXDI2"]:
        df[c] = pd.to_numeric(df[c], errors="coerce")
    df["systolic"]  = df[["BPXSY1", "BPXSY2"]].mean(axis=1)
    df["diastolic"] = df[["BPXDI1", "BPXDI2"]].mean(axis=1)
    df["hypertension"] = ((df["systolic"] >= 130) | (df["diastolic"] >= 80)).astype(float)
    df["fasting_glucose"]   = pd.to_numeric(df.get("LBXSGL"), errors="coerce")
    df["hba1c"]             = pd.to_numeric(df.get("LBXGH"),  errors="coerce")
    df["total_cholesterol"] = pd.to_numeric(df.get("LBXTC"),  errors="coerce")
    df["ldl"]               = pd.to_numeric(df.get("LBDLDL"), errors="coerce")
    df["creatinine"]        = pd.to_numeric(df.get("LBXSCR"), errors="coerce")
    smq = pd.to_numeric(df.get("SMQ020"), errors="coerce")
    df["smoke"]    = (smq == 1).astype(float)
    paq = pd.to_numeric(df.get("PAQ650"), errors="coerce")
    df["exercise"] = (paq == 1).astype(float)
    alq = pd.to_numeric(df.get("ALQ130"), errors="coerce")
    df["alcohol"] = alq.fillna(0)
    df["sodium_intake"] = pd.to_numeric(df.get("DR1TSODI"), errors="coerce")
    bpq = pd.to_numeric(df.get("BPQ020"), errors="coerce")
    df["family_hypertension"] = (bpq == 1).astype(float)
    mcq = pd.to_numeric(df.get("MCQ160A"), errors="coerce")
    df["family_cardiovascular"] = (mcq == 1).astype(float)
    for c in FEATURE_COLS:
        if c not in df.columns:
            df[c] = np.nan
    X = df[FEATURE_COLS].copy()
    y = df["Target"].copy()
    print(f"Số mẫu: {len(df)} | Positive rate: {y.mean():.4f}\n")
    return X, y


# ══════════════════════════════════════════════════════════════════════════════
# TRAIN & ĐÁNH GIÁ
# ══════════════════════════════════════════════════════════════════════════════
def find_optimal_threshold(y_true, y_proba, beta=0.75):
    prec, rec, thresh = precision_recall_curve(y_true, y_proba)
    fbeta = (1 + beta**2) * (prec * rec) / (beta**2 * prec + rec + 1e-8)
    best_idx = np.argmax(fbeta)
    return float(thresh[best_idx]) if best_idx < len(thresh) else 0.5


def run_experiments(X, y):
    os.makedirs("models", exist_ok=True)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"Train: {len(X_train)} mẫu | Test: {len(X_test)} mẫu\n")

    W = 38
    print(f"{'Thí nghiệm':<{W}} {'F1':>6} {'Recall':>8} {'Precision':>10} {'Thresh':>8}")
    print("-" * (W + 36))

    results  = []
    best_f1  = -1
    best_pipe   = None
    best_thresh = 0.5
    best_name   = ""
    prev_group  = ""

    for i, exp in enumerate(EXPERIMENTS, 1):
        name = exp["name"]
        clf  = exp["model"]

        # In tiêu đề nhóm khi đổi model
        group = name.split("|")[0].strip()
        if group != prev_group:
            if prev_group:
                print()
            print(f"  [{group}]")
            prev_group = group

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
        print(f"  {name:<{W-2}} {f1:>6.4f} {rec:>8.4f} {pre:>10.4f} {opt_th:>8.4f}{tag}")

        results.append({
            "Thí nghiệm": name,
            "F1":         round(f1,  4),
            "Recall":     round(rec, 4),
            "Precision":  round(pre, 4),
            "Threshold":  round(opt_th, 4),
        })

        if f1 > best_f1:
            best_f1     = f1
            best_pipe   = pipe
            best_thresh = opt_th
            best_name   = name

    # ── Lưu best model ───────────────────────────────────────────────────────
    joblib.dump(best_pipe,    "models/screening_best_model.pkl")
    joblib.dump(best_thresh,  "models/screening_best_threshold.pkl")
    joblib.dump(FEATURE_COLS, "models/feature_cols.pkl")

    # ── Bảng tổng hợp, sắp xếp theo F1 ─────────────────────────────────────
    df_res = pd.DataFrame(results).sort_values("F1", ascending=False).reset_index(drop=True)
    df_res.index += 1
    df_res.to_csv("models/experiment_results.csv", index=False, encoding="utf-8-sig")

    print("\n" + "=" * (W + 36))
    print(f"🏆  Best: {best_name}")
    print(f"    F1={best_f1:.4f} | threshold={best_thresh:.4f}")
    print(f"\n✅  Kết quả đầy đủ → models/experiment_results.csv")
    print(f"✅  Best model     → models/screening_best_model.pkl")
    return df_res


# ══════════════════════════════════════════════════════════════════════════════
# PREDICT helper (dùng trong app)
# ══════════════════════════════════════════════════════════════════════════════
def build_user_input(user_data: dict) -> pd.DataFrame:
    gender_code = 1 if user_data.get("gender", "Nam") == "Nam" else 2
    row = {
        "age":                   user_data.get("age", 40),
        "gender_code":           gender_code,
        "bmi":                   user_data.get("bmi", 22.0),
        "waist":                 user_data.get("waist", 85),
        "systolic":              user_data.get("systolic", 120),
        "diastolic":             user_data.get("diastolic", 80),
        "hypertension":          int(user_data.get("hypertension", False)),
        "fasting_glucose":       user_data.get("fasting_glucose", 95),
        "hba1c":                 user_data.get("hba1c", 5.4),
        "total_cholesterol":     user_data.get("total_cholesterol", 185),
        "ldl":                   user_data.get("ldl", 110),
        "creatinine":            user_data.get("creatinine", 0.9),
        "smoke":                 int(user_data.get("smoke", False)),
        "exercise":              int(user_data.get("exercise", True)),
        "alcohol":               user_data.get("alcohol", 0),
        "sodium_intake":         user_data.get("sodium_intake", 2000),
        "family_hypertension":   int(user_data.get("family_hypertension", False)),
        "family_cardiovascular": int(user_data.get("family_cardiovascular", False)),
    }
    return pd.DataFrame([row], columns=FEATURE_COLS)


# ══════════════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════════════
def main():
    df = load_and_merge_data()
    X, y = build_features(df)

    print(f"Tổng số thí nghiệm: {len(EXPERIMENTS)}")
    print("=" * 74)
    run_experiments(X, y)


if __name__ == "__main__":
    main()