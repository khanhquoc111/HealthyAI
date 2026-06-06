# LuanVanKTPM - Hệ Thống Đánh Giá Nguy Cơ Bệnh Mạn Tính Dựa Trên Hồ Sơ Sức Khỏe Cá Nhân

**Tác giả:** LuanVanKTPM  
**Ngày cập nhật:** 2026-06-05  
**Phiên bản:** 1.0  

---

## 1. TÓM TẮT TỔNG QUAN

### 1.1 Mục Tiêu Nghiên Cứu

Dự án nhằm xây dựng một **nền tảng hỗ trợ đánh giá nguy cơ bệnh mạn tính** dựa trên các yếu tố rủi ro cá nhân, kết hợp:

- **Luật chuyên gia (Rule-Based System)**: Áp dụng các quy tắc y tế được định nghĩa rõ ràng
- **Machine Learning**: Tận dụng dữ liệu lịch sử để dự đoán chính xác hơn khi có đủ dữ liệu
- **Hồ sơ sức khỏe cá nhân (Health Profile)**: Tái sử dụng dữ liệu giữa các bệnh khác nhau
- **Plugin-Based Architecture**: Cho phép thêm bệnh mới mà không cần sửa core system

### 1.2 Bài Toán Giải Quyết

**Vấn đề hiện tại trong y tế số:**

1. **Nhập dữ liệu lặp lại:** Người dùng phải cung cấp lại cùng các chỉ số sức khỏe cho mỗi bệnh cần đánh giá
2. **Hệ thống riêng biệt:** Mỗi bệnh thường có một hệ thống đánh giá độc lập, không tái sử dụng logic hoặc dữ liệu
3. **Mở rộng khó khăn:** Bổ sung bệnh mới đòi hỏi sửa đổi backend và frontend
4. **AI phụ thuộc dữ liệu:** Mô hình ML cần đủ dữ liệu để hoạt động hiệu quả, nhưng hệ thống thiếu cơ chế fallback

**Giải pháp đề xuất:**

- Xây dựng **hồ sơ sức khỏe trung tâm** làm nguồn dữ liệu chính
- Tách rời **logic đánh giá bệnh** khỏi mã nguồn thông qua **Plugin System**
- Sử dụng **Metadata-Driven Design** để sinh giao diện động
- Kết hợp **Rule Engine và ML Engine** để cân bằng giữa độ tin cậy và độ chính xác

---

## 2. KIẾN TRÚC HỆ THỐNG

### 2.1 Sơ Đồ Kiến Trúc Tổng Thể

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React/Vite)                        │
│  - Dynamic Form Generation từ Metadata                              │
│  - Health Profile Management                                         │
│  - Risk Assessment Display                                           │
│  - Real-time Field Validation                                        │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                  HTTP/CORS │ API Calls
                           │
┌──────────────────────────▼──────────────────────────────────────────┐
│                   BACKEND (FastAPI)                                  │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ API Layer (Plugin API, Auth, Health Profile)               │   │
│  └─────────────┬───────────────────────────────────────────────┘   │
│                │                                                    │
│  ┌─────────────▼───────────────────────────────────────────────┐   │
│  │ Plugin System                                               │   │
│  │  ├─ PluginLoader: Tải plugin từ metadata.json              │   │
│  │  ├─ ValidationEngine: Kiểm tra dữ liệu đầu vào             │   │
│  │  └─ RiskStratificationEngine: Tính toán nguy cơ            │   │
│  └─────────────┬───────────────────────────────────────────────┘   │
│                │                                                    │
│  ┌─────────────▼───────────────────────────────────────────────┐   │
│  │ Evaluation Engines                                          │   │
│  │  ├─ ConditionEvaluator: Đánh giá các điều kiện             │   │
│  │  ├─ RuleEngine: Tính toán điểm dựa trên quy tắc            │   │
│  │  ├─ MLEngine: Dự đoán bằng mô hình Machine Learning        │   │
│  │  └─ ExplanationEngine: Sinh giải thích chi tiết            │   │
│  └─────────────┬───────────────────────────────────────────────┘   │
│                │                                                    │
│  ┌─────────────▼───────────────────────────────────────────────┐   │
│  │ Data Layer                                                  │   │
│  │  ├─ Health Profile: Hồ sơ sức khỏe cá nhân                 │   │
│  │  ├─ User: Quản lý người dùng                               │   │
│  │  └─ Assessment History: Lịch sử đánh giá                   │   │
│  └─────────────┬───────────────────────────────────────────────┘   │
│                │                                                    │
└────────────────▼──────────────────────────────────────────────────┘
                 │
                 │ SQLAlchemy ORM
                 │
         ┌───────▼──────────┐
         │    Database      │
         │   (MySQL/SQLite) │
         └──────────────────┘

Plugins Directory:
├─ diabetes/
│  └─ metadata.json (Disease Info + Risk Config)
└─ hypertension/
   └─ metadata.json

ML Models:
├─ screening_best_model.pkl (Diabetes)
├─ hypertension_model.pkl
└─ feature_cols.pkl
```

### 2.2 Nguyên Lý Hoạt Động

#### 2.2.1 Luồng Đánh Giá Nguy Cơ

```
Người Dùng
    │
    ├─→ Đăng ký / Đăng nhập
    │
    ├─→ Xây dựng Hồ Sơ Sức Khỏe
    │   └─ Lưu dữ liệu vào CsSucKhoe table
    │
    ├─→ Chọn Bệnh Cần Đánh Giá
    │   └─ Plugin được tải động từ metadata.json
    │
    ├─→ Sinh Form Từ Metadata
    │   └─ Frontend render fields từ plugin metadata
    │
    ├─→ Nhập Dữ Liệu Đánh Giá
    │   └─ Frontend validation theo field config
    │
    ├─→ Hợp Nhất Dữ Liệu
    │   ├─ Health Profile từ DB
    │   ├─ Form Data mới nhập
    │   └─ Data thống nhất (unified_data)
    │
    ├─→ Risk Stratification Engine
    │   │
    │   ├─→ Rule Engine (Luôn chạy)
    │   │   ├─ Tính baseline_score từ baseline_mapping
    │   │   ├─ Áp dụng risk_modifiers
    │   │   ├─ Áp dụng protective_factors
    │   │   ├─ Áp dụng interactions
    │   │   └─ Stratify risk level từ thresholds
    │   │
    │   └─→ ML Engine (Chạy nếu đủ dữ liệu)
    │       ├─ Kiểm tra có đủ ml_required_features
    │       ├─ Nếu không: ai_status = "PARTIAL"
    │       ├─ Nếu có: predict_proba từ mô hình
    │       └─ Stratify risk level từ threshold
    │
    ├─→ Explanation Engine
    │   └─ Generate giải thích, khuyến nghị, điểm số
    │
    └─→ Trả Kết Quả
        ├─ Rule-based score & risk level
        ├─ AI-based score & status
        ├─ Explanation & recommendations
        └─ Lưu vào LichSuDanhGia table
```

#### 2.2.2 Quyết Định: Rule Engine vs ML Engine

| Khía Cạnh | Rule Engine | ML Engine |
|-----------|-------------|-----------|
| **Hoạt Động** | Luôn chạy | Chạy nếu đủ dữ liệu |
| **Dữ Liệu Cần** | Fields định nghĩa trong plugin | ml_required_features |
| **Độ Tin Cậy** | Cao (dựa quy tắc y tế) | Phụ thuộc dữ liệu training |
| **Giải Thích** | Dễ (dựa trên rules) | Khó (black box) |
| **Kết Quả** | Luôn có trong `rule_based` | Có trong `ai_based` hoặc "PARTIAL" |
| **Fallback** | N/A | Về Rule Engine nếu thiếu dữ liệu |

---

## 3. CÁC THÀNH PHẦN CHÍNH

### 3.1 Health Profile (Hồ Sơ Sức Khỏe Cá Nhân)

**Vai Trò:** Là nguồn dữ liệu trung tâm, tái sử dụng cho tất cả bệnh

**Các Nhóm Dữ Liệu:**

```
CsSucKhoe Table
├─ Sinh Tồn & Thể Chất
│  ├─ tuoi (Tuổi)
│  ├─ gioiTinh (Giới tính)
│  ├─ chieuCao (Chiều cao)
│  ├─ canNang (Cân nặng)
│  ├─ bmi (BMI)
│  ├─ vongEo (Vòng eo)
│  ├─ huyetApTamThu (Huyết áp tâm thu)
│  └─ huyetApTamTruong (Huyết áp tâm trương)
│
├─ Sinh Hóa Mở Rộng
│  ├─ duongHuyet (Đường huyết)
│  ├─ hba1c (HbA1c)
│  ├─ cholesterol (Cholesterol tổng)
│  ├─ ldl (LDL)
│  ├─ hdl (HDL)
│  ├─ triglyceride (Triglyceride)
│  ├─ creatinine (Creatinine)
│  └─ acidUric (Acid uric)
│
├─ Lối Sống
│  ├─ hutThuoc (Hút thuốc)
│  ├─ uongRuouBia (Uống rượu bia)
│  ├─ soPhutVanDongMoiTuan (Tập thể dục/tuần)
│  └─ mucDoAnMan (Mức độ ăn mặn)
│
├─ Tiền Sử Bệnh (Bản Thân)
│  ├─ caoHuyetAp
│  ├─ tieuDuong
│  ├─ benhTimMach
│  └─ gout
│
└─ Tiền Sử Bệnh (Gia Đình)
   ├─ giaDinhCaoHuyetAp
   ├─ giaDinhTieuDuong
   ├─ giaDinhTimMach
   └─ giaDinhGout
```

**Tái Sử Dụng Dữ Liệu:**

```
1. Lấy Health Profile từ DB
2. Lấy Form Data mới nhập
3. Hợp Nhất (Ưu tiên Form Data)
4. Truyền vào Risk Engine
→ Điểm cốt lõi: Người dùng nhập 1 lần, sử dụng N lần
```

### 3.2 Plugin System

**Cơ Chế Tải Plugin Động:**

```
plugins/diabetes/metadata.json chứa:
{
    "plugin_id": "diabetes",
    "disease_info": {...},
    "fields": [...],
    "risk_config": {...},
    "recommendations": [...],
    "explanation_templates": [...]
}
```

**Thêm Bệnh Mới:**

1. Tạo thư mục: `plugins/disease_name/`
2. Tạo file: `plugins/disease_name/metadata.json`
3. Định nghĩa: fields, risk_config, recommendations
4. Hệ thống tự động nhận diện

Không cần sửa code backend hoặc frontend!

### 3.3 Rule Engine

**Nguyên Lý Hoạt Động:**

```
1. Tính Baseline Score (từ baseline_mapping)
2. Áp Dụng Risk Modifiers
3. Áp Dụng Protective Factors
4. Áp Dụng Interactions
5. Stratify Risk Level (theo thresholds)
```

### 3.4 Machine Learning Engine

**Điều Kiện Kích Hoạt:**

```
ML chỉ chạy khi:
1. Có mô hình pickle
2. Có danh sách features
3. Có tất cả ml_required_features trong dữ liệu

Nếu thiếu: ai_status = "PARTIAL"
```

### 3.5 Explanation Engine

Explanation engine tự động:
- Phân tách yếu tố nguy cơ và yếu tố bảo vệ
- Sinh giải thích chuyên môn
- Tạo khuyến nghị hành động y tế
- Cung cấp scoring breakdown

---

## 4. CẤU TRÚC THƯ MỤC DỰ ÁN

```
LuanVanKTPM/
├─ backend/                          # Backend Python (FastAPI)
│  ├─ main.py                        # Entry point
│  ├─ app/                          # Core logic
│  │  ├─ plugin_api.py
│  │  ├─ plugin_loader.py
│  │  ├─ disease_schema.py
│  │  ├─ validation_engine.py
│  │  ├─ risk_stratification_engine.py
│  │  ├─ condition_evaluator.py
│  │  ├─ explanation_engine.py
│  │  └─ test_*.py
│  ├─ auth/                         # Authentication
│  ├─ function/                     # Business logic
│  ├─ database/                     # Database models
│  ├─ data/                         # Training data
│  ├─ ml/                           # Machine Learning
│  └─ plugins/                      # Disease plugins
│     ├─ diabetes/metadata.json
│     └─ hypertension/metadata.json
│
├─ frontend/                         # Frontend (React/Vite)
│  ├─ src/
│  │  ├─ App.jsx
│  │  ├─ TrangChu.jsx
│  │  ├─ dang_nhap.jsx
│  │  ├─ dang_ky.jsx
│  │  ├─ cs_suckhoe.jsx
│  │  ├─ MainRiskPage.jsx
│  │  └─ main.jsx
│  └─ public/
│
└─ root files
   ├─ README.md
   ├─ problem.txt
   └─ ghichu.txt
```

---

## 5. CÔNG NGHỆ SỬ DỤNG

| Công Nghệ | Phiên Bản | Mục Đích |
|-----------|-----------|---------|
| **FastAPI** | 0.0.4+ | Web framework |
| **Pydantic** | - | Data validation |
| **SQLAlchemy** | - | ORM |
| **React** | 18+ | Frontend |
| **Vite** | - | Build tool |
| **pandas** | - | Data processing |
| **scikit-learn** | - | Machine Learning |
| **MySQL/SQLite** | - | Database |

---

## 6. KHẢ NĂNG MỞ RỘNG

### 6.1 Bổ Sung Bệnh Mới

```bash
mkdir -p plugins/cancer_risk/
# Tạo metadata.json
# Hệ thống tự động nhận diện
```

### 6.2 Định Hướng Tương Lai

- Health Profile Enhancement: Lịch sử theo dõi, trend analysis
- ML Expansion: Thêm mô hình mới, Active Learning
- No-Code Disease Framework: UI builder cho admin
- Analytics Dashboard: Monitoring & performance metrics

---

## 7. TRẠNG THÁI HIỆN TẠI

**✅ Hoàn thiện:**
- Plugin System với hot-reload
- Rule-Based Risk Engine
- Health Profile Management
- Dynamic Form Generation
- Validation Engine
- Explanation Engine
- User Authentication
- 2 plugins: Diabetes, Hypertension

**🔄 Đang phát triển:**
- ML model optimization
- Data imputation

**❌ Tương lai:**
- No-Code Plugin Builder
- Analytics Dashboard
- IoT Integration

---

## 8. HƯỚNG DẪN PHÁT TRIỂN

### Setup Environment

```bash
# Backend
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload

# Frontend
cd frontend
npm install
npm run dev
```

### Thêm Plugin Mới

```bash
# 1. Tạo plugins/my_disease/metadata.json
# 2. Định nghĩa fields, risk_config, recommendations
# 3. Server reload tự động
```

### API Documentation

```
http://127.0.0.1:8000/docs
```

---

**Dự án:** LuanVanKTPM - Hệ Thống Đánh Giá Nguy Cơ Bệnh Mạn Tính  
**Lĩnh vực:** Y tế số, Sàng lọc bệnh, Rule-Based + Machine Learning  
**Kiến trúc:** Plugin-Based, Metadata-Driven, No-Code Framework
