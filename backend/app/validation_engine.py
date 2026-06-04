# backend/app/validation_engine.py
from typing import Any, Dict, List, Optional
from dataclasses import dataclass
from enum import Enum

# Try to import from app, fallback to direct import
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
    """Validates individual form field values according to field definition"""
    
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
        """
        Validate a field value against all applicable rules.
        
        Returns list of validation errors (empty list = valid).
        """
        errors = []

        # 1. Check required
        if self.required and (value is None or value == ""):
            errors.append(ValidationError(
                field=self.key,
                rule=ValidationType.REQUIRED,
                message=f"{self.label} là bắt buộc"
            ))
            return errors  # Stop validation if required field is missing

        # If field is optional and empty, it's valid
        if value is None or value == "":
            return errors

        # 2. Check type
        type_error = self._validate_type(value)
        if type_error:
            errors.append(type_error)
            return errors  # Stop if type is wrong

        # 3. Check numeric constraints
        if self.field_type == "number":
            min_error = self._validate_min(value)
            if min_error:
                errors.append(min_error)
            
            max_error = self._validate_max(value)
            if max_error:
                errors.append(max_error)

        # 4. Check select options
        if self.field_type == "select":
            select_error = self._validate_select(value)
            if select_error:
                errors.append(select_error)

        return errors

    def _validate_type(self, value) -> Optional[ValidationError]:
        """Validate field value against expected type"""
        
        if self.field_type == "number":
            try:
                float(value)
                return None
            except (ValueError, TypeError):
                return ValidationError(
                    field=self.key,
                    rule=ValidationType.TYPE,
                    message=f"{self.label} phải là số"
                )
        
        elif self.field_type == "boolean":
            if not isinstance(value, bool):
                return ValidationError(
                    field=self.key,
                    rule=ValidationType.TYPE,
                    message=f"{self.label} phải là true/false"
                )
        
        elif self.field_type == "text":
            if not isinstance(value, str):
                return ValidationError(
                    field=self.key,
                    rule=ValidationType.TYPE,
                    message=f"{self.label} phải là văn bản"
                )
        
        return None

    def _validate_min(self, value) -> Optional[ValidationError]:
        """Validate minimum value constraint"""
        if self.min_val is None:
            return None
        
        try:
            num_value = float(value)
            if num_value < self.min_val:
                unit_str = f" {self.unit}" if self.unit else ""
                return ValidationError(
                    field=self.key,
                    rule=ValidationType.MIN,
                    message=f"{self.label} phải ≥ {self.min_val}{unit_str}"
                )
        except (ValueError, TypeError):
            pass
        
        return None

    def _validate_max(self, value) -> Optional[ValidationError]:
        """Validate maximum value constraint"""
        if self.max_val is None:
            return None
        
        try:
            num_value = float(value)
            if num_value > self.max_val:
                unit_str = f" {self.unit}" if self.unit else ""
                return ValidationError(
                    field=self.key,
                    rule=ValidationType.MAX,
                    message=f"{self.label} phải ≤ {self.max_val}{unit_str}"
                )
        except (ValueError, TypeError):
            pass
        
        return None

    def _validate_select(self, value: Any) -> Optional[ValidationError]:
        """
        Validate that select field value exists in options.
        
        Supports option format:
        [{"value": "opt1", "label": "Option 1"}, ...]
        """
        if self.field_type != "select":
            return None
        
        if not self.options:
            return None
        
        # Extract valid option values
        valid_values = []
        for opt in self.options:
            if isinstance(opt, dict):
                valid_values.append(opt.get("value"))
            else:
                valid_values.append(opt)
        
        # Check if submitted value is in valid options
        if value not in valid_values:
            valid_list = ", ".join(str(v) for v in valid_values if v is not None)
            return ValidationError(
                field=self.key,
                rule=ValidationType.SELECT,
                message=f"{self.label} phải là một trong: {valid_list}"
            )
        
        return None


class ValidationEngine:
    """Main validation engine for form data against plugin schema"""
    
    def __init__(self, plugin_metadata: Dict[str, Any]):
        self.metadata = plugin_metadata
        self.fields = plugin_metadata.get("fields", [])
        self.cross_validations = plugin_metadata.get("cross_validations", [])

        # Build field validators
        self.field_validators = {
            field["key"]: FieldValidator(field) for field in self.fields
        }

    def validate_form(self, form_data: Dict[str, Any]) -> ValidationResult:
        """
        Validate entire form against schema.
        
        Runs:
        1. Field-level validation
        2. Cross-field validation
        
        Returns ValidationResult with errors and warnings.
        """
        errors = []
        warnings = []

        # 1. Field validation
        for field in self.fields:
            field_key = field["key"]
            value = form_data.get(field_key)
            validator = self.field_validators[field_key]
            field_errors = validator.validate(value)
            errors.extend(field_errors)

        # 2. Cross-field validation
        cross_errors = self._validate_cross_fields(form_data)
        for err in cross_errors:
            if err.severity == "warning":
                warnings.append(err)
            else:
                errors.append(err)

        is_valid = len(errors) == 0

        return ValidationResult(
            is_valid=is_valid,
            errors=errors,
            warnings=warnings,
        )

    def _validate_cross_fields(self, form_data: Dict[str, Any]) -> List[ValidationError]:
        """
        Validate relationships between multiple fields.
        
        Example: diastolic_pressure <= systolic_pressure
        """
        errors = []
        
        for rule in self.cross_validations:
            left_field = rule.get("left")
            right_field = rule.get("right")
            op = rule.get("op")
            message = rule.get("message", f"Validation error between {left_field} and {right_field}")
            severity = rule.get("severity", "warning")
            
            left_val = form_data.get(left_field)
            right_val = form_data.get(right_field)

            # Skip if either field is missing
            if left_val is None or right_val is None:
                continue

            try:
                left_num = float(left_val)
                right_num = float(right_val)

                # Map operator
                op_mapping = {
                    "lte_field": "lte",
                    "gte_field": "gte",
                    "eq_field": "eq",
                    "neq_field": "neq"
                }
                
                condition_op = op_mapping.get(op, op)
                
                # Evaluate condition
                condition = {
                    "field": left_field,
                    "op": condition_op,
                    "value": right_num
                }
                
                if not ConditionEvaluator.evaluate(condition, {left_field: left_num}):
                    errors.append(ValidationError(
                        field=left_field,
                        rule=ValidationType.CROSS_FIELD,
                        message=message,
                        severity=severity
                    ))
            except (ValueError, TypeError):
                # Skip if values can't be converted to numbers
                continue
        
        return errors

    def get_field_errors(self, form_data: Dict[str, Any], field_key: str) -> List[ValidationError]:
        """Get validation errors for a specific field"""
        if field_key not in self.field_validators:
            return []
        
        validator = self.field_validators[field_key]
        value = form_data.get(field_key)
        return validator.validate(value)

    def normalize_form_data(self, form_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Normalize form data according to field type definitions.
        
        Handles:
        - Type conversion (string -> number)
        - Boolean normalization (string "true" -> bool True)
        - Optional field defaults
        """
        normalized = {}
        
        for field in self.fields:
            key = field["key"]
            value = form_data.get(key)
            field_type = field.get("type")

            if value is None or value == "":
                # Use default value if provided, otherwise keep None
                normalized[key] = field.get("default")
            else:
                if field_type == "number":
                    try:
                        normalized[key] = float(value)
                    except (ValueError, TypeError):
                        normalized[key] = field.get("default")
                
                elif field_type == "boolean":
                    # Explicit boolean normalization
                    normalized[key] = self._normalize_boolean(value)
                
                else:
                    # text, select, etc - keep as is
                    normalized[key] = value
        
        return normalized

    def _normalize_boolean(self, value: Any) -> bool:
        """
        Normalize various representations of boolean values.
        
        Truthy values:
        - bool True
        - string: "true", "True", "TRUE", "1", "yes", "Yes", "YES"
        - numeric: 1
        
        Falsy values:
        - bool False
        - string: "false", "False", "FALSE", "0", "no", "No", "NO", ""
        - numeric: 0
        - None returns None
        
        Unknown values default to False (safer).
        """
        # Already a boolean
        if isinstance(value, bool):
            return value
        
        # None stays None
        if value is None:
            return None
        
        # String conversion
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in ("true", "1", "yes"):
                return True
            elif normalized in ("false", "0", "no", ""):
                return False
            else:
                # Unknown string defaults to False
                return False
        
        # Numeric conversion
        if isinstance(value, (int, float)):
            return value == 1  # Only exactly 1 is True
        
        # Any other type defaults to False
        return False

    def get_all_field_keys(self) -> List[str]:
        """Get list of all field keys in order"""
        return [field["key"] for field in self.fields]

    def get_fields_by_group(self) -> Dict[str, List[Dict]]:
        """
        Organize fields by UI group.
        
        Returns dict: {"group_name": [field1, field2, ...]}
        """
        groups = {}
        
        for field in self.fields:
            group_name = field.get("ui", {}).get("group", "ungrouped")
            if group_name not in groups:
                groups[group_name] = []
            groups[group_name].append(field)
        
        return groups
