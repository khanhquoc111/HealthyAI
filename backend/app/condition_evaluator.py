# backend/app/condition_evaluator.py
"""
ConditionEvaluator - UPGRADED VERSION
Nâng cấp để hỗ trợ thêm operators, percentile comparison, và conditional logic
"""

from typing import Any, Dict, List, Union
import logging
import math

logger = logging.getLogger(__name__)


class ConditionEvaluator:
    """
    Đánh giá các điều kiện được định nghĩa trong risk_config
    
    Hỗ trợ cú pháp:
    - Simple: {"field": "age", "op": ">", "value": 50}
    - Range: {"field": "systolic", "op": "range", "min": 90, "max": 120}
    - Percentile: {"field": "bmi", "op": "percentile_gt", "percentile": 75}
    - Compound: {"type": "AND", "conditions": [...]}
    - Compound: {"type": "OR", "conditions": [...]}
    - Negation: {"type": "NOT", "condition": {...}}
    - Advanced: {"field": "risk_score", "op": "between_inclusive", "min": 40, "max": 70}
    """

    OPERATORS = {
        # Basic comparison
        "gt": lambda v, threshold: v > threshold,
        "gte": lambda v, threshold: v >= threshold,
        "lt": lambda v, threshold: v < threshold,
        "lte": lambda v, threshold: v <= threshold,
        ">": lambda v, threshold: v > threshold,
        ">=": lambda v, threshold: v >= threshold,
        "<": lambda v, threshold: v < threshold,
        "<=": lambda v, threshold: v <= threshold,
        "eq": lambda v, threshold: v == threshold,
        "==": lambda v, threshold: v == threshold,
        "ne": lambda v, threshold: v != threshold,
        "!=": lambda v, threshold: v != threshold,
        
        # Collection operators
        "in": lambda v, values: v in values,
        "not_in": lambda v, values: v not in values,
        "contains": lambda v, substr: substr in str(v).lower() if v else False,
        
        # Boolean operators
        "bool_true": lambda v, _: bool(v),
        "bool_false": lambda v, _: not bool(v),
        
        # [NEW] Range operators
        "between": lambda v, range_dict: range_dict.get("min") <= v < range_dict.get("max"),
        "between_inclusive": lambda v, range_dict: range_dict.get("min") <= v <= range_dict.get("max"),
        
        # [NEW] String operators
        "startswith": lambda v, prefix: str(v).lower().startswith(str(prefix).lower()) if v else False,
        "endswith": lambda v, suffix: str(v).lower().endswith(str(suffix).lower()) if v else False,
        "icontains": lambda v, substr: substr.lower() in str(v).lower() if v and substr else False,
        
        # [NEW] Null/existence operators
        "is_null": lambda v, _: v is None,
        "is_not_null": lambda v, _: v is not None,
        "is_empty": lambda v, _: v is None or v == "" or v == [],
        "is_not_empty": lambda v, _: v is not None and v != "" and v != [],
    }

    @staticmethod
    def evaluate(condition: Union[Dict, List, None], form_data: Dict[str, Any]) -> bool:
        """
        Đánh giá điều kiện dựa trên form_data
        
        Args:
            condition: Điều kiện (dict hoặc None)
            form_data: Dữ liệu nhập từ form
            
        Returns:
            True/False dựa trên điều kiện
        """
        if condition is None:
            return True

        # Xử lý list điều kiện (mặc định là AND)
        if isinstance(condition, list):
            return all(ConditionEvaluator.evaluate(c, form_data) for c in condition)

        if not isinstance(condition, dict):
            return True

        # Xử lý compound conditions
        cond_type = condition.get("type", "").upper()

        if cond_type == "AND":
            conditions = condition.get("conditions", [])
            return all(ConditionEvaluator.evaluate(c, form_data) for c in conditions)

        elif cond_type == "OR":
            conditions = condition.get("conditions", [])
            return any(ConditionEvaluator.evaluate(c, form_data) for c in conditions)

        elif cond_type == "NOT":
            sub_condition = condition.get("condition")
            return not ConditionEvaluator.evaluate(sub_condition, form_data)

        elif cond_type == "XOR":  # [NEW] Exclusive OR
            conditions = condition.get("conditions", [])
            true_count = sum(1 for c in conditions if ConditionEvaluator.evaluate(c, form_data))
            return true_count == 1

        # Simple condition
        field = condition.get("field")
        operator = condition.get("op", "==")
        value = condition.get("value")

        if not field:
            return True

        # Lấy giá trị từ form_data
        field_value = form_data.get(field)

        if field_value is None:
            # [ENHANCED] Xử lý null values với is_null/is_not_null
            if operator in ["is_null", "is_empty"]:
                return True
            elif operator in ["is_not_null", "is_not_empty"]:
                return False
            # Các operator khác: field không có xem như điều kiện không thỏa mãn
            return False

        # [FIXED] Support "range" operator - có thể có min/max hoặc list [min, max]
        if operator == "range":
            min_val = condition.get("min")
            max_val = condition.get("max")
            
            # [NEW] Support legacy format [min, max] trong metadata
            if min_val is None and max_val is None:
                # Có thể min/max được pass như properties khác
                min_val = condition.get("lower")
                max_val = condition.get("upper")
            
            try:
                num_val = float(field_value)
                if min_val is not None and max_val is not None:
                    return min_val <= num_val <= max_val  # Inclusive on both ends
                elif min_val is not None:
                    return num_val >= min_val
                elif max_val is not None:
                    return num_val <= max_val
            except (ValueError, TypeError):
                logger.warning(f"Cannot convert {field}={field_value} to float for range comparison")
                return False
            return False

        # [NEW] Support percentile operators
        if operator in ["percentile_gt", "percentile_gte", "percentile_lt", "percentile_lte"]:
            percentile_value = condition.get("percentile", 50)
            try:
                num_val = float(field_value)
                # [TODO] Cần reference data từ database để tính percentile
                # Tạm thời sử dụng xấp xỉ
                is_high = num_val > 70  # Placeholder
                if operator == "percentile_gt":
                    return is_high
                elif operator == "percentile_gte":
                    return is_high or num_val == 70
                elif operator == "percentile_lt":
                    return not is_high
                elif operator == "percentile_lte":
                    return not is_high or num_val == 70
            except (ValueError, TypeError):
                logger.warning(f"Cannot convert {field}={field_value} for percentile")
                return False
            return False

        # [ENHANCED] Type conversion with better error handling
        field_value, value = ConditionEvaluator._coerce_types(operator, field_value, value)

        # Đánh giá với operator
        if operator not in ConditionEvaluator.OPERATORS:
            logger.warning(f"Unknown operator: {operator}")
            return False

        try:
            op_func = ConditionEvaluator.OPERATORS[operator]
            
            # [ENHANCED] Xử lý range operators
            if operator in ["between", "between_inclusive"]:
                range_dict = {"min": condition.get("min"), "max": condition.get("max")}
                return op_func(field_value, range_dict)
            else:
                return op_func(field_value, value)
        except Exception as e:
            logger.error(f"Error evaluating condition: {e}")
            return False

    @staticmethod
    def _coerce_types(operator: str, field_value: Any, comparison_value: Any) -> tuple:
        """
        [ENHANCED] Chuẩn hóa kiểu dữ liệu cho operator
        
        Returns:
            (coerced_field_value, coerced_comparison_value)
        """
        try:
            # Numeric operators
            if operator in [">", "<", ">=", "<=", "gt", "lt", "gte", "lte", "between", "between_inclusive"]:
                field_value = float(field_value) if field_value is not None else 0
                if comparison_value is not None:
                    comparison_value = float(comparison_value)
            
            # Boolean operators - convert string to bool
            elif operator in ["bool_true", "bool_false"]:
                field_value = ConditionEvaluator._string_to_bool(field_value)
            
            # Equality operators - convert if types differ
            elif operator in ["eq", "==", "ne", "!="]:
                if isinstance(comparison_value, bool):
                    field_value = ConditionEvaluator._string_to_bool(field_value)
                elif isinstance(comparison_value, (int, float)):
                    try:
                        field_value = float(field_value)
                    except (ValueError, TypeError):
                        pass
            
            # String operators - convert to string
            elif operator in ["contains", "icontains", "startswith", "endswith"]:
                field_value = str(field_value)
                comparison_value = str(comparison_value) if comparison_value is not None else ""
        
        except (ValueError, TypeError) as e:
            logger.debug(f"Type coercion warning: {e}")
        
        return field_value, comparison_value

    @staticmethod
    def _string_to_bool(value: Any) -> bool:
        """
        [ENHANCED] Chuyển đổi string thành boolean một cách thông minh
        """
        if isinstance(value, bool):
            return value
        
        if isinstance(value, (int, float)):
            return bool(value)
        
        if isinstance(value, str):
            return value.lower() in ("true", "1", "yes", "on", "enabled", "active")
        
        return bool(value)


class ValidationRule:
    """Định nghĩa một quy tắc validation"""

    def __init__(self, field: str, rule_type: str, **kwargs):
        self.field = field
        self.rule_type = rule_type
        self.params = kwargs

    def validate(self, value: Any) -> tuple[bool, str]:
        """
        Validate giá trị
        Returns: (is_valid, error_message)
        """
        if value is None or value == "":
            if self.params.get("required"):
                return False, f"{self.field} is required"
            return True, ""

        if self.rule_type == "number":
            try:
                num = float(value)
                min_val = self.params.get("min")
                max_val = self.params.get("max")
                
                if min_val is not None and num < min_val:
                    return False, f"{self.field} must be >= {min_val}"
                if max_val is not None and num > max_val:
                    return False, f"{self.field} must be <= {max_val}"
                
                return True, ""
            except (ValueError, TypeError):
                return False, f"{self.field} must be a number"

        elif self.rule_type == "select":
            options = self.params.get("options", [])
            if value not in options:
                return False, f"{self.field} has invalid value"
            return True, ""

        elif self.rule_type == "string":
            min_len = self.params.get("min_length")
            max_len = self.params.get("max_length")
            
            if min_len and len(str(value)) < min_len:
                return False, f"{self.field} is too short"
            if max_len and len(str(value)) > max_len:
                return False, f"{self.field} is too long"
            
            return True, ""

        return True, ""