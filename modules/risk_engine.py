# modules/risk_engine.py
# Tất cả hàm phân loại chỉ số và tính điểm nguy cơ


# ─── Phân loại chỉ số ────────────────────────────────────────────────────────

def bmi_category(bmi):
    if bmi < 18.5: return "Thiếu cân", "warn"
    if bmi < 25:   return "Bình thường", "good"
    if bmi < 30:   return "Thừa cân", "warn"
    return "Béo phì", "danger"


def bp_category(sys, dia):
    if sys < 120 and dia < 80: return "Bình thường", "good"
    if sys < 130 and dia < 80: return "Cao giới hạn", "warn"
    if sys < 140 or dia < 90:  return "Cao độ 1", "warn"
    return "Cao độ 2+", "danger"


def glucose_category(gl):
    if gl < 100:  return "Bình thường", "good"
    if gl < 126:  return "Tiền đái tháo đường", "warn"
    return "Nguy cơ đái tháo đường", "danger"


def hba1c_category(hb):
    if hb < 5.7:  return "Bình thường", "good"
    if hb < 6.5:  return "Tiền đái tháo đường", "warn"
    return "Nguy cơ cao", "danger"


def cholesterol_category(tc):
    if tc < 200:  return "Tốt", "good"
    if tc < 240:  return "Giới hạn cao", "warn"
    return "Cao", "danger"


def ldl_category(ldl):
    if ldl < 100:  return "Tối ưu", "good"
    if ldl < 130:  return "Gần tối ưu", "good"
    if ldl < 160:  return "Giới hạn cao", "warn"
    return "Cao", "danger"


def categorize_risk(score, max_score):
    pct = score / max_score
    if pct >= 0.60: return "cao", "Cao", "danger"
    if pct >= 0.30: return "medium", "Trung bình", "warn"
    return "low", "Thấp", "good"


# ─── Tính điểm nguy cơ ───────────────────────────────────────────────────────

def risk_score_diabetes(data):
    score = 0; reasons = []
    if data["age"] >= 45:
        score += 2; reasons.append("Tuổi ≥ 45")
    if data["bmi"] >= 30:
        score += 2; reasons.append("BMI ≥ 30 (Béo phì)")
    elif data["bmi"] >= 25:
        score += 1; reasons.append("BMI 25–30 (Thừa cân)")
    if data["fasting_glucose"] >= 126:
        score += 4; reasons.append("Đường huyết lúc đói ≥ 126 mg/dL")
    elif data["fasting_glucose"] >= 100:
        score += 2; reasons.append("Đường huyết lúc đói 100–125 (Tiền ĐTĐ)")
    if data.get("hba1c", 0) >= 6.5:
        score += 4; reasons.append("HbA1c ≥ 6,5%")
    elif data.get("hba1c", 0) >= 5.7:
        score += 2; reasons.append("HbA1c 5,7–6,4% (Tiền ĐTĐ)")
    if data["family_diabetes"]:
        score += 2; reasons.append("Tiền sử gia đình bị đái tháo đường")
    if data["hypertension"]:
        score += 1; reasons.append("Tăng huyết áp")
    if not data["exercise"]:
        score += 1; reasons.append("Ít vận động thể chất")
    if data["smoke"]:
        score += 1; reasons.append("Hút thuốc lá")
    if data["waist"] >= (102 if data["gender"] == "Nam" else 88):
        score += 2; reasons.append("Vòng bụng lớn (nguy cơ tích mỡ tạng)")
    return min(score, 16), reasons


def risk_score_hypertension(data):
    score = 0; reasons = []
    sys = data.get("systolic", 120); dia = data.get("diastolic", 80)
    if sys >= 140 or dia >= 90:
        score += 4; reasons.append("Huyết áp cao độ 2+")
    elif sys >= 130 or dia >= 80:
        score += 2; reasons.append("Huyết áp cao độ 1")
    if data["bmi"] >= 30:
        score += 2; reasons.append("Béo phì (BMI ≥ 30)")
    if data["age"] >= 55:
        score += 2; reasons.append("Tuổi ≥ 55")
    elif data["age"] >= 40:
        score += 1; reasons.append("Tuổi 40–54")
    if data.get("sodium_intake", 0) > 2300:
        score += 1; reasons.append("Ăn mặn nhiều (Na > 2300 mg/ngày)")
    if data["smoke"]:
        score += 2; reasons.append("Hút thuốc lá")
    if data["family_hypertension"]:
        score += 2; reasons.append("Tiền sử gia đình bị tăng huyết áp")
    if not data["exercise"]:
        score += 1; reasons.append("Ít vận động")
    if data.get("alcohol", 0) > 2:
        score += 1; reasons.append("Uống rượu bia nhiều")
    return min(score, 14), reasons


def risk_score_cardiovascular(data):
    score = 0; reasons = []
    tc = data.get("total_cholesterol", 180)
    ldl = data.get("ldl", 100)
    if tc >= 240:
        score += 3; reasons.append("Cholesterol toàn phần cao (≥ 240)")
    elif tc >= 200:
        score += 1; reasons.append("Cholesterol giới hạn cao (200–239)")
    if ldl >= 160:
        score += 3; reasons.append("LDL-Cholesterol cao (≥ 160)")
    elif ldl >= 130:
        score += 1; reasons.append("LDL cao trung bình (130–159)")
    if data["smoke"]:
        score += 3; reasons.append("Hút thuốc lá — yếu tố nguy cơ tim mạch cao")
    if data["hypertension"]:
        score += 2; reasons.append("Tăng huyết áp")
    if data["bmi"] >= 30:
        score += 1; reasons.append("Béo phì")
    if data["age"] >= 65:
        score += 2; reasons.append("Tuổi ≥ 65")
    elif data["age"] >= 50:
        score += 1; reasons.append("Tuổi 50–64")
    if data.get("fasting_glucose", 90) >= 100:
        score += 1; reasons.append("Đường huyết cao (tiền đái tháo đường)")
    if data["family_cardiovascular"]:
        score += 2; reasons.append("Tiền sử gia đình bệnh tim mạch")
    if not data["exercise"]:
        score += 1; reasons.append("Ít vận động thể chất")
    return min(score, 16), reasons


def risk_score_kidney(data):
    score = 0; reasons = []
    cr = data.get("creatinine", 1.0)
    if cr > 1.2 and data["gender"] == "Nam":
        score += 3; reasons.append("Creatinine máu cao (Nam > 1,2 mg/dL)")
    elif cr > 1.1 and data["gender"] == "Nữ":
        score += 3; reasons.append("Creatinine máu cao (Nữ > 1,1 mg/dL)")
    if data.get("fasting_glucose", 90) >= 126:
        score += 2; reasons.append("Đái tháo đường (nguy cơ bệnh thận)")
    if data["hypertension"]:
        score += 2; reasons.append("Tăng huyết áp — yếu tố hàng đầu gây bệnh thận")
    if data["age"] >= 60:
        score += 1; reasons.append("Tuổi cao ≥ 60")
    if data["smoke"]:
        score += 1; reasons.append("Hút thuốc lá")
    if data.get("nsaid_use", False):
        score += 1; reasons.append("Sử dụng thuốc giảm đau NSAID thường xuyên")
    return min(score, 10), reasons


# ─── Tính tất cả risk cùng lúc ───────────────────────────────────────────────

MAX_SCORES = {"DTĐ": 16, "THA": 14, "Tim": 16, "Thận": 10}

def compute_all_risks(user_data: dict) -> dict:
    """
    Trả về dict chứa scores, labels, keys và last_risks list
    để dùng chung ở nhiều màn hình.
    """
    s_diab, r_diab = risk_score_diabetes(user_data)
    s_htn,  r_htn  = risk_score_hypertension(user_data)
    s_cvd,  r_cvd  = risk_score_cardiovascular(user_data)
    s_kid,  r_kid  = risk_score_kidney(user_data)

    rk_diab_key, rk_diab_lbl, _ = categorize_risk(s_diab, MAX_SCORES["DTĐ"])
    rk_htn_key,  rk_htn_lbl,  _ = categorize_risk(s_htn,  MAX_SCORES["THA"])
    rk_cvd_key,  rk_cvd_lbl,  _ = categorize_risk(s_cvd,  MAX_SCORES["Tim"])
    rk_kid_key,  rk_kid_lbl,  _ = categorize_risk(s_kid,  MAX_SCORES["Thận"])

    return {
        "scores":    {"diab": s_diab, "htn": s_htn, "cvd": s_cvd, "kid": s_kid},
        "reasons":   {"diab": r_diab, "htn": r_htn, "cvd": r_cvd, "kid": r_kid},
        "keys":      {"diab": rk_diab_key, "htn": rk_htn_key, "cvd": rk_cvd_key, "kid": rk_kid_key},
        "labels":    {"diab": rk_diab_lbl, "htn": rk_htn_lbl, "cvd": rk_cvd_lbl, "kid": rk_kid_lbl},
        "last_risks": [
            ("Đái Tháo Đường (Type 2)", rk_diab_lbl, s_diab, MAX_SCORES["DTĐ"]),
            ("Tăng Huyết Áp",           rk_htn_lbl,  s_htn,  MAX_SCORES["THA"]),
            ("Bệnh Tim Mạch",           rk_cvd_lbl,  s_cvd,  MAX_SCORES["Tim"]),
            ("Bệnh Thận Mạn Tính",      rk_kid_lbl,  s_kid,  MAX_SCORES["Thận"]),
        ],
    }