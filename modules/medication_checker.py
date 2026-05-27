# modules/medication_checker.py
# Module kiểm tra tương tác thuốc & ảnh hưởng đến các chỉ số sức khỏe
# Dựa trên dữ liệu NHANES medications.csv + knowledge base y khoa

from pathlib import Path
import pandas as pd

# ─── Knowledge Base: Thuốc → Ảnh hưởng chỉ số ────────────────────────────────
# Mỗi entry: drug_keyword → {effect_type, description, affected_metrics, severity}
# severity: "high" | "medium" | "low"
DRUG_EFFECTS_DB = {
    # === Ảnh hưởng ĐƯỜNG HUYẾT ===
    "PREDNISONE":        {"type": "glucose_raise",  "sev": "high",
                          "vi": "Tăng đường huyết đáng kể (corticosteroid)",
                          "metrics": ["fasting_glucose", "hba1c"], "emoji": "🩸"},
    "PREDNISOLONE":      {"type": "glucose_raise",  "sev": "high",
                          "vi": "Tăng đường huyết (corticosteroid toàn thân)",
                          "metrics": ["fasting_glucose", "hba1c"], "emoji": "🩸"},
    "DEXAMETHASONE":     {"type": "glucose_raise",  "sev": "high",
                          "vi": "Tăng đường huyết mạnh (corticosteroid)",
                          "metrics": ["fasting_glucose", "hba1c"], "emoji": "🩸"},
    "METHYLPREDNISOLONE":{"type": "glucose_raise",  "sev": "high",
                          "vi": "Tăng đường huyết (corticosteroid)",
                          "metrics": ["fasting_glucose"], "emoji": "🩸"},
    "QUETIAPINE":        {"type": "glucose_raise",  "sev": "medium",
                          "vi": "Có thể tăng đường huyết (antipsychotic không điển hình)",
                          "metrics": ["fasting_glucose", "bmi"], "emoji": "🧠"},
    "OLANZAPINE":        {"type": "glucose_raise",  "sev": "high",
                          "vi": "Tăng đường huyết & cân nặng (antipsychotic)",
                          "metrics": ["fasting_glucose", "bmi"], "emoji": "🧠"},
    "CLOZAPINE":         {"type": "glucose_raise",  "sev": "high",
                          "vi": "Nguy cơ cao tăng đường huyết & đái tháo đường",
                          "metrics": ["fasting_glucose", "hba1c"], "emoji": "🧠"},
    "RISPERIDONE":       {"type": "glucose_raise",  "sev": "medium",
                          "vi": "Có thể tăng đường huyết nhẹ",
                          "metrics": ["fasting_glucose"], "emoji": "🧠"},
    "TACROLIMUS":        {"type": "glucose_raise",  "sev": "high",
                          "vi": "Ức chế tiết insulin → tăng đường huyết",
                          "metrics": ["fasting_glucose", "hba1c"], "emoji": "💊"},
    "CYCLOSPORINE":      {"type": "glucose_raise",  "sev": "medium",
                          "vi": "Có thể gây đái tháo đường sau ghép tạng",
                          "metrics": ["fasting_glucose"], "emoji": "💊"},
    "NIACIN":            {"type": "glucose_raise",  "sev": "medium",
                          "vi": "Liều cao có thể tăng đường huyết",
                          "metrics": ["fasting_glucose"], "emoji": "🧪"},
    "THIAZIDE":          {"type": "glucose_raise",  "sev": "low",
                          "vi": "Liều cao có thể gây tăng đường huyết nhẹ",
                          "metrics": ["fasting_glucose"], "emoji": "💧"},

    # === Ảnh hưởng HUYẾT ÁP ===
    "PSEUDOEPHEDRINE":   {"type": "bp_raise",       "sev": "medium",
                          "vi": "Tăng huyết áp (thuốc thông mũi)",
                          "metrics": ["systolic", "diastolic"], "emoji": "❤️"},
    "EPHEDRINE":         {"type": "bp_raise",       "sev": "high",
                          "vi": "Tăng huyết áp đáng kể",
                          "metrics": ["systolic", "diastolic"], "emoji": "❤️"},
    "PHENYLEPHRINE":     {"type": "bp_raise",       "sev": "medium",
                          "vi": "Có thể tăng huyết áp",
                          "metrics": ["systolic"], "emoji": "❤️"},
    "IBUPROFEN":         {"type": "bp_raise",       "sev": "medium",
                          "vi": "NSAID có thể làm giảm tác dụng thuốc hạ áp & tăng HA",
                          "metrics": ["systolic", "diastolic"], "emoji": "💊"},
    "NAPROXEN":          {"type": "bp_raise",       "sev": "medium",
                          "vi": "NSAID làm tăng huyết áp & giữ muối nước",
                          "metrics": ["systolic", "diastolic"], "emoji": "💊"},
    "CELECOXIB":         {"type": "bp_raise",       "sev": "medium",
                          "vi": "COX-2 inhibitor có thể tăng huyết áp",
                          "metrics": ["systolic"], "emoji": "💊"},
    "VENLAFAXINE":       {"type": "bp_raise",       "sev": "medium",
                          "vi": "SNRI liều cao có thể tăng huyết áp",
                          "metrics": ["systolic", "diastolic"], "emoji": "🧠"},

    # === Ảnh hưởng CHOLESTEROL ===
    "CYCLOSPORINE":      {"type": "chol_raise",     "sev": "medium",
                          "vi": "Có thể làm tăng Cholesterol & LDL",
                          "metrics": ["total_cholesterol", "ldl"], "emoji": "🫀"},
    "AMIODARONE":        {"type": "chol_alter",     "sev": "medium",
                          "vi": "Có thể ảnh hưởng đến mức lipid máu",
                          "metrics": ["total_cholesterol"], "emoji": "🫀"},

    # === Ảnh hưởng THẬN (Creatinine) ===
    "IBUPROFEN":         {"type": "kidney_stress",  "sev": "medium",
                          "vi": "NSAID có thể làm giảm chức năng thận, tăng Creatinine",
                          "metrics": ["creatinine"], "emoji": "🫘"},
    "NAPROXEN":          {"type": "kidney_stress",  "sev": "medium",
                          "vi": "NSAID gây co mạch thận, tăng nguy cơ suy thận",
                          "metrics": ["creatinine"], "emoji": "🫘"},
    "METFORMIN":         {"type": "kidney_caution", "sev": "low",
                          "vi": "Cần thận trọng khi Creatinine cao (ngưỡng chống chỉ định)",
                          "metrics": ["creatinine"], "emoji": "⚠️"},
    "AMINOGLYCOSIDE":    {"type": "kidney_stress",  "sev": "high",
                          "vi": "Kháng sinh nhóm aminoglycoside có thể gây độc thận",
                          "metrics": ["creatinine"], "emoji": "🫘"},
    "VANCOMYCIN":        {"type": "kidney_stress",  "sev": "high",
                          "vi": "Có thể gây độc thận, cần theo dõi Creatinine",
                          "metrics": ["creatinine"], "emoji": "🫘"},
    "LITHIUM":           {"type": "kidney_stress",  "sev": "high",
                          "vi": "Dùng lâu dài gây ảnh hưởng chức năng thận",
                          "metrics": ["creatinine"], "emoji": "🫘"},

    # === Thuốc hạ glucose (tương tác dương) ===
    "METFORMIN":         {"type": "glucose_lower",  "sev": "info",
                          "vi": "Thuốc điều trị ĐTĐ — theo dõi đường huyết thường xuyên",
                          "metrics": ["fasting_glucose", "hba1c"], "emoji": "✅"},
    "INSULIN":           {"type": "glucose_lower",  "sev": "info",
                          "vi": "Insulin — nguy cơ hạ đường huyết, theo dõi sát",
                          "metrics": ["fasting_glucose"], "emoji": "✅"},
    "GLIPIZIDE":         {"type": "glucose_lower",  "sev": "info",
                          "vi": "Sulfonylurea — có thể gây hạ đường huyết",
                          "metrics": ["fasting_glucose"], "emoji": "✅"},
    "GLIMEPIRIDE":       {"type": "glucose_lower",  "sev": "info",
                          "vi": "Sulfonylurea — có thể gây hạ đường huyết",
                          "metrics": ["fasting_glucose"], "emoji": "✅"},
    "GLYBURIDE":         {"type": "glucose_lower",  "sev": "info",
                          "vi": "Sulfonylurea — nguy cơ hạ đường huyết cao nhất nhóm",
                          "metrics": ["fasting_glucose"], "emoji": "✅"},
    "SITAGLIPTIN":       {"type": "glucose_lower",  "sev": "info",
                          "vi": "DPP-4 inhibitor — kiểm soát đường huyết sau ăn",
                          "metrics": ["fasting_glucose", "hba1c"], "emoji": "✅"},
    "EMPAGLIFLOZIN":     {"type": "glucose_lower",  "sev": "info",
                          "vi": "SGLT2 inhibitor — cũng bảo vệ tim & thận",
                          "metrics": ["fasting_glucose", "creatinine"], "emoji": "✅"},
    "LIRAGLUTIDE":       {"type": "glucose_lower",  "sev": "info",
                          "vi": "GLP-1 RA — hạ glucose & cân nặng hiệu quả",
                          "metrics": ["fasting_glucose", "bmi"], "emoji": "✅"},

    # === Thuốc hạ huyết áp ===
    "LISINOPRIL":        {"type": "bp_lower",       "sev": "info",
                          "vi": "ACE inhibitor — bảo vệ thận, dùng tốt cho ĐTĐ",
                          "metrics": ["systolic", "diastolic"], "emoji": "✅"},
    "AMLODIPINE":        {"type": "bp_lower",       "sev": "info",
                          "vi": "Calcium channel blocker — hạ huyết áp hiệu quả",
                          "metrics": ["systolic", "diastolic"], "emoji": "✅"},
    "LOSARTAN":          {"type": "bp_lower",       "sev": "info",
                          "vi": "ARB — bảo vệ thận, ít tác dụng phụ hơn ACE-I",
                          "metrics": ["systolic", "creatinine"], "emoji": "✅"},
    "METOPROLOL":        {"type": "bp_lower",       "sev": "info",
                          "vi": "Beta-blocker — cần theo dõi: có thể che triệu chứng hạ đường",
                          "metrics": ["systolic", "fasting_glucose"], "emoji": "⚠️"},
    "ATENOLOL":          {"type": "bp_lower",       "sev": "low",
                          "vi": "Beta-blocker — lưu ý: có thể che lấp triệu chứng hạ đường huyết",
                          "metrics": ["fasting_glucose"], "emoji": "⚠️"},
    "HYDROCHLOROTHIAZIDE":{"type": "bp_lower",      "sev": "low",
                           "vi": "Thiazide diuretic — có thể làm tăng đường huyết & acid uric nhẹ",
                           "metrics": ["fasting_glucose", "systolic"], "emoji": "⚠️"},

    # === Statin (Cholesterol) ===
    "ATORVASTATIN":      {"type": "chol_lower",     "sev": "info",
                          "vi": "Statin — hạ LDL, lưu ý: nguy cơ tăng đường huyết nhẹ",
                          "metrics": ["total_cholesterol", "ldl", "fasting_glucose"], "emoji": "✅"},
    "SIMVASTATIN":       {"type": "chol_lower",     "sev": "info",
                          "vi": "Statin — hạ LDL hiệu quả",
                          "metrics": ["total_cholesterol", "ldl"], "emoji": "✅"},
    "ROSUVASTATIN":      {"type": "chol_lower",     "sev": "info",
                          "vi": "Statin mạnh — hạ LDL tốt, theo dõi enzym gan",
                          "metrics": ["total_cholesterol", "ldl"], "emoji": "✅"},
    "PRAVASTATIN":       {"type": "chol_lower",     "sev": "info",
                          "vi": "Statin — ít tương tác thuốc nhất",
                          "metrics": ["total_cholesterol", "ldl"], "emoji": "✅"},
}

# Nhóm loại tác dụng → màu badge
EFFECT_COLORS = {
    "glucose_raise":  ("🔴 Cảnh báo đường huyết", "danger"),
    "glucose_lower":  ("✅ Thuốc kiểm soát glucose", "info"),
    "bp_raise":       ("🔴 Cảnh báo huyết áp",     "danger"),
    "bp_lower":       ("✅ Thuốc hạ huyết áp",      "info"),
    "chol_raise":     ("🟡 Ảnh hưởng mỡ máu",      "warn"),
    "chol_alter":     ("🟡 Ảnh hưởng mỡ máu",      "warn"),
    "chol_lower":     ("✅ Thuốc hạ mỡ máu",        "info"),
    "kidney_stress":  ("🔴 Cảnh báo chức năng thận","danger"),
    "kidney_caution": ("🟡 Lưu ý chức năng thận",  "warn"),
}

# ─── Tải dữ liệu NHANES medications ──────────────────────────────────────────
_med_cache = None

def _load_med_data() -> pd.DataFrame:
    global _med_cache
    if _med_cache is not None:
        return _med_cache
    candidates = [
        Path("data/medications.csv"),
        Path(__file__).parent.parent / "data" / "medications.csv",
        Path("medications.csv"),
    ]
    for c in candidates:
        if c.exists():
            for enc in ["utf-8", "utf-8-sig", "latin1", "cp1252"]:
                try:
                    df = pd.read_csv(c, encoding=enc, low_memory=False)
                    _med_cache = df
                    return df
                except Exception:
                    continue
    return pd.DataFrame()


def get_available_drugs() -> list[str]:
    """Trả về danh sách thuốc từ NHANES (tên hiển thị, đã loại mã 99999/55555)."""
    df = _load_med_data()
    if df.empty or "RXDDRUG" not in df.columns:
        # Fallback: dùng danh sách từ knowledge base
        return sorted(DRUG_EFFECTS_DB.keys())

    drugs = (
        df["RXDDRUG"]
        .dropna()
        .unique()
    )
    # Lọc mã không rõ nghĩa
    filtered = [d for d in drugs if str(d).strip() not in ("99999", "55555", "nan", "")]
    return sorted(filtered)


def check_medications(selected_drugs: list[str], user_data: dict) -> dict:
    """
    Kiểm tra tác dụng của danh sách thuốc đang dùng lên các chỉ số sức khỏe.

    Returns:
      {
        "alerts":      [{"drug", "effect_label", "description", "severity", "metrics", "emoji"}],
        "warnings":    [{"drug", ...}],   # severity high/medium
        "info_items":  [{"drug", ...}],   # severity info/low
        "affected_metrics": set()         # các chỉ số bị ảnh hưởng
        "has_concern": bool
      }
    """
    all_alerts   = []
    affected_set = set()

    for drug_name in selected_drugs:
        drug_upper = drug_name.upper().strip()

        # Duyệt qua knowledge base, match substring
        matched = []
        for kw, effect in DRUG_EFFECTS_DB.items():
            if kw in drug_upper or drug_upper.startswith(kw):
                matched.append((kw, effect))

        for kw, effect in matched:
            eff_label, badge_cls = EFFECT_COLORS.get(
                effect["type"], ("ℹ️ Lưu ý", "info")
            )
            all_alerts.append({
                "drug":         drug_name,
                "effect_label": eff_label,
                "description":  effect["vi"],
                "severity":     effect["sev"],
                "metrics":      effect["metrics"],
                "emoji":        effect["emoji"],
                "badge_cls":    badge_cls,
                "type":         effect["type"],
            })
            affected_set.update(effect["metrics"])

    # Phân loại cảnh báo
    warnings   = [a for a in all_alerts if a["severity"] in ("high", "medium")]
    info_items = [a for a in all_alerts if a["severity"] in ("low", "info")]

    # Cảnh báo đặc biệt dựa trên chỉ số người dùng
    contextual = _contextual_warnings(selected_drugs, user_data)

    return {
        "alerts":           all_alerts,
        "warnings":         warnings,
        "info_items":       info_items,
        "contextual":       contextual,
        "affected_metrics": affected_set,
        "has_concern":      len(warnings) > 0 or len(contextual) > 0,
    }


def _contextual_warnings(drugs: list[str], ud: dict) -> list[str]:
    """Cảnh báo ngữ cảnh dựa trên cả thuốc VÀ chỉ số hiện tại."""
    msgs = []
    drug_upper_set = {d.upper() for d in drugs}

    gl    = ud.get("fasting_glucose", 95)
    cr    = ud.get("creatinine", 0.9)
    sys   = ud.get("systolic", 120)
    bmi   = ud.get("bmi", 22.0)
    gender= ud.get("gender", "Nam")

    cr_high = (cr > 1.2 and gender == "Nam") or (cr > 1.1 and gender == "Nữ")

    # Metformin + thận suy
    if any("METFORMIN" in d for d in drug_upper_set) and cr_high:
        msgs.append("⚠️ <b>METFORMIN + Creatinine cao:</b> Bạn đang dùng Metformin nhưng chỉ số Creatinine vượt ngưỡng. "
                    "Cần hỏi bác sĩ về điều chỉnh liều hoặc đổi thuốc (nguy cơ nhiễm toan lactic).")

    # NSAID + thận suy
    nsaids = {"IBUPROFEN", "NAPROXEN", "CELECOXIB", "ASPIRIN", "DICLOFENAC", "MELOXICAM"}
    if nsaids & drug_upper_set and cr_high:
        msgs.append("⚠️ <b>NSAID + Creatinine cao:</b> Thuốc giảm đau NSAID bạn đang dùng có thể làm nặng thêm "
                    "tình trạng suy thận hiện tại.")

    # Beta-blocker + đường huyết thấp khả năng
    bblockers = {"METOPROLOL", "ATENOLOL", "BISOPROLOL", "PROPRANOLOL", "CARVEDILOL", "LABETALOL"}
    if bblockers & drug_upper_set and gl < 80:
        msgs.append("⚠️ <b>Beta-blocker + Đường huyết thấp:</b> Beta-blocker có thể che dấu các triệu chứng "
                    "hạ đường huyết (tim đập nhanh). Cần theo dõi đường huyết kỹ hơn.")

    # Corticosteroid + đường huyết cao
    corticoids = {"PREDNISONE", "PREDNISOLONE", "DEXAMETHASONE", "METHYLPREDNISOLONE"}
    if corticoids & drug_upper_set and gl >= 100:
        msgs.append("🔴 <b>Corticosteroid + Đường huyết cao:</b> Bạn đang dùng corticosteroid khi đường huyết "
                    "đã ở mức tiền ĐTĐ/ĐTĐ. Cần kiểm tra đường huyết thường xuyên hơn, "
                    "bác sĩ có thể cần điều chỉnh liều corticoid hoặc thuốc đái tháo đường.")

    # Nhiều thuốc hạ áp
    bp_meds = {"LISINOPRIL", "LOSARTAN", "AMLODIPINE", "METOPROLOL", "ATENOLOL",
               "HYDROCHLOROTHIAZIDE", "VALSARTAN", "OLMESARTAN", "CARVEDILOL"}
    bp_count = sum(1 for d in drug_upper_set if any(b in d for b in bp_meds))
    if bp_count >= 3 and sys < 110:
        msgs.append("⚠️ <b>Đa trị huyết áp + HA thấp:</b> Bạn đang dùng nhiều thuốc hạ áp trong khi "
                    "huyết áp hiện tại đã khá thấp. Nguy cơ tụt huyết áp tư thế đứng.")

    return msgs


# ─── Từ điển dịch tên bệnh Anh → Việt ───────────────────────────────────────
DISEASE_VI = {
    # Tim mạch & huyết áp
    "Essential (primary) hypertension":                                    "Tăng huyết áp nguyên phát",
    "Prevent heart attack/myocardial infarction":                          "Phòng ngừa nhồi máu cơ tim",
    "Heart failure, unspecified":                                          "Suy tim (không xác định)",
    "Cardiac arrhythmia, unspecified":                                     "Rối loạn nhịp tim",
    "Unspecified atrial fibrillation":                                     "Rung nhĩ",
    "Heart disease, unspecified":                                          "Bệnh tim (không xác định)",
    "Angina pectoris, unspecified":                                        "Đau thắt ngực",
    "Prevent blood clots":                                                 "Phòng ngừa huyết khối",
    "Prevent stroke":                                                      "Phòng ngừa đột quỵ",
    "Cerebral infarction":                                                 "Nhồi máu não",
    "Atherosclerosis of native arteries of extremities":                   "Xơ vữa động mạch chi",
    "Phlebitis and thrombophlebitis of lower extremities, unspecified":    "Viêm tĩnh mạch chi dưới",
    "Long term (current) use of antithrombotics/antiplatelets":            "Sử dụng thuốc chống đông/chống kết tập tiểu cầu dài hạn",
    "ST elevation (STEMI) and non-ST elevation (NSTEMI) myocardial infarction": "Nhồi máu cơ tim cấp (STEMI/NSTEMI)",
    "Tachycardia, unspecified":                                            "Nhịp tim nhanh",
    "Chest pain, unspecified":                                             "Đau ngực",
    "Shortness of breath":                                                 "Khó thở",

    # Đái tháo đường & chuyển hoá
    "Type 2 diabetes mellitus":                                            "Đái tháo đường type 2",
    "Type 1 diabetes mellitus":                                            "Đái tháo đường type 1",
    "Type 2 diabetes mellitus with kidney complications":                  "ĐTĐ type 2 biến chứng thận",
    "Type 2 diabetes mellitus with neurological complications":            "ĐTĐ type 2 biến chứng thần kinh",
    "Elevated blood glucose level":                                        "Tăng đường huyết",
    "Hyperglycemia, unspecified":                                          "Tăng glucose máu",
    "Prevent diabetes":                                                    "Phòng ngừa đái tháo đường",
    "Prevent diabetic kidney disease":                                     "Phòng ngừa bệnh thận do ĐTĐ",

    # Mỡ máu
    "Pure hypercholesterolemia":                                           "Tăng cholesterol máu đơn thuần",
    "Pure hyperglyceridemia":                                              "Tăng triglyceride máu",
    "Prevent high cholesterol":                                            "Phòng ngừa tăng mỡ máu",
    "Hyperuricemia without signs of inflammatory arthritis and tophaceous disease": "Tăng acid uric máu",

    # Thận & tiết niệu
    "Disorder of kidney and ureter, unspecified":                          "Rối loạn thận và niệu quản",
    "Edema, unspecified":                                                  "Phù (không xác định)",
    "Hypokalemia":                                                         "Hạ kali máu",
    "Fluid overload":                                                      "Quá tải dịch",
    "Overactive bladder":                                                  "Bàng quang hoạt động quá mức",
    "Frequency of micturition":                                            "Tiểu nhiều lần",
    "Urgency of urination":                                                "Tiểu gấp",
    "Urinary tract infection, site not specified":                         "Nhiễm trùng đường tiểu",
    "Cystitis":                                                            "Viêm bàng quang",
    "Calculus of kidney":                                                  "Sỏi thận",
    "Other specified urinary incontinence":                                "Tiểu không tự chủ",
    "Unspecified urinary incontinence":                                    "Tiểu không kiểm soát",
    "Enlarged prostate":                                                   "Phì đại tuyến tiền liệt",
    "Disorder of prostate, unspecified":                                   "Rối loạn tuyến tiền liệt",
    "Malignant neoplasm of prostate":                                      "Ung thư tuyến tiền liệt",
    "Testicular hypofunction":                                             "Suy tuyến sinh dục nam",
    "Male erectile dysfunction, unspecified":                              "Rối loạn cương dương",
    "Prevent transplanted organ and tissue rejection":                     "Phòng thải ghép tạng",

    # Hô hấp
    "Asthma":                                                              "Hen phế quản",
    "Chronic obstructive pulmonary disease, unspecified":                  "Bệnh phổi tắc nghẽn mạn tính (COPD)",
    "Allergic rhinitis, unspecified":                                      "Viêm mũi dị ứng",
    "Allergic rhinitis due to pollen":                                     "Viêm mũi dị ứng do phấn hoa",
    "Nasal congestion":                                                    "Nghẹt mũi",
    "Wheezing":                                                            "Thở khò khè",
    "Cough":                                                               "Ho",
    "Unspecified chronic bronchitis":                                      "Viêm phế quản mạn tính",
    "Acute bronchitis, unspecified":                                       "Viêm phế quản cấp",
    "Emphysema":                                                           "Khí phế thũng",
    "Unspecified abnormalities of breathing":                              "Rối loạn hô hấp",
    "Pneumonia, unspecified organism":                                     "Viêm phổi",
    "Acute sinusitis, unspecified":                                        "Viêm xoang cấp",
    "Acute nasopharyngitis [common cold]":                                 "Cảm lạnh thông thường",
    "Acute pharyngitis":                                                   "Viêm họng cấp",

    # Tiêu hoá
    "Gastro-esophageal reflux disease":                                    "Trào ngược dạ dày thực quản (GERD)",
    "Functional dyspepsia":                                                "Khó tiêu chức năng",
    "Gastric ulcer":                                                       "Loét dạ dày",
    "Peptic ulcer, site unspecified":                                      "Loét dạ dày-tá tràng",
    "Helicobacter pylori [H. pylori] as the cause of diseases classified elsewhere": "Nhiễm vi khuẩn H. pylori",
    "Disease of stomach and duodenum, unspecified":                        "Bệnh dạ dày-tá tràng",
    "Irritable bowel syndrome":                                            "Hội chứng ruột kích thích",
    "Constipation":                                                        "Táo bón",
    "Diarrhea, unspecified":                                               "Tiêu chảy",
    "Nausea and vomiting":                                                 "Buồn nôn và nôn",
    "Nausea":                                                              "Buồn nôn",
    "Unspecified abdominal pain":                                          "Đau bụng",
    "Heartburn":                                                           "Ợ nóng",
    "Crohn's disease [regional enteritis]":                                "Bệnh Crohn",
    "Prevent gastric ulcer":                                               "Phòng ngừa loét dạ dày",
    "Colic":                                                               "Đau quặn bụng",

    # Xương khớp & cơ
    "Dorsalgia, unspecified":                                              "Đau lưng",
    "Cervicalgia":                                                         "Đau cổ",
    "Pain in shoulder":                                                    "Đau vai",
    "Pain in knee":                                                        "Đau đầu gối",
    "Pain in hip":                                                         "Đau hông",
    "Pain in joint":                                                       "Đau khớp",
    "Pain, unspecified":                                                   "Đau (không xác định)",
    "Myalgia":                                                             "Đau cơ",
    "Muscle spasm":                                                        "Co cơ",
    "Rheumatoid arthritis, unspecified":                                   "Viêm khớp dạng thấp",
    "Osteoarthritis, unspecified site":                                    "Thoái hoá khớp",
    "Other arthritis":                                                     "Viêm khớp khác",
    "Chronic gout":                                                        "Gút mạn tính",
    "Gout, unspecified":                                                   "Bệnh gút",
    "Fibromyalgia":                                                        "Hội chứng đau cơ xơ hoá",
    "Osteoporosis without current pathological fracture":                  "Loãng xương",
    "Prevent bone loss/osteoporosis":                                      "Phòng ngừa loãng xương",
    "Other specified disorders of bone density and structure, unspecified site": "Rối loạn mật độ xương",
    "Unspecified injury":                                                  "Chấn thương",
    "Other acute postprocedural pain":                                     "Đau sau thủ thuật",

    # Thần kinh & tâm thần
    "Major depressive disorder, single episode, unspecified":              "Rối loạn trầm cảm nặng",
    "Anxiety disorder, unspecified":                                       "Rối loạn lo âu",
    "Bipolar disorder, unspecified":                                       "Rối loạn lưỡng cực",
    "Insomnia":                                                            "Mất ngủ",
    "Sleep disorder, unspecified":                                         "Rối loạn giấc ngủ",
    "Attention-deficit hyperactivity disorders":                           "Rối loạn tăng động giảm chú ý (ADHD)",
    "Epilepsy and recurrent seizures":                                     "Động kinh và co giật tái phát",
    "Migraine":                                                            "Đau nửa đầu (Migraine)",
    "Neuralgia and neuritis, unspecified":                                 "Đau thần kinh",
    "Restless legs syndrome":                                              "Hội chứng chân không yên",
    "Schizophrenia":                                                       "Tâm thần phân liệt",
    "Parkinson's disease":                                                 "Bệnh Parkinson",
    "Alzheimer's disease, unspecified":                                    "Bệnh Alzheimer",
    "Degenerative disease of nervous system, unspecified":                 "Thoái hoá thần kinh",
    "Essential tremor":                                                    "Run tay vô căn",
    "Unspecified mood [affective] disorder":                               "Rối loạn cảm xúc",
    "Unspecified psychosis not due to a substance or known physiological condition": "Rối loạn tâm thần",
    "Nervousness":                                                         "Lo lắng, bồn chồn",
    "Post-traumatic stress disorder (PTSD)":                               "Rối loạn căng thẳng sau sang chấn (PTSD)",
    "Panic disorder [episodic paroxysmal anxiety] without agoraphobia":    "Rối loạn hoảng loạn",
    "Headache":                                                            "Đau đầu",
    "Dizziness and giddiness":                                             "Chóng mặt",

    # Nội tiết & tuyến giáp
    "Hypothyroidism, unspecified":                                         "Suy giáp",
    "Disorder of thyroid, unspecified":                                    "Rối loạn tuyến giáp",
    "Nontoxic single thyroid nodule":                                      "Nhân giáp lành tính",
    "Nontoxic goiter, unspecified":                                        "Bướu giáp không nhiễm độc",

    # Da liễu
    "Atopic dermatitis, unspecified":                                      "Viêm da dị ứng (chàm)",
    "Acne":                                                                "Mụn trứng cá",
    "Psoriasis":                                                           "Vảy nến",
    "Rash and other nonspecific skin eruption":                            "Phát ban da",
    "Allergic contact dermatitis":                                         "Viêm da tiếp xúc dị ứng",
    "Pruritus, unspecified":                                               "Ngứa da",
    "Rosacea":                                                             "Viêm da đỏ mặt (Rosacea)",
    "Tinea corporis":                                                      "Nấm da thân",
    "Herpesviral vesicular dermatitis":                                    "Viêm da do Herpes",
    "Zoster [herpes zoster]":                                              "Zona thần kinh",
    "Cellulitis, unspecified":                                             "Viêm mô tế bào",

    # Mắt
    "Glaucoma":                                                            "Tăng nhãn áp (Glaucoma)",
    "Dry eye syndrome":                                                    "Hội chứng mắt khô",
    "Acute atopic conjunctivitis":                                         "Viêm kết mạc dị ứng cấp",
    "Conjunctivitis":                                                      "Viêm kết mạc",
    "Other specified disorders of eye and adnexa":                         "Rối loạn mắt khác",

    # Ung thư
    "Malignant neoplasm of breast":                                        "Ung thư vú",
    "Long term (current) use of agents affecting estrogen receptors and estrogen levels": "Điều trị nội tiết ung thư vú dài hạn",
    "Prevent barest cancer":                                               "Phòng ngừa ung thư vú",

    # Miễn dịch & nhiễm trùng
    "Allergy, unspecified":                                                "Dị ứng",
    "Human immunodeficiency virus [HIV] disease":                          "Bệnh HIV/AIDS",
    "Lupus erythematosus":                                                 "Lupus ban đỏ",
    "Influenza due to certain identified influenza viruses":               "Cúm mùa",
    "Bacterial infection, unspecified":                                    "Nhiễm khuẩn",
    "Prevent bacterial infection":                                         "Phòng ngừa nhiễm khuẩn",
    "Periapical abscess without sinus":                                    "Áp xe quanh chóp răng",
    "Other specified disorders of teeth and supporting structures":        "Rối loạn răng và mô nha chu",
    "Partial loss of teeth":                                               "Mất răng một phần",

    # Nữ khoa & nội tiết tố
    "Long term (current) use of hormonal contraceptives":                  "Sử dụng thuốc tránh thai nội tiết dài hạn",
    "Menopausal and female climacteric states":                            "Mãn kinh và tiền mãn kinh",
    "Excessive, frequent and irregular menstruation":                      "Rối loạn kinh nguyệt",
    "Dysmenorrhea, unspecified":                                           "Đau bụng kinh",

    # Tai mũi họng & hô hấp trên
    "Otitis media, unspecified":                                           "Viêm tai giữa",

    # Khác
    "Nicotine dependence unspecified, with withdrawal":                    "Nghiện nicotine / cai thuốc lá",
    "Conduct disorder, unspecified":                                       "Rối loạn hành vi",
    "Presence of coronary angioplasty implant and graft":                  "Tiền sử đặt stent động mạch vành",

    # Bổ sung các bệnh hay gặp còn lại
    "Malignant neoplasm of thyroid gland":                                 "Ung thư tuyến giáp",
    "Bronchitis, not specified as acute or chronic":                       "Viêm phế quản",
    "Ankylosing spondylitis":                                              "Viêm cột sống dính khớp",
    "Carpal tunnel syndrome":                                              "Hội chứng ống cổ tay",
    "Autoimmune thyroiditis":                                              "Viêm giáp tự miễn (Hashimoto)",
    "Candidiasis, unspecified":                                            "Nhiễm nấm Candida",
    "Candidiasis of vulva and vagina":                                     "Nhiễm nấm âm đạo",
    "Cardiomyopathy, unspecified":                                         "Bệnh cơ tim",
    "Acute upper respiratory infection, unspecified":                      "Nhiễm trùng hô hấp trên cấp",
    "Abnormal results of liver function studies":                          "Bất thường chức năng gan",
    "Androgenic alopecia":                                                 "Rụng tóc do nội tiết",
    "Anorexia":                                                            "Chán ăn",
    "Autistic disorder":                                                   "Rối loạn tự kỷ",
    "Benign paroxysmal vertigo":                                           "Chóng mặt tư thế lành tính (BPPV)",
    "Biliary cirrhosis, unspecified":                                      "Xơ gan mật",
    "Bladder disorder, unspecified":                                       "Rối loạn bàng quang",
    "Atrial premature depolarization":                                     "Ngoại tâm thu nhĩ",
    "Abdominal distension (gaseous)":                                      "Đầy hơi, chướng bụng",
    "Abnormal uterine and vaginal bleeding, unspecified":                  "Xuất huyết tử cung bất thường",
    "Acute prostatitis":                                                   "Viêm tuyến tiền liệt cấp",
    "Acute vaginitis":                                                     "Viêm âm đạo cấp",
    "Bariatric surgery status":                                            "Tình trạng sau phẫu thuật giảm cân",
    "Prophylactic medication":                                             "Thuốc dùng phòng ngừa",
    "Arthropathic psoriasis":                                              "Vảy nến khớp",
}


def _translate_disease(name: str) -> str:
    """Trả về tên bệnh tiếng Việt, fallback về tên gốc nếu chưa có trong từ điển."""
    return DISEASE_VI.get(name, name)


def get_drug_disease_stats(drug_name: str) -> dict:
    """
    Trả về thống kê từ NHANES: bệnh lý phổ biến mà những người dùng thuốc này mắc.
    Kết quả đã được dịch sang tiếng Việt.
    """
    df = _load_med_data()
    if df.empty:
        return {}

    drug_upper = drug_name.upper()
    subset = df[df["RXDDRUG"].str.upper() == drug_upper] if "RXDDRUG" in df.columns else pd.DataFrame()

    if subset.empty or "RXDRSD1" not in subset.columns:
        return {}

    counts = subset["RXDRSD1"].dropna().value_counts().head(5)
    # Dịch tên bệnh sang tiếng Việt
    return {_translate_disease(k): v for k, v in counts.to_dict().items()}