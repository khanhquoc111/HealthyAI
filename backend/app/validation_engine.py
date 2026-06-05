# backend/app/validation_engine.py
from typing import Any, Dict, List, Optional
from dataclasses import dataclass
from enum import Enum

try:
    from app.condition_evaluator import ConditionEvaluator
except ImportError:
    from condition_evaluator import ConditionEvaluator


class ValidationType(str, Enum):
    REQUIRED = "required"
    TYPE = "type"
    MIN = "min"
    MAX = "max"
    RANGE = "range"
    PATTERN = "pattern"
    CUSTOM = "custom"
    CROSS_FIELD = "cross_field"
    SELECT = "select"


@dataclass
class ValidationError:
    field: str
    rule: str
    message: str
    severity: str = "error"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "field": self.field,
            "rule": self.rule,
            "message": self.message,
            "severity": self.severity,
        }


@dataclass
class ValidationResult:
    is_valid: bool
    errors: List[ValidationError]
    warnings: List[ValidationError]

    def has_errors(self) -> bool:
        return len(self.errors) > 0

    def has_warnings(self) -> bool:
        return len(self.warnings) > 0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "is_valid": self.is_valid,
            "errors": [err.to_dict() for err in self.errors],
            "warnings": [warn.to_dict() for warn in self.warnings],
        }


class FieldValidator:
    def __init__(self, field_config: Dict[str, Any]):
        self.field = field_config
        self.key = field_config.get("key")
        self.field_type = field_config.get("type")
        self.required = field_config.get("required", False)
        self.min_val = field_config.get("min")
        self.max_val = field_config.get("max")
        self.options = field_config.get("options", [])
        self.unit = field_config.get("unit")
        self.label = field_config.get("label", self.key)

    def validate(self, value: Any) -> List[ValidationError]:
        errors = []

        if self.required and (value is None or value == ""):
            errors.append(ValidationError(
                field=self.key,
                rule=ValidationType.REQUIRED,
                message=f"{self.label} là bắt buộc"
            ))
            return errors

        if value is None or value == "":
            return errors

        type_error = self._validate_type(value)
        if type_error:
            errors.append(type_error)
            return errors

        if self.field_type == "number":
            min_error = self._validate_min(value)
            if min_error: errors.append(min_error)
            max_error = self._validate_max(value)
            if max_error: errors.append(max_error)

        if self.field_type == "select":
            select_error = self._validate_select(value)
            if select_error: errors.append(select_error)

        return errors

    def _validate_type(self, value) -> Optional[ValidationError]:
        if self.field_type == "number":
            try:
                float(value)
                return None
            except (ValueError, TypeError):
                return ValidationError(field=self.key, rule=ValidationType.TYPE, message=f"{self.label} phải là số")
        return None

    def _validate_min(self, value) -> Optional[ValidationError]:
        if self.min_val is None: return None
        try:
            if float(value) < self.min_val:
                return ValidationError(field=self.key, rule=ValidationType.MIN, message=f"{self.label} phải ≥ {self.min_val}")
        except: pass
        return None

    def _validate_max(self, value) -> Optional[ValidationError]:
        if self.max_val is None: return None
        try:
            if float(value) > self.max_val:
                return ValidationError(field=self.key, rule=ValidationType.MAX, message=f"{self.label} phải ≤ {self.max_val}")
        except: pass
        return None

    def _validate_select(self, value) -> Optional[ValidationError]:
        if not self.options: return None
        valid_values = [opt.get("value") if isinstance(opt, dict) else opt for opt in self.options]
        if value not in valid_values:
            return ValidationError(field=self.key, rule=ValidationType.SELECT, message=f"{self.label} phải là một trong: {', '.join(map(str, valid_values))}")
        return None


class ValidationEngine:
    def __init__(self, plugin_metadata: Dict[str, Any]):
        self.metadata = plugin_metadata
        self.fields = plugin_metadata.get("fields", [])
        self.cross_validations = plugin_metadata.get("cross_validations", [])

        self.field_validators = {field["key"]: FieldValidator(field) for field in self.fields}

    def validate_form(self, form_data: Dict[str, Any]) -> ValidationResult:
        errors = []
        warnings = []

        for field in self.fields:
            field_key = field["key"]
            value = form_data.get(field_key)
            validator = self.field_validators[field_key]
            field_errors = validator.validate(value)
            errors.extend(field_errors)

        cross_errors = self._validate_cross_fields(form_data)
        for err in cross_errors:
            (warnings if err.severity == "warning" else errors).append(err)

        return ValidationResult(is_valid=len(errors) == 0, errors=errors, warnings=warnings)

    def _validate_cross_fields(self, form_data: Dict[str, Any]) -> List[ValidationError]:
        # ... (giữ nguyên code cũ của bạn)
        return []

    def get_field_errors(self, form_data: Dict[str, Any], field_key: str) -> List[ValidationError]:
        if field_key not in self.field_validators: return []
        return self.field_validators[field_key].validate(form_data.get(field_key))

    def normalize_form_data(self, form_data: Dict[str, Any]) -> Dict[str, Any]:
        normalized = {}
        for field in self.fields:
            key = field["key"]
            value = form_data.get(key)
            field_type = field.get("type")

            if value is None or value == "":
                normalized[key] = field.get("default")
            elif field_type == "number":
                try:
                    normalized[key] = float(value)
                except:
                    normalized[key] = field.get("default")
            elif field_type == "boolean":
                normalized[key] = self._normalize_boolean(value)
            else:
                normalized[key] = value
        return normalized

    def _normalize_boolean(self, value: Any) -> bool:
        if isinstance(value, bool): return value
        if value is None: return False
        if isinstance(value, str):
            v = value.strip().lower()
            return v in ("true", "1", "yes", "có")
        if isinstance(value, (int, float)):
            return value == 1
        return False

    def get_all_field_keys(self) -> List[str]:
        return [field["key"] for field in self.fields]