// frontend/src/bs-ql-csyk.jsx
import React, { useState, useEffect } from "react";
import "./css/bs-ql-csyk.css";
import axios from "axios";

// Hàm loại bỏ dấu tiếng Việt và chuyển thành camelCase
const generateSystemCode = (str) => {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Loại bỏ dấu
    .replace(/đ/g, "d").replace(/Đ/g, "D") // Xử lý chữ Đ/đ
    .replace(/[^a-zA-Z0-9\s]/g, "") // Xóa ký tự đặc biệt, chỉ giữ chữ, số và khoảng trắng
    .trim()
    .split(/\s+/) // Cắt theo khoảng trắng
    .map((word, index) => {
      if (index === 0) return word.toLowerCase(); // Chữ đầu tiên viết thường toàn bộ
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(); // Các chữ sau viết hoa chữ cái đầu
    })
    .join("");
};

// Cấu trúc lưu trữ ban đầu
const INITIAL_FORM_STATE = {
  id: "",
  name: "",
  category: "",
  summary: "",
  description: "",
  importance: "",
  unit: "",
  indicator_type: "direct",
  required_inputs: [], // Array of { code: "", name: "" }
  formula: "",
  normal_ranges: [{ code: "", name: "", min: "", max: "" }],
  recommendations: [""], 
  related_diseases: [], // Array of { code: "", name: "" }
  images: [""],
  source: "",
  usable_for_assessment: true,
  is_active: true,
};

export default function BSChiSoYKhoa() {
  const [viewMode, setViewMode] = useState("them-chi-so");
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  
  const [articlesList, setArticlesList] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // --- QUẢN LÝ DANH SÁCH (READ & DELETE) ---
  const fetchArticles = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get("http://127.0.0.1:8000/knowledge/");
      setArticlesList(response.data.articles || []);
    } catch (error) {
      console.error("Lỗi tải danh sách:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === "danh-sach") {
      fetchArticles();
    }
  }, [viewMode]);

  const handleDelete = async (id) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa chỉ số có ID: ${id}? Thao tác này không thể hoàn tác.`)) return;
    
    try {
      await axios.delete(`http://127.0.0.1:8000/knowledge/${id}`);
      alert("Đã xóa thành công!");
      fetchArticles(); 
    } catch (error) {
      console.error("Lỗi khi xóa:", error);
      alert("Xóa thất bại. Vui lòng kiểm tra kết nối Backend.");
    }
  };

  const handleEditSetup = async (id) => {
    try {
      const response = await axios.get(`http://127.0.0.1:8000/knowledge/${id}`);
      setFormData(response.data);
      setIsEditing(true);
      setViewMode("them-chi-so");
    } catch (error) {
      console.error("Lỗi tải dữ liệu chi tiết:", error);
      alert("Không thể tải dữ liệu để chỉnh sửa.");
    }
  };

  const resetForm = () => {
    setFormData(INITIAL_FORM_STATE);
    setIsEditing(false);
    setViewMode("them-chi-so");
  };

  // --- CÁC HÀM XỬ LÝ SỰ KIỆN NHẬP LIỆU ---
  
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => {
      const updatedData = {
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      };

      // Tự động sinh Mã định danh (ID) từ Tên chỉ số nếu đang tạo mới
      if (name === "name" && !isEditing) {
        updatedData.id = generateSystemCode(value);
      }

      return updatedData;
    });
  };

  const handleArrayStringChange = (field, index, value) => {
    const newArray = [...formData[field]];
    newArray[index] = value;
    setFormData((prev) => ({ ...prev, [field]: newArray }));
  };

  const addArrayStringItem = (field) => {
    setFormData((prev) => ({ ...prev, [field]: [...prev[field], ""] }));
  };

  const handleArrayObjectChange = (field, index, key, value) => {
    const newArray = [...formData[field]];
    newArray[index] = { ...newArray[index], [key]: value };

    // Tự động sinh 'code' nếu bác sĩ đang gõ 'name'
    if (key === "name") {
      newArray[index].code = generateSystemCode(value);
    }

    setFormData((prev) => ({ ...prev, [field]: newArray }));
  };

  const addArrayObjectItem = (field) => {
    setFormData((prev) => ({ ...prev, [field]: [...prev[field], { code: "", name: "" }] }));
  };

  const removeArrayItem = (field, index) => {
    const newArray = formData[field].filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, [field]: newArray }));
  };

  const handleRangeChange = (index, key, value) => {
    const newRanges = [...formData.normal_ranges];
    newRanges[index][key] = value;

    // Tự động sinh 'code' nếu bác sĩ đang gõ 'name'
    if (key === "name") {
      newRanges[index].code = generateSystemCode(value);
    }

    setFormData((prev) => ({ ...prev, normal_ranges: newRanges }));
  };

  const addRangeItem = () => {
    setFormData((prev) => ({
      ...prev,
      normal_ranges: [...prev.normal_ranges, { code: "", name: "", min: "", max: "" }],
    }));
  };

  const removeRangeItem = (index) => {
    const newRanges = formData.normal_ranges.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, normal_ranges: newRanges }));
  };

  const handleSaveToServer = async () => {
    const cleanData = {
      ...formData,
      required_inputs: formData.required_inputs.filter(item => item.code?.trim() !== "" && item.name?.trim() !== ""),
      related_diseases: formData.related_diseases.filter(item => item.code?.trim() !== "" && item.name?.trim() !== ""),
      recommendations: formData.recommendations.filter(item => item.trim() !== ""),
      images: formData.images.filter(item => item.trim() !== ""),
    };

    cleanData.normal_ranges = formData.normal_ranges
      .filter((item) => item.name.trim() !== "")
      .map((range) => ({
        code: range.code?.trim() || generateSystemCode(range.name),
        name: range.name,
        min: range.min !== "" ? parseFloat(range.min) : null,
        max: range.max !== "" ? parseFloat(range.max) : null,
      }));

    if (!cleanData.id) {
      alert("Lỗi: Mã định danh (ID) không được để trống!");
      return;
    }

    try {
      await axios.post("http://127.0.0.1:8000/knowledge/", cleanData);
      alert(isEditing ? `Đã cập nhật thành công chỉ số: ${cleanData.id}` : `Đã lưu thành công file: ${cleanData.id}.json vào hệ thống!`);
      setIsEditing(true); 
    } catch (error) {
      console.error("Lỗi khi lưu API:", error);
      alert("Lỗi khi kết nối đến máy chủ. Hãy đảm bảo Backend đang chạy.");
    }
  };

  return (
    <div className="tq-dashboard">
      <header className="tq-header">
        <h1>
          <i className="fa-solid fa-vial-virus"></i> Quản lý Sổ Y Khoa
        </h1>
        <p>Kiến tạo cơ sở dữ liệu y tế bằng cách thêm mới, chỉnh sửa và xuất bản các chỉ số sức khỏe.</p>
      </header>

      <hr className="tq-divider" />

      {/* LỐI TẮT THAO TÁC */}
      <section>
        <h3 className="tq-section-title">
          <i className="fa-solid fa-bolt"></i> Thao tác nhanh
        </h3>
        <div className="csyk-flex-wrap">
          <button
            className={`tq-btn ${viewMode === "them-chi-so" && !isEditing ? "tq-btn-primary" : "tq-btn-secondary"}`}
            onClick={resetForm}
          >
            <i className="fa-solid fa-plus"></i> Biên soạn mới
          </button>
          
          {isEditing && (
            <button className="tq-btn tq-btn-primary">
              <i className="fa-solid fa-pen-to-square"></i> Đang chỉnh sửa: {formData.id}
            </button>
          )}

          <button
            className={`tq-btn ${viewMode === "danh-sach" ? "tq-btn-primary" : "tq-btn-secondary"}`}
            onClick={() => setViewMode("danh-sach")}
          >
            <i className="fa-solid fa-list-check"></i> Danh sách hệ thống
          </button>

          {viewMode === "them-chi-so" && (
            <button className="csyk-btn-export" onClick={handleSaveToServer}>
              <i className="fa-solid fa-cloud-arrow-up"></i> {isEditing ? "Lưu Cập Nhật" : "Lưu vào Hệ thống"}
            </button>
          )}
        </div>
      </section>

      {/* KHU VỰC HIỂN THỊ */}
      {viewMode === "them-chi-so" ? (
        <form className="tq-grid" style={{ marginTop: "20px" }}>
          {/* Nhóm 1: Định danh */}
          <section className="tq-card">
            <h3 className="tq-card-title">
              <i className="fa-solid fa-tag"></i> 1. Định danh
            </h3>
            <div className="csyk-form-group">
              <label className="csyk-label">Mã định danh (ID):</label>
              <input
                type="text"
                name="id"
                value={formData.id}
                onChange={handleInputChange}
                className="csyk-input"
                placeholder="Mã tự động (VD: chieuCao)"
                disabled
                style={{ backgroundColor: "#f1f5f9", color: "#64748b", cursor: "not-allowed" }}
              />
            </div>
            <div className="csyk-form-group">
              <label className="csyk-label">Tên chỉ số (Name):</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="csyk-input"
                placeholder="VD: Chỉ số khối cơ thể"
                required
              />
            </div>
            <div className="csyk-form-group">
              <label className="csyk-label">Danh mục (Category):</label>
              <input
                type="text"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="csyk-input"
                placeholder="VD: Dinh dưỡng"
              />
            </div>
          </section>

          {/* Nhóm 2: Nội dung */}
          <section className="tq-card">
            <h3 className="tq-card-title">
              <i className="fa-solid fa-file-lines"></i> 2. Nội dung y khoa
            </h3>
            <div className="csyk-form-group">
              <label className="csyk-label">Tóm tắt (Summary):</label>
              <textarea
                name="summary"
                value={formData.summary}
                onChange={handleInputChange}
                className="csyk-textarea"
                rows="2"
              />
            </div>
            <div className="csyk-form-group">
              <label className="csyk-label">Mô tả (Description):</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="csyk-textarea"
                rows="3"
              />
            </div>
            <div className="csyk-form-group">
              <label className="csyk-label">Tầm quan trọng (Importance):</label>
              <textarea
                name="importance"
                value={formData.importance}
                onChange={handleInputChange}
                className="csyk-textarea"
                rows="2"
              />
            </div>
          </section>

          {/* Nhóm 3: Kỹ thuật */}
          <section className="tq-card" style={{ gridColumn: "1 / -1" }}>
            <h3 className="tq-card-title">
              <i className="fa-solid fa-microscope"></i> 3. Thông số kỹ thuật
            </h3>
            <div className="csyk-grid-2">
              <div className="csyk-form-group">
                <label className="csyk-label">Đơn vị đo (Unit):</label>
                <input
                  type="text"
                  name="unit"
                  value={formData.unit}
                  onChange={handleInputChange}
                  className="csyk-input"
                  placeholder="VD: mg/dL, kg/m²"
                />
              </div>
              <div className="csyk-form-group">
                <label className="csyk-label">Phương pháp tính (Indicator Type):</label>
                <select
                  name="indicator_type"
                  value={formData.indicator_type}
                  onChange={handleInputChange}
                  className="csyk-select"
                >
                  <option value="direct">Đo trực tiếp (Direct)</option>
                  <option value="calculated">Suy ra từ công thức (Calculated)</option>
                </select>
              </div>
            </div>

            {formData.indicator_type === "calculated" && (
              <div className="csyk-nested-box">
                <div className="csyk-form-group">
                  <label className="csyk-label">Biến số đầu vào (Required Inputs):</label>
                  {formData.required_inputs.map((input, idx) => (
                    <div key={idx} className="csyk-flex-row">
                      <input
                        type="text"
                        placeholder="Mã tự động"
                        value={input.code}
                        disabled
                        className="csyk-input"
                        style={{ flex: 1, backgroundColor: "#f1f5f9", color: "#64748b", cursor: "not-allowed" }}
                      />
                      <input
                        type="text"
                        placeholder="Tên (VD: Cân nặng)"
                        value={input.name}
                        onChange={(e) => handleArrayObjectChange("required_inputs", idx, "name", e.target.value)}
                        className="csyk-input"
                        style={{ flex: 2 }}
                      />
                      <button type="button" onClick={() => removeArrayItem("required_inputs", idx)} className="csyk-btn-icon">
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={() => addArrayObjectItem("required_inputs")} className="csyk-btn-add">
                    + Thêm biến đầu vào
                  </button>
                </div>
                <div className="csyk-form-group" style={{ marginBottom: 0 }}>
                  <label className="csyk-label">Công thức (Formula):</label>
                  <input
                    type="text"
                    name="formula"
                    value={formData.formula}
                    onChange={handleInputChange}
                    className="csyk-input"
                    placeholder="VD: weight / (height * height)"
                  />
                </div>
              </div>
            )}
          </section>

          {/* Nhóm 4: Phân loại */}
          <section className="tq-card" style={{ gridColumn: "1 / -1" }}>
            <h3 className="tq-card-title">
              <i className="fa-solid fa-chart-column"></i> 4. Ngưỡng phân loại
            </h3>
            {formData.normal_ranges.map((range, idx) => (
              <div key={idx} className="csyk-range-box">
                <input
                  type="text"
                  placeholder="Mã tự động"
                  value={range.code}
                  disabled
                  className="csyk-input"
                  style={{ flex: 1, backgroundColor: "#f1f5f9", color: "#64748b", cursor: "not-allowed" }}
                />
                <input
                  type="text"
                  placeholder="Tên (VD: Cao)"
                  value={range.name}
                  onChange={(e) => handleRangeChange(idx, "name", e.target.value)}
                  className="csyk-input"
                  style={{ flex: 1.5 }}
                />
                <input
                  type="number"
                  placeholder="Min"
                  value={range.min}
                  onChange={(e) => handleRangeChange(idx, "min", e.target.value)}
                  className="csyk-input"
                  style={{ flex: 1 }}
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={range.max}
                  onChange={(e) => handleRangeChange(idx, "max", e.target.value)}
                  className="csyk-input"
                  style={{ flex: 1 }}
                />
                <button type="button" onClick={() => removeRangeItem(idx)} className="csyk-btn-icon">
                  <i className="fa-solid fa-trash"></i>
                </button>
              </div>
            ))}
            <button type="button" onClick={addRangeItem} className="csyk-btn-add">
              + Thêm khoảng giá trị
            </button>
          </section>

          {/* Nhóm 5: Lời khuyên */}
          <section className="tq-card">
            <h3 className="tq-card-title">
              <i className="fa-solid fa-star-of-life"></i> 5. Khuyến nghị
            </h3>
            {formData.recommendations.map((rec, idx) => (
              <div key={idx} className="csyk-flex-row">
                <input
                  type="text"
                  value={rec}
                  onChange={(e) => handleArrayStringChange("recommendations", idx, e.target.value)}
                  className="csyk-input"
                  placeholder="Lời khuyên y tế..."
                />
                <button type="button" onClick={() => removeArrayItem("recommendations", idx)} className="csyk-btn-icon">
                  <i className="fa-solid fa-trash"></i>
                </button>
              </div>
            ))}
            <button type="button" onClick={() => addArrayStringItem("recommendations")} className="csyk-btn-add">
              + Thêm lời khuyên
            </button>
          </section>

          {/* Nhóm 6: Liên kết bệnh lý */}
          <section className="tq-card">
            <h3 className="tq-card-title">
              <i className="fa-solid fa-link"></i> 6. Bệnh lý liên quan
            </h3>
            {formData.related_diseases.map((disease, idx) => (
              <div key={idx} className="csyk-flex-row">
                <input
                  type="text"
                  placeholder="Mã tự động"
                  value={disease.code}
                  disabled
                  className="csyk-input"
                  style={{ flex: 1, backgroundColor: "#f1f5f9", color: "#64748b", cursor: "not-allowed" }}
                />
                <input
                  type="text"
                  placeholder="Tên (VD: Tiểu đường)"
                  value={disease.name}
                  onChange={(e) => handleArrayObjectChange("related_diseases", idx, "name", e.target.value)}
                  className="csyk-input"
                  style={{ flex: 2 }}
                />
                <button type="button" onClick={() => removeArrayItem("related_diseases", idx)} className="csyk-btn-icon">
                  <i className="fa-solid fa-trash"></i>
                </button>
              </div>
            ))}
            <button type="button" onClick={() => addArrayObjectItem("related_diseases")} className="csyk-btn-add">
              + Thêm bệnh lý
            </button>
          </section>

          {/* Nhóm 7: Hình ảnh & Nguồn */}
          <section className="tq-card">
            <h3 className="tq-card-title">
              <i className="fa-solid fa-image"></i> 7. Minh họa & Trích dẫn
            </h3>
            <div className="csyk-form-group">
              <label className="csyk-label">Nguồn tài liệu (Source):</label>
              <input
                type="text"
                name="source"
                value={formData.source}
                onChange={handleInputChange}
                className="csyk-input"
                placeholder="VD: WHO"
              />
            </div>
            <label className="csyk-label">Hình ảnh (Image URLs):</label>
            {formData.images.map((img, idx) => (
              <div key={idx} className="csyk-flex-row">
                <input
                  type="text"
                  value={img}
                  onChange={(e) => handleArrayStringChange("images", idx, e.target.value)}
                  className="csyk-input"
                  placeholder="https://..."
                />
                <button type="button" onClick={() => removeArrayItem("images", idx)} className="csyk-btn-icon">
                  <i className="fa-solid fa-trash"></i>
                </button>
              </div>
            ))}
            <button type="button" onClick={() => addArrayStringItem("images")} className="csyk-btn-add">
              + Thêm URL ảnh
            </button>
          </section>

          {/* Nhóm 8: Hệ thống */}
          <section className="tq-card">
            <h3 className="tq-card-title">
              <i className="fa-solid fa-gear"></i> 8. Cấu hình hệ thống
            </h3>
            <ul className="csyk-checkbox-list">
              <li>
                <label className="csyk-checkbox-item">
                  <input
                    type="checkbox"
                    name="usable_for_assessment"
                    checked={formData.usable_for_assessment}
                    onChange={handleInputChange}
                    className="csyk-checkbox-input"
                  />
                  Được dùng để đánh giá tự động (Assessment)
                </label>
              </li>
              <li>
                <label className="csyk-checkbox-item">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleInputChange}
                    className="csyk-checkbox-input"
                  />
                  Kích hoạt hiển thị cho người dùng (Active)
                </label>
              </li>
            </ul>
          </section>
        </form>
      ) : (
        /* GIAO DIỆN DANH SÁCH HỆ THỐNG */
        <section className="tq-card" style={{ marginTop: "20px" }}>
          <h3 className="tq-card-title">
            <i className="fa-solid fa-database"></i> Dữ liệu hiện có
          </h3>
          
          {isLoading ? (
            <div style={{ textAlign: "center", padding: "40px" }}>
              <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: "24px", color: "#3b82f6" }}></i>
              <p style={{ marginTop: "10px", color: "#64748b" }}>Đang tải danh sách...</p>
            </div>
          ) : articlesList.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px" }}>
              <p style={{ color: "#64748b" }}>Chưa có chỉ số y khoa nào được tạo.</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "15px", textAlign: "left" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                    <th style={{ padding: "12px" }}>ID</th>
                    <th style={{ padding: "12px" }}>Tên chỉ số</th>
                    <th style={{ padding: "12px" }}>Danh mục</th>
                    <th style={{ padding: "12px", textAlign: "center" }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {articlesList.map((article) => (
                    <tr key={article.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                      <td style={{ padding: "12px", fontWeight: "bold", color: "#0f172a" }}>{article.id}</td>
                      <td style={{ padding: "12px", color: "#334155" }}>{article.name}</td>
                      <td style={{ padding: "12px" }}>
                        <span style={{ backgroundColor: "#e0f2fe", color: "#0369a1", padding: "4px 8px", borderRadius: "12px", fontSize: "12px" }}>
                          {article.category || "Chưa phân loại"}
                        </span>
                      </td>
                      <td style={{ padding: "12px", textAlign: "center", display: "flex", justifyContent: "center", gap: "8px" }}>
                        <button 
                          onClick={() => handleEditSetup(article.id)}
                          style={{ border: "none", backgroundColor: "#3b82f6", color: "white", padding: "6px 12px", borderRadius: "6px", cursor: "pointer" }}
                          title="Chỉnh sửa"
                        >
                          <i className="fa-solid fa-pen"></i>
                        </button>
                        <button 
                          onClick={() => handleDelete(article.id)}
                          style={{ border: "none", backgroundColor: "#ef4444", color: "white", padding: "6px 12px", borderRadius: "6px", cursor: "pointer" }}
                          title="Xóa"
                        >
                          <i className="fa-solid fa-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}