# gemini_api.py
import requests
import os
import json
import time
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")

if not API_KEY:
    print("⚠️ CẢNH BÁO: GEMINI_API_KEY chưa được thiết lập trong file .env")

def call_gemini(prompt: str, temperature: float = 0.3, max_tokens: int = 4000) -> str:
    """
    Gọi Gemini với JSON structured output để đảm bảo trả lời đúng format
    Có retry logic khi API bị quá tải (503)
    """
    model_name = "gemini-2.5-flash"   # hoặc "gemini-3-flash-preview"
    max_retries = 3
    base_wait_time = 2  # Bắt đầu chờ 2 giây

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={API_KEY}"

    headers = {"Content-Type": "application/json"}

    # JSON Schema để buộc Gemini trả về đúng 5 phần
    response_schema = {
        "type": "object",
        "properties": {
            "phan1": {"type": "string", "description": "Nhận xét tổng quan sức khỏe"},
            "phan2": {"type": "string", "description": "Các yếu tố nguy cơ chính"},
            "phan3": {"type": "string", "description": "Khuyến nghị chế độ ăn uống"},
            "phan4": {"type": "string", "description": "Khuyến nghị vận động thể chất"},
            "phan5": {"type": "string", "description": "Lời khuyên theo dõi và khi nào nên gặp bác sĩ"}
        },
        "required": ["phan1", "phan2", "phan3", "phan4", "phan5"]
    }

    data = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": temperature,
            "maxOutputTokens": max_tokens,
            "topP": 0.95,
            "response_mime_type": "application/json",
            "response_schema": response_schema
        }
    }

    for attempt in range(max_retries):
        try:
            response = requests.post(url, headers=headers, json=data, timeout=80)
            
            if response.status_code == 503:
                # API bị quá tải, thử lại sau
                if attempt < max_retries - 1:
                    wait_time = base_wait_time * (2 ** attempt)
                    print(f"⏳ API quá tải (503). Thử lại sau {wait_time}s... (lần {attempt + 1}/{max_retries})")
                    time.sleep(wait_time)
                    continue
                else:
                    return "❌ API Gemini hiện đang quá tải. Vui lòng thử lại sau vài phút."
            
            if response.status_code != 200:
                error_msg = response.text[:800] if response.text else "No details"
                return f"❌ Lỗi HTTP {response.status_code}: {error_msg}"

            result = response.json()

            if "candidates" not in result or not result["candidates"]:
                return "❌ Lỗi API: Không nhận được phản hồi từ Gemini."

            text = result["candidates"][0]["content"]["parts"][0]["text"]
            
            # Parse JSON và format thành markdown đẹp
            try:
                ai_json = json.loads(text)
                # Nếu API trả về key plan1/plan2 thay vì phan1..phan5, chuyển đổi
                if 'plan1' in ai_json and 'plan2' in ai_json:
                    ai_json = {
                        'phan1': ai_json.get('plan1', ''),
                        'phan2': ai_json.get('plan2', ''),
                        'phan3': ai_json.get('plan3', ''),
                        'phan4': ai_json.get('plan4', ''),
                        'phan5': ai_json.get('plan5', ''),
                    }
                formatted = f"""
**1. Nhận xét tổng quan sức khỏe**  
{ai_json.get('phan1', '')}

**2. Các yếu tố nguy cơ chính**  
{ai_json.get('phan2', '')}

**3. Khuyến nghị chế độ ăn uống**  
{ai_json.get('phan3', '')}

**4. Khuyến nghị vận động thể chất**  
{ai_json.get('phan4', '')}

**5. Lời khuyên theo dõi và khi nào nên gặp bác sĩ**  
{ai_json.get('phan5', '')}
"""
                return formatted.strip()
            except json.JSONDecodeError:
                # Fallback nếu nội dung là chuỗi chứa phan1/plan1 trực tiếp
                parsed_blocks = {}
                for key in ['phan1', 'phan2', 'phan3', 'phan4', 'phan5', 'plan1', 'plan2', 'plan3', 'plan4', 'plan5']:
                    if key in text:
                        # simple split by key label
                        parts = text.split(f'"{key}"') if f'"{key}"' in text else text.split(f"{key}:")
                        if len(parts) > 1:
                            remainder = parts[1]
                            val = remainder.split('"')[1] if '"' in remainder else remainder.split('\n')[0]
                            parsed_blocks[key] = val.strip()
                if parsed_blocks:
                    return "\n\n".join(
                        [f"**{i+1}. {title}**  \n{parsed_blocks.get(f'phan{i+1}', parsed_blocks.get(f'plan{i+1}', ''))}"
                         for i, title in enumerate([
                             'Nhận xét tổng quan sức khỏe',
                             'Các yếu tố nguy cơ chính',
                             'Khuyến nghị chế độ ăn uống',
                             'Khuyến nghị vận động thể chất',
                             'Lời khuyên theo dõi và khi nào nên gặp bác sĩ'
                         ])]
                    )
                return text
            except Exception:
                return text  # fallback nếu parse thất bại

        except requests.exceptions.Timeout:
            return "❌ Lỗi: Timeout khi gọi Gemini API."
        except Exception as e:
            return f"❌ Lỗi gọi Gemini: {str(e)}"
    
    return "❌ Lỗi: Không thể kết nối đến Gemini API sau nhiều lần thử."