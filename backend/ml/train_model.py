"""
train_model.py  –  LuanVanKTPM
================================
Huấn luyện 4 mô hình phân loại nguy cơ bệnh mãn tính từ dữ liệu NHANES.
Script được đặt trong thư mục ml/ cùng cấp với data/ và models/

Cấu trúc:
  backend/
  ├── data/
  │   ├── demographic.csv
  │   ├── examination.csv
  │   ├── labs.csv
  │   ├── questionnaire.csv
  │   ├── medications.csv
  │   └── diet.csv
  ├── ml/
  │   ├── train_model.py  ← Script này
  │   └── models/         ← Output folder (tự tạo)
  │       ├── *_risk_model.pkl
  │       ├── *_features.pkl
  │       ├── *_threshold.pkl
  │       └── training_summary.json

Cách chạy (từ thư mục ml/):
  python train_model.py
  python train_model.py --data-dir ../data --model-dir ./models
"""

import argparse
import os
import sys
import warnings
import json
import logging
from pathlib import Path
from typing import Dict, List, Tuple, Optional

import numpy as np
import pandas as pd
import joblib

from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.metrics import (
    roc_auc_score, average_precision_score,
    classification_report, roc_curve
)

warnings.filterwarnings("ignore")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("train_model")


# ─────────────────────────────────────────────────────────────────────────────
# 1. CẤU HÌNH BỆNH
# ─────────────────────────────────────────────────────────────────────────────

DISEASE_CONFIGS: Dict[str, dict] = {
    # ── Tiểu đường ──────────────────────────────────────────────────────────
    "diabetes": {
        "label": "Tiểu đường (Type 2)",
        # ---- Cách lấy nhãn từ NHANES ----
        # DIQ010=1: bác sĩ chẩn đoán tiểu đường
        # LBXGH>=6.5: HbA1c ≥ 6.5 %  (ADA)
        # LBXGLT>=200: đường huyết 2h ≥ 200 mg/dL  (OGTT)
        # LBXSGL>=126: đường huyết lúc đói ≥ 126 mg/dL
        "label_fn": lambda df: (
            (df.get("DIQ010", pd.Series(np.nan, index=df.index)) == 1)
            | (df.get("LBXGH",  pd.Series(np.nan, index=df.index)) >= 6.5)
            | (df.get("LBXGLT", pd.Series(np.nan, index=df.index)) >= 200)
            | (df.get("LBXSGL", pd.Series(np.nan, index=df.index)) >= 126)
        ).astype(int),
        # ---- Features ML (ánh xạ sang tên field plugin) ----
        "features": {
            # NHANES col        : ml feature name
            "RIDAGEYR"  : "age",
            "BMXBMI"    : "bmi",
            "BMXWAIST"  : "waist",
            "LBXSGL"    : "fasting_glucose",
            "LBXGH"     : "hba1c",
            "LBXSCH"    : "total_cholesterol",
            "LBDLDL"    : "ldl",
            "LBDHDD"    : "hdl",
            "LBXSTR"    : "triglyceride",
            "LBXSCR"    : "creatinine",
            "BPXSY1"    : "systolic",
            "BPXDI1"    : "diastolic",
            "RIAGENDR"  : "gender_code",       # 1=nam, 2=nữ
            "_smoke"    : "smoke",             # derived
            "_exercise" : "exercise",          # derived (phút/tuần)
            "_family_dm": "family_history_diabetes",  # derived
        },
        "model": "gradient_boosting",
        "min_positive_ratio": 0.08,   # bác bỏ nếu nhãn dương < 8 %
    },

    # ── Tăng huyết áp ───────────────────────────────────────────────────────
    "hypertension": {
        "label": "Tăng huyết áp",
        # BPQ020=1: bác sĩ chẩn đoán
        # SBP trung bình ≥ 130 hoặc DBP ≥ 80 (AHA 2017)
        "label_fn": lambda df: (
            (df.get("BPQ020", pd.Series(np.nan, index=df.index)) == 1)
            | (df.get("BPXSY1", pd.Series(np.nan, index=df.index)) >= 130)
            | (df.get("BPXDI1", pd.Series(np.nan, index=df.index)) >= 80)
        ).astype(int),
        "features": {
            "RIDAGEYR" : "age",
            "BMXBMI"   : "bmi",
            "BMXWAIST" : "waist",
            "BPXSY1"   : "systolic",
            "BPXDI1"   : "diastolic",
            "LBXSCH"   : "total_cholesterol",
            "LBDLDL"   : "ldl",
            "LBDHDD"   : "hdl",
            "LBXSTR"   : "triglyceride",
            "LBXSCR"   : "creatinine",
            "LBXSGL"   : "fasting_glucose",
            "RIAGENDR" : "gender_code",
            "_smoke"   : "smoke",
            "_exercise": "exercise",
            "_family_htn": "family_history_hypertension",
        },
        "model": "gradient_boosting",
        "min_positive_ratio": 0.30,
    },

    # ── Tim mạch ─────────────────────────────────────────────────────────────
    "cardiovascular": {
        "label": "Bệnh tim mạch",
        # MCQ160C=1: bệnh mạch vành, MCQ160B=1: suy tim
        # MCQ160D=1: đau thắt ngực,  MCQ160E=1: nhồi máu cơ tim
        "label_fn": lambda df: (
            (df.get("MCQ160C", pd.Series(np.nan, index=df.index)) == 1)
            | (df.get("MCQ160B", pd.Series(np.nan, index=df.index)) == 1)
            | (df.get("MCQ160D", pd.Series(np.nan, index=df.index)) == 1)
            | (df.get("MCQ160E", pd.Series(np.nan, index=df.index)) == 1)
        ).astype(int),
        "features": {
            "RIDAGEYR" : "age",
            "BMXBMI"   : "bmi",
            "BPXSY1"   : "systolic",
            "BPXDI1"   : "diastolic",
            "LBXSCH"   : "total_cholesterol",
            "LBDLDL"   : "ldl",
            "LBDHDD"   : "hdl",
            "LBXSTR"   : "triglyceride",
            "LBXSCR"   : "creatinine",
            "LBXSGL"   : "fasting_glucose",
            "LBXGH"    : "hba1c",
            "RIAGENDR" : "gender_code",
            "_smoke"   : "smoke",
            "_exercise": "exercise",
            "_family_cv": "family_history_cardiovascular",
            "_diabetes_status": "diabetes_status",
            "_htn_status": "htn_status",
        },
        "model": "gradient_boosting",
        "min_positive_ratio": 0.05,
    },

    # ── Suy thận mãn tính ────────────────────────────────────────────────────
    "ckd": {
        "label": "Suy thận mãn tính (CKD)",
        # eGFR < 60 mL/min/1.73m²  hoặc  UACR ≥ 30 mg/g  (KDIGO)
        # eGFR tính theo CKD-EPI từ creatinine, tuổi, giới tính
        "label_fn": None,           # hàm đặc biệt, xử lý ở _build_ckd_label
        "features": {
            # LƯU Ý: LOẠI BỎ _egfr & URDACT vì chúng là ĐỊNH NGHĨA NHÃN
            "RIDAGEYR" : "age",
            "BMXBMI"   : "bmi",
            "LBXSCR"   : "creatinine",
            "BPXSY1"   : "systolic",
            "BPXDI1"   : "diastolic",
            "LBXSGL"   : "fasting_glucose",
            "LBXGH"    : "hba1c",
            "LBXSCH"   : "total_cholesterol",
            "LBXSTR"   : "triglyceride",
            "RIAGENDR" : "gender_code",
            "_smoke"   : "smoke",
            "_diabetes_status": "diabetes_status",
            "_htn_status"     : "htn_status",
        },
        "model": "gradient_boosting",
        "min_positive_ratio": 0.08,
    },
}


# ─────────────────────────────────────────────────────────────────────────────
# 2. ĐỌC & MERGE DỮ LIỆU NHANES
# ─────────────────────────────────────────────────────────────────────────────

def load_nhanes(data_dir: Path) -> pd.DataFrame:
    """
    Đọc 6 file CSV NHANES và merge theo SEQN.
    Trả về DataFrame tổng hợp.
    """
    files = {
        "demographic" : data_dir / "demographic.csv",
        "examination" : data_dir / "examination.csv",
        "labs"        : data_dir / "labs.csv",
        "questionnaire": data_dir / "questionnaire.csv",
        "medications" : data_dir / "medications.csv",
        "diet"        : data_dir / "diet.csv",
    }

    missing = [k for k, p in files.items() if not p.exists()]
    if missing:
        raise FileNotFoundError(
            f"Thiếu file: {missing}\n"
            f"Đặt các file CSV trong thư mục: {data_dir}"
        )

    log.info("Đang đọc dữ liệu NHANES...")
    dfs = {}
    for name, path in files.items():
        try:
            df = pd.read_csv(path, low_memory=False)
            df.columns = df.columns.str.strip('"').str.strip()
            dfs[name] = df
            log.info(f"  ✓ {name}: {df.shape[0]:,} dòng × {df.shape[1]} cột")
        except Exception as e:
            log.warning(f"  ⚠ Không đọc được {name}: {e}")
            dfs[name] = pd.DataFrame(columns=["SEQN"])

    # Merge tất cả theo SEQN (outer để giữ tối đa dòng)
    base = dfs["demographic"]
    for name, df in dfs.items():
        if name == "demographic":
            continue
        if "SEQN" not in df.columns:
            log.warning(f"  ⚠ {name} không có cột SEQN, bỏ qua")
            continue
        # Xử lý trùng tên cột (ngoài SEQN)
        overlap = set(base.columns) & set(df.columns) - {"SEQN"}
        if overlap:
            df = df.rename(
                columns={c: f"{c}_{name}" for c in overlap}
            )
        base = base.merge(df, on="SEQN", how="left")

    log.info(f"  → Dataset gộp: {base.shape[0]:,} dòng × {base.shape[1]} cột")
    return base


# ─────────────────────────────────────────────────────────────────────────────
# 3. XÂY DỰNG FEATURES PHÁI SINH
# ─────────────────────────────────────────────────────────────────────────────

def _ckdepi_egfr(scr: float, age: float, is_female: bool) -> float:
    """CKD-EPI 2009 creatinine equation → eGFR (mL/min/1.73m²)."""
    if pd.isna(scr) or pd.isna(age) or scr <= 0:
        return np.nan
    kappa = 0.7 if is_female else 0.9
    alpha = -0.329 if is_female else -0.411
    sex_factor = 1.018 if is_female else 1.0
    ratio = scr / kappa
    if ratio < 1:
        gfr = 141 * (ratio ** alpha) * (0.993 ** age) * sex_factor
    else:
        gfr = 141 * (ratio ** -1.209) * (0.993 ** age) * sex_factor
    return round(gfr, 2)


def derive_features(df: pd.DataFrame) -> pd.DataFrame:
    """Thêm các cột phái sinh cần thiết cho 4 bệnh."""
    df = df.copy()

    # ── Hút thuốc: SMQ040 (1=hàng ngày, 2=thỉnh thoảng, 3=không hút)
    # SMQ020=1: đã từng hút. Kết hợp → smoke = 1 nếu đang hút
    smq040 = df.get("SMQ040", pd.Series(np.nan, index=df.index))
    df["_smoke"] = smq040.apply(
        lambda x: 1.0 if x in [1, 2] else (0.0 if x == 3 else np.nan)
    )

    # ── Tập thể dục (phút/tuần)
    # PAD615: phút hoạt động vừa/tuần, PAD630: phút đi bộ/tuần
    # PAD660: phút hoạt động nặng/tuần (tính gấp 2)
    pad615 = pd.to_numeric(df.get("PAD615", np.nan), errors="coerce").fillna(0)
    pad630 = pd.to_numeric(df.get("PAD630", np.nan), errors="coerce").fillna(0)
    pad660 = pd.to_numeric(df.get("PAD660", np.nan), errors="coerce").fillna(0)
    df["_exercise"] = (pad615 + pad630 + pad660 * 2).clip(0, 2000)

    # ── Tiền sử gia đình – Tiểu đường
    # MCQ300C=1: họ hàng ruột bị tiểu đường
    mcq300c = df.get("MCQ300C", pd.Series(np.nan, index=df.index))
    df["_family_dm"] = mcq300c.apply(
        lambda x: 1.0 if x == 1 else (0.0 if x == 2 else np.nan)
    )

    # ── Tiền sử gia đình – THA
    # BPQ080 không trực tiếp hỏi gia đình; dùng MCQ300B (gia đình tim mạch)
    mcq300b = df.get("MCQ300B", pd.Series(np.nan, index=df.index))
    df["_family_htn"] = mcq300b.apply(
        lambda x: 1.0 if x == 1 else (0.0 if x == 2 else np.nan)
    )

    # ── Tiền sử gia đình – Tim mạch
    df["_family_cv"] = mcq300b.apply(
        lambda x: 1.0 if x == 1 else (0.0 if x == 2 else np.nan)
    )

    # ── Tình trạng tiểu đường & THA (dùng làm feature cho bệnh khác)
    diq010 = df.get("DIQ010", pd.Series(np.nan, index=df.index))
    df["_diabetes_status"] = diq010.apply(
        lambda x: 1.0 if x == 1 else (0.0 if x in [2, 3] else np.nan)
    )

    bpq020 = df.get("BPQ020", pd.Series(np.nan, index=df.index))
    df["_htn_status"] = bpq020.apply(
        lambda x: 1.0 if x == 1 else (0.0 if x == 2 else np.nan)
    )

    # ── eGFR (CKD-EPI)
    scr  = pd.to_numeric(df.get("LBXSCR", np.nan), errors="coerce")
    age  = pd.to_numeric(df.get("RIDAGEYR", np.nan), errors="coerce")
    # RIAGENDR: 1=nam, 2=nữ
    gender = df.get("RIAGENDR", pd.Series(np.nan, index=df.index))
    df["_egfr"] = [
        _ckdepi_egfr(s, a, g == 2)
        for s, a, g in zip(scr, age, gender)
    ]

    return df


def _build_ckd_label(df: pd.DataFrame) -> pd.Series:
    """
    CKD = eGFR < 60  OR  UACR ≥ 30 mg/g
    Chỉ giữ dòng có ít nhất một trong hai chỉ số.
    """
    egfr = pd.to_numeric(df.get("_egfr", np.nan), errors="coerce")
    uacr = pd.to_numeric(df.get("URDACT", np.nan), errors="coerce")

    cond_egfr = egfr < 60
    cond_uacr = uacr >= 30

    # Nếu cả hai đều NaN → nhãn NaN (loại khỏi training)
    has_data = egfr.notna() | uacr.notna()
    label = (cond_egfr.fillna(False) | cond_uacr.fillna(False)).astype(int)
    label[~has_data] = np.nan
    return label


# ─────────────────────────────────────────────────────────────────────────────
# 4. CHUẨN BỊ DATASET CHO TỪNG BỆNH
# ─────────────────────────────────────────────────────────────────────────────

def prepare_dataset(
    df: pd.DataFrame,
    disease: str,
    config: dict,
) -> Tuple[pd.DataFrame, pd.Series, List[str]]:
    """
    Trả về (X, y, feature_names).
    X: DataFrame đã đổi tên cột → ml feature name
    y: Series nhãn 0/1
    feature_names: list tên feature (theo plugin)
    """
    feat_map = config["features"]

    # ── Xây nhãn ──────────────────────────────────────────────────────────
    if disease == "ckd":
        y_raw = _build_ckd_label(df)
    else:
        try:
            y_raw = config["label_fn"](df)
        except Exception as e:
            raise RuntimeError(f"Lỗi khi tạo nhãn cho {disease}: {e}")

    # Bỏ dòng nhãn NaN
    valid_mask = y_raw.notna()
    df_valid  = df[valid_mask].copy()
    y         = y_raw[valid_mask].astype(int)

    # ── Xây X ─────────────────────────────────────────────────────────────
    rename_map = {}
    missing_cols = []
    for nhanes_col, ml_name in feat_map.items():
        if nhanes_col.startswith("_"):
            # cột phái sinh – tên chính xác trong df
            actual = nhanes_col
        else:
            actual = nhanes_col
        if actual in df_valid.columns:
            rename_map[actual] = ml_name
        else:
            missing_cols.append(nhanes_col)

    if missing_cols:
        log.debug(f"  [{disease}] Cột không có trong data: {missing_cols}")

    X = df_valid[list(rename_map.keys())].rename(columns=rename_map)
    X = X.apply(pd.to_numeric, errors="coerce")

    # Loại cột toàn NaN
    X = X.dropna(axis=1, how="all")
    feature_names = list(X.columns)

    # Loại dòng thiếu label (đã làm), không loại dòng thiếu feature (để imputer xử lý)
    pos_ratio = y.mean()
    log.info(
        f"  [{disease}] {len(y):,} mẫu | "
        f"dương: {int(y.sum()):,} ({pos_ratio:.1%}) | "
        f"{len(feature_names)} features"
    )

    min_ratio = config.get("min_positive_ratio", 0.03)
    if pos_ratio < min_ratio:
        log.warning(
            f"  [{disease}] ⚠ Tỷ lệ dương thấp ({pos_ratio:.1%} < {min_ratio:.1%}). "
            "Kiểm tra lại logic nhãn."
        )

    return X, y, feature_names


# ─────────────────────────────────────────────────────────────────────────────
# 5. XÂY DỰNG PIPELINE & HUẤN LUYỆN
# ─────────────────────────────────────────────────────────────────────────────

def build_pipeline(model_type: str = "gradient_boosting") -> Pipeline:
    """
    Pipeline: SimpleImputer → StandardScaler → Classifier
    Scikit-learn Pipeline đảm bảo không bị data leak khi cross-validate.
    
    Hyperparameter được tinh chỉnh để tránh overfitting:
    - learning_rate cao hơn nhưng n_estimators ít hơn
    - min_samples_leaf tăng để tránh node quá nhỏ
    - max_features hạn chế để tăng diversification
    - subsample = 0.8 để random sampling
    """
    imputer = SimpleImputer(strategy="median")
    scaler  = StandardScaler()

    if model_type == "gradient_boosting":
        clf = GradientBoostingClassifier(
            n_estimators=120,              # ↓ từ 200 → 120
            learning_rate=0.12,            # ↑ từ 0.05 → 0.12
            max_depth=3,                   # ↓ từ 4 → 3
            min_samples_leaf=50,           # ↑ từ 20 → 50
            min_samples_split=80,          # thêm
            subsample=0.8,
            max_features="sqrt",           # thêm regularization
            random_state=42,
        )
    elif model_type == "random_forest":
        clf = RandomForestClassifier(
            n_estimators=150,
            max_depth=5,                   # ↓ từ 6 → 5
            min_samples_leaf=30,           # ↑ từ 20 → 30
            min_samples_split=50,          # thêm
            max_features="sqrt",
            class_weight="balanced",
            random_state=42,
            n_jobs=-1,
        )
    else:
        clf = LogisticRegression(
            C=0.1,                         # ↓ từ 0.5 → 0.1 (tăng regularization)
            max_iter=1000,
            class_weight="balanced",
            solver="lbfgs",
            random_state=42,
        )

    return Pipeline([
        ("imputer", imputer),
        ("scaler",  scaler),
        ("clf",     clf),
    ])


def find_optimal_threshold(
    y_true: np.ndarray,
    y_proba: np.ndarray,
) -> float:
    """
    Tìm ngưỡng tối ưu theo Youden's J = sensitivity + specificity - 1.
    Trả về ngưỡng tốt nhất.
    """
    fpr, tpr, thresholds = roc_curve(y_true, y_proba)
    j_scores = tpr - fpr
    best_idx = np.argmax(j_scores)
    return float(thresholds[best_idx])


def train_disease(
    X: pd.DataFrame,
    y: pd.Series,
    feature_names: List[str],
    disease: str,
    model_type: str,
    model_dir: Path,
) -> dict:
    """
    Cross-validate → huấn luyện toàn bộ → lưu artifact.
    Trả về dict metrics tổng kết.
    """
    log.info(f"\n{'─'*60}")
    log.info(f"  Đang huấn luyện: {disease.upper()}")
    log.info(f"{'─'*60}")

    X_arr = X.values
    y_arr = y.values

    pipeline = build_pipeline(model_type)

    # ── Cross-validation ──────────────────────────────────────────────────
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

    roc_scores = cross_val_score(
        pipeline, X_arr, y_arr,
        scoring="roc_auc", cv=cv, n_jobs=-1
    )
    ap_scores = cross_val_score(
        pipeline, X_arr, y_arr,
        scoring="average_precision", cv=cv, n_jobs=-1
    )

    log.info(f"  CV ROC-AUC : {roc_scores.mean():.4f} ± {roc_scores.std():.4f}")
    log.info(f"  CV Avg Prec: {ap_scores.mean():.4f} ± {ap_scores.std():.4f}")

    # ── Huấn luyện toàn bộ dữ liệu ───────────────────────────────────────
    pipeline.fit(X_arr, y_arr)

    # ── Đánh giá trên tập train (tham khảo) ──────────────────────────────
    y_proba = pipeline.predict_proba(X_arr)[:, 1]
    train_auc = roc_auc_score(y_arr, y_proba)
    threshold = find_optimal_threshold(y_arr, y_proba)
    y_pred = (y_proba >= threshold).astype(int)

    log.info(f"  Train ROC-AUC  : {train_auc:.4f}")
    log.info(f"  Ngưỡng tối ưu  : {threshold:.4f}")
    log.info(
        "\n" + classification_report(
            y_arr, y_pred,
            target_names=["Không mắc", "Có nguy cơ"],
            zero_division=0,
        )
    )

    # ── Feature importance (GBM / RF) ────────────────────────────────────
    clf_step = pipeline.named_steps["clf"]
    if hasattr(clf_step, "feature_importances_"):
        importances = clf_step.feature_importances_
        feat_imp = sorted(
            zip(feature_names, importances),
            key=lambda x: x[1], reverse=True
        )
        log.info("  Top-10 features:")
        for fname, imp in feat_imp[:10]:
            log.info(f"    {fname:<40} {imp:.4f}")

    # ── Lưu artifact ─────────────────────────────────────────────────────
    model_dir.mkdir(parents=True, exist_ok=True)

    model_path    = model_dir / f"{disease}_risk_model.pkl"
    features_path = model_dir / f"{disease}_features.pkl"
    thresh_path   = model_dir / f"{disease}_threshold.pkl"

    joblib.dump(pipeline,     model_path,    compress=3)
    joblib.dump(feature_names, features_path, compress=3)
    joblib.dump(threshold,    thresh_path,   compress=3)

    log.info(f"\n  ✅ Đã lưu: {model_path.name}")
    log.info(f"  ✅ Đã lưu: {features_path.name}")
    log.info(f"  ✅ Đã lưu: {thresh_path.name}")

    return {
        "disease"       : disease,
        "n_samples"     : int(len(y)),
        "n_positive"    : int(y.sum()),
        "positive_rate" : float(y.mean()),
        "n_features"    : len(feature_names),
        "cv_roc_auc_mean": float(roc_scores.mean()),
        "cv_roc_auc_std" : float(roc_scores.std()),
        "cv_ap_mean"     : float(ap_scores.mean()),
        "train_roc_auc"  : float(train_auc),
        "threshold"      : float(threshold),
        "feature_names"  : feature_names,
    }


# ─────────────────────────────────────────────────────────────────────────────
# 6. ĐẠO TẠO & KIỂM ĐỊNH
# ─────────────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Huấn luyện 4 mô hình nguy cơ bệnh mãn tính từ dữ liệu NHANES"
    )
    parser.add_argument(
        "--data-dir",
        type=Path,
        default=Path(__file__).parent.parent / "data",
        help="Thư mục chứa 6 file CSV NHANES (mặc định: ../data)",
    )
    parser.add_argument(
        "--model-dir",
        type=Path,
        default=Path(__file__).parent / "models",
        help="Thư mục lưu model .pkl (mặc định: ./models)",
    )
    parser.add_argument(
        "--diseases",
        nargs="+",
        default=list(DISEASE_CONFIGS.keys()),
        choices=list(DISEASE_CONFIGS.keys()),
        help="Chọn bệnh cần train (mặc định: tất cả)",
    )
    parser.add_argument(
        "--min-samples",
        type=int,
        default=100,
        help="Số mẫu tối thiểu sau lọc để tiến hành train (mặc định: 100)",
    )
    args = parser.parse_args()

    log.info("=" * 60)
    log.info("  LuanVanKTPM – Huấn luyện mô hình bệnh mãn tính")
    log.info("=" * 60)
    log.info(f"  data_dir  : {args.data_dir}")
    log.info(f"  model_dir : {args.model_dir}")
    log.info(f"  diseases  : {args.diseases}")

    # ── 1. Đọc & merge NHANES ─────────────────────────────────────────────
    try:
        raw_df = load_nhanes(args.data_dir)
    except FileNotFoundError as e:
        log.error(str(e))
        sys.exit(1)

    # ── 2. Thêm features phái sinh ────────────────────────────────────────
    log.info("\nĐang tạo features phái sinh...")
    df = derive_features(raw_df)

    # ── 3. Huấn luyện từng bệnh ───────────────────────────────────────────
    all_results = []
    skipped     = []

    for disease in args.diseases:
        config = DISEASE_CONFIGS[disease]
        log.info(f"\n{'═'*60}")
        log.info(f"  Chuẩn bị: {config['label']}")

        try:
            X, y, feature_names = prepare_dataset(df, disease, config)
        except Exception as e:
            log.error(f"  [{disease}] Lỗi prepare_dataset: {e}")
            skipped.append(disease)
            continue

        if len(y) < args.min_samples:
            log.warning(
                f"  [{disease}] Không đủ mẫu ({len(y)} < {args.min_samples}). Bỏ qua."
            )
            skipped.append(disease)
            continue

        # Kiểm tra đủ cả 2 lớp
        if y.nunique() < 2:
            log.error(
                f"  [{disease}] Nhãn chỉ có 1 lớp → không thể train. Bỏ qua."
            )
            skipped.append(disease)
            continue

        try:
            result = train_disease(
                X, y, feature_names,
                disease=disease,
                model_type=config["model"],
                model_dir=args.model_dir,
            )
            all_results.append(result)
        except Exception as e:
            log.error(f"  [{disease}] Lỗi khi train: {e}", exc_info=True)
            skipped.append(disease)
            continue

    # ── 4. Tổng kết ───────────────────────────────────────────────────────
    log.info("\n" + "=" * 60)
    log.info("  TỔNG KẾT")
    log.info("=" * 60)

    summary_rows = []
    for r in all_results:
        row = {
            "Bệnh"      : r["disease"],
            "Mẫu"       : r["n_samples"],
            "Dương"     : f"{r['n_positive']} ({r['positive_rate']:.1%})",
            "Features"  : r["n_features"],
            "CV AUC"    : f"{r['cv_roc_auc_mean']:.4f} ± {r['cv_roc_auc_std']:.4f}",
            "Ngưỡng"    : f"{r['threshold']:.4f}",
        }
        summary_rows.append(row)

    if summary_rows:
        summary_df = pd.DataFrame(summary_rows)
        log.info("\n" + summary_df.to_string(index=False))

    # Lưu summary
    summary_path = args.model_dir / "training_summary.json"
    args.model_dir.mkdir(parents=True, exist_ok=True)
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(all_results, f, ensure_ascii=False, indent=2)
    log.info(f"\n  📄 Kết quả chi tiết: {summary_path}")

    if skipped:
        log.warning(f"\n  ⚠ Bỏ qua (lỗi/thiếu dữ liệu): {skipped}")

    trained = [r["disease"] for r in all_results]
    log.info(f"\n  ✅ Hoàn thành train: {trained}")
    log.info(
        "\n  📁 Các file model được lưu tại:\n"
        f"  {args.model_dir.absolute()}\n"
        "  Cấu trúc file:\n"
        "  ├── diabetes_risk_model.pkl\n"
        "  ├── diabetes_features.pkl\n"
        "  ├── diabetes_threshold.pkl\n"
        "  ├── hypertension_risk_model.pkl\n"
        "  ├── hypertension_features.pkl\n"
        "  ├── hypertension_threshold.pkl\n"
        "  ├── cardiovascular_risk_model.pkl\n"
        "  ├── cardiovascular_features.pkl\n"
        "  ├── cardiovascular_threshold.pkl\n"
        "  ├── ckd_risk_model.pkl\n"
        "  ├── ckd_features.pkl\n"
        "  ├── ckd_threshold.pkl\n"
        "  └── training_summary.json\n"
    )
    
    log.info(
        "  ─── Tích hợp với RiskStratificationEngine ───\n"
        "  Cập nhật _load_ml_model() trong risk_stratification_engine.py:\n"
        "  model_map = {\n"
        '      "diabetes"      : "diabetes_risk_model.pkl",\n'
        '      "hypertension"  : "hypertension_risk_model.pkl",\n'
        '      "cardiovascular": "cardiovascular_risk_model.pkl",\n'
        '      "ckd"           : "ckd_risk_model.pkl",\n'
        "  }\n"
        "  features được load từ: <disease>_features.pkl\n"
        "  threshold được load từ: <disease>_threshold.pkl\n"
    )


if __name__ == "__main__":
    main()