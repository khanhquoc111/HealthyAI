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
  const [healthProfile, setHealthProfile] = useState(null);

  const tenDangNhap = localStorage.getItem("userName");

  useEffect(() => { loadPluginsList(); }, []);
  useEffect(() => { if (tenDangNhap) fetchHealthProfile(); }, [tenDangNhap]);
  useEffect(() => { loadPlugin(selectedPlugin); }, [selectedPlugin]);

  useEffect(() => {
    if (!plugin || Object.keys(formData).length === 0) return;
    const timeout = setTimeout(() => calculateRisk(formData), 800);
    return () => clearTimeout(timeout);
  }, [formData, plugin]);

  const fetchHealthProfile = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/health-profile/${tenDangNhap}`);
      if (res.data.data) {
        setHealthProfile(res.data.data);
      }
    } catch (error) {
      console.error("Lỗi lấy hồ sơ:", error);
    }
  };

  const loadPluginsList = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/plugins`);
      setPlugins(res.data.plugins || []);
    } catch (e) {
      console.error("Load plugins error", e);
    }
  };

  const loadPlugin = async (pluginName) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/plugins/${pluginName}`);
      const pluginData = response.data;
      setPlugin(pluginData);
      
      const mergedForm = mergeWithHealthProfile(pluginData.fields);
      setFormData(mergedForm);
      setRiskResult(null);
    } catch (error) {
      console.error(`Load plugin error:`, error);
    } finally {
      setLoading(false);
    }
  };

  // ==================== MERGE TỐT HƠN ====================
  const mergeWithHealthProfile = (fields) => {
    const initialData = {};

    // Default từ plugin
    fields.forEach((field) => {
      initialData[field.key] = field.default !== undefined ? field.default : "";
    });

    if (!healthProfile) return initialData;

    // Force merge tất cả field chung từ Health Profile
    const commonFields = {
      "tuoi": "tuoi",
      "soPhutVanDongMoiTuan": "soPhutVanDongMoiTuan",
      "hutThuoc": "hutThuoc",
      "bmi": "bmi",
      "vongEo": "vongEo",
      "huyetApTamThu": "huyetApTamThu",
      "huyetApTamTruong": "huyetApTamTruong",
      "caoHuyetAp": "caoHuyetAp",
      "giaDinhCaoHuyetAp": "giaDinhCaoHuyetAp",
      "giaDinhTimMach": "giaDinhTimMach",
      "tieuDuong": "tieuDuong",
      "giaDinhTieuDuong": "giaDinhTieuDuong"
    };

    Object.keys(commonFields).forEach(healthKey => {
      if (healthProfile[healthKey] !== undefined && healthProfile[healthKey] !== null) {
        const formKey = commonFields[healthKey];
        // Chỉ gán nếu field tồn tại trong form plugin hoặc là field chung
        if (fields.some(f => f.key === formKey) || ["tuoi", "soPhutVanDongMoiTuan"].includes(formKey)) {
          initialData[formKey] = healthProfile[healthKey];
        }
      }
    });

    return initialData;
  };

  const handleChange = async (field, value) => {
    const updated = { ...formData, [field.key]: value };
    setFormData(updated);
    await validateField(field.key, updated);

    const commonFields = ["tuoi", "soPhutVanDongMoiTuan", "hutThuoc", "bmi", "vongEo",
                         "huyetApTamThu", "huyetApTamTruong", "caoHuyetAp", 
                         "giaDinhCaoHuyetAp", "giaDinhTimMach", "tieuDuong", "giaDinhTieuDuong"];

    if (commonFields.includes(field.key) && tenDangNhap) {
      updateHealthProfile({ [field.key]: value });
    }
  };

  const updateHealthProfile = async (newData) => {
    try {
      await axios.post(`${API_BASE_URL}/health-profile/`, {
        tenDangNhap: tenDangNhap,
        ...newData
      });
      setHealthProfile(prev => ({ ...prev, ...newData }));
    } catch (error) {
      console.error("Cập nhật Health Profile lỗi:", error);
    }
  };

  const validateField = async (fieldKey, currentData) => {
    try {
      const res = await axios.post(
        `${API_BASE_URL}/plugins/${selectedPlugin}/validate-field/${fieldKey}`,
        currentData
      );
      setErrors(prev => ({
        ...prev,
        [fieldKey]: res.data.is_valid ? "" : (res.data.errors[0]?.message || "Lỗi validation")
      }));
    } catch (e) {
      console.error("Validate error:", e);
    }
  };

  const calculateRisk = async (currentData) => {
  try {
    // ✅ Merge saved health profile vào form data
    const dataToSend = {
      ...currentData,
      ...(healthProfile || {})  // Thêm saved metrics
    };
 
    console.log("Sending to API:", dataToSend);
 
    const response = await axios.post(
      `${API_BASE_URL}/plugins/${selectedPlugin}/score?ten_dang_nhap=${tenDangNhap || ''}`,
      dataToSend
    );
    
    console.log("Risk result:", response.data);
    setRiskResult(response.data);
  } catch (error) {
    console.error("Calculate risk error:", error);
    // Optional: Show error to user
    setRiskResult(null);
  }
};

  const getRiskColor = (level) => level === 'high' ? '#ef4444' : level === 'medium' ? '#f97316' : '#22c55e';
  const getRiskLabel = (level) => level === 'high' ? 'CAO ⚠️' : level === 'medium' ? 'TRUNG BÌNH ⚡' : 'THẤP ✓';

  if (loading || !plugin) return <div style={{ padding: "40px", textAlign: "center" }}>Đang tải dữ liệu...</div>;

  const disease = plugin.disease_info || plugin;

  return (
    <div style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto", fontFamily: "Segoe UI, Arial, sans-serif" }}>
      <h1 style={{ textAlign: "center", color: "#1e293b" }}>🏥 Hệ thống Đánh giá Nguy cơ Bệnh Mạn tính</h1>

      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <strong>👤 {tenDangNhap}</strong>
      </div>

      <div style={{ marginBottom: "24px", textAlign: "center" }}>
        <label><strong>Chọn Bệnh: </strong></label>
        <select value={selectedPlugin} onChange={(e) => setSelectedPlugin(e.target.value)} style={{ padding: "10px", fontSize: "16px" }}>
          {plugins.map(p => (
            <option key={p} value={p}>
              {p === "diabetes" ? "🍬 Tiểu đường" : p === "hypertension" ? "🩸 Tăng huyết áp" : p}
            </option>
          ))}
        </select>
      </div>

      <h2>{disease.name}</h2>
      <p>{disease.description}</p>

      {/* FORM */}
      {plugin.fields.map((field) => (
        <div key={field.key} style={{ marginBottom: "20px" }}>
          <label style={{ fontWeight: "bold", display: "block", marginBottom: "6px" }}>
            {field.label}{field.required && <span style={{color: "red"}}>*</span>}
          </label>

          {field.type === "number" && (
            <input 
              type="number" 
              value={formData[field.key] ?? ""} 
              onChange={(e) => handleChange(field, e.target.value === "" ? "" : Number(e.target.value))} 
              style={{ width: "320px", padding: "10px", border: errors[field.key] ? "2px solid red" : "1px solid #ccc" }} 
            />
          )}

          {field.type === "select" && (
            <select 
              value={formData[field.key] ?? ""} 
              onChange={(e) => handleChange(field, e.target.value)} 
              style={{ width: "320px", padding: "10px" }}
            >
              <option value="">-- Chọn --</option>
              {field.options?.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          )}

          {field.type === "boolean" && (
            <input 
              type="checkbox" 
              checked={!!formData[field.key]} 
              onChange={(e) => handleChange(field, e.target.checked)} 
            />
          )}

          {errors[field.key] && <div style={{color: "red", marginTop: "4px"}}>{errors[field.key]}</div>}
        </div>
      ))}

      {/* KẾT QUẢ */}
      {riskResult && (
        <div style={{ marginTop: "40px", background: "#f8fafc", padding: "24px", borderRadius: "12px" }}>
          <h2>Kết quả Đánh giá Nguy cơ</h2>
          
          <div style={{ display: "flex", gap: "30px", margin: "20px 0" }}>
            <div style={{ flex: 1, padding: "15px", background: "#f0f9ff", borderRadius: "8px" }}>
              <h3>📋 Rule-based</h3>
              <p><strong>Điểm:</strong> {riskResult.rule_based?.score || 0}</p>
              <p><strong>Mức:</strong> <span style={{color: getRiskColor(riskResult.rule_based?.risk_level)}}>{getRiskLabel(riskResult.rule_based?.risk_level)}</span></p>
            </div>

            <div style={{ flex: 1, padding: "15px", background: "#faf5ff", borderRadius: "8px" }}>
              <h3>🧠 ML Model</h3>
              <p><strong>Xác suất:</strong> {(riskResult.ml_based?.probability * 100 || 0).toFixed(1)}%</p>
              <p><strong>Mức:</strong> <span style={{color: getRiskColor(riskResult.ml_based?.risk_level)}}>{getRiskLabel(riskResult.ml_based?.risk_level)}</span></p>
            </div>
          </div>

          <p><strong>Điểm cuối cùng:</strong> <strong>{riskResult.final_score}</strong>/100</p>
        </div>
      )}
    </div>
  );
}