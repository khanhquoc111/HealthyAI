"""
plugin_validator.py
-------------------
Validate tất cả plugin trong thư mục plugins/ theo đúng schema v1.0.

Cách dùng:
    python validator/plugin_validator.py
    python validator/plugin_validator.py --plugin diabetes
"""

import json
import sys
import argparse
from pathlib import Path

PLUGINS_DIR = Path(__file__).parent.parent / "plugins"

VALID_TYPES = {"number", "boolean", "select"}
VALID_OPS = {"gte", "lte", "gt", "lt", "eq", "neq", "bool_true", "bool_false"}
BOOL_OPS = {"bool_true", "bool_false"}

# Shared fields tự động có sẵn, không cần khai báo lại trong plugin
SHARED_FIELDS = {"age", "gender", "height", "weight", "bmi", "smoke", "exercise", "alcohol"}

REQUIRED_TOP_KEYS = [
    "id", "version", "name", "short", "description",
    "icd10_code", "max_score", "fields", "scoring_rules",
    "risk_thresholds", "diet_keys", "guideline_tags", "advice_context"
]


def error(msg: str) -> dict:
    return {"ok": False, "message": msg}


def ok(msg: str = "OK") -> dict:
    return {"ok": True, "message": msg}


def validate_fields(fields: list, plugin_id: str) -> list[str]:
    errors = []
    seen_keys = set()
    for i, f in enumerate(fields):
        prefix = f"fields[{i}]"
        for k in ("key", "label", "type", "default", "shared", "required"):
            if k not in f:
                errors.append(f"{prefix}: thiếu key '{k}'")
        if "key" in f:
            if f["key"] in seen_keys:
                errors.append(f"{prefix}: key '{f['key']}' bị trùng")
            seen_keys.add(f["key"])
            if f["key"] in SHARED_FIELDS and not f.get("shared", False):
                errors.append(f"{prefix}: '{f['key']}' là shared field nhưng shared=false — nên đặt shared=true hoặc bỏ ra khỏi fields[]")
        if "type" in f and f["type"] not in VALID_TYPES:
            errors.append(f"{prefix}: type '{f['type']}' không hợp lệ. Phải là: {VALID_TYPES}")
        if f.get("type") == "select" and not f.get("options"):
            errors.append(f"{prefix}: type='select' nhưng thiếu 'options'")
    return errors


def validate_scoring_rules(rules: list, all_field_keys: set, max_score: int) -> list[str]:
    errors = []
    seen_ids = set()
    total_max_possible = 0

    for i, rule in enumerate(rules):
        prefix = f"scoring_rules[{i}]"
        for k in ("rule_id", "description", "points", "conditions"):
            if k not in rule:
                errors.append(f"{prefix}: thiếu key '{k}'")

        if "rule_id" in rule:
            if rule["rule_id"] in seen_ids:
                errors.append(f"{prefix}: rule_id '{rule['rule_id']}' bị trùng")
            seen_ids.add(rule["rule_id"])

        if "points" in rule:
            total_max_possible += rule["points"]

        if "conditions" in rule:
            for j, cond in enumerate(rule["conditions"]):
                cprefix = f"{prefix}.conditions[{j}]"
                for k in ("field", "op"):
                    if k not in cond:
                        errors.append(f"{cprefix}: thiếu key '{k}'")
                if "op" in cond and cond["op"] not in VALID_OPS:
                    errors.append(f"{cprefix}: op '{cond['op']}' không hợp lệ")
                if "op" in cond and cond["op"] not in BOOL_OPS and "value" not in cond:
                    errors.append(f"{cprefix}: thiếu 'value' cho op '{cond['op']}'")
                if "field" in cond:
                    field_name = cond["field"]
                    # Cho phép field đặc biệt
                    special_fields = {"waist_threshold", "gender"}
                    if field_name not in all_field_keys and field_name not in SHARED_FIELDS and field_name not in special_fields:
                        errors.append(f"{cprefix}: field '{field_name}' không tồn tại trong fields[] hoặc shared fields")

    if total_max_possible > max_score:
        errors.append(
            f"Tổng điểm tối đa của tất cả rules ({total_max_possible}) "
            f"vượt quá max_score ({max_score}). Hãy điều chỉnh max_score hoặc giảm points."
        )

    return errors


def validate_risk_thresholds(thresholds: dict) -> list[str]:
    errors = []
    for key in ("low", "medium", "high"):
        if key not in thresholds:
            errors.append(f"risk_thresholds: thiếu key '{key}'")
        elif "max_percent" not in thresholds[key]:
            errors.append(f"risk_thresholds.{key}: thiếu 'max_percent'")

    if all(k in thresholds for k in ("low", "medium")):
        low_p = thresholds["low"].get("max_percent", 0)
        med_p = thresholds["medium"].get("max_percent", 0)
        if med_p <= low_p:
            errors.append(f"risk_thresholds: medium.max_percent ({med_p}) phải > low.max_percent ({low_p})")
    return errors


def validate_ml_model(ml: dict, plugin_dir: Path) -> list[str]:
    errors = []
    if not isinstance(ml.get("enabled"), bool):
        errors.append("ml_model.enabled phải là boolean")
        return errors

    if ml["enabled"]:
        for file_key in ("model_file", "feature_cols_file", "threshold_file"):
            fname = ml.get(file_key)
            if not fname:
                errors.append(f"ml_model.{file_key}: bắt buộc khi enabled=true")
            elif not (plugin_dir / fname).exists():
                errors.append(f"ml_model.{file_key}: file '{fname}' không tồn tại trong {plugin_dir}")
    return errors


def validate_plugin(plugin_dir: Path) -> dict:
    metadata_path = plugin_dir / "metadata.json"
    if not metadata_path.exists():
        return error(f"Không tìm thấy metadata.json trong {plugin_dir}")

    try:
        with open(metadata_path, encoding="utf-8") as f:
            meta = json.load(f)
    except json.JSONDecodeError as e:
        return error(f"metadata.json không hợp lệ JSON: {e}")

    all_errors = []

    # 1. Kiểm tra top-level keys
    for key in REQUIRED_TOP_KEYS:
        if key not in meta:
            all_errors.append(f"Thiếu top-level key: '{key}'")

    if all_errors:
        return error("\n  - " + "\n  - ".join(all_errors))

    # 2. id phải khớp tên thư mục
    if meta["id"] != plugin_dir.name:
        all_errors.append(f"id '{meta['id']}' không khớp với tên thư mục '{plugin_dir.name}'")

    # 3. Validate fields
    field_errors = validate_fields(meta["fields"], meta["id"])
    all_errors.extend(field_errors)

    # Tập hợp tất cả field keys để check scoring_rules
    all_field_keys = {f["key"] for f in meta["fields"] if "key" in f}

    # 4. Validate scoring_rules
    rule_errors = validate_scoring_rules(meta["scoring_rules"], all_field_keys, meta["max_score"])
    all_errors.extend(rule_errors)

    # 5. Validate risk_thresholds
    threshold_errors = validate_risk_thresholds(meta["risk_thresholds"])
    all_errors.extend(threshold_errors)

    # 6. Check custom_scorer
    if meta.get("custom_scorer", {}).get("enabled"):
        scorer_file = plugin_dir / meta["custom_scorer"].get("file", "custom_scorer.py")
        if not scorer_file.exists():
            all_errors.append(f"custom_scorer.enabled=true nhưng file '{scorer_file.name}' không tồn tại")

    if all_errors:
        return error("\n  - " + "\n  - ".join(all_errors))

    return ok(f"Plugin '{meta['id']}' v{meta['version']} hợp lệ ✓  (max_score={meta['max_score']}, fields={len(meta['fields'])}, rules={len(meta['scoring_rules'])})")


def main():
    parser = argparse.ArgumentParser(description="Validate HealthyAI Disease Plugins")
    parser.add_argument("--plugin", help="Chỉ validate 1 plugin theo id (vd: --plugin diabetes)")
    args = parser.parse_args()

    if not PLUGINS_DIR.exists():
        print(f"❌ Không tìm thấy thư mục plugins/ tại: {PLUGINS_DIR}")
        sys.exit(1)

    if args.plugin:
        plugin_dirs = [PLUGINS_DIR / args.plugin]
    else:
        plugin_dirs = sorted([d for d in PLUGINS_DIR.iterdir() if d.is_dir()])

    if not plugin_dirs:
        print("⚠️  Không có plugin nào trong thư mục plugins/")
        sys.exit(0)

    print(f"\n{'='*60}")
    print(f"  HealthyAI Plugin Validator v1.0")
    print(f"{'='*60}\n")

    all_passed = True
    for plugin_dir in plugin_dirs:
        result = validate_plugin(plugin_dir)
        if result["ok"]:
            print(f"✅  {result['message']}")
        else:
            all_passed = False
            print(f"❌  Plugin '{plugin_dir.name}':\n  {result['message']}\n")

    print(f"\n{'='*60}")
    if all_passed:
        print("  Tất cả plugin hợp lệ 🎉")
    else:
        print("  Có plugin lỗi — vui lòng kiểm tra lại ⚠️")
    print(f"{'='*60}\n")

    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()
