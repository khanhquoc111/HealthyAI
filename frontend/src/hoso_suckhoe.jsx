// frontend/src/hoso_suckhoe.jsx
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

const API_BASE_URL = "http://localhost:8000";

// Fields that should be auto-saved individually on change
// (all fields are eligible — the old bug excluded family history fields)
const NUMERIC_FIELDS = new Set([
  "tuoi", "chieuCao", "canNang", "bmi", "vongEo",
  "huyetApTamThu", "huyetApTamTruong",
  "duongHuyet", "hba1c", "cholesterol", "ldl", "hdl",
  "triglyceride", "creatinine", "acidUric", "soPhutVanDongMoiTuan",
]);

export default function HealthProfileForm() {
  const tenDangNhap = localStorage.getItem("userName") || "";

  const [formData, setFormData] = useState({
    tuoi: "",
    gioiTinh: "Nam",
    chieuCao: "",
    canNang: "",
    bmi: "",
    vongEo: "",
    huyetApTamThu: "",
    huyetApTamTruong: "",
    duongHuyet: "",
    hba1c: "",
    cholesterol: "",
    ldl: "",
    hdl: "",
    triglyceride: "",
    creatinine: "",
    acidUric: "",
    hutThuoc: "Chưa bao giờ",
    uongRuouBia: "Chưa bao giờ",
    soPhutVanDongMoiTuan: "",
    caoHuyetAp: false,
    tieuDuong: false,
    benhTimMach: false,
    gout: false,
    giaDinhCaoHuyetAp: false,
    giaDinhTieuDuong: false,
    giaDinhTimMach: false,
    giaDinhGout: false,
  });

  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [completionRate, setCompletionRate] = useState(0);

  // Debounce timer ref for auto-save
  const autoSaveTimer = useRef(null);

  // Load health profile on mount
  useEffect(() => {
    if (tenDangNhap) {
      loadHealthProfile();
    }
  }, [tenDangNhap]);

  // Calculate completion rate
  useEffect(() => {
    const totalFields = Object.keys(formData).length;
    const filledFields = Object.values(formData).filter(
      (val) => val !== "" && val !== false && val !== null && val !== undefined
    ).length;
    setCompletionRate(Math.round((filledFields / totalFields) * 100));
  }, [formData]);

  // Auto-calculate BMI when height or weight changes
  useEffect(() => {
    const h = parseFloat(formData.chieuCao);
    const w = parseFloat(formData.canNang);
    if (h > 0 && w > 0) {
      const bmi = (w / Math.pow(h / 100, 2)).toFixed(1);
      setFormData((prev) => ({ ...prev, bmi }));
    }
  }, [formData.chieuCao, formData.canNang]);

  // Auto-calculate LDL when cholesterol, HDL, triglyceride are available and LDL is empty
  useEffect(() => {
    if (formData.cholesterol && formData.hdl && formData.triglyceride && !formData.ldl) {
      const total = parseFloat(formData.cholesterol);
      const hdl = parseFloat(formData.hdl);
      const trig = parseFloat(formData.triglyceride);
      if (!isNaN(total) && !isNaN(hdl) && !isNaN(trig)) {
        const ldl = (total - hdl - trig / 5).toFixed(1);
        setFormData((prev) => ({ ...prev, ldl }));
      }
    }
  }, [formData.cholesterol, formData.hdl, formData.triglyceride, formData.ldl]);

  const loadHealthProfile = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/health-profile/${tenDangNhap}`);
      if (response.data.data) {
        setFormData((prev) => ({ ...prev, ...response.data.data }));
      }
    } catch (error) {
      console.error("Error loading health profile:", error);
    } finally {
      setLoading(false);
    }
  };

  // ─── Auto-save a single field ────────────────────────────────────────────
  // Saves any field change to the backend with debounce for number/text inputs.
  const autoSaveField = (fieldName, fieldValue) => {
    if (!tenDangNhap) return;

    // Debounce numeric input changes by 800ms to avoid excessive API calls
    if (NUMERIC_FIELDS.has(fieldName)) {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => {
        sendAutoSave(fieldName, fieldValue);
      }, 800);
    } else {
      // Boolean / select fields save immediately
      sendAutoSave(fieldName, fieldValue);
    }
  };

  const sendAutoSave = async (fieldName, fieldValue) => {
    try {
      await axios.post(`${API_BASE_URL}/health-profile/`, {
        tenDangNhap,
        [fieldName]: fieldValue,
      });
    } catch (error) {
      console.error(`Auto-save error for field ${fieldName}:`, error);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === "checkbox" ? checked : value;

    setFormData((prev) => ({ ...prev, [name]: newValue }));
    autoSaveField(name, newValue);
  };

  // Manual full save
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!tenDangNhap) {
      setMessage("Vui long dang nhap truoc!");
      return;
    }

    try {
      setSaving(true);
      const payload = { tenDangNhap };

      Object.keys(formData).forEach((key) => {
        if (NUMERIC_FIELDS.has(key)) {
          payload[key] = formData[key] !== "" ? Number(formData[key]) : null;
        } else {
          payload[key] = formData[key];
        }
      });

      await axios.post(`${API_BASE_URL}/health-profile/`, payload);
      setMessage("Luu du lieu ho so suc khoe thanh cong!");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage("Loi khi luu du lieu!");
      console.error("Save error:", error);
    } finally {
      setSaving(false);
    }
  };

  const getBMICategory = (bmi) => {
    const b = Number(bmi);
    if (isNaN(b) || b === 0) return "-";
    if (b < 18.5) return "Gay";
    if (b < 25) return "Binh thuong";
    if (b < 30) return "Thua can";
    return "Beo phi";
  };

  const inputStyle = {
    width: "100%",
    padding: "8px",
    border: "1px solid #cbd5e1",
    borderRadius: "6px",
    boxSizing: "border-box",
    marginTop: "4px",
    fontFamily: "inherit",
  };

  const checkLabel = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    margin: "8px 0",
    cursor: "pointer",
  };

  if (loading) {
    return (
      <div style={{ maxWidth: "750px", margin: "0 auto", padding: "20px", textAlign: "center" }}>
        <p>Dang tai du lieu...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "750px", margin: "0 auto", padding: "20px", fontFamily: "Segoe UI, sans-serif" }}>
      <h2 style={{ color: "#1e293b", marginTop: 0 }}>Ho So Suc Khoe Ca Nhan</h2>
      <p style={{ color: "#64748b" }}>
        Tai khoan: <strong>{tenDangNhap || "Chua dang nhap"}</strong>
      </p>

      {/* Completion progress bar */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
          <span style={{ fontSize: "12px", fontWeight: "600", color: "#64748b" }}>
            Muc do dien day du du lieu
          </span>
          <span style={{
            fontSize: "12px",
            fontWeight: "bold",
            color: completionRate > 70 ? "#22c55e" : "#f97316",
          }}>
            {completionRate}%
          </span>
        </div>
        <div style={{ width: "100%", height: "8px", backgroundColor: "#e2e8f0", borderRadius: "4px", overflow: "hidden" }}>
          <div style={{
            height: "100%",
            width: `${completionRate}%`,
            backgroundColor: completionRate > 70 ? "#22c55e" : "#f97316",
            transition: "width 0.3s",
          }} />
        </div>
      </div>

      {message && (
        <div style={{
          padding: "12px",
          marginBottom: "16px",
          borderRadius: "6px",
          backgroundColor: message.includes("thanh cong") ? "#dcfce7" : "#fee2e2",
          color: message.includes("thanh cong") ? "#166534" : "#991b1b",
        }}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

        {/* BLOCK 1: Physical & Vitals */}
        <fieldset style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "16px", backgroundColor: "#f8fafc" }}>
          <legend style={{ fontWeight: "bold", color: "#0f766e", padding: "0 8px" }}>
            1. The chat va Sinh ton
          </legend>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label>Tuoi (nam)</label>
              <input type="number" name="tuoi" value={formData.tuoi} onChange={handleChange} style={inputStyle} />
            </div>
            <div>
              <label>Gioi tinh</label>
              <select name="gioiTinh" value={formData.gioiTinh} onChange={handleChange} style={inputStyle}>
                <option value="Nam">Nam</option>
                <option value="Nu">Nu</option>
              </select>
            </div>
            <div>
              <label>Chieu cao (cm)</label>
              <input type="number" name="chieuCao" value={formData.chieuCao} onChange={handleChange} style={inputStyle} />
            </div>
            <div>
              <label>Can nang (kg)</label>
              <input type="number" name="canNang" value={formData.canNang} onChange={handleChange} style={inputStyle} />
            </div>
            <div>
              <label>
                BMI: {getBMICategory(formData.bmi)}{" "}
                <span style={{ color: "#059669", fontSize: "12px" }}>(Tu dong)</span>
              </label>
              <input
                type="number"
                name="bmi"
                value={formData.bmi}
                readOnly
                style={{ ...inputStyle, backgroundColor: "#e2e8f0", cursor: "not-allowed", color: "#64748b" }}
              />
            </div>
            <div>
              <label>Vong eo (cm)</label>
              <input type="number" name="vongEo" value={formData.vongEo} onChange={handleChange} style={inputStyle} />
            </div>
            <div>
              <label>HA Tam thu (mmHg)</label>
              <input type="number" name="huyetApTamThu" value={formData.huyetApTamThu} onChange={handleChange} style={inputStyle} />
            </div>
            <div>
              <label>HA Tam truong (mmHg)</label>
              <input type="number" name="huyetApTamTruong" value={formData.huyetApTamTruong} onChange={handleChange} style={inputStyle} />
            </div>
          </div>
        </fieldset>

        {/* BLOCK 2: Biochemistry */}
        <fieldset style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "16px", backgroundColor: "#f0fdf4" }}>
          <legend style={{ fontWeight: "bold", color: "#166534", padding: "0 8px" }}>
            2. Chi so Sinh hoa
          </legend>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label>Duong huyet doi (mg/dL)</label>
              <input type="number" name="duongHuyet" value={formData.duongHuyet} onChange={handleChange} style={inputStyle} />
            </div>
            <div>
              <label>HbA1c (%)</label>
              <input type="number" step="0.1" name="hba1c" value={formData.hba1c} onChange={handleChange} style={inputStyle} />
            </div>
            <div>
              <label>Cholesterol TP (mg/dL)</label>
              <input type="number" name="cholesterol" value={formData.cholesterol} onChange={handleChange} style={inputStyle} />
            </div>
            <div>
              <label>HDL-Cholesterol (mg/dL)</label>
              <input type="number" name="hdl" value={formData.hdl} onChange={handleChange} style={inputStyle} />
            </div>
            <div>
              <label>Triglyceride (mg/dL)</label>
              <input type="number" name="triglyceride" value={formData.triglyceride} onChange={handleChange} style={inputStyle} />
            </div>
            <div>
              <label>LDL-Cholesterol (mg/dL)</label>
              <input
                type="number"
                name="ldl"
                value={formData.ldl}
                onChange={handleChange}
                placeholder="Tu dong tinh neu trong"
                style={inputStyle}
              />
            </div>
            <div>
              <label>Creatinine mau (mg/dL)</label>
              <input type="number" step="0.01" name="creatinine" value={formData.creatinine} onChange={handleChange} style={inputStyle} />
            </div>
            <div>
              <label>Acid Uric (mg/dL)</label>
              <input type="number" step="0.1" name="acidUric" value={formData.acidUric} onChange={handleChange} style={inputStyle} />
            </div>
          </div>
        </fieldset>

        {/* BLOCK 3: Lifestyle */}
        <fieldset style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "16px", backgroundColor: "#f8fafc" }}>
          <legend style={{ fontWeight: "bold", color: "#7c3aed", padding: "0 8px" }}>
            3. Loi song
          </legend>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label>Hut thuoc</label>
              <select name="hutThuoc" value={formData.hutThuoc} onChange={handleChange} style={inputStyle}>
                <option value="Chưa bao giờ">Chưa bao giờ</option>
                <option value="Đã bỏ">Đã bỏ</option>
                <option value="Đang hút">Đang hút</option>
              </select>
            </div>
            <div>
              <label>Uong ruou/bia</label>
              <select name="uongRuouBia" value={formData.uongRuouBia} onChange={handleChange} style={inputStyle}>
                <option value="Chưa bao giờ">Chưa bao giờ</option>
                <option value="Thỉnh thoảng">Thỉnh thoảng</option>
                <option value="Thường xuyên">Thường xuyên</option>
              </select>
            </div>
            <div>
              <label>Phut van dong/tuan</label>
              <input type="number" name="soPhutVanDongMoiTuan" value={formData.soPhutVanDongMoiTuan} onChange={handleChange} style={inputStyle} />
            </div>
          </div>
        </fieldset>

        {/* BLOCK 4: Medical History */}
        <fieldset style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "16px", backgroundColor: "#fff5f5" }}>
          <legend style={{ fontWeight: "bold", color: "#dc2626", padding: "0 8px" }}>
            4. Tien su benh ly
          </legend>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <h4 style={{ margin: "5px 0" }}>Ban than bi:</h4>
              {[
                { name: "caoHuyetAp", label: "Cao huyet ap" },
                { name: "tieuDuong", label: "Tieu duong" },
                { name: "benhTimMach", label: "Tim mach" },
                { name: "gout", label: "Gout" },
              ].map(({ name, label }) => (
                <label key={name} style={checkLabel}>
                  <input
                    type="checkbox"
                    name={name}
                    checked={!!formData[name]}
                    onChange={handleChange}
                  />
                  {label}
                </label>
              ))}
            </div>
            <div>
              <h4 style={{ margin: "5px 0" }}>Gia dinh can huyet bi:</h4>
              {[
                { name: "giaDinhCaoHuyetAp", label: "Cao huyet ap" },
                { name: "giaDinhTieuDuong", label: "Tieu duong" },
                { name: "giaDinhTimMach", label: "Tim mach" },
                { name: "giaDinhGout", label: "Gout" },
              ].map(({ name, label }) => (
                <label key={name} style={checkLabel}>
                  <input
                    type="checkbox"
                    name={name}
                    checked={!!formData[name]}
                    onChange={handleChange}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={saving}
          style={{
            padding: "12px",
            backgroundColor: saving ? "#cbd5e1" : "#0284c7",
            color: "white",
            fontWeight: "600",
            border: "none",
            borderRadius: "6px",
            cursor: saving ? "not-allowed" : "pointer",
            fontSize: "16px",
          }}
        >
          {saving ? "Dang dong bo..." : "LUU HO SO SUC KHOE"}
        </button>
      </form>
    </div>
  );
}