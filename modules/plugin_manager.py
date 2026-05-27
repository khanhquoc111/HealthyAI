import json
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent
PLUGINS_DIR = PROJECT_ROOT / "plugins"

_PLUGINS_CACHE = {}

def load_all_plugins():
    """Quét thư mục và nạp tất cả metadata.json vào bộ nhớ."""
    global _PLUGINS_CACHE
    _PLUGINS_CACHE.clear()
    
    # Kiểm tra xem thư mục plugins có tồn tại không
    if not PLUGINS_DIR.exists():
        print(f"Lỗi: Không tìm thấy thư mục {PLUGINS_DIR}")
        return _PLUGINS_CACHE

    for plugin_path in PLUGINS_DIR.iterdir():
        if plugin_path.is_dir():
            meta_file = plugin_path / "metadata.json"
            if meta_file.exists():
                with open(meta_file, encoding="utf-8") as f:
                    data = json.load(f)
                    _PLUGINS_CACHE[data["id"]] = data
    return _PLUGINS_CACHE

def get_plugin(plugin_id: str):
    # Nạp plugin nếu cache trống
    if not _PLUGINS_CACHE:
        load_all_plugins()
    return _PLUGINS_CACHE.get(plugin_id)

def get_all_plugins():
    if not _PLUGINS_CACHE:
        load_all_plugins()
    return _PLUGINS_CACHE

# # --- CODE TEST ---
# if __name__ == "__main__":
#     print("Đang quét thư mục plugins...")
    
#     # 1. Gọi hàm nạp tất cả plugin
#     all_plugins = load_all_plugins()
    
#     # 2. In ra kết quả tổng quan
#     print(f"✅ Đã tải thành công {len(all_plugins)} bệnh lý vào hệ thống:")
    
#     # 3. Duyệt qua và in chi tiết từng bệnh
#     for plugin_id, plugin_data in all_plugins.items():
#         name = plugin_data.get("name", "Không rõ tên")
#         fields_count = len(plugin_data.get("fields", []))
#         rules_count = len(plugin_data.get("scoring_rules", []))
        
#         print(f"  - [{plugin_id}] {name} (Fields: {fields_count}, Rules: {rules_count})")
        
#     # 4. Test hàm lấy một bệnh cụ thể
#     print("\nTest thử lấy bệnh 'diabetes':")
#     diab = get_plugin("diabetes")
#     if diab:
#         print(f"  Tìm thấy! Tên bệnh: {diab['name']}")
#     else:
#         print("  ❌ Không tìm thấy bệnh diabetes.")