// frontend/src/bs-ql-csyk.jsx
import React, { useState } from "react";
import "./css/bs-ql-csyk.css"; // Đã import file CSS tách rời
import axios from "axios";

export default function BSChiSoYKhoa() {
  const [viewMode, setViewMode] = useState("them-chi-so");

  // State lưu trữ dữ liệu JSON
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    category: "",
    summary: "",
    description: "",
    importance: "",
    unit: "",
    indicator_type: "direct",
    required_inputs: [],
    formula: "",
    normal_ranges: [{ label: "", min: "", max: "" }],
    recommendations: [""],
    related_diseases: [""],
    images: [""],
    source: "",
    usable_for_assessment: true,
    is_active: true,
  });

  // --- CÁC HÀM XỬ LÝ SỰ KIỆN NHẬP LIỆU ---
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleArrayStringChange = (field, index, value) => {
    const newArray = [...formData[field]];
    newArray[index] = value;
    setFormData((prev) => ({ ...prev, [field]: newArray }));
  };

  const addArrayStringItem = (field) => {
    setFormData((prev) => ({ ...prev, [field]: [...prev[field], ""] }));
  };

  const removeArrayStringItem = (field, index) => {
    const newArray = formData[field].filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, [field]: newArray }));
  };

  const handleRangeChange = (index, key, value) => {
    const newRanges = [...formData.normal_ranges];
    newRanges[index][key] = value;
    setFormData((prev) => ({ ...prev, normal_ranges: newRanges }));
  };

  const addRangeItem = () => {
    setFormData((prev) => ({
      ...prev,
      normal_ranges: [...prev.normal_ranges, { label: "", min: "", max: "" }],
    }));
  };

  const removeRangeItem = (index) => {
    const newRanges = formData.normal_ranges.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, normal_ranges: newRanges }));
  };

  const handleSaveToServer = async () => {
    // 1. Làm sạch dữ liệu như cũ
    const cleanData = {
      ...formData,
      required_inputs: formData.required_inputs.filter(
        (item) => item.trim() !== "",
      ),
      recommendations: formData.recommendations.filter(
        (item) => item.trim() !== "",
      ),
      related_diseases: formData.related_diseases.filter(
        (item) => item.trim() !== "",
      ),
      images: formData.images.filter((item) => item.trim() !== ""),
      normal_ranges: formData.normal_ranges.filter(
        (item) => item.label.trim() !== "",
      ),
    };

    cleanData.normal_ranges = cleanData.normal_ranges.map((range) => ({
      label: range.label,
      min: range.min !== "" ? parseFloat(range.min) : null,
      max: range.max !== "" ? parseFloat(range.max) : null,
    }));

    // 2. Kiểm tra bắt buộc phải có ID (vì ID sẽ làm tên file)
    if (!cleanData.id) {
      alert("Vui lòng nhập Mã định danh (ID) để tạo tên file!");
      return;
    }

    // 3. Gửi API sang Backend
    try {
      const response = await axios.post(
        "http://127.0.0.1:8000/knowledge/",
        cleanData,
      );
      alert(`Đã lưu thành công file: ${cleanData.id}.json vào hệ thống!`);
    } catch (error) {
      console.error("Lỗi khi lưu API:", error);
      alert("Lỗi khi kết nối đến máy chủ. Hãy đảm bảo Backend đang chạy.");
    }
  };

  // Xuất JSON
  const handleExportJSON = () => {
    const cleanData = {
      ...formData,
      required_inputs: formData.required_inputs.filter(
        (item) => item.trim() !== "",
      ),
      recommendations: formData.recommendations.filter(
        (item) => item.trim() !== "",
      ),
      related_diseases: formData.related_diseases.filter(
        (item) => item.trim() !== "",
      ),
      images: formData.images.filter((item) => item.trim() !== ""),
      normal_ranges: formData.normal_ranges.filter(
        (item) => item.label.trim() !== "",
      ),
    };

    cleanData.normal_ranges = cleanData.normal_ranges.map((range) => ({
      label: range.label,
      min: range.min !== "" ? parseFloat(range.min) : null,
      max: range.max !== "" ? parseFloat(range.max) : null,
    }));

    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(cleanData, null, 4));
    const downloadAnchorNode = document.createElement("a");
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute(
      "download",
      `${cleanData.id || "chi_so_moi"}.json`,
    );
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  return (
    <div className="tq-dashboard">
      <header className="tq-header">
        <h1>
          <i className="fa-solid fa-vial-virus"></i> Quản lý Sổ Y Khoa
        </h1>
        <p>
          Kiến tạo cơ sở dữ liệu y tế bằng cách thêm mới, chỉnh sửa và xuất bản
          các chỉ số sức khỏe.
        </p>
      </header>

      <hr className="tq-divider" />

      {/* LỐI TẮT THAO TÁC */}
      <section>
        <h3 className="tq-section-title">
          <i className="fa-solid fa-bolt"></i> Thao tác nhanh
        </h3>
        <div className="csyk-flex-wrap">
          <button
            className={`tq-btn ${viewMode === "them-chi-so" ? "tq-btn-primary" : "tq-btn-secondary"}`}
            onClick={() => setViewMode("them-chi-so")}
          >
            <i className="fa-solid fa-plus"></i> Biên soạn chỉ số
          </button>
          <button
            className={`tq-btn ${viewMode === "danh-sach" ? "tq-btn-primary" : "tq-btn-secondary"}`}
            onClick={() => setViewMode("danh-sach")}
          >
            <i className="fa-solid fa-list-check"></i> Danh sách hệ thống
          </button>

          {viewMode === "them-chi-so" && (
            <button className="csyk-btn-export" onClick={handleSaveToServer}>
              <i className="fa-solid fa-cloud-arrow-up"></i> Lưu thẳng vào Hệ
              thống
            </button>
          )}
        </div>
      </section>

      {/* KHU VỰC NỘI DUNG FORM */}
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
                placeholder="VD: BMI, GLUCOSE"
                required
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
                <label className="csyk-label">
                  Phương pháp tính (Indicator Type):
                </label>
                <select
                  name="indicator_type"
                  value={formData.indicator_type}
                  onChange={handleInputChange}
                  className="csyk-select"
                >
                  <option value="direct">Đo trực tiếp (Direct)</option>
                  <option value="calculated">
                    Suy ra từ công thức (Calculated)
                  </option>
                </select>
              </div>
            </div>

            {formData.indicator_type === "calculated" && (
              <div className="csyk-nested-box">
                <div className="csyk-form-group">
                  <label className="csyk-label">
                    Biến số đầu vào (Required Inputs):
                  </label>
                  {formData.required_inputs.map((input, idx) => (
                    <div key={idx} className="csyk-flex-row">
                      <input
                        type="text"
                        value={input}
                        onChange={(e) =>
                          handleArrayStringChange(
                            "required_inputs",
                            idx,
                            e.target.value,
                          )
                        }
                        className="csyk-input"
                        placeholder="VD: weight"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          removeArrayStringItem("required_inputs", idx)
                        }
                        className="csyk-btn-icon"
                      >
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addArrayStringItem("required_inputs")}
                    className="csyk-btn-add"
                  >
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
              (Normal Ranges)
            </h3>
            {formData.normal_ranges.map((range, idx) => (
              <div key={idx} className="csyk-range-box">
                <input
                  type="text"
                  placeholder="Tên ngưỡng (VD: Bình thường)"
                  value={range.label}
                  onChange={(e) =>
                    handleRangeChange(idx, "label", e.target.value)
                  }
                  className="csyk-input"
                  style={{ flex: 2 }}
                />
                <input
                  type="number"
                  placeholder="Min"
                  value={range.min}
                  onChange={(e) =>
                    handleRangeChange(idx, "min", e.target.value)
                  }
                  className="csyk-input"
                  style={{ flex: 1 }}
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={range.max}
                  onChange={(e) =>
                    handleRangeChange(idx, "max", e.target.value)
                  }
                  className="csyk-input"
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={() => removeRangeItem(idx)}
                  className="csyk-btn-icon"
                >
                  <i className="fa-solid fa-trash"></i>
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addRangeItem}
              className="csyk-btn-add"
            >
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
                  onChange={(e) =>
                    handleArrayStringChange(
                      "recommendations",
                      idx,
                      e.target.value,
                    )
                  }
                  className="csyk-input"
                  placeholder="Lời khuyên y tế..."
                />
                <button
                  type="button"
                  onClick={() => removeArrayStringItem("recommendations", idx)}
                  className="csyk-btn-icon"
                >
                  <i className="fa-solid fa-trash"></i>
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addArrayStringItem("recommendations")}
              className="csyk-btn-add"
            >
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
                  value={disease}
                  onChange={(e) =>
                    handleArrayStringChange(
                      "related_diseases",
                      idx,
                      e.target.value,
                    )
                  }
                  className="csyk-input"
                  placeholder="Tên bệnh lý..."
                />
                <button
                  type="button"
                  onClick={() => removeArrayStringItem("related_diseases", idx)}
                  className="csyk-btn-icon"
                >
                  <i className="fa-solid fa-trash"></i>
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addArrayStringItem("related_diseases")}
              className="csyk-btn-add"
            >
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
                  onChange={(e) =>
                    handleArrayStringChange("images", idx, e.target.value)
                  }
                  className="csyk-input"
                  placeholder="https://..."
                />
                <button
                  type="button"
                  onClick={() => removeArrayStringItem("images", idx)}
                  className="csyk-btn-icon"
                >
                  <i className="fa-solid fa-trash"></i>
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addArrayStringItem("images")}
              className="csyk-btn-add"
            >
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
        <section
          className="tq-card warning"
          style={{ marginTop: "20px", textAlign: "center", padding: "40px" }}
        >
          <i
            className="fa-solid fa-folder-open"
            style={{ fontSize: "40px", color: "#94a3b8", marginBottom: "16px" }}
          ></i>
          <h3 className="tq-card-title">Chưa có kết nối Database</h3>
          <p className="tq-alert-subtitle">
            Chức năng xem danh sách file JSON đang được xây dựng.
          </p>
        </section>
      )}
    </div>
  );
}
