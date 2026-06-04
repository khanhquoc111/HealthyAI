// frontend/src/cs_suckhoe.jsx
import { useState, useEffect } from "react";
import axios from "axios";

const API_BASE_URL = "http://127.0.0.1:8000";

export default function ChiSoSucKhoe() {
  const [formData, setFormData] = useState({
    tuoi: "",
    gioiTinh: "Nam",
    chieuCao: "",
    canNang: "",
    bmi: "",
    vongEo: "",
    huyetApTamThu: "",
    huyetApTamTruong: "",
    hutThuoc: "Không",
    uongRuouBia: "Không",
    soPhutVanDongMoiTuan: "",
    mucDoAnMan: "Vừa",
    caoHuyetAp: false,
    giaDinhCaoHuyetAp: false,
    giaDinhTimMach: false,
    tieuDuong: false,           // Bản thân tiểu đường
    giaDinhTieuDuong: false,    // Gia đình tiểu đường
    duongHuyet: "",
    cholesterol: ""
  });

  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [completionRate, setCompletionRate] = useState(0);
  const tenDangNhap = localStorage.getItem("userName");

  // Tính completion rate
  useEffect(() => {
    const nonEmptyFields = Object.values(formData).filter(v => 
      v !== "" && v !== false && v !== null && v !== undefined
    ).length;
    const rate = Math.round((nonEmptyFields / Object.keys(formData).length) * 100);
    setCompletionRate(rate);
  }, [formData]);

  // Load health profile
  useEffect(() => {
    if (tenDangNhap) fetchHealthProfile();
  }, [tenDangNhap]);

  // Tự động tính BMI
  useEffect(() => {
    if (formData.chieuCao && formData.canNang) {
      const heightInM = formData.chieuCao / 100;
      const bmiValue = (formData.canNang / (heightInM * heightInM)).toFixed(1);
      setFormData((prev) => ({ ...prev, bmi: bmiValue }));
    }
  }, [formData.chieuCao, formData.canNang]);

  const fetchHealthProfile = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/health-profile/${tenDangNhap}`);
      if (res.data.data) {
        setFormData((prev) => ({ ...prev, ...res.data.data }));
      }
    } catch (error) {
      console.error("Lỗi tải dữ liệu", error);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === "checkbox" ? checked : value;
    
    setFormData((prev) => ({
      ...prev,
      [name]: newValue
    }));
    
    // Auto-save single field
    if (tenDangNhap) {
      autoSaveField(name, newValue);
    }
  };

  const autoSaveField = async (fieldName, fieldValue) => {
    try {
      await axios.post(`${API_BASE_URL}/health-profile/`, {
        tenDangNhap: tenDangNhap,
        [fieldName]: fieldValue
      });
    } catch (error) {
      console.error(`Auto-save lỗi cho field ${fieldName}:`, error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!tenDangNhap) {
      setMessage("⚠️ Vui lòng đăng nhập trước!");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        tenDangNhap: tenDangNhap,
        tuoi: formData.tuoi ? Number(formData.tuoi) : null,
        chieuCao: formData.chieuCao ? Number(formData.chieuCao) : null,
        canNang: formData.canNang ? Number(formData.canNang) : null,
        bmi: formData.bmi ? Number(formData.bmi) : null,
        vongEo: formData.vongEo ? Number(formData.vongEo) : null,
        huyetApTamThu: formData.huyetApTamThu ? Number(formData.huyetApTamThu) : null,
        huyetApTamTruong: formData.huyetApTamTruong ? Number(formData.huyetApTamTruong) : null,
        soPhutVanDongMoiTuan: formData.soPhutVanDongMoiTuan ? Number(formData.soPhutVanDongMoiTuan) : null,
        duongHuyet: formData.duongHuyet ? Number(formData.duongHuyet) : null,
        cholesterol: formData.cholesterol ? Number(formData.cholesterol) : null,
        
        gioiTinh: formData.gioiTinh,
        hutThuoc: formData.hutThuoc,
        uongRuouBia: formData.uongRuouBia,
        mucDoAnMan: formData.mucDoAnMan,
        
        caoHuyetAp: formData.caoHuyetAp,
        giaDinhCaoHuyetAp: formData.giaDinhCaoHuyetAp,
        giaDinhTimMach: formData.giaDinhTimMach,
        tieuDuong: formData.tieuDuong,
        giaDinhTieuDuong: formData.giaDinhTieuDuong
      };

      await axios.post(`${API_BASE_URL}/health-profile/`, payload);
      setMessage("✅ Lưu dữ liệu thành công!");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage("❌ Lỗi khi lưu dữ liệu!");
      console.error(error);
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setSaving(false);
    }
  };

  const getCompletionColor = () => {
    if (completionRate < 33) return "#ef4444";
    if (completionRate < 67) return "#f97316";
    return "#22c55e";
  };

  const BMI_CATEGORY = (bmi) => {
    const b = Number(bmi);
    if (isNaN(b)) return "-";
    if (b < 18.5) return "Gầy";
    if (b < 25) return "Bình thường";
    if (b < 30) return "Thừa cân";
    return "Béo phì";
  };

  return (
    <div style={{ maxWidth: "700px", margin: "0 auto", padding: "20px", fontFamily: "Segoe UI, Arial, sans-serif" }}>
      <h2 style={{ color: "#1e293b", marginTop: 0 }}>📋 Nhập Chỉ Số Sức Khỏe Cá Nhân</h2>
      <p style={{ color: "#64748b", marginBottom: "24px" }}>
        <i>👤 Tài khoản: <strong>{tenDangNhap || "Chưa đăng nhập"}</strong></i>
      </p>

      {/* PROGRESS BAR */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
          <span style={{ fontSize: "12px", fontWeight: "600", color: "#64748b" }}>Hoàn thành hồ sơ</span>
          <span style={{ fontSize: "12px", fontWeight: "bold", color: getCompletionColor() }}>
            {completionRate}%
          </span>
        </div>
        <div style={{
          width: "100%",
          height: "8px",
          backgroundColor: "#e2e8f0",
          borderRadius: "4px",
          overflow: "hidden"
        }}>
          <div style={{
            height: "100%",
            width: `${completionRate}%`,
            backgroundColor: getCompletionColor(),
            transition: "width 0.3s ease"
          }} />
        </div>
      </div>

      {/* MESSAGE */}
      {message && (
        <div style={{
          padding: "12px",
          marginBottom: "16px",
          borderRadius: "6px",
          backgroundColor: message.includes("✅") ? "#dcfce7" : "#fee2e2",
          color: message.includes("✅") ? "#166534" : "#991b1b",
          fontSize: "14px",
          fontWeight: "500"
        }}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        
        {/* SECTION 1: Thể chất & Sinh tồn */}
        <fieldset style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "16px", backgroundColor: "#f8fafc" }}>
          <legend style={{ fontWeight: "bold", color: "#0f766e", padding: "0 8px" }}>📏 1. Thể chất & Sinh tồn</legend>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div>
              <label style={{ fontWeight: "600", color: "#334155", display: "block", marginBottom: "4px" }}>Tuổi (năm)</label>
              <input type="number" name="tuoi" value={formData.tuoi} onChange={handleChange} style={inputStyle} min="0" max="150" />
            </div>

            <div>
              <label style={{ fontWeight: "600", color: "#334155", display: "block", marginBottom: "4px" }}>Giới tính</label>
              <select name="gioiTinh" value={formData.gioiTinh} onChange={handleChange} style={selectStyle}>
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ fontWeight: "600", color: "#334155", display: "block", marginBottom: "4px" }}>Chiều cao (cm)</label>
                <input type="number" name="chieuCao" value={formData.chieuCao} onChange={handleChange} style={inputStyle} min="100" max="250" />
              </div>
              <div>
                <label style={{ fontWeight: "600", color: "#334155", display: "block", marginBottom: "4px" }}>Cân nặng (kg)</label>
                <input type="number" name="canNang" value={formData.canNang} onChange={handleChange} style={inputStyle} min="20" max="300" />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ fontWeight: "600", color: "#334155", display: "block", marginBottom: "4px" }}>BMI</label>
                <input type="number" name="bmi" value={formData.bmi} readOnly style={{ ...inputStyle, backgroundColor: "#e2e8f0", cursor: "not-allowed" }} />
                <span style={{ fontSize: "12px", color: "#64748b", marginTop: "4px", display: "block" }}>
                  → {BMI_CATEGORY(formData.bmi)}
                </span>
              </div>
              <div>
                <label style={{ fontWeight: "600", color: "#334155", display: "block", marginBottom: "4px" }}>Vòng eo (cm)</label>
                <input type="number" name="vongEo" value={formData.vongEo} onChange={handleChange} style={inputStyle} min="40" max="200" />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ fontWeight: "600", color: "#334155", display: "block", marginBottom: "4px" }}>HA Tâm thu (mmHg)</label>
                <input type="number" name="huyetApTamThu" value={formData.huyetApTamThu} onChange={handleChange} style={inputStyle} min="80" max="200" />
              </div>
              <div>
                <label style={{ fontWeight: "600", color: "#334155", display: "block", marginBottom: "4px" }}>HA Tâm trương (mmHg)</label>
                <input type="number" name="huyetApTamTruong" value={formData.huyetApTamTruong} onChange={handleChange} style={inputStyle} min="40" max="130" />
              </div>
            </div>
          </div>
        </fieldset>

        {/* SECTION 2: Lối sống */}
        <fieldset style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "16px", backgroundColor: "#f8fafc" }}>
          <legend style={{ fontWeight: "bold", color: "#7c3aed", padding: "0 8px" }}>🏃 2. Lối sống</legend>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div>
              <label style={{ fontWeight: "600", color: "#334155", display: "block", marginBottom: "4px" }}>Hút thuốc</label>
              <select name="hutThuoc" value={formData.hutThuoc} onChange={handleChange} style={selectStyle}>
                <option value="Không">Không</option>
                <option value="Đã bỏ">Đã bỏ</option>
                <option value="Đang hút">Đang hút</option>
              </select>
            </div>

            <div>
              <label style={{ fontWeight: "600", color: "#334155", display: "block", marginBottom: "4px" }}>Uống rượu/bia</label>
              <select name="uongRuouBia" value={formData.uongRuouBia} onChange={handleChange} style={selectStyle}>
                <option value="Không">Không</option>
                <option value="Thỉnh thoảng">Thỉnh thoảng</option>
                <option value="Thường xuyên">Thường xuyên</option>
              </select>
            </div>

            <div>
              <label style={{ fontWeight: "600", color: "#334155", display: "block", marginBottom: "4px" }}>Mức độ ăn mặn</label>
              <select name="mucDoAnMan" value={formData.mucDoAnMan} onChange={handleChange} style={selectStyle}>
                <option value="Nhạt">Nhạt</option>
                <option value="Vừa">Vừa</option>
                <option value="Mặn">Mặn</option>
              </select>
            </div>

            <div>
              <label style={{ fontWeight: "600", color: "#334155", display: "block", marginBottom: "4px" }}>Phút vận động/tuần</label>
              <input type="number" name="soPhutVanDongMoiTuan" value={formData.soPhutVanDongMoiTuan} onChange={handleChange} style={inputStyle} min="0" max="10000" />
            </div>
          </div>
        </fieldset>

        {/* SECTION 3: Tiền sử bệnh - ĐÃ CẬP NHẬT */}
        <fieldset style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "16px", backgroundColor: "#f8fafc" }}>
          <legend style={{ fontWeight: "bold", color: "#dc2626", padding: "0 8px" }}>⚠️ 3. Tiền sử bệnh</legend>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontWeight: "500", color: "#334155" }}>
              <input type="checkbox" name="caoHuyetAp" checked={formData.caoHuyetAp} onChange={handleChange} style={{ width: "18px", height: "18px" }} />
              <span>Bản thân bị cao huyết áp</span>
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontWeight: "500", color: "#334155" }}>
              <input type="checkbox" name="giaDinhCaoHuyetAp" checked={formData.giaDinhCaoHuyetAp} onChange={handleChange} style={{ width: "18px", height: "18px" }} />
              <span>Gia đình có người cao huyết áp</span>
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontWeight: "500", color: "#334155" }}>
              <input type="checkbox" name="giaDinhTimMach" checked={formData.giaDinhTimMach} onChange={handleChange} style={{ width: "18px", height: "18px" }} />
              <span>Gia đình có người tim mạch</span>
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontWeight: "500", color: "#334155" }}>
              <input type="checkbox" name="tieuDuong" checked={formData.tieuDuong} onChange={handleChange} style={{ width: "18px", height: "18px" }} />
              <span>Bản thân mắc tiểu đường</span>
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontWeight: "500", color: "#334155" }}>
              <input type="checkbox" name="giaDinhTieuDuong" checked={formData.giaDinhTieuDuong} onChange={handleChange} style={{ width: "18px", height: "18px" }} />
              <span>Gia đình có người mắc tiểu đường</span>
            </label>
          </div>
        </fieldset>

        {/* SECTION 4: Chỉ số sinh hóa */}
        <fieldset style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "16px", backgroundColor: "#f8fafc" }}>
          <legend style={{ fontWeight: "bold", color: "#0284c7", padding: "0 8px" }}>🔬 4. Chỉ số sinh hóa (Tùy chọn)</legend>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ fontWeight: "600", color: "#334155", display: "block", marginBottom: "4px" }}>Đường huyết (mg/dL)</label>
              <input type="number" name="duongHuyet" value={formData.duongHuyet} onChange={handleChange} style={inputStyle} min="50" max="500" />
            </div>
            <div>
              <label style={{ fontWeight: "600", color: "#334155", display: "block", marginBottom: "4px" }}>Cholesterol (mg/dL)</label>
              <input type="number" name="cholesterol" value={formData.cholesterol} onChange={handleChange} style={inputStyle} min="100" max="400" />
            </div>
          </div>
        </fieldset>

        {/* BUTTONS */}
        <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
          <button 
            type="submit" 
            disabled={saving}
            style={{
              flex: 1,
              padding: "12px",
              backgroundColor: saving ? "#cbd5e1" : "#0284c7",
              color: "white",
              fontWeight: "600",
              border: "none",
              borderRadius: "6px",
              cursor: saving ? "not-allowed" : "pointer",
              fontSize: "14px"
            }}
          >
            {saving ? "⏳ Đang lưu..." : "💾 LƯU CHỈ SỐ"}
          </button>
        </div>
      </form>
    </div>
  );
}

// Styles
const inputStyle = {
  width: "100%",
  padding: "10px",
  border: "1px solid #cbd5e1",
  borderRadius: "6px",
  fontFamily: "inherit",
  fontSize: "14px",
  boxSizing: "border-box"
};

const selectStyle = {
  ...inputStyle,
  cursor: "pointer"
};