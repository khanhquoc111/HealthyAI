# modules/plugin_trainer.py
from __future__ import annotations
import io
import json
import warnings
warnings.filterwarnings("ignore")

import numpy as np
import pandas as pd
import joblib
from pathlib import Path
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import f1_score, precision_recall_curve


def _find_optimal_threshold(y_true, y_proba) -> float:
    """Tìm threshold tối ưu theo F-beta (tái dụng logic từ train_model_v1.py)."""
    prec, rec, thresh = precision_recall_curve(y_true, y_proba)
    beta = 0.75
    fbeta = (1 + beta**2) * (prec * rec) / (beta**2 * prec + rec + 1e-8)
    best_idx = np.argmax(fbeta)
    return float(thresh[best_idx]) if best_idx < len(thresh) else 0.5


def train_plugin_model(plugin_id: str, plugin: dict, csv_bytes: bytes) -> dict:
    """
    Nhận CSV bytes → train model → lưu model.pkl vào plugins/{id}/
    → cập nhật metadata.json: ml_model.enabled = true
    """
    try:
        plugin_dir = Path("plugins") / plugin_id
        feature_cols = plugin.get("ml_model", {}).get("feature_cols", [])

        if not feature_cols:
            return {"ok": False, "error": "Plugin chưa khai báo feature_cols trong ml_model"}

        # ── 1. Đọc CSV ───────────────────────────────────────────────────────
        df = pd.read_csv(io.BytesIO(csv_bytes))

        # Kiểm tra cột target bắt buộc
        if "target" not in df.columns:
            return {
                "ok": False,
                "error": "CSV thiếu cột 'target' (0 = không bệnh, 1 = có bệnh)"
            }

        # Kiểm tra feature_cols có đủ không
        missing_cols = [c for c in feature_cols if c not in df.columns]
        if missing_cols:
            return {
                "ok": False,
                "error": f"CSV thiếu các cột: {missing_cols}"
            }

        # ── 2. Chuẩn bị X, y ─────────────────────────────────────────────────
        X = df[feature_cols].copy()
        y = df["target"].astype(int)

        if len(y) < 50:
            return {"ok": False, "error": "Dataset quá nhỏ — cần ít nhất 50 mẫu"}

        if y.nunique() < 2:
            return {"ok": False, "error": "Dataset chỉ có 1 nhãn — cần cả mẫu 0 và 1"}

        # ── 3. Train ─────────────────────────────────────────────────────────
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )

        # Thử Random Forest trước, fallback Logistic Regression nếu dataset nhỏ
        clf = (
            RandomForestClassifier(
                n_estimators=300, max_depth=8, min_samples_leaf=3,
                class_weight="balanced", random_state=42, n_jobs=-1
            )
            if len(X_train) >= 200
            else LogisticRegression(max_iter=1000, class_weight="balanced", C=0.5)
        )

        pipe = Pipeline([
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler",  StandardScaler()),
            ("clf",     clf),
        ])
        pipe.fit(X_train, y_train)

        # ── 4. Đánh giá & tìm threshold ──────────────────────────────────────
        y_proba = pipe.predict_proba(X_test)[:, 1]
        threshold = _find_optimal_threshold(y_test, y_proba)
        y_pred = (y_proba >= threshold).astype(int)
        f1 = f1_score(y_test, y_pred, zero_division=0)

        # ── 5. Lưu model.pkl và threshold.pkl ────────────────────────────────
        joblib.dump(pipe,      plugin_dir / "model.pkl")
        joblib.dump(threshold, plugin_dir / "threshold.pkl")

        # ── 6. Cập nhật metadata.json: bật enabled = true ────────────────────
        meta_path = plugin_dir / "metadata.json"
        with open(meta_path, encoding="utf-8") as f:
            meta = json.load(f)

        meta["ml_model"]["enabled"] = True
        meta["ml_model"]["threshold_file"] = "threshold.pkl"

        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(meta, f, ensure_ascii=False, indent=2)

        return {
            "ok": True,
            "plugin_id": plugin_id,
            "samples": len(df),
            "f1_score": round(f1, 4),
            "threshold": round(threshold, 4),
            "model_file": "model.pkl",
            "message": f"Train thành công — F1={f1:.4f}, threshold={threshold:.4f}"
        }

    except Exception as e:
        return {"ok": False, "error": str(e)}