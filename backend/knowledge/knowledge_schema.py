from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict

# Định nghĩa cấu trúc chuẩn cho Bệnh lý, Biến số đầu vào...
class ReferenceItem(BaseModel):
    code: str
    name: str

class NormalRange(BaseModel):
    code: str      # VD: "trungBinh"
    name: str      # VD: "Trung bình"
    min: Optional[float] = None
    max: Optional[float] = None

class KnowledgeArticle(BaseModel):
    model_config = ConfigDict(extra='ignore')

    id: str
    name: str
    category: str
    
    summary: str
    description: str
    importance: Optional[str] = ""
    
    unit: Optional[str] = ""
    indicator_type: Optional[str] = "direct"
    
    # Đổi từ List[str] sang List[ReferenceItem]
    required_inputs: List[ReferenceItem] = Field(default_factory=list) 
    formula: Optional[str] = None
    
    normal_ranges: List[NormalRange] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    
    # Đổi từ List[str] sang List[ReferenceItem]
    related_diseases: List[ReferenceItem] = Field(default_factory=list)
    
    images: List[str] = Field(default_factory=list)
    source: Optional[str] = ""
    
    usable_for_assessment: bool = True
    is_active: bool = True