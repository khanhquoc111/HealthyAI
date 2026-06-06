# backend/app/validation_engine.py
"""
ValidationEngine - UPGRADED VERSION
Nâng cấp validation với data quality scoring, smart normalization, và better error handling
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
    Engine validation nâng cấp với quality scoring
    """
    
    def __init__(self, risk_config: Dict[str, Any]):
        """
        Args:
            risk_config: Config từ metadata.json -> risk_config
        """
        self.risk_config = risk_config
        self.fields = risk_config.get("fields", [])
        # [FIX] Support cả field.key và field.code
        self.field_map = {f.get("key") or f.get("code"): f for f in self.fields}
        
        # [NEW] Data quality config
        self.quality_config = risk_config.get("data_quality", {})
        self.normalization_rules = risk_config.get("normalization_rules", {})
    
    def validate_form(self, form_data: Dict[str, Any]) -> ValidationResult:
        """
        Validate form data - simplified version cho metadata hiện tại
        """
        errors = []
        warnings = []
        
        # [STEP 1] Validate required fields
        for field in self.fields:
            key = field.get("key") or field.get("code")
            required = field.get("required", False)
            value = form_data.get(key)
            
            if required and (value is None or value == ""):
                errors.append(ValidationError(
                    field=key,
                    message=f"{field.get('label', key)} là bắt buộc",
                    code="required_missing"
                ))
                continue
            
            if value is None or value == "":
                continue
            
            # [STEP 2] Type validation
            field_type = field.get("type")
            type_valid, type_error = self._validate_type(key, value, field_type, field)
            
            if not type_valid:
                errors.append(ValidationError(
                    field=key,
                    message=type_error,
                    code="invalid_type"
                ))
                continue
            
            # [STEP 3] Value range validation
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
        
        # [STEP 4] Calculate data quality score (simplified)
        quality_score = self._calculate_data_quality(form_data)
        
        return ValidationResult(
            errors=errors,
            warnings=warnings,
            data_quality_score=quality_score
        )
    
    def normalize_form_data(self, form_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        [ENHANCED] Chuẩn hóa dữ liệu form
        
        - Convert types theo field definition
        - Apply normalization rules
        - Compute derived fields
        """
        normalized = {}
        
        for field in self.fields:
            key = field.get("key")
            value = form_data.get(key)
            
            if value is None:
                normalized[key] = None
                continue
            
            field_type = field.get("type")
            
            # [NEW] Apply field-specific normalization rules
            if key in self.normalization_rules:
                value = self._apply_normalization_rule(key, value, self.normalization_rules[key])
            
            # Type normalization
            if field_type == "number":
                try:
                    normalized[key] = float(value)
                except (ValueError, TypeError):
                    normalized[key] = None
            
            elif field_type == "boolean":
                normalized[key] = self._normalize_boolean(value)
            
            elif field_type == "select":
                normalized[key] = value
            
            elif field_type == "string":
                normalized[key] = str(value).strip() if value else None
            
            else:
                normalized[key] = value
        
        return normalized
    
    def _validate_type(self, field_key: str, value: Any, field_type: str, field_config: Dict) -> Tuple[bool, str]:
        """Validate kiểu dữ liệu"""
        if field_type == "number":
            try:
                float(value)
                return True, ""
            except (ValueError, TypeError):
                return False, f"{field_config.get('label', field_key)} phải là số"
        
        elif field_type == "boolean":
            bool_valid, error = self._validate_boolean(value)
            return bool_valid, error
        
        elif field_type == "select":
            return True, ""
        
        elif field_type == "string":
            return True, ""
        
        return True, ""
    
    def _validate_boolean(self, value: Any) -> Tuple[bool, str]:
        """Validate boolean value"""
        if isinstance(value, bool):
            return True, ""
        
        if isinstance(value, (int, float)):
            return value in [0, 1, 0.0, 1.0], ""
        
        if isinstance(value, str):
            valid_values = {"true", "false", "1", "0", "yes", "no", "on", "off"}
            return value.lower() in valid_values, ""
        
        return False, "Giá trị boolean không hợp lệ"
    
    def _normalize_boolean(self, value: Any) -> bool:
        """Chuẩn hóa giá trị boolean"""
        if isinstance(value, bool):
            return value
        
        if isinstance(value, (int, float)):
            return bool(value)
        
        if isinstance(value, str):
            return value.lower() in ("true", "1", "yes", "on", "enabled", "active")
        
        return bool(value)
    
    def _apply_normalization_rule(self, field_key: str, value: Any, rule: Dict) -> Any:
        """
        [NEW] Áp dụng normalization rule cho field
        
        Rule format:
        {
            "type": "scale",  # scale, trim, round, lookup, custom
            "params": {...}
        }
        """
        rule_type = rule.get("type")
        params = rule.get("params", {})
        
        if rule_type == "scale":
            # Chia tỷ lệ giá trị (e.g., chia cho 100)
            scale_factor = params.get("factor", 1)
            try:
                return float(value) / scale_factor
            except (ValueError, TypeError):
                return value
        
        elif rule_type == "trim":
            # Cắt string whitespace
            return str(value).strip() if value else value
        
        elif rule_type == "round":
            # Làm tròn số
            decimals = params.get("decimals", 2)
            try:
                return round(float(value), decimals)
            except (ValueError, TypeError):
                return value
        
        elif rule_type == "lookup":
            # Ánh xạ giá trị
            mapping = params.get("mapping", {})
            return mapping.get(str(value), value)
        
        elif rule_type == "custom":
            # Custom function - định nghĩa trong metadata
            formula = params.get("formula")
            # [TODO] Evaluate formula safely
            return value
        
        return value
    
    def _check_outlier(self, field_key: str, value: float, field_config: Dict) -> Optional[str]:
        """
        [NEW] Phát hiện giá trị outlier
        """
        outlier_config = self.quality_config.get("outlier_detection", {})
        if not outlier_config.get("enabled"):
            return None
        
        # Sử dụng z-score hoặc IQR để phát hiện outlier
        # [TODO] Cần dữ liệu thống kê từ DB
        
        min_realistic = field_config.get("min")
        max_realistic = field_config.get("max")
        
        if min_realistic and value < min_realistic * 0.5:
            return f"{field_config.get('label', field_key)} có giá trị quá thấp (có thể lỗi nhập liệu)"
        
        if max_realistic and value > max_realistic * 1.5:
            return f"{field_config.get('label', field_key)} có giá trị quá cao (có thể lỗi nhập liệu)"
        
        return None
    
    def _validate_cross_field(self, form_data: Dict[str, Any]) -> List[ValidationError]:
        """
        [NEW] Validate dependencies giữa các field
        
        Ví dụ: height và weight phải cùng có hoặc cùng không
        """
        errors = []
        cross_validations = self.risk_config.get("cross_field_validations", [])
        
        for validation in cross_validations:
            fields_required = validation.get("fields_required")
            fields_optional = validation.get("fields_optional")
            condition = validation.get("condition")
            message = validation.get("message")
            
            # [TODO] Implement cross-field validation logic
        
        return errors
    
    def _calculate_data_quality(self, form_data: Dict[str, Any]) -> float:
        """
        [NEW] Tính data quality score (0-100)
        
        Dựa trên:
        - % field được điền
        - Kiểu dữ liệu hợp lệ
        - Không có outlier
        """
        quality_config = self.quality_config or {}
        
        # Tính % field được điền
        filled_count = sum(1 for f in self.fields if form_data.get(f.get("key")) is not None)
        total_required = sum(1 for f in self.fields if f.get("required"))
        
        completeness = (filled_count / total_required * 100) if total_required > 0 else 100
        
        # Weight của completeness
        completeness_weight = quality_config.get("completeness_weight", 0.5)
        
        # Base score từ completeness
        score = completeness * completeness_weight
        
        # Thêm điểm cho data consistency
        consistency_score = 100  # [TODO] Calculate consistency
        consistency_weight = quality_config.get("consistency_weight", 0.3)
        
        score += consistency_score * consistency_weight
        
        # Thêm điểm cho data accuracy (check outliers, ranges)
        accuracy_score = 100  # [TODO] Calculate accuracy
        accuracy_weight = quality_config.get("accuracy_weight", 0.2)
        
        score += accuracy_score * accuracy_weight
        
        return min(100, max(0, score))