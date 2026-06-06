# backend/app/validation_engine.py
"""
ValidationEngine - Kiểm tra và normalize dữ liệu nhập từ form
Cung cấp:
- Field validation (yêu cầu, kiểu dữ liệu, range)
- Form validation (kiểm tra toàn bộ form)
- Data normalization (chuẩn hóa dữ liệu)
- Warning generation (cảnh báo về dữ liệu)
"""

from typing import Any, Dict, List
from dataclasses import dataclass, asdict
import logging

logger = logging.getLogger(__name__)


@dataclass
class ValidationError:
    """Lỗi validation"""

    field: str
    message: str
    severity: str = "error"  # error, warning

    def to_dict(self):
        return asdict(self)


@dataclass
class ValidationResult:
    """Kết quả validation"""

    is_valid: bool = True
    errors: List[ValidationError] = None
    warnings: List[ValidationError] = None

    def __post_init__(self):
        if self.errors is None:
            self.errors = []
        if self.warnings is None:
            self.warnings = []

    def has_errors(self) -> bool:
        return len(self.errors) > 0

    def has_warnings(self) -> bool:
        return len(self.warnings) > 0

    def to_dict(self):
        return {
            "is_valid": self.is_valid,
            "errors": [e.to_dict() for e in self.errors],
            "warnings": [w.to_dict() for w in self.warnings],
        }


class ValidationEngine:
    """Kiểm tra và normalize dữ liệu từ form"""

    def __init__(self, plugin_metadata: Dict[str, Any]):
        self.metadata = plugin_metadata
        self.fields = plugin_metadata.get("fields", [])
        self.field_map = {f["key"]: f for f in self.fields}

    def validate_form(self, form_data: Dict[str, Any]) -> ValidationResult:
        """
        Validate toàn bộ form
        
        Args:
            form_data: Dữ liệu từ form
            
        Returns:
            ValidationResult với errors và warnings
        """
        result = ValidationResult()

        # Kiểm tra từng field
        for field in self.fields:
            key = field.get("key")
            value = form_data.get(key)
            field_errors = self._validate_field(field, value, form_data)
            result.errors.extend(field_errors)

        result.is_valid = not result.has_errors()
        return result

    def get_field_errors(self, form_data: Dict[str, Any], field_key: str) -> List[ValidationError]:
        """
        Validate một field cụ thể
        """
        field = self.field_map.get(field_key)
        if not field:
            return []

        value = form_data.get(field_key)
        return self._validate_field(field, value, form_data)

    def _validate_field(
        self, field: Dict[str, Any], value: Any, form_data: Dict[str, Any]
    ) -> List[ValidationError]:
        """
        Validate một field
        """
        errors = []
        key = field.get("key")

        # 1. Kiểm tra bắt buộc
        if field.get("required", False):
            if value is None or value == "" or str(value).strip() == "":
                errors.append(
                    ValidationError(
                        field=key,
                        message=f"{field.get('label', key)} là bắt buộc",
                    )
                )
                return errors

        # Nếu trống và không bắt buộc, pass
        if value is None or value == "":
            return errors

        # 2. Kiểm tra kiểu dữ liệu
        field_type = field.get("type", "text")

        if field_type == "number":
            try:
                num_value = float(value)
                # Kiểm tra min/max
                min_val = field.get("min")
                max_val = field.get("max")

                if min_val is not None and num_value < min_val:
                    errors.append(
                        ValidationError(
                            field=key,
                            message=f"{field.get('label', key)} phải >= {min_val}",
                        )
                    )

                if max_val is not None and num_value > max_val:
                    errors.append(
                        ValidationError(
                            field=key,
                            message=f"{field.get('label', key)} phải <= {max_val}",
                        )
                    )
            except (ValueError, TypeError):
                errors.append(
                    ValidationError(
                        field=key,
                        message=f"{field.get('label', key)} phải là số",
                    )
                )

        elif field_type == "select":
            options = field.get("options", [])
            valid_values = [opt.get("value") for opt in options]
            if value not in valid_values:
                errors.append(
                    ValidationError(
                        field=key,
                        message=f"{field.get('label', key)} giá trị không hợp lệ",
                    )
                )

        elif field_type == "boolean":
            if not isinstance(value, bool):
                errors.append(
                    ValidationError(
                        field=key,
                        message=f"{field.get('label', key)} phải là boolean",
                    )
                )

        # 3. Kiểm tra custom validation rules
        custom_rules = field.get("validation_rules", [])
        for rule in custom_rules:
            rule_type = rule.get("type")

            if rule_type == "custom_range":
                # Kiểm tra range dựa trên điều kiện khác
                pass  # Implement nếu cần

        return errors

    def normalize_form_data(self, form_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Chuẩn hóa dữ liệu (convert types, fill defaults, etc.)
        """
        normalized = {}

        for field in self.fields:
            key = field.get("key")
            value = form_data.get(key)
            field_type = field.get("type", "text")

            # Nếu không có giá trị, dùng default
            if value is None or value == "":
                if field.get("default") is not None:
                    value = field.get("default")
                else:
                    continue

            # Convert types
            if field_type == "number":
                try:
                    normalized[key] = float(value)
                except (ValueError, TypeError):
                    normalized[key] = None
            elif field_type == "boolean":
                if isinstance(value, bool):
                    normalized[key] = value
                else:
                    normalized[key] = str(value).lower() in ["true", "1", "yes", "on"]
            else:
                normalized[key] = value

        return normalized

    def get_all_field_keys(self) -> List[str]:
        """Lấy tất cả field keys"""
        return [f.get("key") for f in self.fields]

    def get_field_by_key(self, key: str) -> Dict[str, Any]:
        """Lấy field definition theo key"""
        return self.field_map.get(key)

    def get_required_fields(self) -> List[str]:
        """Lấy danh sách field bắt buộc"""
        return [f.get("key") for f in self.fields if f.get("required", False)]