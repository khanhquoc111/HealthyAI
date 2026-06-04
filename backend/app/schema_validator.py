# backend/app/schema_validator.py
from typing import Dict, Any, List, Tuple
from .disease_schema import DiseaseSchema


def validate_disease_schema(data: dict):
    """
    Validate disease plugin metadata against DiseaseSchema.
    
    Args:
        data: Dictionary to validate
        
    Returns:
        Validated DiseaseSchema Pydantic model
        
    Raises:
        ValueError: If validation fails
    """
    try:
        # Pydantic validates and converts data to DiseaseSchema model
        # Extra fields are silently ignored, allowing forward compatibility
        validated = DiseaseSchema(**data)
        return validated
    except Exception as e:
        raise ValueError(f"Invalid disease schema: {str(e)}")


class SchemaValidator:
    """
    ✅ NEW CLASS - Validate form input data against plugin field definitions
    """
    
    def validate(self, form_data: Dict[str, Any], fields: List[Dict[str, Any]]) -> Tuple[bool, List[str]]:
        """
        Validate form data against field definitions.
        
        Args:
            form_data: Input data to validate
            fields: Field definitions from plugin metadata
            
        Returns:
            (is_valid: bool, errors: List[str])
        """
        errors = []
        
        if not fields:
            return True, []
        
        # Validate each field
        for field in fields:
            field_key = field.get("key")
            field_type = field.get("type")
            required = field.get("required", False)
            min_val = field.get("min")
            max_val = field.get("max")
            options = field.get("options", [])
            
            value = form_data.get(field_key)
            
            # Check required
            if required and (value is None or value == ""):
                errors.append(f"{field.get('label', field_key)} là bắt buộc")
                continue
            
            # Skip validation if optional and empty
            if value is None or value == "":
                continue
            
            # Type validation
            if field_type == "number":
                try:
                    num_val = float(value)
                    
                    # Check min
                    if min_val is not None and num_val < min_val:
                        errors.append(f"{field.get('label', field_key)} phải >= {min_val}")
                    
                    # Check max
                    if max_val is not None and num_val > max_val:
                        errors.append(f"{field.get('label', field_key)} phải <= {max_val}")
                
                except (ValueError, TypeError):
                    errors.append(f"{field.get('label', field_key)} phải là số")
            
            elif field_type == "select":
                # Check if value is in options
                valid_values = [opt.get("value") if isinstance(opt, dict) else opt for opt in options]
                if value not in valid_values:
                    errors.append(f"{field.get('label', field_key)} không hợp lệ")
            
            elif field_type == "boolean":
                if not isinstance(value, (bool, int)):
                    if isinstance(value, str):
                        if value.lower() not in ("true", "false", "1", "0", "yes", "no"):
                            errors.append(f"{field.get('label', field_key)} phải là true/false")
        
        return len(errors) == 0, errors