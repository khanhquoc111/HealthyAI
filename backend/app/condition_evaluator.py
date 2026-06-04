from typing import Dict, Any, List, Union


class ConditionEvaluator:
    """
    Evaluates atomic and composite conditions with support for:
    
    1. Atomic: {"field": "age", "op": "gte", "value": 45}
    2. AND: {"all": [condition1, condition2, ...]}
    3. OR: {"any": [condition1, condition2, ...]}
    4. NOT (AND): {"not_all": [condition1, condition2]} = NOT(all true)
    5. NOT (OR): {"not_any": [condition1, condition2]} = NOT(any true)
    6. Nested: {"all": [{"field": "age", ...}, {"any": [...]}]}
    
    Operators: gte, gt, lte, lt, eq, neq, bool_true, bool_false, in, range
    """

    @staticmethod
    def evaluate(condition: Union[Dict, None], form_data: Dict[str, Any]) -> bool:
        """
        Main entry point for condition evaluation.
        Supports atomic, composite, and nested conditions.
        Returns False for None/empty conditions.
        """
        if not condition:
            return False

        # Handle NOT with "not_all" - True if NOT all conditions are true
        if condition.get("not_all") is not None:
            conditions = condition.get("not_all")
            if not isinstance(conditions, list):
                return False
            return not all(
                ConditionEvaluator.evaluate(cond, form_data) 
                for cond in conditions
            )

        # Handle NOT with "not_any" - True if NOT any condition is true
        if condition.get("not_any") is not None:
            conditions = condition.get("not_any")
            if not isinstance(conditions, list):
                return False
            return not any(
                ConditionEvaluator.evaluate(cond, form_data) 
                for cond in conditions
            )

        # Handle composite conditions with "all" (AND)
        if condition.get("all") is not None:
            conditions = condition.get("all")
            if not isinstance(conditions, list):
                return False
            return all(
                ConditionEvaluator.evaluate(cond, form_data) 
                for cond in conditions
            )

        # Handle composite conditions with "any" (OR)
        if condition.get("any") is not None:
            conditions = condition.get("any")
            if not isinstance(conditions, list):
                return False
            return any(
                ConditionEvaluator.evaluate(cond, form_data) 
                for cond in conditions
            )

        # Handle atomic condition
        return ConditionEvaluator._evaluate_atomic(condition, form_data)

    @staticmethod
    def _evaluate_atomic(condition: Dict, form_data: Dict[str, Any]) -> bool:
        """Evaluate a single atomic condition."""
        field = condition.get("field")
        op = condition.get("op")
        value = condition.get("value")
        actual = form_data.get(field)

        # Boolean operations - handle BEFORE None check to allow bool_false to match None
        if op == "bool_true":
            return ConditionEvaluator._evaluate_bool_true(actual)
        if op == "bool_false":
            return ConditionEvaluator._evaluate_bool_false(actual)

        # For non-boolean operations, None is an error case
        if actual is None:
            return False

        try:
            # Numeric comparisons
            if op in ["gte", "gt", "lte", "lt"]:
                actual = float(actual)
                value = float(value)
                if op == "gte":
                    return actual >= value
                if op == "gt":
                    return actual > value
                if op == "lte":
                    return actual <= value
                if op == "lt":
                    return actual < value

            # Equality operations
            if op == "eq":
                return actual == value
            if op == "neq":
                return actual != value

            # Membership operations
            if op == "in":
                if isinstance(value, list):
                    return actual in value
                return str(actual) in str(value).split(",")

            # Range operation
            if op == "range":
                actual = float(actual)
                minv = condition.get("min")
                maxv = condition.get("max")
                if minv is not None and actual < minv:
                    return False
                if maxv is not None and actual > maxv:
                    return False
                return True

        except (ValueError, TypeError):
            return False

        return False

    @staticmethod
    def _evaluate_bool_true(actual: Any) -> bool:
        """
        Safely evaluate if a value is truthy for bool_true operator.
        Handles boolean, string, numeric, and None values.
        
        Returns True only for:
        - bool True
        - string "true", "True", "TRUE"
        - string "1"
        - numeric 1
        
        Returns False for:
        - bool False
        - string "false", "False", "FALSE", "0", "", any other string
        - numeric 0, 0.0
        - None
        """
        # Direct boolean True
        if actual is True:
            return True
        
        # Direct boolean False
        if actual is False:
            return False
        
        # None
        if actual is None:
            return False
        
        # String values
        if isinstance(actual, str):
            # Normalize and check against known truthy strings
            normalized = actual.strip().lower()
            return normalized in ("true", "1", "yes")
        
        # Numeric values: only 1 is truthy, others (0, 2, 3, etc) are falsy
        if isinstance(actual, (int, float)):
            return actual == 1
        
        # Everything else is falsy
        return False

    @staticmethod
    def _evaluate_bool_false(actual: Any) -> bool:
        """
        Safely evaluate if a value is falsy for bool_false operator.
        This is the inverse of _evaluate_bool_true.
        
        Returns True for:
        - bool False
        - string "false", "False", "FALSE"
        - string "0", ""
        - numeric 0, 0.0
        - None
        
        Returns False for:
        - bool True
        - string "true", "True", "TRUE", "1"
        - numeric 1
        """
        return not ConditionEvaluator._evaluate_bool_true(actual)
