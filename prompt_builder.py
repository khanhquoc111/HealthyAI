# prompt_builder.py
def build_gemini_prompt(user_data: dict, risk_results: list, ml_results: dict = None) -> str:
    user_info = "\n".join([f"- {k}: {v}" for k, v in user_data.items()])

    risk_info = "\n".join([
        f"- {name}: Nguy cơ **{level}** ({score}/{max_score} điểm)"
        for name, level, score, max_score in risk_results
    ])

    ml_info = ""
    if ml_results and ml_results.get("screening_prob") is not None:
        ml_info = f"""
**KẾT QUẢ TỪ MÔ HÌNH MÁY HỌC (ĐÃ TRAIN):**
- Xác suất nguy cơ Đái tháo đường (Screening model): **{ml_results['screening_prob']:.1%}**
- Mức độ: **{ml_results['screening_risk_level']}**
- Ngưỡng tối ưu: {ml_results.get('screening_threshold', 0.5):.4f}
"""

    prompt = f"""Bạn là bác sĩ chuyên khoa nội tổng quát kiêm chuyên gia dinh dưỡng.

Dựa trên dữ liệu sau, hãy phân tích và đưa ra lời khuyên **tham khảo** một cách khách quan.

**DỮ LIỆU BỆNH NHÂN:**
{user_info}

**KẾT QUẢ PHÂN TÍCH NGUY CƠ TỪ HỆ THỐNG:**
{risk_info}

{ml_info}

Hãy trả lời **chính xác** theo định dạng JSON với 5 trường sau (không thêm bất kỳ nội dung nào ngoài JSON):
- phan1: Nhận xét tổng quan sức khỏe (2-3 câu ngắn gọn, không chẩn đoán bệnh)
- phan2: Các yếu tố nguy cơ chính cần chú ý nhất (dùng dấu đầu dòng nếu cần)
- phan3: Khuyến nghị chế độ ăn uống (cụ thể, dễ thực hiện, phù hợp người Việt)
- phan4: Khuyến nghị vận động thể chất (loại hình, tần suất, thời lượng)
- phan5: Lời khuyên theo dõi và khi nào nên gặp bác sĩ

Giọng điệu ấm áp, khích lệ, không gây hoang mang. Tổng nội dung ngắn gọn, dễ hiểu.
"""

    return prompt