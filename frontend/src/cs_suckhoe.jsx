// frontend/src/cs_suckhoe.jsx
import { useState, useEffect } from "react";
import axios from "axios";

const API_BASE_URL = "http://127.0.0.1:8000";

export default function ChiSoSucKhoe() {
  const [formData, setFormData] = useState({
    tuoi: "", gioiTinh: "Nam", chieuCao: "", canNang: "", bmi: "", vongEo: "",
    huyetApTamThu: "", huyetApTamTruong: "",
    // Nhóm Sinh hóa bổ sung đồng bộ DB
    duongHuyet: "", hba1c: "", cholesterol: "", ldl: "", hdl: "", triglyceride: "", creatinine: "", acidUric: "",
    hutThuoc: "Không", uongRuouBia: "Không", soPhutVanDongMoiTuan: "", mucDoAnMan: "Vừa",
    caoHuyetAp: false, tieuDuong: false, benhTimMach: false, gout: false,
    giaDinhCaoHuyetAp: false, giaDinhTieuDuong: false, giaDinhTimMach: false, giaDinhGout: false
  });

  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [completionRate, setCompletionRate] = useState(0);
  const tenDangNhap = localStorage.getItem("userName");

  // Tính toán % tiến trình hồ sơ
  useEffect(() => {
    const nonEmptyFields = Object.values(formData).filter(v => 
      v !== "" && v !== false && v !== null && v !== undefined
    ).length;
    const rate = Math.round((nonEmptyFields / Object.keys(formData).length) * 100);
    setCompletionRate(rate);
  }, [formData]);

  // Load hồ sơ khi có tenDangNhap
  useEffect(() => {
    if (tenDangNhap) fetchHealthProfile();
  }, [tenDangNhap]);

  // 1. RÀNG BUỘC TÍNH TOÁN BMI CHẶT CHẼ
  useEffect(() => {
    const c = parseFloat(formData.chieuCao);
    const n = parseFloat(formData.canNang);
    if (c > 0 && n > 0) {
      const heightInM = c / 100;
      const bmiValue = (n / (heightInM * heightInM)).toFixed(1);
      // Chỉ cập nhật nếu có sự thay đổi để tránh loop
      if (String(formData.bmi) !== String(bmiValue)) {
        setFormData((prev) => ({ ...prev, bmi: bmiValue }));
        if (tenDangNhap) autoSaveField("bmi", bmiValue);
      }
    } else if (formData.bmi !== "") {
      // Nếu xóa chiều cao/cân nặng -> Tự động xóa BMI
      setFormData((prev) => ({ ...prev, bmi: "" }));
      if (tenDangNhap) autoSaveField("bmi", null);
    }
  }, [formData.chieuCao, formData.canNang]);

  // 2. RÀNG BUỘC TÍNH TOÁN LDL-CHOLESTEROL (Công thức Friedewald)
  useEffect(() => {
    const tc = parseFloat(formData.cholesterol);
    const hdl = parseFloat(formData.hdl);
    const tg = parseFloat(formData.triglyceride);
    
    if (tc > 0 && hdl > 0 && tg > 0) {
      const ldlEst = (tc - hdl - (tg / 5)).toFixed(1);
      // Chỉ tự động điền nếu người dùng chưa nhập LDL để ưu tiên chỉ số xét nghiệm thực tế
      if (formData.ldl === "" || formData.ldl === null) {
        setFormData((prev) => ({ ...prev, ldl: ldlEst }));
        if (tenDangNhap) autoSaveField("ldl", ldlEst);
      }
    }
  }, [formData.cholesterol, formData.hdl, formData.triglyceride]);

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
    
    setFormData((prev) => ({ ...prev, [name]: newValue }));
    if (tenDangNhap) autoSaveField(name, newValue);
  };

  const autoSaveField = async (fieldName, fieldValue) => {
    try {
      let payloadValue = fieldValue;
      const numericFields = [
        "tuoi", "chieuCao", "canNang", "bmi", "vongEo", "huyetApTamThu", "huyetApTamTruong",
        "duongHuyet", "hba1c", "cholesterol", "ldl", "hdl", "triglyceride", "creatinine", "acidUric", "soPhutVanDongMoiTuan"
      ];
      
      if (numericFields.includes(fieldName)) {
        payloadValue = (fieldValue === "" || fieldValue === null) ? null : Number(fieldValue);
      }

      await axios.post(`${API_BASE_URL}/health-profile/`, {
        tenDangNhap: tenDangNhap,
        [fieldName]: payloadValue
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
      const payload = { tenDangNhap };
      
      const numericFields = [
        "tuoi", "chieuCao", "canNang", "bmi", "vongEo", "huyetApTamThu", "huyetApTamTruong",
        "duongHuyet", "hba1c", "cholesterol", "ldl", "hdl", "triglyceride", "creatinine", "acidUric", "soPhutVanDongMoiTuan"
      ];
      Object.keys(formData).forEach(key => {
        if (numericFields.includes(key)) {
          payload[key] = formData[key] ? Number(formData[key]) : null;
        } else {
          payload[key] = formData[key];
        }
      });
      
      await axios.post(`${API_BASE_URL}/health-profile/`, payload);
      setMessage("✅ Lưu dữ liệu hồ sơ sức khỏe thành công!");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage("❌ Lỗi khi lưu dữ liệu!");
    } finally {
      setSaving(false);
    }
  };

  const BMI_CATEGORY = (bmi) => {
    const b = Number(bmi);
    if (isNaN(b) || b === 0) return "-";
    if (b < 18.5) return "Gầy";
    if (b < 25) return "Bình thường";
    if (b < 30) return "Thừa cân";
    return "Béo phì";
  };

  return (
    <div style={{ maxWidth: "750px", margin: "0 auto", padding: "20px", fontFamily: "Segoe UI, sans-serif" }}>
      <h2 style={{ color: "#1e293b", marginTop: 0 }}>📋 Đồng Bộ Chỉ Số Sức Khỏe Cá Nhân</h2>
      <p style={{ color: "#64748b" }}><i>👤 Tài khoản: <strong>{tenDangNhap || "Chưa đăng nhập"}</strong></i></p>

      {/* THANH TIẾN TRÌNH HỒ SƠ */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
           <span style={{ fontSize: "12px", fontWeight: "600", color: "#64748b" }}>Mức độ điền đầy đủ dữ liệu AI</span>
          <span style={{ fontSize: "12px", fontWeight: "bold", color: completionRate > 70 ? '#22c55e' : '#f97316' }}>{completionRate}%</span>
        </div>
        <div style={{ width: "100%", height: "8px", backgroundColor: "#e2e8f0", borderRadius: "4px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${completionRate}%`, backgroundColor: completionRate > 70 ? '#22c55e' : '#f97316', transition: "width 0.3s" }} />
        </div>
      </div>

      {completionRate <= 15 && (
        <div style={{ padding: "16px", marginBottom: "20px", borderRadius: "8px", backgroundColor: "#eff6ff", color: "#1e3a8a", border: "1px solid #bfdbfe", display: "flex", alignItems: "flex-start", gap: "12px" }}>
          <span style={{ fontSize: "24px" }}>👋</span>
          <div>
            <h4 style={{ margin: "0 0 4px 0", color: "#1d4ed8" }}>Chào mừng bạn mới!</h4>
            <p style={{ margin: 0, fontSize: "14px", lineHeight: "1.5" }}>
              Hệ thống cần thu thập một số dữ liệu sinh tồn cơ bản. Hãy dành 1 phút để thiết lập hồ sơ sức khỏe nhé. Điều này giúp hệ thống <strong>Trí tuệ nhân tạo (AI)</strong> có đủ 18 nhóm dữ liệu lâm sàng để phân tích độ rủi ro bệnh mạn tính một cách chính xác nhất cho riêng bạn.
            </p>
          </div>
        </div>
      )}

      {message && <div style={{ padding: "12px", marginBottom: "16px", borderRadius: "6px", backgroundColor: message.includes("✅") ? "#dcfce7" : "#fee2e2", color: message.includes("✅") ? "#166534" : "#991b1b" }}>{message}</div>}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* KHỐI 1 */}
        <fieldset style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "16px", backgroundColor: "#f8fafc" }}>
          <legend style={{ fontWeight: "bold", color: "#0f766e", padding: "0 8px" }}>📏 1. Thể chất & Sinh tồn</legend>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div><label>Tuổi (năm)</label><input type="number" name="tuoi" value={formData.tuoi} onChange={handleChange} style={inputStyle}/></div>
            <div><label>Giới tính</label><select name="gioiTinh" value={formData.gioiTinh} onChange={handleChange} style={inputStyle}><option value="Nam">Nam</option><option value="Nữ">Nữ</option></select></div>
            <div><label>Chiều cao (cm)</label><input type="number" name="chieuCao" value={formData.chieuCao} onChange={handleChange} style={inputStyle}/></div>
            <div><label>Cân nặng (kg)</label><input type="number" name="canNang" value={formData.canNang} onChange={handleChange} style={inputStyle}/></div>
            <div>
              <label>BMI: {BMI_CATEGORY(formData.bmi)} <span style={{color: "#059669", fontSize: "12px"}}>(Tự động)</span></label>
              <input type="number" name="bmi" value={formData.bmi} readOnly style={{...inputStyle, backgroundColor: "#e2e8f0", cursor: "not-allowed", color: "#64748b"}}/>
            </div>
            <div><label>Vòng eo (cm)</label><input type="number" name="vongEo" value={formData.vongEo} onChange={handleChange} style={inputStyle}/></div>
            <div><label>HA Tâm thu (mmHg)</label><input type="number" name="huyetApTamThu" value={formData.huyetApTamThu} onChange={handleChange} style={inputStyle}/></div>
            <div><label>HA Tâm trương (mmHg)</label><input type="number" name="huyetApTamTruong" value={formData.huyetApTamTruong} onChange={handleChange} style={inputStyle}/></div>
          </div>
        </fieldset>

        {/* KHỐI 2: XÉT NGHIỆM SINH HÓA NÂNG CAO */}
        <fieldset style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "16px", backgroundColor: "#f0fdf4" }}>
          <legend style={{ fontWeight: "bold", color: "#166534", padding: "0 8px" }}>🔬 2. Chỉ số Sinh hóa (Bổ sung dữ liệu mô hình AI)</legend>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div><label>Đường huyết đói (mg/dL)</label><input type="number" name="duongHuyet" value={formData.duongHuyet} onChange={handleChange} style={inputStyle}/></div>
            <div><label>HbA1c (%)</label><input type="number" step="0.1" name="hba1c" value={formData.hba1c} onChange={handleChange} style={inputStyle}/></div>
            <div><label>Cholesterol toàn phần (mg/dL)</label><input type="number" name="cholesterol" value={formData.cholesterol} onChange={handleChange} style={inputStyle}/></div>
            <div><label>HDL-Cholesterol (mg/dL)</label><input type="number" name="hdl" value={formData.hdl} onChange={handleChange} style={inputStyle}/></div>
            <div><label>Triglyceride (mg/dL)</label><input type="number" name="triglyceride" value={formData.triglyceride} onChange={handleChange} style={inputStyle}/></div>
            <div>
              <label>LDL-Cholesterol (mg/dL)</label>
              <input type="number" name="ldl" value={formData.ldl} onChange={handleChange} placeholder="Tự động tính nếu để trống" style={inputStyle}/>
            </div>
            <div><label>Creatinine máu (mg/dL)</label><input type="number" step="0.01" name="creatinine" value={formData.creatinine} onChange={handleChange} style={inputStyle}/></div>
            <div><label>Acid Uric (mg/dL)</label><input type="number" step="0.1" name="acidUric" value={formData.acidUric} onChange={handleChange} style={inputStyle}/></div>
          </div>
        </fieldset>

        {/* KHỐI 3 */}
        <fieldset style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "16px", backgroundColor: "#f8fafc" }}>
          <legend style={{ fontWeight: "bold", color: "#7c3aed", padding: "0 8px" }}>🏃 3. Lối sống</legend>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div><label>Hút thuốc</label><select name="hutThuoc" value={formData.hutThuoc} onChange={handleChange} style={inputStyle}><option value="Không">Không</option><option value="Đã bỏ">Đã bỏ</option><option value="Đang hút">Đang hút</option></select></div>
            <div><label>Uống rượu/bia</label><select name="uongRuouBia" value={formData.uongRuouBia} onChange={handleChange} style={inputStyle}><option value="Không">Không</option><option value="Thỉnh thoảng">Thỉnh thoảng</option><option value="Thường xuyên">Thường xuyên</option></select></div>
            <div><label>Mức độ ăn mặn</label><select name="mucDoAnMan" value={formData.mucDoAnMan} onChange={handleChange} style={inputStyle}><option value="Nhạt">Nhạt</option><option value="Vừa">Vừa</option><option value="Mặn">Mặn</option></select></div>
            <div><label>Phút vận động/tuần</label><input type="number" name="soPhutVanDongMoiTuan" value={formData.soPhutVanDongMoiTuan} onChange={handleChange} style={inputStyle}/></div>
          </div>
        </fieldset>

        {/* KHỐI 4 */}
        <fieldset style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "16px", backgroundColor: "#fff5f5" }}>
          <legend style={{ fontWeight: "bold", color: "#dc2626", padding: "0 8px" }}>⚠️ 4. Tiền sử bệnh lý (Cá nhân & Gia đình)</legend>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <h4 style={{ margin: "5px 0" }}>Bản thân bị:</h4>
              <label style={checkLabel}><input type="checkbox" name="caoHuyetAp" checked={formData.caoHuyetAp} onChange={handleChange}/> Cao huyết áp</label>
              <label style={checkLabel}><input type="checkbox" name="tieuDuong" checked={formData.tieuDuong} onChange={handleChange}/> Tiểu đường</label>
              <label style={checkLabel}><input type="checkbox" name="benhTimMach" checked={formData.benhTimMach} onChange={handleChange}/> Tim mạch</label>
              <label style={checkLabel}><input type="checkbox" name="gout" checked={formData.gout} onChange={handleChange}/> Bệnh Gout</label>
            </div>
            <div>
              <h4 style={{ margin: "5px 0" }}>Gia đình cận huyết bị:</h4>
              <label style={checkLabel}><input type="checkbox" name="giaDinhCaoHuyetAp" checked={formData.giaDinhCaoHuyetAp} onChange={handleChange}/> Cao huyết áp GD</label>
              <label style={checkLabel}><input type="checkbox" name="giaDinhTieuDuong" checked={formData.giaDinhTieuDuong} onChange={handleChange}/> Tiểu đường GD</label>
              <label style={checkLabel}><input type="checkbox" name="giaDinhTimMach" checked={formData.giaDinhTimMach} onChange={handleChange}/> Tim mạch GD</label>
              <label style={checkLabel}><input type="checkbox" name="giaDinhGout" checked={formData.giaDinhGout} onChange={handleChange}/> Gout GD</label>
            </div>
          </div>
        </fieldset>

        <button type="submit" disabled={saving} style={{ padding: "12px", backgroundColor: saving ? "#cbd5e1" : "#0284c7", color: "white", fontWeight: "600", border: "none", borderRadius: "6px", cursor: saving ? "not-allowed" : "pointer" }}>
          {saving ? "⏳ Đang đồng bộ..." : "💾 LƯU TOÀN BỘ CHỈ SỐ LÊN ĐỒNG BỘ AI"}
        </button>
      </form>
    </div>
  );
}

const inputStyle = { width: "100%", padding: "8px", border: "1px solid #cbd5e1", borderRadius: "6px", boxSizing: "border-box", marginTop: "4px" };
const checkLabel = { display: "flex", alignItems: "center", gap: "8px", margin: "8px 0", cursor: "pointer" };