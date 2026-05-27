from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Any

from gemini_api import call_gemini
from prompt_builder import build_gemini_prompt
from modules.diet_advisor import get_diet_benchmark
from modules.medication_checker import (
    check_medications,
    get_available_drugs,
    get_drug_disease_stats,
)
from modules.risk_engine import (
    MAX_SCORES,
    bmi_category,
    bp_category,
    cholesterol_category,
    compute_all_risks,
    glucose_category,
    hba1c_category,
    ldl_category,
)


DEFAULT_PROFILE: dict[str, Any] = {
    "age": 40,
    "gender": "Nam",
    "height": 165,
    "weight": 65.0,
    "waist": 85,
    "systolic": 120,
    "diastolic": 80,
    "fasting_glucose": 95,
    "hba1c": 5.4,
    "total_cholesterol": 185,
    "ldl": 110,
    "creatinine": 0.9,
    "smoke": False,
    "exercise": True,
    "alcohol": 0,
    "sodium_intake": 2000,
    "nsaid_use": False,
    "family_diabetes": False,
    "family_hypertension": False,
    "family_cardiovascular": False,
}

RISK_META = {
    "diab": {"name": "Đái Tháo Đường (Type 2)", "short": "ĐTĐ", "max": MAX_SCORES["DTĐ"]},
    "htn": {"name": "Tăng Huyết Áp", "short": "Huyết áp", "max": MAX_SCORES["THA"]},
    "cvd": {"name": "Bệnh Tim Mạch", "short": "Tim mạch", "max": MAX_SCORES["Tim"]},
    "kid": {"name": "Bệnh Thận Mạn Tính", "short": "Thận", "max": MAX_SCORES["Thận"]},
}


def build_user_data(profile: dict[str, Any] | None = None) -> dict[str, Any]:
    data = {**DEFAULT_PROFILE, **(profile or {})}
    height = max(float(data.get("height", DEFAULT_PROFILE["height"])), 1.0)
    weight = float(data.get("weight", DEFAULT_PROFILE["weight"]))
    systolic = int(data.get("systolic", DEFAULT_PROFILE["systolic"]))
    diastolic = int(data.get("diastolic", DEFAULT_PROFILE["diastolic"]))

    normalized = {
        "age": int(data.get("age", DEFAULT_PROFILE["age"])),
        "gender": data.get("gender") if data.get("gender") in ("Nam", "Nữ") else "Nam",
        "height": height,
        "weight": weight,
        "waist": int(data.get("waist", DEFAULT_PROFILE["waist"])),
        "systolic": systolic,
        "diastolic": diastolic,
        "fasting_glucose": int(data.get("fasting_glucose", DEFAULT_PROFILE["fasting_glucose"])),
        "hba1c": float(data.get("hba1c", DEFAULT_PROFILE["hba1c"])),
        "total_cholesterol": int(data.get("total_cholesterol", DEFAULT_PROFILE["total_cholesterol"])),
        "ldl": int(data.get("ldl", DEFAULT_PROFILE["ldl"])),
        "creatinine": float(data.get("creatinine", DEFAULT_PROFILE["creatinine"])),
        "smoke": bool(data.get("smoke", DEFAULT_PROFILE["smoke"])),
        "exercise": bool(data.get("exercise", DEFAULT_PROFILE["exercise"])),
        "alcohol": int(data.get("alcohol", DEFAULT_PROFILE["alcohol"])),
        "sodium_intake": int(data.get("sodium_intake", DEFAULT_PROFILE["sodium_intake"])),
        "nsaid_use": bool(data.get("nsaid_use", DEFAULT_PROFILE["nsaid_use"])),
        "family_diabetes": bool(data.get("family_diabetes", DEFAULT_PROFILE["family_diabetes"])),
        "family_hypertension": bool(data.get("family_hypertension", DEFAULT_PROFILE["family_hypertension"])),
        "family_cardiovascular": bool(data.get("family_cardiovascular", DEFAULT_PROFILE["family_cardiovascular"])),
    }
    normalized["bmi"] = weight / ((height / 100) ** 2)
    normalized["hypertension"] = systolic >= 130 or diastolic >= 80
    return normalized


def _label_pair(label: str, status: str) -> dict[str, str]:
    return {"label": label, "status": status}


def health_categories(user_data: dict[str, Any]) -> dict[str, dict[str, Any]]:
    bmi_label, bmi_status = bmi_category(user_data["bmi"])
    bp_label, bp_status = bp_category(user_data["systolic"], user_data["diastolic"])
    glucose_label, glucose_status = glucose_category(user_data["fasting_glucose"])
    hba1c_label, hba1c_status = hba1c_category(user_data["hba1c"])
    cholesterol_label, cholesterol_status = cholesterol_category(user_data["total_cholesterol"])
    ldl_label, ldl_status = ldl_category(user_data["ldl"])
    creatinine_high = (
        user_data["creatinine"] > 1.2 and user_data["gender"] == "Nam"
    ) or (
        user_data["creatinine"] > 1.1 and user_data["gender"] == "Nữ"
    )

    return {
        "bmi": {**_label_pair(bmi_label, bmi_status), "value": round(user_data["bmi"], 1)},
        "blood_pressure": {
            **_label_pair(bp_label, bp_status),
            "value": f"{user_data['systolic']}/{user_data['diastolic']}",
        },
        "fasting_glucose": {
            **_label_pair(glucose_label, glucose_status),
            "value": user_data["fasting_glucose"],
        },
        "hba1c": {**_label_pair(hba1c_label, hba1c_status), "value": round(user_data["hba1c"], 1)},
        "total_cholesterol": {
            **_label_pair(cholesterol_label, cholesterol_status),
            "value": user_data["total_cholesterol"],
        },
        "ldl": {**_label_pair(ldl_label, ldl_status), "value": user_data["ldl"]},
        "creatinine": {
            **_label_pair("Cao" if creatinine_high else "Bình thường", "danger" if creatinine_high else "good"),
            "value": user_data["creatinine"],
        },
        "exercise": {
            **_label_pair("Thường xuyên" if user_data["exercise"] else "Ít vận động", "good" if user_data["exercise"] else "warn"),
            "value": user_data["exercise"],
        },
        "smoke": {
            **_label_pair("Có" if user_data["smoke"] else "Không", "danger" if user_data["smoke"] else "good"),
            "value": user_data["smoke"],
        },
    }


def _risk_items(risks: dict[str, Any]) -> list[dict[str, Any]]:
    items = []
    for key, meta in RISK_META.items():
        score = risks["scores"][key]
        max_score = meta["max"]
        items.append(
            {
                "key": key,
                "name": meta["name"],
                "short": meta["short"],
                "level_key": risks["keys"][key],
                "level": risks["labels"][key],
                "score": score,
                "max_score": max_score,
                "percent": round(score / max_score * 100, 1),
                "reasons": risks["reasons"][key],
            }
        )
    return items


@lru_cache(maxsize=1)
def _load_screening_model() -> tuple[Any | None, float | None]:
    try:
        import joblib

        model_path = Path("models/screening_best_model.pkl")
        threshold_path = Path("models/screening_best_threshold.pkl")
        if model_path.exists() and threshold_path.exists():
            return joblib.load(model_path), float(joblib.load(threshold_path))
    except Exception:
        return None, None
    return None, None


def ml_screening(user_data: dict[str, Any]) -> dict[str, Any]:
    pipe, threshold = _load_screening_model()
    if pipe is None or threshold is None:
        return {"available": False, "probability": None, "level": None, "threshold": None}

    try:
        from train_model import build_user_input

        x_input = build_user_input(user_data)
        probability = float(pipe.predict_proba(x_input)[0, 1])
        if probability >= threshold:
            level = "Cao" if probability >= 0.65 else "Trung bình"
        else:
            level = "Thấp"
        return {
            "available": True,
            "probability": probability,
            "level": level,
            "threshold": threshold,
        }
    except Exception as exc:
        return {
            "available": False,
            "probability": None,
            "level": None,
            "threshold": threshold,
            "error": str(exc),
        }


def analyze_profile(profile: dict[str, Any] | None = None) -> dict[str, Any]:
    user_data = build_user_data(profile)
    risks = compute_all_risks(user_data)
    items = _risk_items(risks)
    high_risks = [item["name"] for item in items if item["level"] == "Cao"]
    medium_risks = [item["name"] for item in items if item["level"] == "Trung bình"]

    return {
        "user_data": user_data,
        "categories": health_categories(user_data),
        "risks": {
            "scores": risks["scores"],
            "reasons": risks["reasons"],
            "keys": risks["keys"],
            "labels": risks["labels"],
            "items": items,
        },
        "ml": ml_screening(user_data),
        "conclusion": {
            "high_risks": high_risks,
            "medium_risks": medium_risks,
            "status": "high" if high_risks else "medium" if medium_risks else "good",
        },
    }


def _risk_keys_for_diet(risks: dict[str, Any]) -> list[str]:
    keys = risks.get("keys", {})
    risk_keys = [
        risk_key
        for risk_key in ("diab", "htn", "cvd", "kid")
        if keys.get(risk_key) in ("cao", "medium")
    ]
    return risk_keys or ["diab"]


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
    risk_keys = _risk_keys_for_diet(analysis["risks"])
    result = get_diet_benchmark(analysis["user_data"], risk_keys)
    return {
        "risk_keys": risk_keys,
        "risk_labels": analysis["risks"]["labels"],
        "benchmark": result["benchmark"],
        "tips": result["tips"],
        "n_similar": result["n_similar"],
        "source": result["source"],
        "sample_menu": sample_menu(risk_keys),
    }


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
    stats = {
        drug: get_drug_disease_stats(drug)
        for drug in selected_drugs[:3]
    }
    return {
        **result,
        "affected_metrics": affected,
        "drug_stats": stats,
        "selected_drugs": selected_drugs,
    }


def ai_advice(profile: dict[str, Any] | None = None) -> dict[str, Any]:
    analysis = analyze_profile(profile)
    risk_results = [
        (
            item["name"],
            item["level"],
            item["score"],
            item["max_score"],
        )
        for item in analysis["risks"]["items"]
    ]
    ml = analysis["ml"]
    fallback_probability = risk_results[0][2] / risk_results[0][3]
    ml_results = {
        "screening_prob": ml["probability"] if ml["probability"] is not None else fallback_probability,
        "screening_risk_level": ml["level"] or risk_results[0][1],
        "screening_threshold": ml["threshold"] or 0.5,
    }
    prompt = build_gemini_prompt(analysis["user_data"], risk_results, ml_results)
    return {"reply": call_gemini(prompt), "analysis": analysis}


def reference_payload() -> dict[str, Any]:
    return {
        "reference_rows": [
            {
                "metric": "BMI (Châu Á)",
                "normal": "18,5 - 22,9",
                "watch": "23 - 24,9",
                "high": ">= 25",
            },
            {
                "metric": "Huyết áp tâm thu",
                "normal": "< 120 mmHg",
                "watch": "120 - 129 mmHg",
                "high": ">= 130 mmHg",
            },
            {
                "metric": "Huyết áp tâm trương",
                "normal": "< 80 mmHg",
                "watch": "-",
                "high": ">= 80 mmHg",
            },
            {
                "metric": "Đường huyết lúc đói",
                "normal": "< 100 mg/dL",
                "watch": "100 - 125 mg/dL",
                "high": ">= 126 mg/dL",
            },
            {"metric": "HbA1c", "normal": "< 5,7%", "watch": "5,7 - 6,4%", "high": ">= 6,5%"},
            {
                "metric": "Cholesterol toàn phần",
                "normal": "< 200 mg/dL",
                "watch": "200 - 239 mg/dL",
                "high": ">= 240 mg/dL",
            },
            {
                "metric": "LDL-Cholesterol",
                "normal": "< 100 mg/dL",
                "watch": "100 - 159 mg/dL",
                "high": ">= 160 mg/dL",
            },
            {
                "metric": "Creatinine (Nam)",
                "normal": "0,7 - 1,2 mg/dL",
                "watch": "-",
                "high": "> 1,2 mg/dL",
            },
            {
                "metric": "Creatinine (Nữ)",
                "normal": "0,5 - 1,1 mg/dL",
                "watch": "-",
                "high": "> 1,1 mg/dL",
            },
            {
                "metric": "Vòng bụng (Nam Châu Á)",
                "normal": "< 90 cm",
                "watch": "90 - 95 cm",
                "high": "> 95 cm",
            },
            {
                "metric": "Vòng bụng (Nữ Châu Á)",
                "normal": "< 80 cm",
                "watch": "80 - 85 cm",
                "high": "> 85 cm",
            },
        ],
        "lifestyle_cards": [
            {
                "title": "Chế độ ăn uống lành mạnh",
                "tone": "blue",
                "items": [
                    "Hạn chế đường, muối và chất béo bão hòa",
                    "Ăn nhiều rau xanh, trái cây tươi, ngũ cốc nguyên hạt",
                    "Đảm bảo đủ protein từ cá, đậu hũ, trứng",
                    "Uống đủ nước: 1,5 - 2 lít/ngày",
                    "Giảm thực phẩm chế biến sẵn, đồ uống có ga",
                ],
            },
            {
                "title": "Mục tiêu vận động",
                "tone": "purple",
                "items": [
                    "Ít nhất 150 phút/tuần vận động vừa",
                    "Hoặc 75 phút/tuần vận động mạnh",
                    "Tập sức mạnh 2-3 lần/tuần",
                    "Đi bộ sau bữa ăn 10-15 phút để hỗ trợ kiểm soát đường huyết",
                ],
            },
            {
                "title": "Cân nặng và stress",
                "tone": "teal",
                "items": [
                    "Duy trì BMI trong khoảng 18,5 - 22,9",
                    "Giảm dần 0,5 - 1 kg/tuần nếu đang thừa cân",
                    "Thực hành thiền, yoga, thở sâu để giảm stress",
                    "Ngủ đủ 7 - 8 tiếng mỗi đêm",
                ],
            },
            {
                "title": "Khi nào nên gặp bác sĩ",
                "tone": "amber",
                "items": [
                    "Huyết áp >= 140/90 mmHg liên tục",
                    "Đường huyết lúc đói >= 126 mg/dL",
                    "HbA1c >= 6,5% hoặc Cholesterol >= 240 mg/dL",
                    "Tức ngực, khó thở, đau đầu dữ dội hoặc phù chân",
                ],
            },
        ],
    }
