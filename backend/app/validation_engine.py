# backend/app/validation_engine.py
"""
ValidationEngine - FIXED VERSION
BUG FIX CHÍNH:
  - __init__ nhận đúng plugin_metadata (root level) thay vì chỉ risk_config
  - self.fields lấy từ plugin_metadata["fields"], không phải risk_config["fields"]
  - normalize_form_data giờ mới thực sự xử lý đúng các field
"""

from typing import Any, Dict, List, Optional, Tuple
import logging
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class ValidationError:
    """Mô tả một lỗi validation"""
    field: str
    message: str
    severity: str = "error"  # error, warning, info
    code: str = "invalid"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "field": self.field,
            "message": self.message,
            "severity": self.severity,
            "code": self.code
        }


@dataclass
class ValidationResult:
    """Kết quả validation"""
    errors: List[ValidationError] = None
    warnings: List[ValidationError] = None
    data_quality_score: float = 100.0  # 0-100

    def __post_init__(self):
        if self.errors is None:
            self.errors = []
        if self.warnings is None:
            self.warnings = []

    @property
    def is_valid(self) -> bool:
        return len(self.errors) == 0

    def has_errors(self) -> bool:
        return len(self.errors) > 0

    def has_warnings(self) -> bool:
        return len(self.warnings) > 0


class ValidationEngine:
    """
    Engine validation nâng cấp với quality scoring.

    QUAN TRỌNG: Nhận plugin_metadata (toàn bộ dict từ metadata.json),
    KHÔNG phải chỉ plugin_metadata["risk_config"].
    """

    def __init__(self, plugin_metadata: Dict[str, Any]):
        """
        Args:
            plugin_metadata: Toàn bộ dict từ metadata.json
                             (có key "fields", "risk_config", "disease_info", ...)
        """
        # ── [FIX] Lấy fields từ root của metadata, không phải từ risk_config ──
        self.fields = plugin_metadata.get("fields", [])
        self.risk_config = plugin_metadata.get("risk_config", {})

        # Build lookup map theo key
        self.field_map = {
            (f.get("key") or f.get("code")): f
            for f in self.fields
            if f.get("key") or f.get("code")
        }

        # Optional quality / normalization config (trong risk_config nếu có)
        self.quality_config = self.risk_config.get("data_quality", {})
        self.normalization_rules = self.risk_config.get("normalization_rules", {})

    # ──────────────────────────────────────────────────────────────────────────
    # PUBLIC API
    # ──────────────────────────────────────────────────────────────────────────

    def validate_form(self, form_data: Dict[str, Any]) -> ValidationResult:
        """Validate form data dựa trên field definitions."""
        errors: List[ValidationError] = []
        warnings: List[ValidationError] = []

        for field in self.fields:
            key = field.get("key") or field.get("code")
            if not key:
                continue

            required = field.get("required", False)
            value = form_data.get(key)

            # Kiểm tra required
            if required and (value is None or value == ""):
                errors.append(ValidationError(
                    field=key,
                    message=f"{field.get('label', key)} là bắt buộc",
                    code="required_missing"
                ))
                continue

            # Bỏ qua optional field chưa điền
            if value is None or value == "":
                continue

            field_type = field.get("type")

            # Validate kiểu
            type_valid, type_error = self._validate_type(key, value, field_type, field)
            if not type_valid:
                errors.append(ValidationError(
                    field=key,
                    message=type_error,
                    code="invalid_type"
                ))
                continue

            # Validate range cho number
            if field_type == "number":
                min_val = field.get("min")
                max_val = field.get("max")
                try:
                    num_val = float(value)
                    if min_val is not None and num_val < min_val:
                        errors.append(ValidationError(
                            field=key,
                            message=f"{field.get('label', key)} phải >= {min_val}",
                            code="below_minimum"
                        ))
                    if max_val is not None and num_val > max_val:
                        errors.append(ValidationError(
                            field=key,
                            message=f"{field.get('label', key)} phải <= {max_val}",
                            code="above_maximum"
                        ))
                except (ValueError, TypeError):
                    errors.append(ValidationError(
                        field=key,
                        message=f"{field.get('label', key)} phải là số",
                        code="not_numeric"
                    ))

            elif field_type == "select":
                options = field.get("options", [])
                valid_values = [
                    opt.get("value") if isinstance(opt, dict) else opt
                    for opt in options
                ]
                if value not in valid_values:
                    errors.append(ValidationError(
                        field=key,
                        message=f"{field.get('label', key)} không hợp lệ",
                        code="invalid_option"
                    ))

            elif field_type == "boolean":
                bool_valid, bool_error = self._validate_boolean(value)
                if not bool_valid:
                    errors.append(ValidationError(
                        field=key,
                        message=bool_error,
                        code="invalid_boolean"
                    ))

        quality_score = self._calculate_data_quality(form_data)

        return ValidationResult(
            errors=errors,
            warnings=warnings,
            data_quality_score=quality_score
        )

    def normalize_form_data(self, form_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Chuẩn hóa dữ liệu form theo type định nghĩa trong fields.
        Chỉ trả về các key có trong plugin fields (loại bỏ chieuCao, canNang, ... không thuộc plugin).
        """
        normalized: Dict[str, Any] = {}

        for field in self.fields:
            key = field.get("key") or field.get("code")
            if not key:
                continue

            value = form_data.get(key)

            if value is None or value == "":
                normalized[key] = None
                continue

            # Áp dụng normalization rule nếu có
            if key in self.normalization_rules:
                value = self._apply_normalization_rule(key, value, self.normalization_rules[key])

            field_type = field.get("type")

            if field_type == "number":
                try:
                    normalized[key] = float(value)
                except (ValueError, TypeError):
                    normalized[key] = None

            elif field_type == "boolean":
                normalized[key] = self._normalize_boolean(value)

            elif field_type == "select":
                normalized[key] = str(value) if value is not None else None

            elif field_type == "string":
                normalized[key] = str(value).strip() if value else None

            else:
                normalized[key] = value

        return normalized

    # ──────────────────────────────────────────────────────────────────────────
    # PRIVATE HELPERS
    # ──────────────────────────────────────────────────────────────────────────

    def _validate_type(self, field_key: str, value: Any, field_type: str, field_config: Dict) -> Tuple[bool, str]:
        if field_type == "number":
            try:
                float(value)
                return True, ""
            except (ValueError, TypeError):
                return False, f"{field_config.get('label', field_key)} phải là số"

        elif field_type == "boolean":
            return self._validate_boolean(value)

        return True, ""

    def _validate_boolean(self, value: Any) -> Tuple[bool, str]:
        if isinstance(value, bool):
            return True, ""
        if isinstance(value, (int, float)):
            return value in [0, 1, 0.0, 1.0], ""
        if isinstance(value, str):
            valid_values = {"true", "false", "1", "0", "yes", "no", "on", "off"}
            return value.lower() in valid_values, ""
        return False, "Giá trị boolean không hợp lệ"

    def _normalize_boolean(self, value: Any) -> bool:
        if isinstance(value, bool):
            return value
        if isinstance(value, (int, float)):
            return bool(value)
        if isinstance(value, str):
            return value.lower() in ("true", "1", "yes", "on", "enabled", "active")
        return bool(value)

    def _apply_normalization_rule(self, field_key: str, value: Any, rule: Dict) -> Any:
        rule_type = rule.get("type")
        params = rule.get("params", {})

        if rule_type == "scale":
            scale_factor = params.get("factor", 1)
            try:
                return float(value) / scale_factor
            except (ValueError, TypeError):
                return value

        elif rule_type == "trim":
            return str(value).strip() if value else value

        elif rule_type == "round":
            decimals = params.get("decimals", 2)
            try:
                return round(float(value), decimals)
            except (ValueError, TypeError):
                return value

        elif rule_type == "lookup":
            mapping = params.get("mapping", {})
            return mapping.get(str(value), value)

        return value

    def _calculate_data_quality(self, form_data: Dict[str, Any]) -> float:
        required_fields = [f for f in self.fields if f.get("required")]
        optional_fields = [f for f in self.fields if not f.get("required")]

        total_fields = len(self.fields) or 1

        filled_required = sum(
            1 for f in required_fields
            if form_data.get(f.get("key") or f.get("code")) not in (None, "")
        )
        filled_optional = sum(
            1 for f in optional_fields
            if form_data.get(f.get("key") or f.get("code")) not in (None, "")
        )

        required_score = (filled_required / len(required_fields) * 60) if required_fields else 60
        optional_score = (filled_optional / len(optional_fields) * 40) if optional_fields else 40

        return min(100.0, max(0.0, required_score + optional_score))