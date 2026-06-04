# LuanVanKTPM: Hệ Thống Sàng Lọc Nguy Cơ Bệnh Mãn Tính

## 1. Tổng Quan

**LuanVanKTPM** là hệ thống tích hợp trí tuệ nhân tạo (AI) và quy tắc dựa trên cấu hình (Rule-based system) để sàng lọc và đánh giá nguy cơ mắc bệnh mãn tính. Hệ thống tuân theo kiến trúc **no-code**, cho phép thêm mới bệnh chỉ thông qua cấu hình metadata mà không cần chỉnh sửa mã nguồn.

## 2. Vấn Đề Cốt Lõi

Hệ thống phải giải quyết **bài toán mismatch dữ liệu**:
- **Mô hình AI**: Yêu cầu 18 chỉ số đầu vào cố định
- **Dữ liệu bệnh từ JSON**: Không đầy đủ, biến đổi theo từng bệnh

**Giải pháp**: Xây dựng lớp dữ liệu trung gian **Personal Health Index** để:
- Chứa các chỉ số cố định của người dùng từ hồ sơ sức khỏe
- Bổ sung dữ liệu thiếu từ cấu hình bệnh
- Đảm bảo AI luôn có đủ 18 features để hoạt động
- Giữ nguyên tính linh hoạt của logic quy tắc

## 3. Kiến Trúc Hệ Thống

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                          │
│  - Đăng ký / Đăng nhập                                       │
│  - Dynamic Form từ JSON                                      │
│  - Giao diện đánh giá nguy cơ                                │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                  Backend (FastAPI)                           │
├──────────────────────────────────────────────────────────────┤
│  Plugin System (No-Code)                                     │
│  ├─ Load bệnh từ metadata.json                              │
│  └─ Disease schema validation                               │
│                                                              │
│  Core Processing Pipeline                                   │
│  ├─ Validation Engine: Kiểm tra dữ liệu đầu vào            │
│  ├─ Personal Health Index: Bổ sung dữ liệu                 │
│  ├─ AI Engine: Dự đoán dựa trên 18 features               │
│  ├─ Rule Engine: Đánh giá từ logic JSON                     │
│  ├─ Scoring & Stratification: Xếp hạng nguy cơ            │
│  ├─ Explanation Engine: Giải thích kết quả                 │
│  └─ Recommendation System: Gợi ý hành động                 │
│                                                              │
│  Database (MySQL)                                           │
│  ├─ User profiles & Health records                          │
│  └─ Disease configurations                                  │
└──────────────────────────────────────────────────────────────┘
```

## 4. Stack Công Nghệ

### Backend
- **Framework**: FastAPI (Python)
- **Database**: MySQL
- **Machine Learning**: Scikit-learn / TensorFlow
- **Validation**: Pydantic

### Frontend
- **Framework**: React + Vite
- **Styling**: CSS
- **State Management**: Động từ JSON schema

### Core Engines
- **Validation Engine** (`validation_engine.py`): Kiểm tra tính hợp lệ dữ liệu
- **Condition Evaluator** (`condition_evaluator.py`): Đánh giá điều kiện từ rule
- **Risk Stratification Engine** (`risk_stratification_engine.py`): Xếp hạng mức độ nguy cơ
- **Explanation Engine** (`explanation_engine.py`): Tạo giải thích cho kết quả
- **Schema Validator** (`schema_validator.py`): Xác thực schema bệnh
- **Plugin Loader** (`plugin_loader.py`): Tải plugin bệnh động

## 5. Luồng Xử Lý Dữ Liệu

```
User Input (Form từ Frontend)
    ↓
[Validation Engine] → Kiểm tra dữ liệu hợp lệ
    ↓
[Personal Health Index] → Merge với dữ liệu cố định người dùng
    ↓
[Feature Engineering] → Tạo 18 features cho AI + rule features
    ↓
    ├─→ [AI Engine] → Prediction (xác suất nguy cơ từ model)
    │
    └─→ [Rule Engine] → Evaluation (điểm từ logic bác sĩ)
    ↓
[Scoring & Stratification] → Xếp hạng: Thấp/Trung bình/Cao/Rất cao
    ↓
[Explanation Engine] → Tạo giải thích chi tiết
    ↓
[Recommendation System] → Gợi ý hành động y tế
    ↓
Output: { ai_prediction, rule_score, final_risk_level, explanation, recommendations }
```

## 6. Personal Health Index

**Định nghĩa**: Lớp dữ liệu trung gian lưu trữ các chỉ số sức khỏe cố định của cá nhân, được sử dụng để bổ sung dữ liệu không đủ từ cấu hình bệnh.

**Thành phần**:
- Thông tin nhân khẩu học (tuổi, giới tính, BMI)
- Tiền sử bệnh
- Lịch sử gia đình
- Các chỉ số sức khỏe định kỳ (huyết áp, đường huyết, cholesterol, v.v.)
- Thói quen sống (hút thuốc, uống rượu, hoạt động thể chất)

**Lợi ích**:
- Đảm bảo AI có đủ dữ liệu để dự đoán
- Giảm phụ thuộc vào dữ liệu JSON không hoàn chỉnh
- Cho phép so sánh và xác thực kết quả AI với rule

## 7. Tính Năng No-Code

Thêm bệnh mới chỉ bằng cách:

1. Tạo thư mục bệnh mới trong `backend/plugins/{disease_name}/`
2. Định nghĩa `metadata.json`:
   ```json
   {
     "name": "Tên bệnh",
     "description": "Mô tả",
     "rules": [
       {
         "condition": "bmi > 30 AND blood_pressure_systolic > 140",
         "score": 0.8,
         "message": "Nguy cơ cao"
       }
     ],
     "required_fields": ["bmi", "blood_pressure_systolic"],
     "ai_enabled": true
   }
   ```
3. Plugin system tự động load và cấu hình bệnh

## 8. Output Hệ Thống

Kết quả đánh giá cho mỗi bệnh:

```json
{
  "disease": "Tiểu đường",
  "ai_prediction": {
    "probability": 0.75,
    "confidence": 0.92
  },
  "rule_evaluation": {
    "score": 0.8,
    "matching_rules": [...]
  },
  "risk_level": "Cao",
  "explanation": "...",
  "recommendations": [...]
}
```

## 9. Mục Tiêu Hệ Thống

✓ Thêm bệnh mới **không cần chỉnh sửa code**  
✓ Đảm bảo AI **luôn có đủ dữ liệu** hoạt động  
✓ Tăng **độ tin cậy** bằng cách so sánh AI và rule  
✓ Hỗ trợ **quy trình sàng lọc** hiệu quả  
✓ Cung cấp **giải thích rõ ràng** cho bác sĩ và bệnh nhân  

## 10. Cấu Trúc Thư Mục

```
LuanVanKTPM/
├── backend/
│   ├── main.py                 # Entry point
│   ├── app/
│   │   ├── condition_evaluator.py
│   │   ├── disease_schema.py
│   │   ├── explanation_engine.py
│   │   ├── plugin_api.py
│   │   ├── plugin_loader.py
│   │   ├── risk_stratification_engine.py
│   │   ├── schema_validator.py
│   │   └── validation_engine.py
│   ├── auth/                   # Authentication
│   ├── database/               # Database models
│   ├── data/                   # Training datasets
│   ├── ml/                     # AI models
│   └── plugins/                # Disease plugins
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── dang_ky.jsx        # Registration
│   │   ├── dang_nhap.jsx      # Login
│   │   ├── MainRiskPage.jsx   # Main assessment
│   │   └── main.jsx
│   └── public/
└── README.md
```

---

**Tác giả**: KPTM Research Team  
**Phiên bản**: 1.0  
**Cập nhật**: 2026
