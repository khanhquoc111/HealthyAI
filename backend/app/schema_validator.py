# backend/app/schema_validator.py
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