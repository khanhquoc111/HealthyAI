// frontend/src/cs_suckhoe.jsx
import { useState, useEffect } from "react";
import axios from "axios";

const API_BASE_URL = "http://127.0.0.1:8000";

export default function ChiSoSucKhoe() {
  const [formData, setFormData] = useState({
    tuoi: "", gioiTinh: "Nam", chieuCao: "", canNang: "", bmi: "", vongEo: "", huyetApTamThu: "", huyetApTamTruong: "",
    duongHuyet: "", hba1c: "", cholesterol: "", ldl: "", hdl: "", triglyceride: "", creatinine: "", acidUric: "",
    hutThuoc: "Không", uongRuouBia: "Không", soPhutVanDongMoiTuan: "", mucDoAnMan: "Vừa",
    caoHuyetAp: false, tieuDuong: false, benhTimMach: false, gout: false,
    giaDinhCaoHuyetAp: false, giaDinhTieuDuong: false, giaDinhTimMach: false, giaDinhGout: false
  });

  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [completionRate, setCompletionRate] = useState(0);
  const [missingFields, setMissingFields] = useState([]);
  const [activeAccordion, setActiveAccordion] = useState(1); 
  
  const tenDangNhap = localStorage.getItem("userName");

  useEffect(() => {
    const importantFields = { 
      'bmi': 'Thể chất', 'huyetApTamThu': 'Huyết áp', 'duongHuyet': 'Đường huyết', 
      'cholesterol': 'Cholesterol toàn phần', 'ldl': 'Chỉ số LDL', 'creatinine': 'Creatinine' 
    };
    let filled = 0;
    let missing = [];
    Object.keys(importantFields).forEach(key => {
      if (formData[key] !== "" && formData[key] !== null) filled++;
      else missing.push(importantFields[key]);
    });
    setCompletionRate(Math.round((filled / Object.keys(importantFields).length) * 100));
    setMissingFields(missing.slice(0, 3));
  }, [formData]);

  useEffect(() => { if (tenDangNhap) fetchHealthProfile(); }, [tenDangNhap]);
  useEffect(() => {
    if (formData.chieuCao && formData.canNang) {
      const heightInM = formData.chieuCao / 100;
      setFormData(prev => ({ ...prev, bmi: (formData.canNang / (heightInM * heightInM)).toFixed(1) }));
    }
  }, [formData.chieuCao, formData.canNang]);

  const fetchHealthProfile = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/health-profile/${tenDangNhap}`);
      if (res.data.data) setFormData(prev => ({ ...prev, ...res.data.data }));
    } catch (error) { console.error(error); }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const toggleCheckbox = (name) => {
    setFormData(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!tenDangNhap) return setMessage("⚠️ Vui lòng đăng nhập trước!");
    try {
      setSaving(true);
      const payload = { tenDangNhap, ...formData };
      const numericFields = ["tuoi", "chieuCao", "canNang", "bmi", "vongEo", "huyetApTamThu", "huyetApTamTruong", "duongHuyet", "hba1c", "cholesterol", "ldl", "hdl", "triglyceride", "creatinine", "acidUric", "soPhutVanDongMoiTuan"];
      numericFields.forEach(k => { payload[k] = formData[k] ? Number(formData[k]) : null; });
      await axios.post(`${API_BASE_URL}/health-profile/`, payload);
      setMessage("✅ Lưu dữ liệu chỉ số thành công!");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) { setMessage("❌ Lỗi khi lưu dữ liệu!"); } 
    finally { setSaving(false); }
  };

  return (
    <div style={{ width: "100%", maxWidth: "900px", margin: "0 auto" }}>
      {/* CSS CẤU HÌNH HIỆU ỨNG ACCORDION CUỘN VÀ ĐỔI MÀU CHỮ CHUẨN */}
      <style>{`
        .custom-input { 
          background-color: #FFFFFF !important; 
          color: #1E293B !important; 
          border: 1px solid #D1D5DB; 
          border-radius: 8px; 
          padding: 12px; 
          width: 100%; 
          box-sizing: border-box; 
          transition: all 0.2s; 
          font-size: 15px;
        }
        .custom-input:focus { outline: none; border-color: #2563EB; box-shadow: 0 0 0 3px rgba(37,99,235,.15); }
        select.custom-input option { color: #1E293B !important; background-color: #FFFFFF !important; }
        
        .acc-header { padding: 20px 24px; background: white; border: 1px solid #E2E8F0; border-radius: 12px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; font-weight: 700; font-size: 16px; margin-bottom: 12px; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); }
        .acc-header:hover { border-color: #2563EB; background-color: #F8FAFC; }
        .acc-header.active { border-color: #2563EB; border-bottom-left-radius: 0; border-bottom-right-radius: 0; margin-bottom: 0; }
        
        /* HIỆU ỨNG CHUYỂN ĐỘNG ACCORDION MƯỢT MÀ KHÔNG CỨNG NHẮC */
        .acc-wrapper {
          max-height: 0;
          opacity: 0;
          overflow: hidden;
          transition: max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease-in-out, padding 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          padding: 0 24px;
          border: 1px solid transparent;
          margin-bottom: 12px;
          border-radius: 0 0 12px 12px;
        }
        .acc-wrapper.open {
          max-height: 800px; /* Chiều cao tối đa ước tính để tạo hiệu ứng trượt */
          opacity: 1;
          padding: 24px;
          border-color: #E2E8F0;
          border-top: none;
        }

        .tag-btn { padding: 10px 20px; border-radius: 20px; cursor: pointer; font-size: 14px; font-weight: 600; transition: all 0.2s; user-select: none; border: 1px solid #D1D5DB; background: white; color: #475569; }
        .tag-btn:hover { border-color: #2563EB; color: #2563EB; }
        .tag-btn.active { background: #DBEAFE; border-color: #2563EB; color: #1E3A8A; box-shadow: 0 2px 4px rgba(37,99,235,0.1); }
      `}</style>

      {/* TIẾN TRÌNH HỒ SƠ */}
      <div style={{ background: "white", padding: "24px", borderRadius: "16px", border: "1px solid #E2E8F0", marginBottom: "32px" }}>
        <div style={{ display: "flex", justifycontent: "space-between", justifyContent: "space-between", marginBottom: "12px" }}>
          <span style={{ fontWeight: "700", color: "#334155" }}>Độ hoàn thiện dữ liệu lâm sàng</span>
          <span style={{ fontWeight: "bold", color: completionRate === 100 ? '#22C55E' : '#2563EB' }}>{completionRate}%</span>
        </div>
        <div style={{ width: "100%", height: "10px", backgroundColor: "#F1F5F9", borderRadius: "5px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${completionRate}%`, backgroundColor: completionRate === 100 ? '#22C55E' : '#2563EB', transition: "width 0.5s ease" }} />
        </div>
        {missingFields.length > 0 && (
          <div style={{ marginTop: "12px", fontSize: "14px", color: "#64748B" }}>
            Trường AI đề xuất thêm: <span style={{ color: "#F59E0B", fontWeight: "600" }}>{missingFields.join(", ")}</span>
          </div>
        )}
      </div>

      {message && <div style={{ padding: "16px", marginBottom: "24px", borderRadius: "8px", backgroundColor: message.includes("✅") ? "#DCFCE7" : "#FEF2F2", color: message.includes("✅") ? "#166534" : "#991B1B", fontWeight: "600" }}>{message}</div>}

      <form onSubmit={handleSubmit}>
        {/* KHỐI 1 */}
        <div className={`acc-header ${activeAccordion === 1 ? 'active' : ''}`} onClick={() => setActiveAccordion(activeAccordion === 1 ? 0 : 1)}>
          <span>🫀 1. Thể chất & Sinh tồn</span>
          <span>{activeAccordion === 1 ? '▼' : '▶'}</span>
        </div>
        <div className={`acc-wrapper ${activeAccordion === 1 ? 'open' : ''}`} style={{ background: "#EFF6FF" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
            <div><label style={lblStyle}>Tuổi</label><input type="number" name="tuoi" value={formData.tuoi} onChange={handleChange} className="custom-input"/></div>
            <div><label style={lblStyle}>Giới tính</label><select name="gioiTinh" value={formData.gioiTinh} onChange={handleChange} className="custom-input"><option value="Nam">Nam</option><option value="Nữ">Nữ</option></select></div>
            <div><label style={lblStyle}>Chiều cao (cm)</label><input type="number" name="chieuCao" value={formData.chieuCao} onChange={handleChange} className="custom-input"/></div>
            <div><label style={lblStyle}>Cân nặng (kg)</label><input type="number" name="canNang" value={formData.canNang} onChange={handleChange} className="custom-input"/></div>
            <div><label style={lblStyle}>BMI chỉ số</label><input type="number" name="bmi" value={formData.bmi} readOnly className="custom-input" style={{background:"#E2E8F0"}}/></div>
            <div><label style={lblStyle}>Vòng eo (cm)</label><input type="number" name="vongEo" value={formData.vongEo} onChange={handleChange} className="custom-input"/></div>
            <div><label style={lblStyle}>HA Tâm thu (mmHg)</label><input type="number" name="huyetApTamThu" value={formData.huyetApTamThu} onChange={handleChange} className="custom-input"/></div>
            <div><label style={lblStyle}>HA Tâm trương (mmHg)</label><input type="number" name="huyetApTamTruong" value={formData.huyetApTamTruong} onChange={handleChange} className="custom-input"/></div>
          </div>
          <div style={{textAlign: "right", marginTop: "20px"}}><button type="button" onClick={()=>setActiveAccordion(2)} style={nextBtnStyle}>Tiếp theo ▶</button></div>
        </div>

        {/* KHỐI 2 */}
        <div className={`acc-header ${activeAccordion === 2 ? 'active' : ''}`} onClick={() => setActiveAccordion(activeAccordion === 2 ? 0 : 2)}>
          <span>🧪 2. Chỉ số Sinh hóa chuyên sâu</span>
          <span>{activeAccordion === 2 ? '▼' : '▶'}</span>
        </div>
        <div className={`acc-wrapper ${activeAccordion === 2 ? 'open' : ''}`} style={{ background: "#F0FDF4" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
            <div><label style={lblStyle}>Đường huyết đói (mg/dL)</label><input type="number" name="duongHuyet" value={formData.duongHuyet} onChange={handleChange} className="custom-input"/></div>
            <div><label style={lblStyle}>HbA1c (%)</label><input type="number" step="0.1" name="hba1c" value={formData.hba1c} onChange={handleChange} className="custom-input"/></div>
            <div><label style={lblStyle}>Cholesterol toàn phần</label><input type="number" name="cholesterol" value={formData.cholesterol} onChange={handleChange} className="custom-input"/></div>
            <div><label style={lblStyle}>LDL-Cholesterol</label><input type="number" name="ldl" value={formData.ldl} onChange={handleChange} className="custom-input"/></div>
            <div><label style={lblStyle}>HDL-Cholesterol</label><input type="number" name="hdl" value={formData.hdl} onChange={handleChange} className="custom-input"/></div>
            <div><label style={lblStyle}>Creatinine máu</label><input type="number" step="0.01" name="creatinine" value={formData.creatinine} onChange={handleChange} className="custom-input"/></div>
          </div>
          <div style={{textAlign: "right", marginTop: "20px"}}><button type="button" onClick={()=>setActiveAccordion(3)} style={nextBtnStyle}>Tiếp theo ▶</button></div>
        </div>

        {/* KHỐI 3 */}
        <div className={`acc-header ${activeAccordion === 3 ? 'active' : ''}`} onClick={() => setActiveAccordion(activeAccordion === 3 ? 0 : 3)}>
          <span>🏃 3. Lối sống cá nhân</span>
          <span>{activeAccordion === 3 ? '▼' : '▶'}</span>
        </div>
        <div className={`acc-wrapper ${activeAccordion === 3 ? 'open' : ''}`} style={{ background: "#FFF7ED" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
            <div><label style={lblStyle}>Tần suất hút thuốc</label><select name="hutThuoc" value={formData.hutThuoc} onChange={handleChange} className="custom-input"><option value="Không">Không</option><option value="Đã bỏ">Đã bỏ</option><option value="Đang hút">Đang hút</option></select></div>
            <div><label style={lblStyle}>Sử dụng rượu bia</label><select name="uongRuouBia" value={formData.uongRuouBia} onChange={handleChange} className="custom-input"><option value="Không">Không</option><option value="Thỉnh thoảng">Thỉnh thoảng</option><option value="Thường xuyên">Thường xuyên</option></select></div>
            <div><label style={lblStyle}>Khẩu vị ăn mặn</label><select name="mucDoAnMan" value={formData.mucDoAnMan} onChange={handleChange} className="custom-input"><option value="Nhạt">Nhạt</option><option value="Vừa">Vừa</option><option value="Mặn">Mặn</option></select></div>
            <div><label style={lblStyle}>Vận động thể chất (phút/tuần)</label><input type="number" name="soPhutVanDongMoiTuan" value={formData.soPhutVanDongMoiTuan} onChange={handleChange} className="custom-input"/></div>
          </div>
          <div style={{textAlign: "right", marginTop: "20px"}}><button type="button" onClick={()=>setActiveAccordion(4)} style={nextBtnStyle}>Tiếp theo ▶</button></div>
        </div>

        {/* KHỐI 4 */}
        <div className={`acc-header ${activeAccordion === 4 ? 'active' : ''}`} onClick={() => setActiveAccordion(activeAccordion === 4 ? 0 : 4)}>
          <span>⚠️ 4. Tiền sử bệnh lý (Cá nhân & Gia đình)</span>
          <span>{activeAccordion === 4 ? '▼' : '▶'}</span>
        </div>
        <div className={`acc-wrapper ${activeAccordion === 4 ? 'open' : ''}`} style={{ background: "#FEF2F2" }}>
          <div style={{ marginBottom: "28px" }}>
            <label style={{...lblStyle, marginBottom:"12px"}}>Tiền sử lâm sàng bản thân:</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
              <div className={`tag-btn ${formData.caoHuyetAp ? 'active' : ''}`} onClick={() => toggleCheckbox('caoHuyetAp')}>{formData.caoHuyetAp ? '✓' : '+'} Cao huyết áp</div>
              <div className={`tag-btn ${formData.tieuDuong ? 'active' : ''}`} onClick={() => toggleCheckbox('tieuDuong')}>{formData.tieuDuong ? '✓' : '+'} Tiểu đường</div>
              <div className={`tag-btn ${formData.benhTimMach ? 'active' : ''}`} onClick={() => toggleCheckbox('benhTimMach')}>{formData.benhTimMach ? '✓' : '+'} Tim mạch</div>
              <div className={`tag-btn ${formData.gout ? 'active' : ''}`} onClick={() => toggleCheckbox('gout')}>{formData.gout ? '✓' : '+'} Bệnh Gout</div>
            </div>
          </div>

          <div>
            <label style={{...lblStyle, marginBottom:"12px"}}>Tiền sử di truyền gia đình cận huyết:</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
              <div className={`tag-btn ${formData.giaDinhCaoHuyetAp ? 'active' : ''}`} onClick={() => toggleCheckbox('giaDinhCaoHuyetAp')}>{formData.giaDinhCaoHuyetAp ? '✓' : '+'} Cao huyết áp GD</div>
              <div className={`tag-btn ${formData.giaDinhTieuDuong ? 'active' : ''}`} onClick={() => toggleCheckbox('giaDinhTieuDuong')}>{formData.giaDinhTieuDuong ? '✓' : '+'} Tiểu đường GD</div>
              <div className={`tag-btn ${formData.giaDinhTimMach ? 'active' : ''}`} onClick={() => toggleCheckbox('giaDinhTimMach')}>{formData.giaDinhTimMach ? '✓' : '+'} Tim mạch GD</div>
              <div className={`tag-btn ${formData.giaDinhGout ? 'active' : ''}`} onClick={() => toggleCheckbox('giaDinhGout')}>{formData.giaDinhGout ? '✓' : '+'} Gout GD</div>
            </div>
          </div>
        </div>

        {/* NÚT SUBMIT */}
        <button type="submit" disabled={saving} style={{ width: "100%", padding: "16px", backgroundColor: saving ? "#94A3B8" : "#2563EB", color: "white", fontSize: "16px", fontWeight: "700", border: "none", borderRadius: "12px", cursor: saving ? "not-allowed" : "pointer", marginTop: "24px", transition: "all 0.2s", boxShadow: "0 4px 6px -1px rgba(37, 99, 235, 0.2)" }}>
          {saving ? "⏳ Đang kết nối dữ liệu đám mây..." : "💾 LƯU HỒ SƠ SỨC KHỎE CAN THIỆP"}
        </button>
      </form>
    </div>
  );
}

const lblStyle = { display: "block", fontWeight: "600", color: "#475569", marginBottom: "8px", fontSize: "14px" };
const nextBtnStyle = { padding: "8px 16px", background: "#FFFFFF", border: "1px solid #CBD5E1", borderRadius: "8px", color: "#475569", fontWeight: "600", cursor: "pointer", transition: "all 0.2s" };