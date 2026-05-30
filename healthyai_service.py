from __future__ import annotations
import joblib
import pandas as pd
from pathlib import Path
from typing import Any

from modules.plugin_manager import get_all_plugins, get_plugin
from modules.dynamic_scorer import compute_dynamic_score
from gemini_api import call_gemini
from prompt_builder import build_gemini_prompt
from modules.diet_advisor import get_diet_benchmark, NUTRITION_COLS
from modules.medication_checker import check_medications, get_available_drugs, get_drug_disease_stats
from modules.risk_engine import bmi_category, bp_category, glucose_category, hba1c_category, cholesterol_category, ldl_category

DEFAULT_PROFILE: dict[str, Any] = {
    "age": 40, "gender": "Nam", "height": 165, "weight": 65.0, "waist": 85,
    "systolic": 120, "diastolic": 80, "fasting_glucose": 95, "hba1c": 5.4,
    "total_cholesterol": 185, "ldl": 110, "creatinine": 0.9,
    "smoke": False, "exercise": True, "alcohol": 0, "sodium_intake": 2000,
    "nsaid_use": False, "family_diabetes": False, "family_hypertension": False, "family_cardiovascular": False
}

def build_user_data(profile: dict[str, Any] | None = None) -> dict[str, Any]:
    data = {**DEFAULT_PROFILE, **(profile or {})}
    height = max(float(data.get("height", 165)), 1.0)
    weight = float(data.get("weight", 65.0))
    
    data["bmi"] = weight / ((height / 100) ** 2)
    data["hypertension"] = int(data.get("systolic", 120)) >= 130 or int(data.get("diastolic", 80)) >= 80
    return data

def health_categories(user_data: dict[str, Any]) -> dict[str, dict[str, Any]]:
    bmi_label, bmi_status = bmi_category(user_data["bmi"])
    bp_label, bp_status = bp_category(user_data["systolic"], user_data["diastolic"])
    glucose_label, glucose_status = glucose_category(user_data["fasting_glucose"])
    hba1c_label, hba1c_status = hba1c_category(user_data["hba1c"])
    cholesterol_label, cholesterol_status = cholesterol_category(user_data["total_cholesterol"])
    ldl_label, ldl_status = ldl_category(user_data["ldl"])
    creatinine_high = (user_data["creatinine"] > 1.2 and user_data["gender"] == "Nam") or (user_data["creatinine"] > 1.1 and user_data["gender"] == "Nữ")

    def _label_pair(label: str, status: str) -> dict[str, str]:
        return {"label": label, "status": status}

    return {
        "bmi": {**_label_pair(bmi_label, bmi_status), "value": round(user_data["bmi"], 1)},
        "blood_pressure": {**_label_pair(bp_label, bp_status), "value": f"{user_data['systolic']}/{user_data['diastolic']}"},
        "fasting_glucose": {**_label_pair(glucose_label, glucose_status), "value": user_data["fasting_glucose"]},
        "hba1c": {**_label_pair(hba1c_label, hba1c_status), "value": round(user_data["hba1c"], 1)},
        "total_cholesterol": {**_label_pair(cholesterol_label, cholesterol_status), "value": user_data["total_cholesterol"]},
        "ldl": {**_label_pair(ldl_label, ldl_status), "value": user_data["ldl"]},
        "creatinine": {**_label_pair("Cao" if creatinine_high else "Bình thường", "danger" if creatinine_high else "good"), "value": user_data["creatinine"]},
        "exercise": {**_label_pair("Thường xuyên" if user_data["exercise"] else "Ít vận động", "good" if user_data["exercise"] else "warn"), "value": user_data["exercise"]},
        "smoke": {**_label_pair("Có" if user_data["smoke"] else "Không", "danger" if user_data["smoke"] else "good"), "value": user_data["smoke"]},
    }

def _run_plugin_ml(pid: str, plugin: dict, user_data: dict[str, Any]) -> tuple[str, list[str]]:
    """Chạy model.pkl riêng của plugin, trả về (level_key, reasons)."""
    try:
        plugin_dir = Path("plugins") / pid
        model_path = plugin_dir / plugin["ml_model"]["model_file"]
        feature_cols = plugin["ml_model"].get("feature_cols", [])

        model = joblib.load(model_path)

        row = {}
        for col in feature_cols:
            if col == "gender_code":
                row[col] = 1 if user_data.get("gender") == "Nam" else 2
            elif col in user_data:
                row[col] = int(user_data[col]) if isinstance(user_data[col], bool) else user_data[col]
            else:
                row[col] = 0

        x_input = pd.DataFrame([row], columns=feature_cols)
        probability = float(model.predict_proba(x_input)[0, 1])
        level_key = "cao" if probability >= 0.65 else "medium" if probability >= 0.40 else "low"
        reasons = [f"ML xác suất nguy cơ: {round(probability * 100, 1)}%"]
        return level_key, reasons
    except Exception as e:
        return None, []  # None = báo hiệu ML thất bại, fallback sang rule-based

def analyze_profile(profile: dict[str, Any] | None = None) -> dict[str, Any]:
    user_data = build_user_data(profile)
    plugins = get_all_plugins()

    items = []
    scores_dict, reasons_dict, keys_dict, labels_dict = {}, {}, {}, {}
    high_risks, medium_risks = [], []

    for pid, plugin in plugins.items():
        ml_config = plugin.get("ml_model", {})
        ml_enabled = ml_config.get("enabled", False)
        ml_path = Path("plugins") / pid / ml_config.get("model_file", "model.pkl")
        max_score = plugin.get("max_score", 10)

        if ml_enabled and ml_path.exists():
            # Có model riêng → ưu tiên ML
            final_key, reasons = _run_plugin_ml(pid, plugin, user_data)
            if final_key is None:
                # ML lỗi runtime → fallback rule-based
                rule_score, reasons = compute_dynamic_score(pid, user_data)
                pct = rule_score / max_score
                final_key = "cao" if pct >= 0.60 else "medium" if pct >= 0.30 else "low"
            else:
                # Ánh xạ level → score ước tính để hiển thị percent
                rule_score = {"cao": max_score, "medium": max_score // 2, "low": 0}[final_key]
        else:
            # Không có model → rule-based (có thể có custom_scorer.py)
            rule_score, reasons = compute_dynamic_score(pid, user_data)
            pct = rule_score / max_score
            final_key = "cao" if pct >= 0.60 else "medium" if pct >= 0.30 else "low"

        percent = round((rule_score / max_score) * 100, 1)
        final_label = "Cao" if final_key == "cao" else "Trung bình" if final_key == "medium" else "Thấp"

        if final_key == "cao":
            high_risks.append(plugin["name"])
        elif final_key == "medium":
            medium_risks.append(plugin["name"])

        scores_dict[pid] = rule_score
        reasons_dict[pid] = reasons
        keys_dict[pid] = final_key
        labels_dict[pid] = final_label

        items.append({
            "key": pid,
            "name": plugin["name"],
            "short": plugin.get("short", pid),
            "level_key": final_key,
            "level": final_label,
            "score": rule_score,
            "max_score": max_score,
            "percent": percent,
            "reasons": reasons,
            "ml_used": ml_enabled and ml_path.exists(),  # Frontend biết kết quả từ nguồn nào
        })

    return {
        "user_data": user_data,
        "categories": health_categories(user_data),
        "risks": {
            "scores": scores_dict, "reasons": reasons_dict,
            "keys": keys_dict, "labels": labels_dict, "items": items,
        },
        "conclusion": {
            "high_risks": high_risks, "medium_risks": medium_risks,
            "status": "high" if high_risks else "medium" if medium_risks else "good",
        }
    }

def sample_menu(risk_keys: list[str]) -> dict[str, list[str]]:
    is_diab = "diab" in risk_keys
    is_htn = "htn" in risk_keys
    is_cvd = "cvd" in risk_keys

    return {
        "Bữa sáng (7:00-8:00)": [
            "Cháo yến mạch nguyên hạt + trứng luộc" if is_diab else "Bún gạo lứt + rau luộc",
            "Sữa không đường hoặc sữa hạnh nhân không đường" if is_diab else "Sữa ít béo 200ml",
            "1/2 quả táo hoặc 1 múi bưởi" if is_diab else "1 quả chuối nhỏ",
        ],
        "Bữa trưa (11:30-12:30)": [
            "Gạo lứt 1/2 chén hoặc cơm trắng 1/2 chén nhỏ",
            "Cá hấp/nướng 120-150g" if is_cvd else "Thịt gà hoặc đậu hũ 100g",
            "Rau cải xào ít dầu hoặc rau luộc 200g",
            "Canh rau củ ít muối" if is_htn else "Canh bí đao hoặc canh chua nhẹ",
        ],
        "Bữa xế (15:00-16:00)": [
            "Một nắm nhỏ hạt óc chó, hạnh nhân không muối" if is_cvd else "Sữa chua không đường 100ml",
            "1 quả ổi, táo hoặc lê" if is_diab else "Trái cây tươi theo mùa",
        ],
        "Bữa tối (17:30-18:30)": [
            "Gạo lứt hoặc cơm ít hơn bữa trưa",
            "Cá thu/cá hồi/đậu phụ 100g" if is_cvd else "Thịt nạc hoặc tôm 80-100g",
            "Rau xanh luộc hoặc xào ít dầu 200g",
            "Không ăn sau 20:00 để tránh tăng đường huyết ban đêm" if is_diab else "Ngủ sớm, tránh ăn khuya",
        ],
    }

def diet_recommendations(profile: dict[str, Any] | None = None) -> dict[str, Any]:
    analysis = analyze_profile(profile)
    
    # ĐÃ ĐƯỢC LƯU Ý SỬA ĐỔI: Tự động ánh xạ từ plugin_id sang diet_keys chuẩn của NHANES
    mapped_diet_keys = []
    for pid, v in analysis["risks"]["keys"].items():
        if v in ("cao", "medium"):
            plugin = get_plugin(pid)
            if plugin:
                mapped_diet_keys.extend(plugin.get("diet_keys", []))
                
    result = get_diet_benchmark(analysis["user_data"], mapped_diet_keys or ["diab"])
    return {
        "risk_keys": mapped_diet_keys,
        "risk_labels": analysis["risks"]["labels"],
        "benchmark": result["benchmark"],
        "tips": result["tips"],
        "n_similar": result["n_similar"],
        "source": result["source"],
        "sample_menu": sample_menu(mapped_diet_keys),
    }

def ai_advice(profile: dict[str, Any] | None = None) -> dict[str, Any]:
    analysis = analyze_profile(profile)
    risk_results = [(item["name"], item["level"], item["score"], item["max_score"]) for item in analysis["risks"]["items"]]
    prompt = build_gemini_prompt(analysis["user_data"], risk_results, None)
    return {"reply": call_gemini(prompt), "analysis": analysis}

def search_drugs(search: str = "", limit: int = 100) -> dict[str, Any]:
    drugs = get_available_drugs()
    if search:
        needle = search.upper()
        drugs = [drug for drug in drugs if needle in drug.upper()]
    return {"items": drugs[:limit], "total": len(drugs)}

def medication_report(profile: dict[str, Any] | None, selected_drugs: list[str]) -> dict[str, Any]:
    user_data = build_user_data(profile)
    result = check_medications(selected_drugs, user_data)
    affected = sorted(result.get("affected_metrics", []))
    stats = {drug: get_drug_disease_stats(drug) for drug in selected_drugs[:3]}
    return {**result, "affected_metrics": affected, "drug_stats": stats, "selected_drugs": selected_drugs}

def reference_payload() -> dict[str, Any]:
    return {
        "reference_rows": [
            {"metric": "BMI (Châu Á)", "normal": "18,5 - 22,9", "watch": "23 - 24,9", "high": ">= 25"},
            {"metric": "Huyết áp tâm thu", "normal": "< 120 mmHg", "watch": "120 - 129 mmHg", "high": ">= 130 mmHg"},
            {"metric": "Huyết áp tâm trương", "normal": "< 80 mmHg", "watch": "-", "high": ">= 80 mmHg"},
            {"metric": "Đường huyết lúc đói", "normal": "< 100 mg/dL", "watch": "100 - 125 mg/dL", "high": ">= 126 mg/dL"},
            {"metric": "HbA1c", "normal": "< 5,7%", "watch": "5,7 - 6,4%", "high": ">= 6,5%"},
            {"metric": "Cholesterol toàn phần", "normal": "< 200 mg/dL", "watch": "200 - 239 mg/dL", "high": ">= 240 mg/dL"},
            {"metric": "LDL-Cholesterol", "normal": "< 100 mg/dL", "watch": "100 - 159 mg/dL", "high": ">= 160 mg/dL"},
            {"metric": "Creatinine (Nam)", "normal": "0,7 - 1,2 mg/dL", "watch": "-", "high": "> 1,2 mg/dL"},
            {"metric": "Creatinine (Nữ)", "normal": "0,5 - 1,1 mg/dL", "watch": "-", "high": "> 1,1 mg/dL"},
            {"metric": "Vòng bụng (Nam Châu Á)", "normal": "< 90 cm", "watch": "90 - 95 cm", "high": "> 95 cm"},
            {"metric": "Vòng bụng (Nữ Châu Á)", "normal": "< 80 cm", "watch": "80 - 85 cm", "high": "> 85 cm"}
        ],
        "lifestyle_cards": [
            {"title": "Chế độ ăn uống lành mạnh", "tone": "blue", "items": ["Hạn chế đường, muối và chất béo bão hòa", "Ăn nhiều rau xanh, trái cây tươi, ngũ cốc nguyên hạt", "Đảm bảo đủ protein từ cá, đậu hũ, trứng", "Uống đủ nước: 1,5 - 2 lít/ngày", "Giảm thực phẩm chế biến sẵn, đồ uống có ga"]},
            {"title": "Mục tiêu vận động", "tone": "purple", "items": ["Ít nhất 150 phút/tuần vận động vừa", "Hoặc 75 phút/tuần vận động mạnh", "Tập sức mạnh 2-3 lần/tuần", "Đi bộ sau bữa ăn 10-15 phút để hỗ trợ kiểm soát đường huyết"]},
            {"title": "Cân nặng và stress", "tone": "teal", "items": ["Duy trì BMI trong khoảng 18,5 - 22,9", "Giảm dần 0,5 - 1 kg/tuần nếu đang thừa cân", "Thực hành thiền, yoga, thở sâu để giảm stress", "Ngủ đủ 7 - 8 tiếng mỗi đêm"]},
            {"title": "Khi nào nên gặp bác sĩ", "tone": "amber", "items": ["Huyết áp >= 140/90 mmHg liên tục", "Đường huyết lúc đói >= 126 mg/dL", "HbA1c >= 6,5% hoặc Cholesterol >= 240 mg/dL", "Tức ngực, khó thở, đau đầu dữ dội hoặc phù chân"]}
        ]
    }