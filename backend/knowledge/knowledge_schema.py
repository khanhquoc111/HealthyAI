from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict

class NormalRange(BaseModel):
    label: str
    min: Optional[float] = None
    max: Optional[float] = None

class KnowledgeArticle(BaseModel):
    # Cho phép Pydantic bỏ qua các trường rác nếu có, nhưng giữ lại các trường đã khai báo
    model_config = ConfigDict(extra='ignore')

    # Nhóm 1
    id: str
    name: str
    category: str
    
    # Nhóm 2
    summary: str
    description: str
    importance: Optional[str] = ""
    
    # Nhóm 3
    unit: Optional[str] = ""
    indicator_type: Optional[str] = "direct"
    required_inputs: List[str] = Field(default_factory=list)
    formula: Optional[str] = None
    
    # Nhóm 4, 5, 6
    normal_ranges: List[NormalRange] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    related_diseases: List[str] = Field(default_factory=list)
    
    # Nhóm 7
    images: List[str] = Field(default_factory=list)
    source: Optional[str] = ""
    
    # Nhóm 8
    usable_for_assessment: bool = True
    is_active: bool = True