// frontend/src/MainRiskPage.jsx
import { useEffect, useState } from "react";
import axios from "axios";

const API_BASE_URL = "http://127.0.0.1:8000";

export default function MainRiskPage() {
  const [selectedPlugin, setSelectedPlugin] = useState("diabetes");
  const [plugins, setPlugins] = useState([]);
  const [plugin, setPlugin] = useState(null);
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [riskResult, setRiskResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);
  const [healthProfile, setHealthProfile] = useState(null);
  const [profileLoaded, setProfileLoaded] = useState(false);

  const tenDangNhap = localStorage.getItem("userName");

  useEffect(() => { loadPluginsList(); }, []);
  useEffect(() => { tenDangNhap ? fetchHealthProfile() : setProfileLoaded(true); }, [tenDangNhap]);
  useEffect(() => { if (profileLoaded) loadPlugin(selectedPlugin); }, [selectedPlugin, profileLoaded, healthProfile]);

  const fetchHealthProfile = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/health-profile/${tenDangNhap}`);
      if (res.data.data) setHealthProfile(res.data.data);
    } catch (error) { console.error(error); } 
    finally { setProfileLoaded(true); }
  };

  const loadPluginsList = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/plugins`);
      setPlugins(res.data.plugins || []);
    } catch (e) { console.error(e); }
  };

  const loadPlugin = async (pluginName) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/plugins/${pluginName}`);
      setPlugin(response.data);
      setFormData(mergeWithHealthProfile(response.data.fields));
      setRiskResult(null);
      setErrors({});
    } catch (error) { console.error(error); } 
    finally { setLoading(false); }
  };

  const mergeWithHealthProfile = (fields) => {
    const initialData = {};
    fields.forEach((field) => initialData[field.key] = field.default !== undefined ? field.default : "");
    if (!healthProfile) return initialData;
    const dbToFormMapping = {
      "tuoi": "age", "bmi": "bmi", "vongEo": "waist", "huyetApTamThu": "systolic", "huyetApTamTruong": "diastolic",
      "duongHuyet": "fasting_glucose", "hba1c": "hba1c", "cholesterol": "total_cholesterol", "ldl": "ldl", "hdl": "hdl",
      "creatinine": "creatinine", "soPhutVanDongMoiTuan": "exercise_minutes_per_week",
      "giaDinhTieuDuong": "family_history_diabetes", "giaDinhCaoHuyetAp": "family_history_hypertension", "giaDinhTimMach": "family_history_cardiovascular",
    };
    Object.keys(dbToFormMapping).forEach(dbKey => {
      if (healthProfile[dbKey] !== undefined && healthProfile[dbKey] !== null) {
        if (fields.some(f => f.key === dbToFormMapping[dbKey])) initialData[dbToFormMapping[dbKey]] = healthProfile[dbKey];
      }
    });
    if (healthProfile["hutThuoc"] && fields.some(f => f.key === "smoking_status")) {
        const val = healthProfile["hutThuoc"];
        initialData["smoking_status"] = val === "Đang hút" ? "current" : val === "Đã bỏ" ? "former" : "never";
    }
    return initialData;
  };

  const handleChange = async (field, value) => {
    const updated = { ...formData, [field.key]: value };
    setFormData(updated);
    try {
      const res = await axios.post(`${API_BASE_URL}/plugins/${selectedPlugin}/validate-field/${field.key}`, updated);
      setErrors(prev => ({ ...prev, [field.key]: res.data.is_valid ? "" : res.data.errors[0]?.message }));
    } catch (e) { console.error(e); }
  };

  const handleAnalyzeClick = () => {
    let missingFields = plugin.fields.filter(f => f.required && (formData[f.key] === undefined || formData[f.key] === "")).map(f => f.label);
    if (missingFields.length > 0) return alert(`⚠️ Thiếu thông tin bắt buộc:\n- ${missingFields.join('\n- ')}`);
    calculateRisk(formData);
  };

  const calculateRisk = async (currentData) => {
    try {
      setIsCalculating(true);
      const cleanData = {};
      Object.keys(currentData).forEach(k => { if (currentData[k] !== "" && currentData[k] !== null) cleanData[k] = currentData[k]; });
      const response = await axios.post(`${API_BASE_URL}/plugins/${selectedPlugin}/score?ten_dang_nhap=${tenDangNhap || ''}`, cleanData);
      setRiskResult(response.data);
      setErrors({});
    } catch (error) {
      setRiskResult(null);
      alert("❌ LỖI VALIDATION:\n" + (error.response?.data?.detail?.message || "Không thể phân tích dữ liệu."));
    } finally { setIsCalculating(false); }
  };

  if (loading || !plugin) return <div style={{ color: "#64748B" }}>Đang tải cấu hình dữ liệu y tế...</div>;

  return (
    <div style={{ width: "100%", maxWidth: "1200px", margin: "0 auto" }}>
      {/* KHAI BÁO CSS ĐẢM BẢO MÀU CHỮ HIỂN THỊ ĐẬM RÕ RÀNG TRÊN NỀN TRẮNG */}
      <style>{`
        .custom-input { 
          background-color: #FFFFFF !important; 
          color: #1E293B !important; 
          border: 1px solid #D1D5DB; 
          border-radius: 8px; 
          padding: 12px; 
          width: 100%; 
          box-sizing: border-box; 
          font-size: 15px; 
          transition: all 0.2s ease-in-out; 
        }
        .custom-input:focus { 
          outline: none; 
          border-color: #2563EB; 
          box-shadow: 0 0 0 3px rgba(37,99,235,.15); 
        }
        select.custom-input option {
          color: #1E293B !important;
          background-color: #FFFFFF !important;
        }
        .btn-analyze { height: 56px; font-size: 18px; font-weight: 700; border-radius: 12px; background: #2563EB; color: white; border: none; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 6px -1px rgba(37,99,235,.2); }
        .btn-analyze:hover { transform: translateY(-2px); background: #1D4ED8; }
        .btn-analyze:disabled { background: #94A3B8; cursor: not-allowed; transform: none; }
      `}</style>

      {/* HEADER NGANG THU GỌN */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#FFFFFF", padding: "20px 24px", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", marginBottom: "32px" }}>
        <div>
          <h2 style={{ margin: 0, color: "#1E293B", fontSize: "20px", fontWeight: "700" }}>🫁 {plugin.disease_info?.name || "Đánh giá nguy cơ"}</h2>
          <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#64748B" }}>{plugin.disease_info?.description}</p>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <span style={{ fontSize: "14px", fontWeight: "600", color: "#475569" }}>Mô hình đích:</span>
          <select value={selectedPlugin} onChange={(e) => setSelectedPlugin(e.target.value)} className="custom-input" style={{ width: "220px", padding: "8px 12px" }}>
            {plugins.map(p => <option key={p} value={p}>{p === "diabetes" ? "🍬 Tiểu đường" : p === "hypertension" ? "🩸 Tăng huyết áp" : p}</option>)}
          </select>
        </div>
      </div>

      {/* FORM NHẬP LIỆU */}
      <div style={{ background: "white", padding: "32px", borderRadius: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", border: "1px solid #E2E8F0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
          {plugin.fields.map((field) => (
            <div key={field.key} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontWeight: "600", color: "#475569", fontSize: "14px" }}>
                {field.label}{field.required && <span style={{color: "#EF4444"}}> *</span>}
              </label>

              {field.type === "number" && (
                <input type="number" className="custom-input" value={formData[field.key] ?? ""} onChange={(e) => handleChange(field, e.target.value === "" ? "" : Number(e.target.value))} />
              )}
              {field.type === "select" && (
                <select className="custom-input" value={formData[field.key] ?? ""} onChange={(e) => handleChange(field, e.target.value)}>
                  <option value="">-- Chọn --</option>
                  {field.options?.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              )}
              {field.type === "boolean" && (
                <label style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px", border: "1px solid #D1D5DB", borderRadius: "8px", cursor: "pointer", backgroundColor: formData[field.key] ? "#EFF6FF" : "#FFFFFF", borderColor: formData[field.key] ? "#2563EB" : "#D1D5DB", transition: "all 0.2s" }}>
                  <input type="checkbox" checked={!!formData[field.key]} onChange={(e) => handleChange(field, e.target.checked)} style={{ width: "18px", height: "18px" }}/>
                  <span style={{ color: formData[field.key] ? "#1E40AF" : "#475569", fontSize: "15px", fontWeight: formData[field.key] ? "600" : "500" }}>Kích hoạt yếu tố chỉ định này</span>
                </label>
              )}
              {errors[field.key] && <div style={{color: "#EF4444", fontSize: "13px", fontWeight: "500"}}>{errors[field.key]}</div>}
            </div>
          ))}
        </div>
        
        <button className="btn-analyze" onClick={handleAnalyzeClick} disabled={isCalculating} style={{ width: "100%", marginTop: "32px" }}>
          {isCalculating ? "⏳ Đang phân tích chỉ số liên tầng..." : "🩺 Phân tích nguy cơ"}
        </button>
      </div>

      {/* DUAL ENGINE DASHBOARD */}
      {riskResult && (
        <div style={{ marginTop: "32px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
          <div style={{ background: "white", padding: "24px", borderRadius: "16px", border: "1px solid #E2E8F0", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
            <h3 style={{ margin: "0 0 16px 0", color: "#334155", display: "flex", justifyContent: "space-between" }}>
              <span>📋 Rule-based Engine</span>
              <span style={{ color: "#2563EB", fontWeight: "700" }}>{riskResult.rule_based?.score ?? 0} Điểm</span>
            </h3>
            <div style={{ width: "100%", height: "12px", background: "#F1F5F9", borderRadius: "6px", overflow: "hidden", marginBottom: "16px" }}>
              <div style={{ width: `${Math.min(riskResult.rule_based?.score ?? 0, 100)}%`, height: "100%", background: riskResult.rule_based?.score > 60 ? "#EF4444" : riskResult.rule_based?.score > 30 ? "#F59E0B" : "#22C55E", transition: "width 1s" }} />
            </div>
            <p style={{ margin: 0, color: "#64748B" }}>Phân tầng nguy cơ: <strong style={{ color: riskResult.rule_based?.score > 60 ? "#EF4444" : riskResult.rule_based?.score > 30 ? "#F59E0B" : "#22C55E" }}>{String(riskResult.rule_based?.risk_level).toUpperCase()}</strong></p>
          </div>

          <div style={{ background: "white", padding: "24px", borderRadius: "16px", border: "1px solid #E2E8F0", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
            <h3 style={{ margin: "0 0 16px 0", color: "#334155", display: "flex", justifyContent: "space-between" }}>
              <span>🧠 Học máy AI Model</span>
              {riskResult.ai_based?.status === "READY" ? <span style={{ color: "#10B981", fontWeight: "700" }}>{(riskResult.ai_based?.probability * 100).toFixed(1)}%</span> : <span style={{ color: "#F59E0B", fontSize:"14px" }}>PARTIAL MODE</span>}
            </h3>
            
            {riskResult.ai_based?.status === "READY" ? (
              <>
                <div style={{ width: "100%", height: "12px", background: "#F1F5F9", borderRadius: "6px", overflow: "hidden", marginBottom: "16px" }}>
                  <div style={{ width: `${riskResult.ai_based?.probability * 100}%`, height: "100%", background: riskResult.ai_based?.probability > 0.6 ? "#EF4444" : riskResult.ai_based?.probability > 0.3 ? "#F59E0B" : "#22C55E", transition: "width 1s" }} />
                </div>
                <p style={{ margin: 0, color: "#64748B" }}>Độ đồng thuận thuật toán: <strong style={{ color: "#2563EB" }}>{riskResult.ai_based?.confidence}%</strong></p>
              </>
            ) : (
              <p style={{ margin: 0, fontSize: "14px", color: "#64748B", lineHeight: "1.5" }}>Cần điền đầy đủ các chỉ số sinh hóa nâng cao trong mục <strong>Hồ sơ sức khỏe</strong> để đồng bộ kích hoạt phân tích mạng nơ-ron.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}