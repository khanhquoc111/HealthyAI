"""
custom_scorer.py — Kidney Disease Plugin
-----------------------------------------
Override rule-based scoring với logic tính creatinine theo giới tính.
Trong tương lai có thể mở rộng để tính eGFR bằng công thức CKD-EPI.
"""


def compute_score(user_data: dict) -> tuple[int, list[str]]:
    """
    Tính điểm nguy cơ bệnh thận mạn.

    Args:
        user_data: dict chứa toàn bộ thông số của người dùng

    Returns:
        (score, reasons): điểm và danh sách lý do
    """
    score = 0
    reasons = []

    cr = user_data.get("creatinine", 1.0)
    gender = user_data.get("gender", "Nam")

    # Creatinine — ngưỡng khác nhau theo giới tính
    if cr > 1.2 and gender == "Nam":
        score += 3
        reasons.append("Creatinine máu cao (Nam > 1.2 mg/dL)")
    elif cr > 1.1 and gender == "Nữ":
        score += 3
        reasons.append("Creatinine máu cao (Nữ > 1.1 mg/dL)")

    # Đái tháo đường
    if user_data.get("fasting_glucose", 90) >= 126:
        score += 2
        reasons.append("Đái tháo đường (nguy cơ bệnh thận)")

    # Tăng huyết áp
    if user_data.get("hypertension", False):
        score += 2
        reasons.append("Tăng huyết áp — yếu tố hàng đầu gây bệnh thận")

    # Tuổi
    if user_data.get("age", 0) >= 60:
        score += 1
        reasons.append("Tuổi cao ≥ 60")

    # Hút thuốc
    if user_data.get("smoke", False):
        score += 1
        reasons.append("Hút thuốc lá")

    # NSAID
    if user_data.get("nsaid_use", False):
        score += 1
        reasons.append("Sử dụng thuốc giảm đau NSAID thường xuyên")

    return min(score, 10), reasons


# ── Mở rộng tương lai: tính eGFR bằng CKD-EPI ──────────────────────────────

def compute_egfr(creatinine: float, age: int, gender: str) -> float:
    """
    Tính eGFR theo công thức CKD-EPI 2021 (không dùng race).
    Kết quả: mL/min/1.73m²

    Chưa tích hợp vào scoring — để dành cho v2.0.
    """
    import math
    kappa = 0.7 if gender == "Nữ" else 0.9
    alpha = -0.241 if gender == "Nữ" else -0.302
    sex_factor = 1.012 if gender == "Nữ" else 1.0

    cr_kappa = creatinine / kappa
    egfr = (142
            * min(cr_kappa, 1) ** alpha
            * max(cr_kappa, 1) ** (-1.200)
            * 0.9938 ** age
            * sex_factor)
    return round(egfr, 1)
