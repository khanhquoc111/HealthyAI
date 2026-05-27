# Disease Plugin Schema — Đặc tả kỹ thuật v1.0

Tài liệu này định nghĩa cấu trúc chuẩn của một Disease Plugin dùng trong HealthyAI Framework.

---

## Cấu trúc thư mục một plugin

```
plugins/
└── diabetes/
    ├── metadata.json        ← BẮT BUỘC: mô tả toàn bộ plugin
    ├── model.pkl            ← TÙY CHỌN: ML model đã train (sklearn pipeline)
    ├── feature_cols.pkl     ← BẮT BUỘC nếu có model.pkl
    ├── threshold.pkl        ← BẮT BUỘC nếu có model.pkl
    └── custom_scorer.py     ← TÙY CHỌN: override rule-based scoring bằng Python
```

---

## Cấu trúc metadata.json

```json
{
  "id": "string",               // Unique key, lowercase, dùng làm dict key (vd: "diabetes")
  "version": "string",          // Phiên bản plugin (vd: "1.0.0")
  "name": "string",             // Tên đầy đủ hiển thị UI (vd: "Đái Tháo Đường Type 2")
  "short": "string",            // Tên ngắn (vd: "ĐTĐ")
  "description": "string",      // Mô tả ngắn về bệnh
  "icd10_code": "string",       // Mã ICD-10 tham khảo (vd: "E11")
  "max_score": "integer",       // Tổng điểm tối đa của rule-based scoring
  "fields": [...],              // Định nghĩa các trường input cần thiết
  "scoring_rules": [...],       // Luật tính điểm nguy cơ
  "risk_thresholds": {...},     // Ngưỡng phân loại mức nguy cơ
  "diet_keys": [...],           // Keys dùng để lọc gợi ý dinh dưỡng
  "guideline_tags": [...],      // Tags dùng để lọc RAG documents
  "advice_context": "string"    // Đoạn context bổ sung inject vào Gemini prompt
}
```

---

## Chi tiết từng phần

### `fields[]` — Định nghĩa trường input

Mỗi field là một object:

```json
{
  "key": "string",           // Tên biến, khớp với key trong user_data dict
  "label": "string",         // Tên hiển thị UI (tiếng Việt)
  "type": "number|boolean|select",
  "unit": "string|null",     // Đơn vị (vd: "mg/dL", "kg", null nếu boolean)
  "default": "any",          // Giá trị mặc định
  "min": "number|null",      // Chỉ dùng khi type = "number"
  "max": "number|null",      // Chỉ dùng khi type = "number"
  "step": "number|null",     // Bước nhảy input (vd: 0.1 cho hba1c)
  "options": [...],          // Chỉ dùng khi type = "select" — list các giá trị hợp lệ
  "shared": "boolean",       // true = field này dùng chung với nhiều plugin (vd: age, bmi)
  "required": "boolean",     // Bắt buộc nhập hay không
  "tooltip": "string|null"   // Gợi ý giải thích cho người dùng
}
```

**Các `shared` fields** (được HealthyAI tự động hợp nhất, không cần khai báo lại ở mỗi plugin):
`age`, `gender`, `height`, `weight`, `bmi` (auto-calculated), `smoke`, `exercise`, `alcohol`

---

### `scoring_rules[]` — Luật tính điểm

Mỗi rule là một object với `conditions[]` (AND logic) và `points`:

```json
{
  "rule_id": "string",        // ID duy nhất để debug (vd: "r_age_45")
  "description": "string",   // Lý do hiển thị khi rule này triggered
  "points": "integer",        // Điểm cộng thêm khi rule match
  "conditions": [             // Tất cả conditions phải đúng (AND)
    {
      "field": "string",      // Key của field trong user_data
      "op": "gte|lte|gt|lt|eq|neq|bool_true|bool_false",
      "value": "any"          // Giá trị so sánh (null nếu dùng bool_true/bool_false)
    }
  ]
}
```

**Các `op` được hỗ trợ:**

| Op | Ý nghĩa |
|---|---|
| `gte` | `field >= value` |
| `lte` | `field <= value` |
| `gt` | `field > value` |
| `lt` | `field < value` |
| `eq` | `field == value` |
| `neq` | `field != value` |
| `bool_true` | `field == True` |
| `bool_false` | `field == False` |

**Field đặc biệt** `"waist_threshold"`: framework tự resolve thành 102 (Nam) hoặc 88 (Nữ) dựa trên `gender`.

---

### `risk_thresholds` — Ngưỡng phân loại

```json
{
  "low":    { "max_percent": 33 },   // score/max_score * 100 <= 33% → Thấp
  "medium": { "max_percent": 66 },   // 34% - 66% → Trung bình
  "high":   { "max_percent": 100 }   // > 66% → Cao
}
```

---

### ML Model — Dùng chung ở cấp Framework

ML model **không thuộc về từng plugin**. Hệ thống sử dụng 1 model tổng duy nhất () được quản lý bởi , áp dụng cho tất cả plugin.

Plugin chỉ cần khai báo  (tùy chọn) để cho biết những fields nào của plugin được dùng làm input cho model tổng:

```json
"ml_feature_keys": ["fasting_glucose", "hba1c", "waist"]
```

Nếu bỏ trống, framework tự dùng toàn bộ shared fields làm input.

---

### `custom_scorer.py` — Override bằng Python (tùy chọn)

Khi cần logic phức tạp hơn JSON rules (vd: tính eGFR từ creatinine + tuổi + giới tính), tạo file `custom_scorer.py` trong thư mục plugin với hàm bắt buộc:

```python
def compute_score(user_data: dict) -> tuple[int, list[str]]:
    """
    Returns:
        score (int): Điểm nguy cơ tính được
        reasons (list[str]): Danh sách lý do
    """
    ...
```

Framework sẽ **ưu tiên** `custom_scorer.py` nếu tồn tại, bỏ qua `scoring_rules` trong JSON.

---

## Quy tắc validation

1. `id` phải unique trong toàn bộ `plugins/` folder
2. Tổng `points` tối đa của tất cả rules KHÔNG được vượt `max_score`
3. Mọi `field.key` dùng trong `scoring_rules` phải tồn tại trong `fields[]` hoặc là shared field
4. Nếu `ml_model.enabled: true`, 3 file `.pkl` phải tồn tại
5. `risk_thresholds.medium.max_percent` phải > `risk_thresholds.low.max_percent`
