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
  const [isCalculating, setIsCalculating] = useState(false); // State báo hiệu đang gửi API
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

  // ĐÃ XÓA USE_EFFECT TỰ ĐỘNG GỌI API calculateRisk Ở ĐÂY NHƯ YÊU CẦU

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
      setErrors({}); // Xóa lỗi cũ khi đổi bệnh
    } catch (error) {
      console.error(`Load plugin error:`, error);
    } finally {
      setLoading(false);
    }
  };

  const mergeWithHealthProfile = (fields) => {
    const initialData = {};
    fields.forEach((field) => {
      initialData[field.key] = field.default !== undefined ? field.default : "";
    });

    if (!healthProfile) return initialData;

    const dbToFormMapping = {
      "tuoi": "age", "bmi": "bmi", "vongEo": "waist",
      "huyetApTamThu": "systolic", "huyetApTamTruong": "diastolic",
      "duongHuyet": "fasting_glucose", "hba1c": "hba1c",
      "cholesterol": "total_cholesterol", "ldl": "ldl", "hdl": "hdl",
      "creatinine": "creatinine", "soPhutVanDongMoiTuan": "exercise_minutes_per_week",
      "giaDinhTieuDuong": "family_history_diabetes",
      "giaDinhCaoHuyetAp": "family_history_hypertension",
      "giaDinhTimMach": "family_history_cardiovascular",
    };

    Object.keys(dbToFormMapping).forEach(dbKey => {
      if (healthProfile[dbKey] !== undefined && healthProfile[dbKey] !== null) {
        const formKey = dbToFormMapping[dbKey];
        if (fields.some(f => f.key === formKey)) {
          initialData[formKey] = healthProfile[dbKey];
        }
      }
    });

    if (healthProfile["hutThuoc"] && fields.some(f => f.key === "smoking_status")) {
        let val = healthProfile["hutThuoc"];
        if (val === "Đang hút") initialData["smoking_status"] = "current";
        else if (val === "Đã bỏ") initialData["smoking_status"] = "former";
        else if (val === "Không") initialData["smoking_status"] = "never";
    }

    return initialData;
  };

  const handleChange = async (field, value) => {
    const updated = { ...formData, [field.key]: value };
    setFormData(updated);
    // Vẫn giữ kiểm tra lỗi Validate trực tiếp (như gõ chữ vào ô số)
    await validateField(field.key, updated); 
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

  // NÚT BẤM KÍCH HOẠT QUÁ TRÌNH TÍNH TOÁN
  const handleAnalyzeClick = () => {
    // 1. Kiểm tra xem người dùng đã điền đủ các trường bắt buộc chưa
    let missingFields = [];
    plugin.fields.forEach(field => {
      if (field.required && (formData[field.key] === undefined || formData[field.key] === "")) {
        missingFields.push(field.label);
      }
    });

    if (missingFields.length > 0) {
      alert(`⚠️ Vui lòng điền các trường bắt buộc sau trước khi phân tích:\n- ${missingFields.join('\n- ')}`);
      return;
    }

    // 2. Chạy tính toán
    calculateRisk(formData);
  };

  const calculateRisk = async (currentData) => {
    try {
      setIsCalculating(true);
      
      // BƯỚC LỌC DỮ LIỆU: Loại bỏ các key rỗng ("") để tránh lỗi 400 Bad Request từ Backend
      const cleanData = {};
      Object.keys(currentData).forEach(key => {
        if (currentData[key] !== "" && currentData[key] !== null && currentData[key] !== undefined) {
          cleanData[key] = currentData[key];
        }
      });

      console.log("Gửi dữ liệu đã làm sạch lên API:", cleanData);
      
      const response = await axios.post(
        `${API_BASE_URL}/plugins/${selectedPlugin}/score?ten_dang_nhap=${tenDangNhap || ''}`,
        cleanData
      );
      console.log("tenDangNhap:", tenDangNhap);
      console.log("cleanData:", cleanData);
      
      console.log("Kết quả trả về:", response.data);
      setRiskResult(response.data);
      setErrors({}); // Xóa báo lỗi form nếu API phân tích thành công
      
    } catch (error) {
      console.error("Calculate risk error:", error);
      setRiskResult(null);
      
      // Bóc tách chi tiết mảng lỗi 400 từ Backend để hiển thị rõ ràng lên giao diện
      let errorMsg = "Không thể phân tích dữ liệu.";
      if (error.response?.data?.detail?.errors) {
        // Lấy danh sách các trường bị lỗi từ ValidationEngine
        const errorList = error.response.data.detail.errors.map(err => `• ${err.field}: ${err.message}`).join("\n");
        errorMsg = `Hệ thống từ chối phân tích do dữ liệu form không hợp lệ:\n\n${errorList}`;
      } else if (error.response?.data?.detail?.message) {
        errorMsg = error.response.data.detail.message;
      } else if (error.response?.data?.detail) {
        errorMsg = error.response.data.detail;
      }
      
      alert("❌ LỖI VALIDATION:\n" + errorMsg);
    } finally {
      setIsCalculating(false);
    }
  };

  const getRiskColor = (level) => {
    const l = String(level).toLowerCase();
    if (l === 'high' || l === 'rất cao' || l === 'cao') return '#ef4444';
    if (l === 'medium' || l === 'trung bình') return '#f97316';
    return '#22c55e';
  };

  const getRiskLabel = (level) => {
    const l = String(level).toLowerCase();
    if (l === 'high' || l === 'rất cao' || l === 'cao') return 'CAO ⚠️';
    if (l === 'medium' || l === 'trung bình') return 'TRUNG BÌNH ⚡';
    if (l === 'low' || l === 'thấp') return 'THẤP ✓';
    return level; 
  };

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
        <select value={selectedPlugin} onChange={(e) => setSelectedPlugin(e.target.value)} style={{ padding: "10px", fontSize: "16px", borderRadius: "6px" }}>
          {plugins.map(p => (
            <option key={p} value={p}>
              {p === "diabetes" ? "🍬 Tiểu đường" : p === "hypertension" ? "🩸 Tăng huyết áp" : p === "gout" ? "🦶 Bệnh Gout" : p}
            </option>
          ))}
        </select>
      </div>

      <h2 style={{ textAlign: "center", color: "#334155" }}>{disease.name}</h2>
      <p style={{ textAlign: "center", color: "#64748b", fontStyle: "italic", marginBottom: "30px" }}>{disease.description}</p>

      {/* KHU VỰC HIỂN THỊ CÁC Ô NHẬP LIỆU ĐỘNG */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px", background: "white", padding: "30px", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", maxWidth: "600px", margin: "0 auto" }}>
        {plugin.fields.map((field) => (
          <div key={field.key} style={{ width: "100%", display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontWeight: "bold", color: "#475569" }}>
              {field.label}{field.required && <span style={{color: "red"}}> *</span>}
            </label>

            {field.type === "number" && (
              <input 
                type="number" 
                value={formData[field.key] ?? ""} 
                onChange={(e) => handleChange(field, e.target.value === "" ? "" : Number(e.target.value))} 
                style={{ width: "100%", padding: "12px", border: errors[field.key] ? "2px solid red" : "1px solid #cbd5e1", borderRadius: "8px", fontSize: "15px", boxSizing: "border-box" }} 
              />
            )}

            {field.type === "select" && (
              <select 
                value={formData[field.key] ?? ""} 
                onChange={(e) => handleChange(field, e.target.value)} 
                style={{ width: "100%", padding: "12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "15px", boxSizing: "border-box", cursor: "pointer" }}
              >
                <option value="">-- Chọn --</option>
                {field.options?.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            )}

            {field.type === "boolean" && (
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
                <input 
                  type="checkbox" 
                  checked={!!formData[field.key]} 
                  onChange={(e) => handleChange(field, e.target.checked)} 
                  style={{ width: "20px", height: "20px", cursor: "pointer" }}
                />
                <span style={{ color: "#64748b", fontSize: "14px" }}>Kích hoạt yếu tố này</span>
              </div>
            )}

            {errors[field.key] && <div style={{color: "#ef4444", fontSize: "13px", fontWeight: "500"}}>{errors[field.key]}</div>}
          </div>
        ))}
        
        {/* === NÚT BẤM KÍCH HOẠT PHÂN TÍCH === */}
        <div style={{ width: "100%", marginTop: "20px" }}>
          <button 
            onClick={handleAnalyzeClick}
            disabled={isCalculating}
            style={{
              width: "100%",
              padding: "16px",
              backgroundColor: isCalculating ? "#94a3b8" : "#2563eb",
              color: "white",
              fontSize: "16px",
              fontWeight: "bold",
              border: "none",
              borderRadius: "8px",
              cursor: isCalculating ? "not-allowed" : "pointer",
              boxShadow: "0 4px 6px -1px rgba(37, 99, 235, 0.2)",
              transition: "all 0.2s"
            }}
          >
            {isCalculating ? "⏳ Đang phân tích & Đồng bộ..." : "🔍 PHÂN TÍCH NGUY CƠ & LƯU HỒ SƠ"}
          </button>
        </div>
      </div>

      {/* ==================== HIỂN THỊ KẾT QUẢ KÉP DUAL-ENGINE ==================== */}
      {riskResult && (
        <div style={{ marginTop: "40px", background: "#f8fafc", padding: "24px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
          <h2 style={{ marginTop: 0, color: "#0f172a", textAlign: "center" }}>📊 Kết quả Đánh giá Nguy cơ Song song (Dual-Engine)</h2>
          
          <div style={{ display: "flex", gap: "30px", margin: "20px 0" }}>
            {/* CỘT 1: HỆ CHUYÊN GIA (RULE-BASED) */}
            <div style={{ flex: 1, padding: "20px", background: "#f0f9ff", borderRadius: "8px", border: "1px solid #bae6fd" }}>
              <h3 style={{ marginTop: 0, color: "#0369a1" }}>📋 Rule-based Engine</h3>
              <p><strong>Điểm số nguy cơ:</strong> {riskResult.rule_based?.score ?? 0} / 100</p>
              <p><strong>Mức độ đánh giá:</strong> <span style={{ fontWeight: "bold", color: getRiskColor(riskResult.rule_based?.risk_level) }}>{getRiskLabel(riskResult.rule_based?.risk_level)}</span></p>
            </div>

            {/* CỘT 2: PHÂN CHIA THEO TRẠNG THÁI MÔ HÌNH AI */}
            <div style={{ flex: 1, padding: "20px", background: "#faf5ff", borderRadius: "8px", border: "1px solid #e9d5ff" }}>
              <h3 style={{ marginTop: 0, color: "#6b21a8" }}>🧠 Học máy AI Model</h3>
              
              {/* TRẠNG THÁI 1: READY */}
              {riskResult.ai_based?.status === "READY" && (
                <>
                  <p><strong>Xác suất mô hình dự đoán:</strong> {(riskResult.ai_based?.probability * 100).toFixed(1)}%</p>
                  <p><strong>Mức độ đánh giá:</strong> <span style={{ fontWeight: "bold", color: getRiskColor(riskResult.ai_based?.risk_level) }}>{getRiskLabel(riskResult.ai_based?.risk_level)}</span></p>
                  <div style={{ marginTop: "10px", padding: "8px", background: "#f3e8ff", color: "#6b21a8", borderRadius: "4px", fontSize: "13px", fontWeight: "600" }}>
                    ✓ Đã đối chiếu chéo thành công với AI!
                  </div>
                </>
              )}

              {/* TRẠNG THÁI 2: PARTIAL (Thiết kế Gamification UI) */}
              {riskResult.ai_based?.status === "PARTIAL" && (
                <div style={{ padding: "16px", background: "#fffbeb", border: "1px dashed #f59e0b", borderRadius: "8px" }}>
                  <h4 style={{ color: "#d97706", marginTop: 0, marginBottom: "8px" }}>🔓 Khám phá Dự đoán AI</h4>
                  <p style={{ fontSize: "13px", color: "#4b5563", margin: "0 0 12px 0" }}>
                    Hệ thống AI cần thêm một số chỉ số lâm sàng để đưa ra dự đoán cá nhân hóa có độ chính xác cao nhất cho bạn:
                  </p>
                  
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {riskResult.ai_based?.missing_features?.map((item, index) => (
                      <span key={index} style={{ background: "#fef3c7", color: "#b45309", padding: "4px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "600", border: "1px solid #fcd34d" }}>
                        + Thêm {item}
                      </span>
                    ))}
                  </div>
                  
                  <button 
                    onClick={() => {
                      document.getElementById("risk_form_container")?.scrollIntoView({ behavior: 'smooth' });
                      alert("Gợi ý: Cập nhật các chỉ số này trên thẻ 'Hồ Sơ Sức Khỏe Cá Nhân' để hệ thống tự động ghi nhận vĩnh viễn.");
                    }}
                    style={{ marginTop: "16px", width: "100%", padding: "10px", background: "white", color: "#d97706", border: "2px solid #f59e0b", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", transition: "0.2s" }}
                    onMouseOver={(e) => e.target.style.background = "#fef3c7"}
                    onMouseOut={(e) => e.target.style.background = "white"}
                  >
                    Cập nhật Dữ liệu Lâm sàng
                  </button>
                </div>
              )}

              {/* TRẠNG THÁI 3: UNAVAILABLE */}
              {riskResult.ai_based?.status === "UNAVAILABLE" && (
                <p style={{ color: "#7c3aed", fontWeight: "500", fontStyle: "italic", marginTop: "15px", padding: "10px", background: "#f5f3ff", borderRadius: "6px" }}>
                  ℹ️ {riskResult.ai_based?.risk_level}
                </p>
              )}
            </div>
          </div>

          {/* PHẦN KẾT LUẬN TỰ ĐỘNG ĐỒNG BỘ */}
          <div style={{ marginTop: "20px", padding: "12px", background: "#f1f5f9", borderRadius: "6px" }}>
            <p style={{ margin: 0, fontSize: "14px" }}>
              <strong>💡 Cơ chế vận hành:</strong> Kết quả chính thức áp dụng từ Rule-based đạt <strong>{riskResult.rule_based?.score ?? 0} điểm</strong>. 
              Dữ liệu thu thập từ form này đã được gửi tự động để làm giàu <strong>Hồ sơ sức khỏe</strong> của bạn trên Cloud.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}