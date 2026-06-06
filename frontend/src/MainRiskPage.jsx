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

  useEffect(() => { 
    if (tenDangNhap) {
      fetchHealthProfile(); 
    } else {
      setProfileLoaded(true);
    }
  }, [tenDangNhap]);

  useEffect(() => { 
    if (profileLoaded) {
      loadPlugin(selectedPlugin); 
    }
  }, [selectedPlugin, profileLoaded, healthProfile]);

  const fetchHealthProfile = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/health-profile/${tenDangNhap}`);
      if (res.data.data) {
        setHealthProfile(res.data.data);
      }
    } catch (error) {
      console.error("Lỗi lấy hồ sơ:", error);
    } finally {
      setProfileLoaded(true);
    }
  };

  const loadPluginsList = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/plugins/diseases`);
      const pluginIds = res.data.diseases ? res.data.diseases.map(p => p.id) : [];
      setPlugins(pluginIds);
    } catch (e) {
      console.error("Load plugins error", e);
    }
  };

  const loadPlugin = async (pluginName) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/plugins/diseases/${pluginName}`);
      const pluginData = response.data;
      setPlugin(pluginData);
      const mergedForm = mergeWithHealthProfile(pluginData.fields);
      setFormData(mergedForm);
      setRiskResult(null);
      setErrors({});
    } catch (error) {
      console.error(`Load plugin error:`, error);
    } finally {
      setLoading(false);
    }
  };

  const mergeWithHealthProfile = (fields) => {
    const initialData = {};
    fields.forEach((field) => {
      const fieldKey = field.key || field.code; // [FIX] Hỗ trợ cả field.key và field.code
      initialData[fieldKey] = field.default !== undefined ? field.default : "";
    });

    if (healthProfile) {
      initialData.chieuCao = healthProfile.chieuCao || "";
      initialData.canNang = healthProfile.canNang || "";

      const dbToFormMapping = {
        "tuoi": "age", 
        "bmi": "bmi", 
        "vongEo": "waist",
        "huyetApTamThu": "systolic", 
        "huyetApTamTruong": "diastolic",
        "duongHuyet": "fasting_glucose", 
        "hba1c": "hba1c",
        "cholesterol": "total_cholesterol", 
        "ldl": "ldl", 
        "hdl": "hdl",
        "creatinine": "creatinine", 
        "soPhutVanDongMoiTuan": "exercise_minutes_per_week",
        "giaDinhTieuDuong": "family_history_diabetes",
        "giaDinhCaoHuyetAp": "family_history_hypertension",
        "giaDinhTimMach": "family_history_cardiovascular",
      };

      Object.keys(dbToFormMapping).forEach(dbKey => {
        if (healthProfile[dbKey] !== undefined && healthProfile[dbKey] !== null) {
          const formKey = dbToFormMapping[dbKey];
          if (fields.some(f => (f.key || f.code) === formKey)) {
            initialData[formKey] = healthProfile[dbKey];
          }
        }
      });

      if (healthProfile["hutThuoc"] && fields.some(f => (f.key || f.code) === "smoking_status")) {
        let val = healthProfile["hutThuoc"];
        if (val === "Đang hút") initialData["smoking_status"] = "current";
        else if (val === "Đã bỏ") initialData["smoking_status"] = "former";
        else if (val === "Không") initialData["smoking_status"] = "never";
      }
    }
    return initialData;
  };

  const handleChange = async (fieldOrKey, value) => {
    // [FIX] Nếu fieldOrKey là Object (field), lấy key hoặc code. Nếu là String (truyền trực tiếp name), thì lấy chính nó.
    const key = (typeof fieldOrKey === 'object') ? (fieldOrKey.key || fieldOrKey.code) : fieldOrKey;
    const updated = { ...formData, [key]: value };

    if (key === "chieuCao" || key === "canNang") {
      const c = parseFloat(updated.chieuCao);
      const n = parseFloat(updated.canNang);
      if (c > 0 && n > 0) {
        updated.bmi = Number((n / Math.pow(c / 100, 2)).toFixed(1));
      } else {
        updated.bmi = "";
      }
    }

    setFormData(updated);

    if (plugin?.fields?.some(f => (f.key || f.code) === key)) {
      await validateForm(updated);
    }
    
    if ((key === "chieuCao" || key === "canNang") && plugin?.fields?.some(f => (f.key || f.code) === "bmi")) {
      await validateForm(updated);
    }
  };

  const validateForm = async (currentData) => {
    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/plugins/diseases/${selectedPlugin}/validate`,
        currentData
      );
      
      const newErrors = {};
      if (!res.data.is_valid && res.data.errors) {
        res.data.errors.forEach(err => {
          newErrors[err.field] = err.message;
        });
      }
      setErrors(newErrors);
    } catch (e) {
      console.error("Validate error:", e);
    }
  };

  const handleAnalyzeClick = () => {
    if (!plugin) return;

    let missingFields = [];
    plugin.fields.forEach(field => {
      const fieldKey = field.key || field.code;
      const value = formData[fieldKey];

      // LOGIC KIỂM TRA MỚI:
      // Nếu trường là bắt buộc (required):
      // - Nếu là kiểu boolean: chỉ coi là thiếu nếu giá trị là undefined hoặc null.
      //   (Giá trị false được coi là "đã trả lời là không", nên hợp lệ).
      // - Nếu là các kiểu khác: kiểm tra empty string.
      
      const isMissing = field.required && (
        value === undefined || 
        value === null || 
        (field.type !== "boolean" && value === "")
      );

      if (isMissing) {
        missingFields.push(field.label);
      }
    });

    if (missingFields.length > 0) {
      alert(`⚠️ Vui lòng trả lời các câu hỏi sau:\n- ${missingFields.join('\n- ')}`);
      return;
    }

    calculateRisk(formData);
  };

  const calculateRisk = async (currentData) => {
    try {
      setIsCalculating(true);
      
      const cleanData = {};
      Object.keys(currentData).forEach(key => {
        if (currentData[key] !== "" && currentData[key] !== null && currentData[key] !== undefined) {
          cleanData[key] = currentData[key];
        }
      });

      const response = await axios.post(
        `${API_BASE_URL}/api/plugins/diseases/${selectedPlugin}/assess`,
        {
          health_profile: healthProfile || {},
          form_data: cleanData,
          include_breakdown: true,
          calculate_progression: true
        }
      );

      setRiskResult(response.data);
      setErrors({}); 
      
    } catch (error) {
      console.error("Calculate risk error:", error);
      setRiskResult(null);
      
      let errorMsg = "Không thể phân tích dữ liệu.";
      if (error.response?.data?.detail?.errors) {
        const errorList = error.response.data.detail.errors.map(err => `• ${err.field}: ${err.message}`).join("\n");
        errorMsg = `Hệ thống từ chối phân tích:\n\n${errorList}`;
      } else if (error.response?.data?.detail) {
        errorMsg = typeof error.response.data.detail === 'string' 
          ? error.response.data.detail 
          : JSON.stringify(error.response.data.detail);
      }
      
      alert("❌ LỖI:\n" + errorMsg);
    } finally {
      setIsCalculating(false);
    }
  };

  const getRiskColor = (level) => {
    const l = String(level).toLowerCase();
    if (l.includes('high') || l.includes('cao')) return '#ef4444';
    if (l.includes('medium') || l.includes('trung')) return '#f97316';
    return '#22c55e';
  };

  const getRiskLabel = (level) => {
    const l = String(level).toLowerCase();
    if (l.includes('high') || l.includes('cao')) return 'CAO ⚠️';
    if (l.includes('medium') || l.includes('trung')) return 'TRUNG BÌNH ⚡';
    if (l.includes('low') || l.includes('thấp')) return 'THẤP ✓';
    return level; 
  };

  if (loading || !plugin) {
    return <div style={{ padding: "40px", textAlign: "center" }}>Đang tải dữ liệu...</div>;
  }

  const disease = plugin.disease_info || plugin;

  return (
    <div style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto", fontFamily: "Segoe UI, Arial, sans-serif" }}>
      <h1 style={{ textAlign: "center", color: "#1e293b" }}>🏥 Hệ thống Đánh giá Nguy cơ Bệnh Mạn tính</h1>

      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <strong>👤 {tenDangNhap || "Khách"}</strong>
      </div>

      <div style={{ marginBottom: "24px", textAlign: "center" }}>
        <label><strong>Chọn Bệnh: </strong></label>
        <select 
          value={selectedPlugin} 
          onChange={(e) => setSelectedPlugin(e.target.value)} 
          style={{ padding: "10px", fontSize: "16px", borderRadius: "6px" }}
        >
          {plugins.map((p, index) => (
            <option key={`${p}_${index}`} value={p}>
              {p === "diabetes" ? "🍬 Tiểu đường" : 
               p === "hypertension" ? "🩸 Tăng huyết áp" : 
               p === "stroke" ? "🧠 Đột quỵ" :
               p === "gout" ? "🦶 Bệnh Gout" : p}
            </option>
          ))}
        </select>
      </div>

      <h2 style={{ textAlign: "center", color: "#334155" }}>{disease.name}</h2>
      <p style={{ textAlign: "center", color: "#64748b", fontStyle: "italic", marginBottom: "30px" }}>
        {disease.description}
      </p>

      {/* Form */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px", 
                    background: "white", padding: "30px", borderRadius: "12px", 
                    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", maxWidth: "600px", margin: "0 auto" }}>
        
        {plugin.fields.map((field, index) => {
          // [FIX] Lấy key chuẩn
          const fieldKey = field.key || field.code;

          if (fieldKey === "bmi") {
            return (
              <div key={`bmi_group_${index}`} style={{ width: "100%", background: "#f8fafc", padding: "16px", 
                                            borderRadius: "8px", border: "1px dashed #cbd5e1", display: "flex", flexDirection: "column", gap: "10px" }}>
                <p style={{ margin: 0, fontSize: "13px", color: "#64748b", fontStyle: "italic" }}>
                  * Chỉ số BMI được hệ thống tự động tính toán.
                </p>
                <div style={{ display: "flex", gap: "12px" }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontWeight: "bold", color: "#475569", fontSize: "14px" }}>Chiều cao (cm)</label>
                    <input type="number" value={formData.chieuCao || ""} 
                           onChange={(e) => handleChange("chieuCao", e.target.value === "" ? "" : Number(e.target.value))} 
                           style={{ width: "100%", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "6px" }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontWeight: "bold", color: "#475569", fontSize: "14px" }}>Cân nặng (kg)</label>
                    <input type="number" value={formData.canNang || ""} 
                           onChange={(e) => handleChange("canNang", e.target.value === "" ? "" : Number(e.target.value))} 
                           style={{ width: "100%", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "6px" }} />
                  </div>
                </div>
                <div>
                  <label style={{ fontWeight: "bold", color: "#0f766e" }}>
                    {field.label} {field.required && <span style={{color: "red"}}>*</span>}
                  </label>
                  <input type="number" value={formData.bmi || ""} readOnly 
                         style={{ width: "100%", padding: "12px", border: errors.bmi ? "2px solid red" : "1px solid #cbd5e1", 
                                  borderRadius: "8px", backgroundColor: "#e2e8f0", color: "#64748b" }} />
                  {errors.bmi && <div style={{color: "#ef4444", fontSize: "13px"}}>{errors.bmi}</div>}
                </div>
              </div>
            );
          }

          return (
            <div key={`${fieldKey}_${index}`} style={{ width: "100%", display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontWeight: "bold", color: "#475569" }}>
                {field.label}{field.required && <span style={{color: "red"}}> *</span>}
              </label>

              {field.type === "number" && (
                <input type="number" value={formData[fieldKey] ?? ""} 
                       onChange={(e) => handleChange(fieldKey, e.target.value === "" ? "" : Number(e.target.value))} 
                       style={{ width: "100%", padding: "12px", border: errors[fieldKey] ? "2px solid red" : "1px solid #cbd5e1", borderRadius: "8px" }} />
              )}

              {field.type === "select" && (
                <select value={formData[fieldKey] ?? ""} onChange={(e) => handleChange(fieldKey, e.target.value)} 
                        style={{ width: "100%", padding: "12px", border: "1px solid #cbd5e1", borderRadius: "8px" }}>
                  <option value="">-- Chọn --</option>
                  {field.options?.map((opt, optIndex) => <option key={`${opt.value}_${optIndex}`} value={opt.value}>{opt.label}</option>)}
                </select>
              )}

              {field.type === "boolean" && (
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
                  {/* [FIX] Gọi handleChange với tên trường (string) thay vì object */}
                  <input type="checkbox" checked={!!formData[fieldKey]} 
                         onChange={(e) => handleChange(fieldKey, e.target.checked)} />
                  <span style={{ color: "#64748b" }}>Kích hoạt yếu tố này</span>
                </div>
              )}

              {errors[fieldKey] && <div style={{color: "#ef4444", fontSize: "13px"}}>{errors[fieldKey]}</div>}
            </div>
          );
        })}

        <div style={{ width: "100%", marginTop: "20px" }}>
          <button onClick={handleAnalyzeClick} disabled={isCalculating}
                  style={{
                    width: "100%", padding: "16px", backgroundColor: isCalculating ? "#94a3b8" : "#2563eb",
                    color: "white", fontSize: "16px", fontWeight: "bold", border: "none", borderRadius: "8px",
                    cursor: isCalculating ? "not-allowed" : "pointer"
                  }}>
            {isCalculating ? "⏳ Đang phân tích..." : "🔍 PHÂN TÍCH NGUY CƠ & LƯU HỒ SƠ"}
          </button>
        </div>
      </div>

      {riskResult && (
        <div style={{ marginTop: "40px", background: "#f8fafc", padding: "24px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
          <h2 style={{ textAlign: "center" }}>📊 Kết quả Đánh giá Nguy cơ</h2>
          
          <div style={{ display: "flex", justifyContent: "center", gap: "40px", marginTop: "20px", flexWrap: "wrap" }}>
            <div style={{ textAlign: "center", padding: "20px", background: "white", borderRadius: "10px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", minWidth: "200px" }}>
              <div style={{ fontSize: "16px", color: "#64748b", fontWeight: "600" }}>Mức độ Nguy cơ</div>
              <div style={{ fontSize: "28px", fontWeight: "900", color: getRiskColor(riskResult.risk_level), marginTop: "10px" }}>
                {getRiskLabel(riskResult.risk_level)}
              </div>
            </div>

            <div style={{ textAlign: "center", padding: "20px", background: "white", borderRadius: "10px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", minWidth: "200px" }}>
              <div style={{ fontSize: "16px", color: "#64748b", fontWeight: "600" }}>Điểm số (0-100)</div>
              <div style={{ fontSize: "36px", fontWeight: "900", color: "#1e293b", marginTop: "4px" }}>
                {riskResult.final_score}
              </div>
            </div>
          </div>
          
          {riskResult.explanation && (
            <div style={{ marginTop: "20px", padding: "20px", background: "white", borderRadius: "10px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)"}}>
              <h3 style={{ color: "#334155", marginTop: 0 }}>💡 Chi tiết đánh giá</h3>
              <p style={{ whiteSpace: "pre-wrap", color: "#475569" }}>{riskResult.explanation.summary}</p>
              
              {riskResult.recommendations && riskResult.recommendations.length > 0 && (
                <div style={{ marginTop: "15px" }}>
                  <h4 style={{ color: "#0f766e", marginBottom: "8px" }}>Khuyến nghị:</h4>
                  <ul style={{ margin: 0, paddingLeft: "20px", color: "#475569" }}>
                    {riskResult.recommendations.map((rec, idx) => (
                      <li key={`rec_${idx}`} style={{ marginBottom: "4px" }}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}