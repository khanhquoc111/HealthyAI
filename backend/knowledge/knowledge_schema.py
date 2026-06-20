from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict

class NormalRange(BaseModel):
    label: str
    min: Optional[float] = None
    max: Optional[float] = None

class KnowledgeArticle(BaseModel):
    # Cho phép Pydantic bỏ qua các trường không được định nghĩa (VD: importance, source)
    model_config = ConfigDict(extra='ignore')

    id: str
    name: str
    category: str
    summary: str
    description: str
    formula: Optional[str] = None
    images: List[str] = Field(default_factory=list)
    normal_ranges: List[NormalRange] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    related_diseases: List[str] = Field(default_factory=list)