import sys
from pathlib import Path

# Thêm thư mục gốc vào Python path
sys.path.insert(0, str(Path(__file__).parent.parent))

from modules.plugin_manager import get_plugin

def evaluate_condition(user_data: dict, condition: dict) -> bool:
    """Đọc hiểu và dịch các toán tử logic từ file JSON sang code Python."""
    field = condition.get("field")
    op = condition.get("op")
    val = condition.get("value")

    # Lấy giá trị người dùng đã nhập, nếu chưa nhập thì mặc định là None
    user_val = user_data.get(field)
    
    if user_val is None:
        return False

    # Dịch các toán tử (operator) thành phép toán tương ứng
    if op == "gte": return user_val >= val        # Lớn hơn hoặc bằng
    if op == "lte": return user_val <= val        # Nhỏ hơn hoặc bằng
    if op == "gt":  return user_val > val         # Lớn hơn
    if op == "lt":  return user_val < val         # Nhỏ hơn
    if op == "eq":  return user_val == val        # Bằng nhau
    if op == "neq": return user_val != val        # Khác nhau
    if op == "bool_true":  return bool(user_val) is True   # Checkbox chọn Có
    if op == "bool_false": return bool(user_val) is False  # Checkbox chọn Không
    
    return False

def compute_dynamic_score(plugin_id: str, user_data: dict) -> tuple[int, list]:
    """Tính tổng điểm nguy cơ dựa trên cấu hình JSON của bệnh."""
    plugin = get_plugin(plugin_id)
    if not plugin:
        return 0, ["Lỗi: Không tìm thấy cấu hình bệnh lý."]
    
    # Ưu tiên custom_scorer.py nếu plugin có khai báo và file tồn tại
    custom_cfg = plugin.get("custom_scorer", {})
    if custom_cfg.get("enabled"):
        scorer_path = Path(__file__).parent.parent / "plugins" / plugin_id / custom_cfg.get("file", "custom_scorer.py")
        if scorer_path.exists():
            import importlib.util
            spec = importlib.util.spec_from_file_location("custom_scorer", scorer_path)
            mod = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(mod)
            return mod.compute_score(user_data)

    score = 0
    reasons = []
    
    # Lấy danh sách luật tính điểm và điểm tối đa từ JSON
    rules = plugin.get("scoring_rules", [])
    max_score = plugin.get("max_score", 100)

    for rule in rules:
        # Giả định ban đầu là luật này đúng
        conditions_met = True 
        
        # Kiểm tra tất cả các điều kiện trong 1 luật (AND logic)
        for cond in rule.get("conditions", []):
            if not evaluate_condition(user_data, cond):
                conditions_met = False
                break # Chỉ cần 1 điều kiện sai, bỏ qua luật này
        
        # Nếu tất cả điều kiện đều thỏa mãn -> Cộng điểm và ghi nhận lý do
        if conditions_met:
            score += rule.get("points", 0)
            reasons.append(rule.get("description", "Có yếu tố nguy cơ"))

    # Đảm bảo điểm không vượt quá điểm tối đa
    final_score = min(score, max_score)
    return final_score, reasons

# # --- ĐOẠN CODE TEST TRỰC TIẾP ---
# if __name__ == "__main__":
#     from modules.plugin_manager import load_all_plugins
    
#     # Giả lập dữ liệu một bệnh nhân (ví dụ: nam, 50 tuổi, béo phì, đường huyết cao)
#     mock_user_data = {
#         "age": 50,
#         "bmi": 31.5,
#         "fasting_glucose": 130,
#         "exercise": False,
#         "smoke": True
#     }
    
#     print("Khởi chạy bộ tính điểm động...")
#     print(f"Dữ liệu bệnh nhân: {mock_user_data}\n")
    
#     # Nạp tất cả plugins trước
#     load_all_plugins()
    
#     # Test tính điểm cho bệnh tiểu đường
#     score, reasons = compute_dynamic_score("diabetes", mock_user_data)
    
#     print(f"✅ Bệnh lý: Đái Tháo Đường")
#     print(f"👉 Tổng điểm nguy cơ: {score}")
#     print("👉 Lý do chi tiết:")
#     for r in reasons:
#         print(f"  - {r}")