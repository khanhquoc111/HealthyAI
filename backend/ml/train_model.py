import os
import warnings
warnings.filterwarnings("ignore")

import numpy as np
import pandas as pd
import joblib
import json
import sys

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


# ══════════════════════════════════════════════════════════════════════════════
# OPTIMIZED GENERIC DISEASE FRAMEWORK v2
# - Dynamic scale_pos_weight dựa vào positive rate
# - Disease-specific feature selection
# - Missing value handling
# - F-beta tùy chỉnh per disease
# ══════════════════════════════════════════════════════════════════════════════

DISEASES_CONFIG = {
    "diabetes": {
        "plugin_id": "diabetes",
        "name": "Tiểu đường Type 2",
        "description": "Sàng lọc nguy cơ tiểu đường type 2 từ dữ liệu NHANES",
        "target_field": "DIQ010",
        "target_value": 1,
        "exclude_values": [9, 7],
        "feature_cols": None,  # Dùng FEATURE_COLS_DEFAULT
        "beta": 1.2
    },
    "hypertension": {
        "plugin_id": "hypertension",
        "name": "Cao huyết áp (Tăng huyết áp)",
        "description": "Sàng lọc nguy cơ cao huyết áp từ dữ liệu NHANES",
        "target_field": "BPQ020",
        "target_value": 1,
        "exclude_values": [9],
        "feature_cols": ["age", "gender_code", "bmi", "systolic", "diastolic", 
                        "total_cholesterol", "ldl", "smoke", "exercise", "sodium_intake"],
        "beta": 1.0
    },
    "kidney_disease": {
        "plugin_id": "kidney_disease",
        "name": "Bệnh thận mãn tính",
        "description": "Sàng lọc nguy cơ bệnh thận mãn tính từ dữ liệu NHANES",
        "target_field": "MCQ160K",
        "target_value": 1,
        "exclude_values": [9],
        "feature_cols": ["age", "gender_code", "bmi", "creatinine", "systolic", "diastolic",
                        "fasting_glucose", "hba1c", "total_cholesterol", "ldl"],
        "beta": 2.0
    },
    "cardiovascular": {
        "plugin_id": "cardiovascular",
        "name": "Bệnh tim mạch",
        "description": "Sàng lọc nguy cơ bệnh tim mạch từ dữ liệu NHANES",
        "target_field": "MCQ160B",
        "target_value": 1,
        "exclude_values": [9],
        "feature_cols": ["age", "gender_code", "bmi", "systolic", "diastolic",
                        "total_cholesterol", "ldl", "smoke", "exercise"],
        "beta": 2.0
    }
}

FEATURE_COLS_DEFAULT = [
    "age", "gender_code", "bmi", "waist", "systolic", "diastolic",
    "fasting_glucose", "hba1c", "total_cholesterol", "ldl", "creatinine",
    "smoke", "exercise", "alcohol", "sodium_intake"
]

ALL_AVAILABLE_FEATURES = [
    "age", "gender_code", "bmi", "waist", "systolic", "diastolic",
    "fasting_glucose", "hba1c", "total_cholesterol", "ldl", "creatinine",
    "smoke", "exercise", "alcohol", "sodium_intake"
]


def get_experiments(imbalance_ratio, disease_id):
    """
    Tạo experiments với scale_pos_weight tính toán từ imbalance ratio
    imbalance_ratio = (1 - positive_rate) / positive_rate
    """
    # Scale pos weight base trên imbalance
    scale_base = max(3.0, min(40.0, imbalance_ratio))  # Clamp giữa 3-40
    
    experiments = [
        {"name": f"RF | Balanced (depth=12)",
         "model": RandomForestClassifier(n_estimators=1000, max_depth=12, min_samples_leaf=2,
                                         class_weight="balanced", random_state=42, n_jobs=-1)},
    ]
    
    if HAS_XGB:
        # Tạo scale_pos_weight variants dựa vào imbalance
        scales = [
            max(3, scale_base * 0.8),
            scale_base,
            scale_base * 1.2,
            scale_base * 1.5,
        ]
        
        experiments.extend([
            {"name": f"XGB | scale={scales[0]:.1f} - Conservative",
             "model": XGBClassifier(n_estimators=800, max_depth=6, learning_rate=0.03,
                                    subsample=0.8, colsample_bytree=0.8, scale_pos_weight=scales[0],
                                    gamma=0.3, min_child_weight=3, reg_lambda=1.5,
                                    eval_metric="aucpr", random_state=42, n_jobs=-1)},

            {"name": f"XGB | scale={scales[1]:.1f} - Balanced",
             "model": XGBClassifier(n_estimators=850, max_depth=6, learning_rate=0.035,
                                    subsample=0.8, colsample_bytree=0.8, scale_pos_weight=scales[1],
                                    gamma=0.4, min_child_weight=2,
                                    eval_metric="aucpr", random_state=42, n_jobs=-1)},

            {"name": f"XGB | scale={scales[2]:.1f} - Sensitive",
             "model": XGBClassifier(n_estimators=900, max_depth=5, learning_rate=0.04,
                                    subsample=0.75, colsample_bytree=0.75, scale_pos_weight=scales[2],
                                    gamma=0.5, min_child_weight=4, reg_lambda=2.0,
                                    eval_metric="aucpr", random_state=42, n_jobs=-1)},

            {"name": f"XGB | scale={scales[3]:.1f} - Aggressive",
             "model": XGBClassifier(n_estimators=700, max_depth=4, learning_rate=0.04,
                                    subsample=0.7, colsample_bytree=0.7, scale_pos_weight=scales[3],
                                    eval_metric="aucpr", random_state=42, n_jobs=-1)},
        ])
    
    return experiments


def find_data_dir():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    possible_dirs = [os.path.join(project_root, "data"), os.path.join(script_dir, "data"), project_root]
    required = ["demographic.csv", "diet.csv", "examination.csv", "questionnaire.csv", "labs.csv"]
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
        (quest, ["SEQN", "DIQ010", "SMQ020", "ALQ130", "BPQ020", "MCQ160A", "MCQ160B", "MCQ160C", "MCQ160K", "PAQ650"]),
        (labs, ["SEQN", "LBXSGL", "LBXGH", "LBXTC", "LBDLDL", "LBXSCR"]),
    ]:
        df = df.merge(src[cols], on="SEQN", how="left")
    print(f"✅ Đã gộp: {df.shape[0]} mẫu, {df.shape[1]} cột")
    return df


def build_features(df):
    df = df.copy()
    df["age"] = pd.to_numeric(df["RIDAGEYR"], errors="coerce")
    df["gender_code"] = pd.to_numeric(df["RIAGENDR"], errors="coerce")
    df["bmi"] = pd.to_numeric(df["BMXBMI"], errors="coerce")
    df["waist"] = pd.to_numeric(df["BMXWAIST"], errors="coerce")
    
    for c in ["BPXSY1", "BPXSY2", "BPXDI1", "BPXDI2"]:
        df[c] = pd.to_numeric(df[c], errors="coerce")
    df["systolic"] = df[["BPXSY1", "BPXSY2"]].mean(axis=1)
    df["diastolic"] = df[["BPXDI1", "BPXDI2"]].mean(axis=1)
    
    df["fasting_glucose"] = pd.to_numeric(df.get("LBXSGL"), errors="coerce")
    df["hba1c"] = pd.to_numeric(df.get("LBXGH"), errors="coerce")
    df["total_cholesterol"] = pd.to_numeric(df.get("LBXTC"), errors="coerce")
    df["ldl"] = pd.to_numeric(df.get("LBDLDL"), errors="coerce")
    df["creatinine"] = pd.to_numeric(df.get("LBXSCR"), errors="coerce")
    df["smoke"] = (pd.to_numeric(df.get("SMQ020"), errors="coerce") == 1).astype(float)
    df["exercise"] = (pd.to_numeric(df.get("PAQ650"), errors="coerce") == 1).astype(float)
    df["alcohol"] = pd.to_numeric(df.get("ALQ130"), errors="coerce").fillna(0)
    df["sodium_intake"] = pd.to_numeric(df.get("DR1TSODI"), errors="coerce")
    
    return df


def find_optimal_threshold(y_true, y_proba, beta=1.0):
    """
    Tìm threshold tối ưu dựa vào F-beta score
    beta > 1: ưu tiên Recall (không bỏ sót bệnh)
    beta = 1: balanced Recall/Precision
    beta < 1: ưu tiên Precision (ít false positive)
    """
    prec, rec, thresh = precision_recall_curve(y_true, y_proba)
    fbeta = (1 + beta**2) * (prec * rec) / (beta**2 * prec + rec + 1e-8)
    best_idx = np.argmax(fbeta)
    return float(thresh[best_idx]) if best_idx < len(thresh) else 0.5


def run_experiments(X, y, disease_config, feature_cols):
    script_dir = os.path.dirname(os.path.abspath(__file__))
    models_dir = os.path.join(script_dir, "models")
    os.makedirs(models_dir, exist_ok=True)
    
    plugin_id = disease_config["plugin_id"]
    beta = disease_config.get("beta", 1.0)
    
    # Tính imbalance ratio
    pos_rate = y.mean()
    imbalance_ratio = (1 - pos_rate) / (pos_rate + 1e-6)

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    print(f"Train: {len(X_train)} | Test: {len(X_test)}")
    print(f"Imbalance Ratio: {imbalance_ratio:.2f} | Beta: {beta}\n")

    W = 50
    print(f"{'Thí nghiệm':<{W}} {'F1':>6} {'Recall':>8} {'Precision':>10} {'Thresh':>8}")
    print("-" * (W + 40))

    best_f1 = -1
    best_recall = -1
    best_precision = -1
    best_pipe = None
    best_thresh = 0.5
    best_name = ""
    results = []
    experiments = get_experiments(imbalance_ratio, plugin_id)

    for exp in experiments:
        name = exp["name"]
        clf = exp["model"]

        pipe = Pipeline([("imputer", SimpleImputer(strategy="median")),
                         ("scaler", StandardScaler()),
                         ("clf", clf)])
        pipe.fit(X_train, y_train)

        y_proba = pipe.predict_proba(X_test)[:, 1]
        opt_th = find_optimal_threshold(y_test, y_proba, beta=beta)
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
            best_recall = rec
            best_precision = pre
            best_pipe = pipe
            best_thresh = opt_th
            best_name = name

    # Lưu models
    joblib.dump(best_pipe, os.path.join(models_dir, f"{plugin_id}_model.pkl"))
    joblib.dump(best_thresh, os.path.join(models_dir, f"{plugin_id}_threshold.pkl"))
    joblib.dump(feature_cols, os.path.join(models_dir, f"{plugin_id}_features.pkl"))

    plugin_meta = {
        "plugin_id": plugin_id,
        "disease_name": disease_config["name"],
        "description": disease_config["description"],
        "target_field": disease_config["target_field"],
        "positive_rate": round(pos_rate, 4),
        "imbalance_ratio": round(imbalance_ratio, 2),
        "beta": beta,
        "best_model": best_name,
        "best_f1": round(best_f1, 4),
        "best_recall": round(best_recall, 4),
        "best_precision": round(best_precision, 4),
        "best_threshold": round(best_thresh, 4),
        "feature_count": len(feature_cols),
        "features": feature_cols,
        "training_date": pd.Timestamp.now().isoformat(),
        "sample_count": len(X)
    }
    with open(os.path.join(models_dir, f"{plugin_id}_meta.json"), "w") as f:
        json.dump(plugin_meta, f, indent=2)

    df_res = pd.DataFrame(results).sort_values("F1", ascending=False)
    df_res.to_csv(os.path.join(models_dir, f"{plugin_id}_results.csv"), index=False, encoding="utf-8-sig")

    print("\n" + "="*90)
    print(f"🏆 {disease_config['name'].upper()}")
    print(f"   Best Model: {best_name}")
    print(f"   F1={best_f1:.4f} | Recall={best_recall:.4f} | Precision={best_precision:.4f} | Threshold={best_thresh:.4f}")
    print(f"   Features: {len(feature_cols)} / {len(ALL_AVAILABLE_FEATURES)}")
    print(f"   Plugin ID: {plugin_id}")
    print(f"✅ Models lưu tại: {models_dir}")


def main():
    print("🚀 Training mô hình sàng lọc - OPTIMIZED Generic Disease Framework v2")
    print("=" * 90)
    
    if len(sys.argv) > 1:
        disease_arg = sys.argv[1].lower()
        if disease_arg == "all":
            diseases_to_train = list(DISEASES_CONFIG.keys())
        elif disease_arg in DISEASES_CONFIG:
            diseases_to_train = [disease_arg]
        else:
            print(f"❌ Bệnh '{disease_arg}' không được hỗ trợ")
            return
    else:
        diseases_to_train = list(DISEASES_CONFIG.keys())
    
    df = load_and_merge_data()
    df = build_features(df)
    
    print(f"\n📋 SẼ HUẤN LUYỆN {len(diseases_to_train)} BỆNH (TỐI ƯU HÓA):")
    for i, disease in enumerate(diseases_to_train, 1):
        print(f"   {i}. {DISEASES_CONFIG[disease]['name']} ({disease})")
    print("=" * 90)
    
    for disease_id in diseases_to_train:
        disease_config = DISEASES_CONFIG[disease_id]
        target_field = disease_config["target_field"]
        target_value = disease_config["target_value"]
        exclude_values = disease_config["exclude_values"]
        
        # Lấy features tùy chỉnh hoặc mặc định
        feature_cols = disease_config.get("feature_cols") or FEATURE_COLS_DEFAULT
        # Lọc chỉ features có sẵn
        feature_cols = [f for f in feature_cols if f in ALL_AVAILABLE_FEATURES]
        
        # Filter data - chỉ giữ rows hợp lệ và có tất cả features cần thiết
        valid_mask = (df[target_field].notna() & 
                     ~df[target_field].isin(exclude_values) &
                     df[feature_cols].notna().all(axis=1))
        
        df_filtered = df[valid_mask].copy()
        X_filtered = df_filtered[feature_cols].copy()
        
        y = (df_filtered[target_field] == target_value).astype(int)
        
        print(f"\n{'='*90}")
        print(f"📌 DISEASE #{diseases_to_train.index(disease_id) + 1}: {disease_config['name']}")
        print(f"   Plugin ID: {disease_config['plugin_id']}")
        print(f"   Target Field: {target_field}")
        print(f"   Positive Class: {target_value} (Yes)")
        print(f"📊 Số mẫu: {len(X_filtered)} | Positive rate: {y.mean():.4f} ({y.sum()} cases)")
        print(f"   Features: {len(feature_cols)} / {len(ALL_AVAILABLE_FEATURES)}")
        print(f"   Tổng số thí nghiệm: {len(get_experiments((1-y.mean())/(y.mean()+1e-6), disease_id))}")
        print("=" * 90)
        
        run_experiments(X_filtered, y, disease_config, feature_cols)
    
    print(f"\n{'='*90}")
    print(f"✅ HOÀN TẤT! Đã huấn luyện thành công!")
    print(f"{'='*90}\n")


if __name__ == "__main__":
    main()