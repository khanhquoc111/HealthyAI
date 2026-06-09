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

**Các Nhóm Dữ Liệu (CsSucKhoe table):**

```
CsSucKhoe & HSucKhoe Tables
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
1. Lấy Health Profile từ DB (CsSucKhoe)
2. Lấy Form Data mới nhập từ user
3. Hợp Nhất (Ưu tiên Form Data)
4. Truyền vào Risk Engine
→ Điểm cốt lõi: Người dùng nhập 1 lần, sử dụng N lần
```

**Cơ Sở Dữ Liệu Liên Quan:**

- **CsSucKhoe**: Health profile chính
- **HSucKhoe**: Chi tiết sức khỏe
- **DuLieuDanhGiaBenH**: Dữ liệu đánh giá bệnh cụ thể
- **LichSuDanhGia**: Lịch sử tất cả các lần đánh giá
- **NguoiDung**: Quản lý người dùng

### 3.2 Plugin System

**Vai Trò:** Cho phép thêm bệnh mới mà không cần sửa code backend

**Cơ Chế Tải Plugin Động:**

Hệ thống hỗ trợ các bệnh sau thông qua plugin architecture:

```
Plugins Hiện Có:
├─ plugins/diabetes/metadata.json
├─ plugins/hypertension/metadata.json
├─ plugins/cardiovascular/metadata.json
├─ plugins/kidney/metadata.json
└─ plugins/stroke/metadata.json
```

Mỗi plugin chứa metadata.json với định nghĩa:

```json
{
    "plugin_id": "disease_name",
    "disease_info": {
        "name": "Tên bệnh",
        "description": "Mô tả"
    },
    "fields": [...],           # Input fields
    "risk_config": {...},       # Baseline scores, risk modifiers
    "recommendations": [...],   # Khuyến nghị
    "explanation_templates": [] # Template giải thích
}
```

**Thêm Bệnh Mới (Không Cần Sửa Code):**

```bash
# 1. Tạo thư mục plugin
mkdir plugins/disease_name/

# 2. Tạo & định nghĩa metadata.json
# Bao gồm: fields, risk_config, recommendations

# 3. Hệ thống tự động nhận diện
# - Server tự reload
# - Frontend tự generate form
# - API tự tạo endpoint
```

### 3.3 Rule Engine

**Nguyên Lý Hoạt Động:**

Rule Engine chạy trên tất cả các request để tính điểm rủi ro dựa trên quy tắc y tế:

```
1. Tính Baseline Score (từ baseline_mapping)
   └─ Áp dụng điểm cơ sở cho mỗi nhóm tuổi
   
2. Áp Dụng Risk Modifiers
   └─ Tăng điểm cho các yếu tố rủi ro (chỉ số cao)
   
3. Áp Dụng Protective Factors
   └─ Giảm điểm cho các yếu tố bảo vệ (chỉ số bình thường)
   
4. Áp Dụng Interactions
   └─ Xử lý các tương tác giữa các yếu tố
   
5. Stratify Risk Level
   └─ Phân loại nguy cơ (Low/Medium/High/Very High) theo threshold
```

**Ưu Điểm:**
- ✅ Luôn chạy được (không cần dữ liệu huấn luyện)
- ✅ Dễ giải thích (dựa trên quy tắc y tế rõ ràng)
- ✅ Nhanh và độ tin cậy cao

### 3.4 Machine Learning Engine

**Mô Hình Có Sẵn:**

Dự án đã đào tạo và lưu trữ 4 bộ mô hình ML:

```
backend/ml/models/
├─ Diabetes Risk Prediction
│  ├─ diabetes_model.pkl
│  ├─ diabetes_feature_cols.pkl
│  └─ diabetes_threshold.pkl
│
├─ Hypertension Risk Prediction
│  ├─ hypertension_model.pkl
│  ├─ hypertension_feature_cols.pkl
│  └─ hypertension_threshold.pkl
│
├─ Cardiovascular Risk Prediction
│  ├─ cardiovascular_model.pkl
│  ├─ cardiovascular_feature_cols.pkl
│  └─ cardiovascular_threshold.pkl
│
├─ Kidney Disease Risk Prediction
│  ├─ kidney_model.pkl
│  ├─ kidney_feature_cols.pkl
│  └─ kidney_threshold.pkl
│
└─ Utility Models
   ├─ screening_best_model.pkl
   ├─ screening_best_threshold.pkl
   ├─ feature_cols.pkl
   └─ experiment_results.csv
```

**Điều Kiện Kích Hoạt:**

```
ML chỉ chạy khi:
1. Có mô hình pickle cho disease tương ứng
2. Có danh sách features (feature_cols.pkl)
3. Có tất cả ml_required_features trong dữ liệu

Nếu thiếu: ai_status = "PARTIAL"
```

**Đào Tạo Mô Hình:**

```bash
# Mỗi disease có script training tương ứng
python backend/ml/train_diabetes_final.py
python backend/ml/train_hypertension_final.py
python backend/ml/train_cardiovascular_final.py
python backend/ml/train_kidney_final.py
```

### 3.5 Explanation Engine

**Chức Năng:**

Explanation engine tự động sinh ra lời giải thích chi tiết về kết quả đánh giá:

```
Sinh Ra:
├─ Risk Breakdown
│  ├─ Phân tách yếu tố nguy cơ (Risk Factors)
│  ├─ Phân tách yếu tố bảo vệ (Protective Factors)
│  └─ Phân tách tương tác giữa các yếu tố
│
├─ Scoring Details
│  ├─ Baseline score
│  ├─ Modifiers applied
│  ├─ Final rule-based score
│  └─ AI prediction (nếu có)
│
├─ Clinical Explanations
│  └─ Lý giải từng yếu tố bằng thuật ngữ y tế
│
└─ Recommendations
   ├─ Khuyến nghị hành động ngay
   ├─ Khuyến nghị theo dõi
   └─ Khuyến nghị tái đánh giá
```

**Sử Dụng:**

- Giải thích cho người dùng tại sao có nguy cơ cao/thấp
- Cung cấp proof cho bác sĩ để hỗ trợ quyết định lâm sàng
- Định hướng hành động phòng ngừa cụ thể

---

## 4. CẤU TRÚC THƯ MỤC DỰ ÁN

```
LuanVanKTPM/
├─ .git/                            # Git repository
├─ .gitignore                       # Git ignore rules
├─ content.sql                      # SQL schema dump
├─ healthyai.db                     # SQLite database
├─ healthyai.db-shm                # SQLite shared memory
├─ healthyai.db-wal                # SQLite write-ahead log
├─ api_server_8001.out.log         # Server output log
├─ api_server_8001.err.log         # Server error log
├─ source_dump.txt                 # Data dump
├─ ghichu.txt                       # Project notes
├─ requirements.txt                 # Root dependencies (if any)
├─ README.md                        # Main documentation
│
├─ backend/                         # Backend Python (FastAPI)
│  ├─ main.py                       # Entry point
│  ├─ requirements.txt              # Backend dependencies
│  ├─ test_db.py                    # Database test script
│  ├─ venv/                         # Virtual environment
│  │
│  ├─ app/                          # Core logic
│  │  ├─ plugin_api.py
│  │  ├─ plugin_loader.py
│  │  ├─ disease_schema.py
│  │  ├─ validation_engine.py
│  │  ├─ risk_stratification_engine.py
│  │  ├─ condition_evaluator.py
│  │  ├─ explanation_engine.py
│  │  ├─ schema_validator.py
│  │  ├─ test_api_acceptance.py
│  │  ├─ test_plugin_compatibility.py
│  │  ├─ test_schema.py
│  │  └─ __pycache__/
│  │
│  ├─ auth/                         # Authentication
│  │  ├─ dang_ky.py                 # Registration
│  │  ├─ dang_nhap.py               # Login
│  │  └─ __pycache__/
│  │
│  ├─ database/                     # Database models & operations
│  │  ├─ database.py                # Database connection config
│  │  ├─ cs_suckhoe.py              # Health record model
│  │  ├─ hs_suckhoe.py              # Health data model
│  │  ├─ du_lieu_danh_gia_benh.py   # Assessment data model
│  │  ├─ lich_su_danh_gia.py        # Assessment history model
│  │  ├─ nguoi_dung.py              # User model
│  │  └─ __pycache__/
│  │
│  ├─ function/                     # Business logic
│  │  ├─ cn_hs_suckhoe.py           # Health profile functions
│  │  └─ __pycache__/
│  │
│  ├─ data/                         # Training datasets
│  │  ├─ cardio_final.csv           # Cardiovascular data
│  │  ├─ diabetes_final.csv         # Diabetes data
│  │  ├─ hypertension_final.csv     # Hypertension data
│  │  ├─ ckd_final.csv              # Kidney disease data
│  │  ├─ demographic.csv            # Demographics
│  │  ├─ examination.csv            # Examination results
│  │  ├─ labs.csv                   # Lab results
│  │  ├─ medications.csv            # Medications
│  │  ├─ diet.csv                   # Diet info
│  │  ├─ questionnaire.csv          # Questionnaire responses
│  │  └─ __pycache__/
│  │
│  ├─ ml/                           # Machine Learning
│  │  ├─ train_cardiovascular_final.py    # Cardiovascular model training
│  │  ├─ train_diabetes_final.py          # Diabetes model training
│  │  ├─ train_hypertension_final.py      # Hypertension model training
│  │  ├─ train_kidney_final.py            # Kidney disease model training
│  │  ├─ __pycache__/
│  │  │
│  │  └─ models/                    # Pre-trained ML models
│  │     ├─ diabetes_model.pkl
│  │     ├─ diabetes_feature_cols.pkl
│  │     ├─ diabetes_threshold.pkl
│  │     ├─ hypertension_model.pkl
│  │     ├─ hypertension_feature_cols.pkl
│  │     ├─ hypertension_threshold.pkl
│  │     ├─ cardiovascular_model.pkl
│  │     ├─ cardiovascular_feature_cols.pkl
│  │     ├─ cardiovascular_threshold.pkl
│  │     ├─ kidney_model.pkl
│  │     ├─ kidney_feature_cols.pkl
│  │     ├─ kidney_threshold.pkl
│  │     ├─ screening_best_model.pkl
│  │     ├─ screening_best_threshold.pkl
│  │     ├─ feature_cols.pkl
│  │     └─ experiment_results.csv
│  │
│  └─ plugins/                      # Disease plugins (metadata-driven)
│     ├─ diabetes/
│     │  └─ metadata.json
│     ├─ hypertension/
│     │  └─ metadata.json
│     ├─ cardiovascular/
│     │  └─ metadata.json
│     ├─ kidney/
│     │  └─ metadata.json
│     └─ stroke/
│        └─ metadata.json
│
└─ frontend/                        # Frontend (React/Vite)
   ├─ mobile/                       # Mobile app (placeholder)
   │
   └─ web/                          # Web frontend
      ├─ .gitignore
      ├─ package.json
      ├─ package-lock.json
      ├─ vite.config.js             # Vite configuration
      ├─ eslint.config.js           # ESLint configuration
      ├─ index.html                 # Main HTML
      ├─ README.md                  # Frontend specific docs
      ├─ node_modules/
      │
      ├─ public/                    # Static assets
      │  ├─ favicon.svg
      │  └─ icons.svg
      │
      └─ src/                       # React components & pages
         ├─ main.jsx                # React entry point
         ├─ App.jsx                 # Main app component
         ├─ App.css                 # Global styles
         ├─ index.css               # Base styles
         │
         ├─ pages/                  # Page components
         │  ├─ trang-chu.jsx        # Home page
         │  ├─ dang-nhap.jsx        # Login page
         │  ├─ dang-ky.jsx          # Registration page
         │  ├─ hs-suckhoe.jsx       # Health profile page
         │  └─ phan-tich-benh.jsx   # Disease analysis page
         │
         ├─ components/             # Reusable components
         │  ├─ header.jsx
         │  ├─ header.css
         │  ├─ footer.jsx
         │  └─ footer.css
         │
         ├─ assets/                 # Images & static content
         │  ├─ react.svg
         │  ├─ vite.svg
         │  ├─ hero.png
         │  └─ icons.svg
         │
         └─ css/                    # Additional stylesheets
```

## 5. DỮ LIỆU & DATASETS

### 5.1 Datasets Huấn Luyện

Dự án sử dụng 10 datasets CSV để xây dựng mô hình ML:

```
backend/data/
├─ Thông Tin Bệnh Chính
│  ├─ diabetes_final.csv         # Dữ liệu tiểu đường (target)
│  ├─ hypertension_final.csv     # Dữ liệu cao huyết áp (target)
│  ├─ cardio_final.csv           # Dữ liệu tim mạch (target)
│  └─ ckd_final.csv              # Dữ liệu bệnh thận (target)
│
└─ Thông Tin Bổ Trợ
   ├─ demographic.csv             # Dữ liệu nhân khẩu học
   ├─ examination.csv             # Kết quả khám lâm sàng
   ├─ labs.csv                    # Kết quả xét nghiệm
   ├─ medications.csv             # Thông tin dùng thuốc
   ├─ diet.csv                    # Thông tin chế độ ăn
   └─ questionnaire.csv           # Kết quả khảo sát
```

### 5.2 Database

```
healthyai.db - SQLite Database
├─ CsSucKhoe           # Hồ sơ sức khỏe (Health Profile)
├─ HSucKhoe           # Chi tiết sức khỏe
├─ DuLieuDanhGiaBenH  # Dữ liệu đánh giá bệnh
├─ LichSuDanhGia      # Lịch sử đánh giá
└─ NguoiDung          # Quản lý người dùng

WAL & SHM files: Cho phép concurrent access
```

---

## 6. CÔNG NGHỆ SỬ DỤNG

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

## 7. KHẢ NĂNG MỞ RỘNG

### 7.1 Bổ Sung Bệnh Mới

Thêm một bệnh mới không cần sửa code backend hay frontend:

```bash
# 1. Tạo cấu trúc plugin
mkdir -p plugins/gout/

# 2. Tạo metadata.json với định nghĩa:
cat > plugins/gout/metadata.json << 'EOF'
{
    "plugin_id": "gout",
    "disease_info": {
        "name": "Bệnh Gout",
        "description": "Đánh giá nguy cơ bệnh Gout"
    },
    "fields": [
        {"name": "baseline_uric_acid", "label": "Acid uric cơ sở", ...},
        ...
    ],
    "risk_config": {
        "baseline_mapping": {...},
        "risk_modifiers": [...],
        ...
    },
    "recommendations": [...],
    "explanation_templates": [...]
}
EOF

# 3. Server tự động nhận diện
# 4. Frontend tự sinh form
# 5. API sẵn sàng hoạt động
```

**Yêu Cầu Tối Thiểu:**
- ✅ Plugin directory & metadata.json
- ✅ Định nghĩa fields và risk_config
- ✅ Không cần code backend
- ✅ Không cần code frontend

### 7.2 Mở Rộng ML Models

```bash
# Thêm mô hình mới cho bệnh mới
python backend/ml/train_gout_final.py

# Model sẽ được lưu:
# - backend/ml/models/gout_model.pkl
# - backend/ml/models/gout_feature_cols.pkl
# - backend/ml/models/gout_threshold.pkl
```

### 7.3 Định Hướng Tương Lai

- **Health Profile Enhancement**: Lịch sử theo dõi, trend analysis
- **ML Expansion**: Thêm mô hình mới, Active Learning, Transfer Learning
- **No-Code Disease Framework**: UI builder cho admin thêm disease
- **Analytics Dashboard**: Monitoring, statistics, và performance metrics
- **Mobile App**: React Native extension từ web foundation
- **IoT Integration**: Đấu nối với thiết bị y tế (máy đo huyết áp, glucose meter)

---

## 8. TRẠNG THÁI HIỆN TẠI

**✅ Hoàn thiện:**
- Plugin System với hot-reload
- Rule-Based Risk Engine
- Health Profile Management
- Dynamic Form Generation
- Validation Engine
- Explanation Engine
- User Authentication
- 5 plugins: Diabetes, Hypertension, Cardiovascular, Kidney Disease, Stroke
- ML Models cho 4 bệnh (Diabetes, Hypertension, Cardiovascular, Kidney)

**🔄 Đang phát triển:**
- ML model optimization
- Data imputation
- Frontend UI improvements

**❌ Tương lai:**
- No-Code Plugin Builder
- Analytics Dashboard
- IoT Integration
- Real-time monitoring

---

## 9. HƯỚNG DẪN PHÁT TRIỂN

### 9.1 Setup Environment

**Backend Setup:**

```bash
# 1. Tạo virtual environment
cd backend
python -m venv venv

# 2. Kích hoạt environment
venv\Scripts\activate              # Windows
# or: source venv/bin/activate     # Linux/Mac

# 3. Cài dependencies
pip install -r requirements.txt

# 4. Khởi động server
uvicorn main:app --reload
# API sẽ chạy tại: http://127.0.0.1:8000
```

**Frontend Setup:**

```bash
# 1. Di chuyển đến frontend web
cd frontend/web

# 2. Cài dependencies
npm install

# 3. Khởi động dev server
npm run dev
# Frontend sẽ chạy tại: http://localhost:5173 (hoặc port khác)
```

### 9.2 Thêm Plugin Bệnh Mới

```bash
# 1. Tạo thư mục plugin
mkdir -p plugins/disease_name/

# 2. Tạo file metadata.json
# Xem ví dụ: plugins/diabetes/metadata.json

# 3. Định nghĩa:
#    - disease_info: Thông tin bệnh
#    - fields: Input fields cho form
#    - risk_config: Baseline scores, risk modifiers, etc.
#    - recommendations: Khuyến nghị hành động
#    - explanation_templates: Template giải thích

# 4. Server sẽ tự động nhận diện khi restart
```

### 9.3 Huấn Luyện Mô Hình ML Mới

```bash
# Các script training có sẵn:
cd backend/ml

python train_diabetes_final.py         # Diabetes model
python train_hypertension_final.py     # Hypertension model
python train_cardiovascular_final.py   # Cardiovascular model
python train_kidney_final.py           # Kidney disease model

# Models sẽ được lưu tại: backend/ml/models/
```

### 9.4 API Documentation

```
http://127.0.0.1:8000/docs
```

FastAPI tự động sinh Swagger UI để test API.

### 9.5 Database Test

```bash
cd backend
python test_db.py
```

Kiểm tra kết nối database và các bảng.

---

**Dự án:** LuanVanKTPM - Hệ Thống Đánh Giá Nguy Cơ Bệnh Mạn Tính  
**Lĩnh vực:** Y tế số, Sàng lọc bệnh, Rule-Based + Machine Learning  
**Kiến trúc:** Plugin-Based, Metadata-Driven, No-Code Framework