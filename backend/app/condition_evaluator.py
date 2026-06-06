# backend/app/condition_evaluator.py
"""
ConditionEvaluator - Đánh giá các điều kiện từ risk config
Hỗ trợ logic AND/OR/NOT với so sánh giá trị (>, <, ==, etc.)

[FIX] Thêm support cho "range" operator cho baseline_mapping
"""

from typing import Any, Dict, List, Union
import logging

logger = logging.getLogger(__name__)


class ConditionEvaluator:
    """
    Đánh giá các điều kiện được định nghĩa trong risk_config
    
    Hỗ trợ cú pháp:
    - Simple: {"field": "age", "op": ">", "value": 50}
    - Range: {"field": "systolic", "op": "range", "min": 90, "max": 120}
    - Compound: {"type": "AND", "conditions": [...]}
    - Compound: {"type": "OR", "conditions": [...]}
    - Negation: {"type": "NOT", "condition": {...}}
    """

    OPERATORS = {
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
        "in": lambda v, values: v in values,
        "not_in": lambda v, values: v not in values,
        "contains": lambda v, substr: substr in str(v).lower() if v else False,
        "bool_true": lambda v, _: bool(v),
        "bool_false": lambda v, _: not bool(v),
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

        # Simple condition
        field = condition.get("field")
        operator = condition.get("op", "==")
        value = condition.get("value")

        if not field:
            return True

        # Lấy giá trị từ form_data
        field_value = form_data.get(field)

        if field_value is None:
            # Nếu field không có, xem như điều kiện không thỏa mãn
            return False

        # [FIX] Support "range" operator cho baseline_mapping
        if operator == "range":
            min_val = condition.get("min")
            max_val = condition.get("max")
            try:
                num_val = float(field_value)
                if min_val is not None and max_val is not None:
                    return min_val <= num_val < max_val
                elif min_val is not None:
                    return num_val >= min_val
                elif max_val is not None:
                    return num_val < max_val
            except (ValueError, TypeError):
                logger.warning(f"Cannot convert {field}={field_value} to float for range comparison")
                return False
            return False

        # Chuyển kiểu nếu cần
        try:
            if operator in [">", "<", ">=", "<=", "gt", "lt", "gte", "lte"]:
                field_value = float(field_value)
                if isinstance(value, (int, float)):
                    value = float(value)
        except (ValueError, TypeError):
            pass

        # Đánh giá với operator
        if operator not in ConditionEvaluator.OPERATORS:
            logger.warning(f"Unknown operator: {operator}")
            return False

        try:
            op_func = ConditionEvaluator.OPERATORS[operator]
            return op_func(field_value, value)
        except Exception as e:
            logger.error(f"Error evaluating condition: {e}")
            return False


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
                return False, f"{self.field} là bắt buộc"
            return True, ""

        # Numeric validation
        if self.rule_type == "numeric":
            try:
                num_val = float(value)
                min_val = self.params.get("min")
                max_val = self.params.get("max")

                if min_val is not None and num_val < min_val:
                    return False, f"{self.field} không thể nhỏ hơn {min_val}"
                if max_val is not None and num_val > max_val:
                    return False, f"{self.field} không thể lớn hơn {max_val}"

                return True, ""
            except ValueError:
                return False, f"{self.field} phải là số"

        # Range validation
        elif self.rule_type == "range":
            try:
                num_val = float(value)
                min_val = self.params.get("min")
                max_val = self.params.get("max")
                if not (min_val <= num_val <= max_val):
                    return False, f"{self.field} phải trong khoảng [{min_val}, {max_val}]"
                return True, ""
            except ValueError:
                return False, f"{self.field} phải là số"

        # Length validation
        elif self.rule_type == "length":
            min_len = self.params.get("min", 0)
            max_len = self.params.get("max", float("inf"))
            str_val = str(value)
            if not (min_len <= len(str_val) <= max_len):
                return False, f"{self.field} độ dài phải từ {min_len} đến {max_len}"
            return True, ""

        # Enum validation
        elif self.rule_type == "enum":
            allowed = self.params.get("values", [])
            if value not in allowed:
                return False, f"{self.field} giá trị không hợp lệ: {value}"
            return True, ""

        # Pattern validation
        elif self.rule_type == "pattern":
            import re
            pattern = self.params.get("pattern")
            if not re.match(pattern, str(value)):
                return False, f"{self.field} định dạng không hợp lệ"
            return True, ""

        return True, ""