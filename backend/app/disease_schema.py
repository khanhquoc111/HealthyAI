# backend/app/disease_schema.py
from typing import List, Optional, Dict, Any, Literal, Union
from pydantic import BaseModel, Field, validator


class UIConfig(BaseModel):
    input_type: Literal["text", "number", "checkbox", "select", "range"] = "text"
    placeholder: Optional[str] = None
    group: Optional[str] = None
    order: int = 0


class FieldSchema(BaseModel):
    key: str = Field(..., description="Unique identifier, snake_case")
    label: str
    type: Literal["number", "text", "boolean", "select"]
    
    required: bool = False
    default: Optional[Any] = None
    
    min: Optional[float] = None
    max: Optional[float] = None
    step: Optional[float] = 1.0
    unit: Optional[str] = None
    
    options: Optional[List[Dict[str, str]]] = None
    ui: UIConfig = Field(default_factory=UIConfig)
    
    @validator('key')
    def key_must_be_snake_case(cls, v):
        if not v.replace('_', '').isalnum():
            raise ValueError('key phải là snake_case')
        return v


class ComputedField(BaseModel):
    """Computed fields - cho phép tính toán động từ các field khác"""
    key: str
    formula: str                    # Ví dụ: "age * 0.1 + bmi * 2.5"
    dependencies: List[str] = Field(default_factory=list)
    description: Optional[str] = None


class ExplanationTemplate(BaseModel):
    """Template giải thích chi tiết cho từng rule"""
    rule_id: str
    template: str                   # "Huyết áp tâm thu {systolic} vượt ngưỡng {threshold} mmHg"
    variables: List[str] = Field(default_factory=list)


class ConditionSchema(BaseModel):
    """
    Atomic or composite condition schema.
    Atomic: {"field": "age", "op": "gte", "value": 45}
    Composite AND: {"all": [cond1, cond2]}
    Composite OR: {"any": [cond1, cond2]}
    Composite NOT: {"not_all": [cond1, cond2]}, {"not_any": [cond1, cond2]}
    """
    field: Optional[str] = None
    op: Optional[Literal["gte", "gt", "lte", "lt", "eq", "neq", "bool_true", "bool_false", "in", "range"]] = None
    value: Optional[Union[float, str, bool, List]] = None
    min: Optional[float] = None
    max: Optional[float] = None
    
    # Logical operators for compound conditions
    all: Optional[List["ConditionSchema"]] = None
    any: Optional[List["ConditionSchema"]] = None
    not_all: Optional[List["ConditionSchema"]] = None
    not_any: Optional[List["ConditionSchema"]] = None


ConditionSchema.model_rebuild()


class CrossValidationRule(BaseModel):
    left: str
    op: Literal["lte_field", "gte_field", "eq_field", "neq_field"]
    right: str
    message: str
    severity: Literal["error", "warning"] = "warning"


class RiskRule(BaseModel):
    id: str
    description: str
    condition: ConditionSchema
    category: Literal["modifier", "protective", "interaction"] = "modifier"
    effect_type: Literal["additive", "multiplicative", "divisive"] = "multiplicative"
    value: float = 1.0
    priority: int = 10
    weight: float = 1.0


class RecommendationRule(BaseModel):
    id: str
    condition: ConditionSchema
    text: str
    priority: int = 1
    action_type: Literal["lifestyle", "monitoring", "medication", "referral"] = "lifestyle"


class BaselineStage(BaseModel):
    name: str
    condition: ConditionSchema
    score: float
    priority: Optional[int] = None


class InteractionRule(BaseModel):
    """
    Interaction rule with flexible condition support.
    """
    id: str
    interaction_multiplier: float = 1.0
    description: Optional[str] = None
    
    conditions: Optional[List[ConditionSchema]] = None
    condition: Optional[ConditionSchema] = None
    
    @validator('id')
    def id_must_not_be_empty(cls, v):
        if not v.strip():
            raise ValueError('Interaction id cannot be empty')
        return v


class DiseaseInfo(BaseModel):
    id: str
    name: str
    version: str = "1.0"
    description: Optional[str] = None
    author: Optional[str] = None
    last_updated: Optional[str] = None


class RiskStratificationConfig(BaseModel):
    baseline_mapping: List[BaselineStage]
    risk_modifiers: List[RiskRule]
    protective_factors: List[RiskRule]
    interactions: List[InteractionRule] = Field(default_factory=list)
    thresholds: List[Dict[str, Any]] = Field(..., description="Thresholds cho risk level")
    computed_fields: List[ComputedField] = Field(default_factory=list)


class DiseaseSchema(BaseModel):
    disease_info: DiseaseInfo
    fields: List[FieldSchema]
    risk_config: RiskStratificationConfig
    recommendations: List[RecommendationRule]
    cross_validations: List[CrossValidationRule] = Field(default_factory=list)
    explanation_templates: List[ExplanationTemplate] = Field(default_factory=list)
    risk_levels: Dict[str, Dict[str, Any]] = Field(default_factory=dict)
    display_config: Optional[Dict] = Field(default_factory=dict)
    
    # Kích hoạt tính năng State Pattern cho ML Engine
    ml_required_features: List[str] = Field(default_factory=list)