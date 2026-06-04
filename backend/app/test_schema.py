# backend/app/test_schema.py
import json
from pathlib import Path
from app.schema_validator import validate_disease_schema

def test_plugin_schema(plugin_name: str = "hypertension"):
    metadata_path = Path("plugins") / plugin_name / "metadata.json"
    
    if not metadata_path.exists():
        print(f"❌ Không tìm thấy file: {metadata_path}")
        return
    
    try:
        with open(metadata_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        print(f"✅ Đang validate schema cho plugin: {plugin_name}")
        
        validated = validate_disease_schema(data)
        
        print("✅ Schema hợp lệ!")
        print(f"   Disease: {validated.disease_info.name}")
        print(f"   Version: {validated.disease_info.version}")
        print(f"   Số fields: {len(validated.fields)}")
        print(f"   Số baseline rules: {len(validated.risk_config.baseline_mapping)}")
            
    except Exception as e:
        print(f"❌ Validate thất bại: {e}")

if __name__ == "__main__":
    test_plugin_schema()