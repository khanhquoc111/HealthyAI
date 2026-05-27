# modules/diet_advisor.py
# Hệ thống Gợi ý Thực đơn dựa trên NHANES diet.csv
# Dùng k-NN Cosine Similarity để tìm "hình mẫu" sức khỏe tốt gần nhất

import os
import numpy as np
import pandas as pd
from pathlib import Path

# ─── Ánh xạ cột NHANES → tên hiển thị ───────────────────────────────────────
NUTRITION_COLS = {
    "DR1TKCAL": ("Năng lượng",       "kcal/ngày",    2000, "energy"),
    "DR1TPROT": ("Đạm (Protein)",    "g/ngày",         60, "protein"),
    "DR1TCARB": ("Tinh bột (Carb)",  "g/ngày",        250, "carb"),
    "DR1TSUGR": ("Đường tổng",       "g/ngày",         50, "sugar"),
    "DR1TFIBE": ("Chất xơ",          "g/ngày",         25, "fiber"),
    "DR1TTFAT": ("Chất béo tổng",    "g/ngày",         65, "fat"),
    "DR1TSFAT": ("Chất béo bão hòa", "g/ngày",         20, "sat_fat"),
    "DR1TCHOL": ("Cholesterol",      "mg/ngày",       300, "cholesterol"),
    "DR1TSODI": ("Natri (Muối)",     "mg/ngày",      2300, "sodium"),
    "DR1TPOTA": ("Kali",             "mg/ngày",      3500, "potassium"),
    "DR1TCALC": ("Canxi",            "mg/ngày",      1000, "calcium"),
    "DR1TIRON": ("Sắt",              "mg/ngày",        18, "iron"),
    "DR1TMAGN": ("Magiê",            "mg/ngày",       400, "magnesium"),
    "DR1TALCO": ("Cồn (Alcohol)",    "g/ngày",          0, "alcohol"),
}

# Tên cột dùng để tính similarity với user_data
MATCH_FEATURES = ["age", "gender_code", "bmi", "fasting_glucose", "hba1c",
                  "systolic", "diastolic", "total_cholesterol", "ldl"]

# ─── Giới hạn tối ưu theo mục tiêu sức khỏe ─────────────────────────────────
HEALTHY_BOUNDS = {
    "diab":  {"DR1TSUGR": (0, 30),  "DR1TFIBE": (25, 999),
              "DR1TCARB": (0, 200), "DR1TKCAL": (1400, 2200)},
    "htn":   {"DR1TSODI": (0, 1500),"DR1TPOTA": (3000, 9999),
              "DR1TALCO": (0, 14),  "DR1TKCAL": (1400, 2200)},
    "cvd":   {"DR1TSFAT": (0, 15),  "DR1TCHOL": (0, 200),
              "DR1TTFAT": (0, 55),  "DR1TFIBE": (25, 999)},
    "kid":   {"DR1TSODI": (0, 2000),"DR1TPOTA": (0, 2000),
              "DR1TPROT": (0, 50),  "DR1TCALC": (800, 1200)},
}

# Lời khuyên thực phẩm theo nguy cơ
FOOD_TIPS = {
    "diab": {
        "ăn nhiều": ["Rau xanh lá (cải bó xôi, bông cải xanh)",
                     "Ngũ cốc nguyên hạt (gạo lứt, yến mạch)",
                     "Protein nạc (cá, đậu hũ, ức gà)",
                     "Trái cây ít đường (táo, lê, cam)",
                     "Các loại đậu (đậu đen, đậu xanh)"],
        "hạn chế": ["Cơm trắng, bánh mì trắng, bún, phở",
                    "Nước ngọt, trà sữa, nước ép đóng hộp",
                    "Bánh kẹo, đồ ngọt, kem",
                    "Trái cây ngọt nhiều (xoài chín, chuối, nho)",
                    "Thực phẩm chế biến sẵn có đường ẩn"],
    },
    "htn": {
        "ăn nhiều": ["Rau cải, bí đao, cần tây (giàu Kali)",
                     "Chuối, cam, khoai lang",
                     "Cá hồi, cá thu (omega-3)",
                     "Hạt điều, hạnh nhân (không muối)",
                     "Sữa chua ít béo, sữa tách kem"],
        "hạn chế": ["Thức ăn mặn, nước tương, mắm",
                    "Dưa muối, thức ăn đóng hộp",
                    "Rượu bia, đồ uống có cồn",
                    "Thịt chế biến (lạp xưởng, xúc xích, thịt nguội)",
                    "Mì ăn liền, snack chiên"],
    },
    "cvd": {
        "ăn nhiều": ["Cá biển (cá hồi, cá ngừ, cá thu)",
                     "Dầu olive, dầu hướng dương",
                     "Yến mạch, hạt chia",
                     "Quả bơ, các loại hạt",
                     "Rau củ đa màu sắc"],
        "hạn chế": ["Mỡ động vật, nội tạng (tim, gan, thận)",
                    "Đồ chiên rán nhiều dầu",
                    "Margarine, dầu cọ",
                    "Thức ăn nhanh (hamburger, gà rán)",
                    "Phô mai béo cao"],
    },
    "kid": {
        "ăn nhiều": ["Táo, bắp cải, cà tím (ít Kali)",
                     "Gạo trắng, bánh mì trắng (ít Kali hơn gạo lứt)",
                     "Trứng lòng trắng (protein chất lượng cao)",
                     "Dầu olive, mỡ lành mạnh"],
        "hạn chế": ["Chuối, cam, khoai tây, cà chua (nhiều Kali)",
                    "Các loại đậu, nấm",
                    "Thực phẩm giàu muối",
                    "Đạm động vật nhiều (thịt đỏ, hải sản)",
                    "Soda đen (nhiều Phosphate)"],
    },
}

# ─── Xếp hạng màu dinh dưỡng ─────────────────────────────────────────────────
def _nutrition_status(col_key, value, risk_keys):
    """Trả về (icon, color_class) dựa trên ngưỡng tối ưu cho hồ sơ nguy cơ."""
    bounds_ok = True
    for rk in risk_keys:
        if col_key in HEALTHY_BOUNDS.get(rk, {}):
            lo, hi = HEALTHY_BOUNDS[rk][col_key]
            if not (lo <= value <= hi):
                bounds_ok = False
                break
    if bounds_ok:
        return "✅", "good"
    return "⚠️", "warn"


# ─── Tải dữ liệu NHANES ──────────────────────────────────────────────────────
_diet_cache = None

def _load_diet_data() -> pd.DataFrame:
    global _diet_cache
    if _diet_cache is not None:
        return _diet_cache

    # Tìm file diet.csv
    candidates = [
        Path("data/diet.csv"),
        Path(__file__).parent.parent / "data" / "diet.csv",
        Path("diet.csv"),
    ]
    path = None
    for c in candidates:
        if c.exists():
            path = c
            break

    if path is None:
        return pd.DataFrame()  # Không có file

    for enc in ["utf-8", "utf-8-sig", "latin1", "cp1252"]:
        try:
            df = pd.read_csv(path, encoding=enc, low_memory=False)
            _diet_cache = df
            return df
        except Exception:
            continue
    return pd.DataFrame()


# ─── Hàm chính: tính chỉ số dinh dưỡng tối ưu ────────────────────────────────
def get_diet_benchmark(user_data: dict, risk_keys: list) -> dict:
    """
    Trả về dict chứa:
      - "benchmark": {col_key: (mean, unit, label)} của "hình mẫu" sức khỏe tốt
      - "user_diet":  None (không có dữ liệu người dùng từ NHANES)
      - "tips": dict gợi ý thực phẩm
      - "source": "nhanes_knn" | "default"
    """
    df = _load_diet_data()

    # Nếu không có dữ liệu NHANES, trả về ngưỡng mặc định
    if df.empty:
        return _default_benchmark(user_data, risk_keys)

    avail_cols = [c for c in NUTRITION_COLS if c in df.columns]
    if not avail_cols:
        return _default_benchmark(user_data, risk_keys)

    # ── Bước 1: Lọc "hình mẫu" sức khỏe tốt ─────────────────────────────────
    # Chỉ giữ người có chỉ số tốt theo tất cả các risk hiện tại
    mask = pd.Series([True] * len(df), index=df.index)

    for col_key, (lo, hi) in {
        "DR1TSUGR": (0, 40),   # đường thấp
        "DR1TFIBE": (20, 999), # chất xơ cao
        "DR1TSODI": (0, 2300), # muối vừa
        "DR1TSFAT": (0, 20),   # béo bão hòa thấp
        "DR1TKCAL": (1200, 3000),  # calo hợp lý
    }.items():
        if col_key in df.columns:
            col = pd.to_numeric(df[col_key], errors="coerce")
            mask &= col.between(lo, hi, inclusive="both").fillna(False)

    healthy_df = df[mask].copy()

    if len(healthy_df) < 20:
        healthy_df = df  # Fallback nếu quá ít mẫu

    # ── Bước 2: k-NN Cosine Similarity để tìm người giống nhất ───────────────
    # Dùng age, gender, bmi làm feature matching đơn giản + hiệu quả
    age    = user_data.get("age", 40)
    gender = 1 if user_data.get("gender", "Nam") == "Nam" else 2
    bmi    = user_data.get("bmi", 22.0)

    if "RIDAGEYR" in healthy_df.columns and "BMXBMI" in healthy_df.columns:
        hdf = healthy_df.copy()
        hdf["_age"]  = pd.to_numeric(hdf["RIDAGEYR"], errors="coerce").fillna(age)
        hdf["_bmi"]  = pd.to_numeric(hdf["BMXBMI"],   errors="coerce").fillna(bmi)

        # Khoảng cách Euclidean đơn giản
        hdf["_dist"] = (
            ((hdf["_age"] - age) / 20.0) ** 2 +
            ((hdf["_bmi"] - bmi) / 5.0)  ** 2
        ) ** 0.5

        # Lấy top 100 người gần nhất
        top_df = hdf.nsmallest(100, "_dist")
    else:
        top_df = healthy_df.sample(min(100, len(healthy_df)), random_state=42)

    # ── Bước 3: Tính trung bình dinh dưỡng của nhóm hình mẫu ─────────────────
    benchmark = {}
    for col_key, (label, unit, ref_val, slug) in NUTRITION_COLS.items():
        if col_key in top_df.columns:
            vals = pd.to_numeric(top_df[col_key], errors="coerce").dropna()
            mean_val = float(vals.mean()) if len(vals) > 0 else ref_val
            p25      = float(vals.quantile(0.25)) if len(vals) > 0 else ref_val * 0.8
            p75      = float(vals.quantile(0.75)) if len(vals) > 0 else ref_val * 1.2
        else:
            mean_val, p25, p75 = ref_val, ref_val * 0.8, ref_val * 1.2

        icon, status = _nutrition_status(col_key, mean_val, risk_keys)
        benchmark[col_key] = {
            "label":    label,
            "unit":     unit,
            "mean":     round(mean_val, 1),
            "p25":      round(p25, 1),
            "p75":      round(p75, 1),
            "ref":      ref_val,
            "icon":     icon,
            "status":   status,
            "slug":     slug,
        }

    # ── Bước 4: Tổng hợp tips ─────────────────────────────────────────────────
    combined_tips = {"ăn nhiều": [], "hạn chế": []}
    for rk in risk_keys:
        if rk in FOOD_TIPS:
            for k in ("ăn nhiều", "hạn chế"):
                for t in FOOD_TIPS[rk][k]:
                    if t not in combined_tips[k]:
                        combined_tips[k].append(t)

    return {
        "benchmark":  benchmark,
        "tips":       combined_tips,
        "n_similar":  len(top_df),
        "source":     "nhanes_knn",
    }


def _default_benchmark(user_data: dict, risk_keys: list) -> dict:
    """Fallback khi không có NHANES data."""
    benchmark = {}
    for col_key, (label, unit, ref_val, slug) in NUTRITION_COLS.items():
        icon, status = _nutrition_status(col_key, ref_val, risk_keys)
        benchmark[col_key] = {
            "label": label, "unit": unit, "mean": ref_val,
            "p25":   ref_val * 0.8, "p75": ref_val * 1.2, "ref": ref_val,
            "icon":  icon, "status": status, "slug": slug,
        }
    combined_tips = {"ăn nhiều": [], "hạn chế": []}
    for rk in risk_keys:
        if rk in FOOD_TIPS:
            for k in ("ăn nhiều", "hạn chế"):
                for t in FOOD_TIPS[rk][k]:
                    if t not in combined_tips[k]:
                        combined_tips[k].append(t)
    return {
        "benchmark": benchmark,
        "tips": combined_tips,
        "n_similar": 0,
        "source": "default",
    }