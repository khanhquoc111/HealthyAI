// frontend/src/MainRiskPage.jsx
import { useEffect, useState } from "react";
import axios from "axios";

const API_BASE_URL = "http://127.0.0.1:8000";

// Keys used only for BMI calculation — not part of any plugin field
const AUX_KEYS = new Set(["chieuCao", "canNang"]);

export default function MainRiskPage() {
  const [selectedPlugin, setSelectedPlugin] = useState(null);
  const [plugins, setPlugins] = useState([]);        // [{id, name, icon}, ...]
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
    // Chỉ load lại form khi đổi Bệnh (selectedPlugin) hoặc lần đầu load xong profile
    if (profileLoaded && selectedPlugin) {
      loadPlugin(selectedPlugin);
    }
  }, [selectedPlugin, profileLoaded]); // ĐÃ XÓA healthProfile KHỎI MẢNG NÀY

  // ─── Data loading ──────────────────────────────────────────────────────────

  const fetchHealthProfile = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/health-profile/${tenDangNhap}`);
      if (res.data.data) setHealthProfile(res.data.data);
    } catch (error) {
      console.error("Error fetching health profile:", error);
    } finally {
      setProfileLoaded(true);
    }
  };

  const loadPluginsList = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/plugins/diseases`);
      const diseaseList = res.data.diseases || [];
      setPlugins(diseaseList);
      if (diseaseList.length > 0 && !selectedPlugin) {
        setSelectedPlugin(diseaseList[0].id);
      }
    } catch (e) {
      console.error("Load plugins error:", e);
    }
  };

  const loadPlugin = async (pluginName) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/plugins/diseases/${pluginName}`);
      const pluginData = response.data;
      setPlugin(pluginData);

      // Build form with defaults, then merge health profile data using metadata mapping
      const mergedForm = buildFormFromMetadata(pluginData.fields);
      setFormData(mergedForm);
      setRiskResult(null);
      setErrors({});
    } catch (error) {
      console.error("Load plugin error:", error);
    } finally {
      setLoading(false);
    }
  };

  // ─── Metadata-driven form initialization ───────────────────────────────────
  //
  // Each field in metadata may declare a `health_profile_key` — the key name
  // as it appears in the health profile returned by the backend. If present,
  // the field's initial value is taken from healthProfile[health_profile_key].
  // No field-name mapping table lives in this file.

  // frontend/src/MainRiskPage.jsx
const buildFormFromMetadata = (fields) => {
  const initialData = {};

  fields.forEach((field) => {
    const key = field.key || field.code;
    initialData[key] = field.default !== undefined 
      ? field.default 
      : (field.type === "boolean" ? false : "");
  });

  initialData.chieuCao = "";
  initialData.canNang = "";

  if (!healthProfile) return initialData;

  // Load hard columns
  ["tuoi", "gioiTinh", "chieuCao", "canNang", "bmi", "vongEo", 
   "huyetApTamThu", "huyetApTamTruong", "hutThuoc", "uongRuouBia", 
   "soPhutVanDongMoiTuan"].forEach(k => {
    if (healthProfile[k] !== undefined) initialData[k] = healthProfile[k];
  });

  // Load EAV fields + fallback
  // Load EAV fields + fallback
  const EAV_FALLBACK = {
    // --- Lối sống ---
    "smoking_status": "hutThuoc",
    "exercise_minutes_per_week": "soPhutVanDongMoiTuan",
    
    // --- Thể chất & Sinh tồn ---
    "age": "tuoi",
    "systolic": "huyetApTamThu",
    "diastolic": "huyetApTamTruong",
    
    // --- Tiền sử bệnh/gia đình ---
    "diabetes_status": "tieuDuong", // Lấy từ hồ sơ để map qua "yes/no"
    "family_history_diabetes": "giaDinhTieuDuong",
    "family_history_hypertension": "giaDinhCaoHuyetAp",
    "family_history_cardiovascular": "giaDinhTimMach",
    
    // --- Sinh hóa ---
    "fasting_glucose": "duongHuyet",
    "hba1c": "hba1c",
    "total_cholesterol": "cholesterol",
    "ldl": "ldl",
    "hdl": "hdl",
    "triglyceride": "triglyceride",
    "creatinine": "creatinine"
  };

  fields.forEach((field) => {
    const key = field.key || field.code;
    let hpKey = field.health_profile_key || EAV_FALLBACK[key] || key;

    let value = healthProfile[hpKey];
    if (value === undefined || value === null) return;

    // --- MAPPING VALUES (Xử lý khác biệt giá trị giữa Hồ sơ và Plugin) ---
    
    // 1. Ánh xạ tình trạng hút thuốc (Tiếng Việt -> Tiếng Anh)
    if (key === "smoking_status") {
      const smokingMap = {
        "Chưa bao giờ": "never",
        "Đã bỏ": "former",
        "Đang hút": "current"
      };
      value = smokingMap[value] || value;
    }

    // 2. Ánh xạ tình trạng bệnh lý (Boolean true/false -> Select "yes"/"no")
    if (key === "diabetes_status" || key === "htn_status") {
      if (typeof value === "boolean") {
        value = value ? "yes" : "no";
      }
    }

    // ----------------------------------------------------------------------

    // Đẩy vào form với đúng format
    if (field.type === "boolean") {
      initialData[key] = Boolean(value);
    } else if (field.type === "number") {
      initialData[key] = Number(value);
    } else {
      initialData[key] = value;
    }
  });

  // Tính BMI
  const h = parseFloat(initialData.chieuCao);
  const w = parseFloat(initialData.canNang);
  if (h > 0 && w > 0) {
    initialData.bmi = Number((w / (h / 100) ** 2).toFixed(1));
  }

  return initialData;
};

  // ─── Input handling ────────────────────────────────────────────────────────

  const handleChange = async (fieldOrKey, value) => {
    const key = typeof fieldOrKey === "object"
      ? (fieldOrKey.key || fieldOrKey.code)
      : fieldOrKey;

    const updated = { ...formData, [key]: value };

    // Auto-calculate BMI when height or weight changes
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

    // Real-time validation for plugin fields
    const isPluginField = plugin?.fields?.some((f) => (f.key || f.code) === key);
    const isBmiRelated = (key === "chieuCao" || key === "canNang") &&
      plugin?.fields?.some((f) => (f.key || f.code) === "bmi");

    if (isPluginField || isBmiRelated) {
      await validateForm(updated);
    }
  };

  // ─── Validation ────────────────────────────────────────────────────────────

  const validateForm = async (currentData) => {
    try {
      const pluginKeys = new Set(plugin?.fields?.map((f) => f.key || f.code) || []);
      const payload = {};
      for (const [k, v] of Object.entries(currentData)) {
        if (pluginKeys.has(k) && v !== "" && v !== null && v !== undefined) {
          payload[k] = v;
        }
      }

      const res = await axios.post(
        `${API_BASE_URL}/api/plugins/diseases/${selectedPlugin}/validate`,
        payload
      );

      const newErrors = {};
      if (!res.data.is_valid && res.data.errors) {
        res.data.errors.forEach((err) => {
          newErrors[err.field] = err.message;
        });
      }
      setErrors(newErrors);
    } catch (e) {
      console.error("Validate error:", e);
    }
  };

  // ─── Risk analysis ─────────────────────────────────────────────────────────

  const handleAnalyzeClick = () => {
    if (!plugin) return;

    const missingFields = [];
    plugin.fields.forEach((field) => {
      const fieldKey = field.key || field.code;
      const value = formData[fieldKey];
      const isMissing =
        field.required &&
        (value === undefined || value === null || (field.type !== "boolean" && value === ""));
      if (isMissing) missingFields.push(field.label);
    });

    if (missingFields.length > 0) {
      alert(`Vui long dien cac truong bat buoc:\n- ${missingFields.join("\n- ")}`);
      return;
    }

    calculateRisk(formData);
  };

  const calculateRisk = async (currentData) => {
    try {
      setIsCalculating(true);

      // Only send plugin field keys, exclude aux keys and empty values
      const pluginKeys = new Set(plugin?.fields?.map((f) => f.key || f.code) || []);
      const cleanData = {};
      for (const [k, v] of Object.entries(currentData)) {
        if (
          pluginKeys.has(k) &&
          !AUX_KEYS.has(k) &&
          v !== "" &&
          v !== null &&
          v !== undefined
        ) {
          cleanData[k] = v;
        }
      }

      const response = await axios.post(
        `${API_BASE_URL}/api/plugins/diseases/${selectedPlugin}/assess`,
        {
          health_profile: healthProfile || {},
          form_data: cleanData,
          tenDangNhap: tenDangNhap || null,
          include_breakdown: true,
          calculate_progression: true,
        }
      );

      setRiskResult(response.data);
      setErrors({});

      // Refresh local health profile cache so next load reflects saved data
      if (tenDangNhap) {
        try {
          const profileRes = await axios.get(`${API_BASE_URL}/health-profile/${tenDangNhap}`);
          if (profileRes.data.data) setHealthProfile(profileRes.data.data);
        } catch (_) {
          // Non-blocking
        }
      }
    } catch (error) {
      console.error("Calculate risk error:", error);
      setRiskResult(null);

      let errorMsg = "Khong the phan tich du lieu.";
      if (error.response?.data?.detail?.errors) {
        const errorList = error.response.data.detail.errors
          .map((err) => `- ${err.field}: ${err.message}`)
          .join("\n");
        errorMsg = `He thong tu choi phan tich:\n\n${errorList}`;
      } else if (error.response?.data?.detail) {
        errorMsg =
          typeof error.response.data.detail === "string"
            ? error.response.data.detail
            : JSON.stringify(error.response.data.detail);
      }
      alert("LOI:\n" + errorMsg);
    } finally {
      setIsCalculating(false);
    }
  };

  // ─── UI helpers ────────────────────────────────────────────────────────────

  const getRiskColor = (level) => {
    const l = String(level).toLowerCase();
    if (l.includes("high") || l.includes("cao")) return "#ef4444";
    if (l.includes("medium") || l.includes("trung")) return "#f97316";
    return "#22c55e";
  };

  const getRiskLabel = (level) => {
    const l = String(level).toLowerCase();
    if (l.includes("high") || l.includes("cao")) return "CAO";
    if (l.includes("medium") || l.includes("trung")) return "TRUNG BINH";
    if (l.includes("low") || l.includes("thap")) return "THAP";
    return level;
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  if (!profileLoaded || (loading && !plugin)) {
    return <div style={{ padding: "40px", textAlign: "center" }}>Dang tai du lieu...</div>;
  }

  const disease = plugin?.disease_info || {};

  return (
    <div style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto", fontFamily: "Segoe UI, Arial, sans-serif" }}>
      <h1 style={{ textAlign: "center", color: "#1e293b" }}>He thong Danh gia Nguy co Benh Man tinh</h1>

      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <strong>Nguoi dung: {tenDangNhap || "Khach"}</strong>
      </div>

      {/* Disease selector — labels come from metadata, not hardcoded */}
      <div style={{ marginBottom: "24px", textAlign: "center" }}>
        <label><strong>Chon Benh: </strong></label>
        <select
          value={selectedPlugin || ""}
          onChange={(e) => setSelectedPlugin(e.target.value)}
          style={{ padding: "10px", fontSize: "16px", borderRadius: "6px" }}
        >
          {plugins.map((p) => (
            <option key={p.id} value={p.id}>
              {p.icon ? `${p.icon} ` : ""}{p.name || p.id}
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: "20px", color: "#64748b" }}>
          Dang tai plugin...
        </div>
      )}

      {!loading && plugin && (
        <>
          <h2 style={{ textAlign: "center", color: "#334155" }}>{disease.name}</h2>
          <p style={{ textAlign: "center", color: "#64748b", fontStyle: "italic", marginBottom: "30px" }}>
            {disease.description}
          </p>

          {/* Form */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "20px",
              background: "white",
              padding: "30px",
              borderRadius: "12px",
              boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
              maxWidth: "600px",
              margin: "0 auto",
            }}
          >
            {plugin.fields.map((field, index) => {
              const fieldKey = field.key || field.code;

              // BMI field: show height + weight inputs above the readonly BMI field
              if (fieldKey === "bmi") {
                return (
                  <div
                    key={`bmi_group_${index}`}
                    style={{
                      width: "100%",
                      background: "#f8fafc",
                      padding: "16px",
                      borderRadius: "8px",
                      border: "1px dashed #cbd5e1",
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                    }}
                  >
                    <p style={{ margin: 0, fontSize: "13px", color: "#64748b", fontStyle: "italic" }}>
                      Chi so BMI duoc tu dong tinh tu chieu cao va can nang.
                    </p>
                    <div style={{ display: "flex", gap: "12px" }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontWeight: "bold", color: "#475569", fontSize: "14px" }}>Chieu cao (cm)</label>
                        <input
                          type="number"
                          value={formData.chieuCao || ""}
                          onChange={(e) =>
                            handleChange("chieuCao", e.target.value === "" ? "" : Number(e.target.value))
                          }
                          style={{ width: "100%", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "6px", boxSizing: "border-box" }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontWeight: "bold", color: "#475569", fontSize: "14px" }}>Can nang (kg)</label>
                        <input
                          type="number"
                          value={formData.canNang || ""}
                          onChange={(e) =>
                            handleChange("canNang", e.target.value === "" ? "" : Number(e.target.value))
                          }
                          style={{ width: "100%", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "6px", boxSizing: "border-box" }}
                        />
                      </div>
                    </div>
                    <div>
                      <label style={{ fontWeight: "bold", color: "#0f766e" }}>
                        {field.label}{field.unit ? ` (${field.unit})` : ""}
                        {field.required && <span style={{ color: "red" }}> *</span>}
                      </label>
                      <input
                        type="number"
                        value={formData.bmi || ""}
                        readOnly
                        style={{
                          width: "100%",
                          padding: "12px",
                          border: errors.bmi ? "2px solid red" : "1px solid #cbd5e1",
                          borderRadius: "8px",
                          backgroundColor: "#e2e8f0",
                          color: "#64748b",
                          boxSizing: "border-box",
                        }}
                      />
                      {errors.bmi && <div style={{ color: "#ef4444", fontSize: "13px" }}>{errors.bmi}</div>}
                    </div>
                  </div>
                );
              }

              // Generic field rendering
              return (
                <div
                  key={`${fieldKey}_${index}`}
                  style={{ width: "100%", display: "flex", flexDirection: "column", gap: "6px" }}
                >
                  <label style={{ fontWeight: "bold", color: "#475569" }}>
                    {field.label}
                    {field.unit ? <span style={{ fontWeight: "normal", color: "#94a3b8" }}> ({field.unit})</span> : null}
                    {field.required && <span style={{ color: "red" }}> *</span>}
                  </label>

                  {field.type === "number" && (
                    <input
                      type="number"
                      step={field.step || "any"}
                      min={field.min}
                      max={field.max}
                      value={formData[fieldKey] ?? ""}
                      onChange={(e) =>
                        handleChange(fieldKey, e.target.value === "" ? "" : Number(e.target.value))
                      }
                      style={{
                        width: "100%",
                        padding: "12px",
                        border: errors[fieldKey] ? "2px solid red" : "1px solid #cbd5e1",
                        borderRadius: "8px",
                        boxSizing: "border-box",
                      }}
                    />
                  )}

                  {field.type === "select" && (
                    <select
                      value={formData[fieldKey] ?? ""}
                      onChange={(e) => handleChange(fieldKey, e.target.value)}
                      style={{
                        width: "100%",
                        padding: "12px",
                        border: errors[fieldKey] ? "2px solid red" : "1px solid #cbd5e1",
                        borderRadius: "8px",
                        boxSizing: "border-box",
                      }}
                    >
                      <option value="">-- Chon --</option>
                      {field.options?.map((opt, optIndex) => (
                        <option key={`${opt.value}_${optIndex}`} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  )}

                  {field.type === "boolean" && (
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
                      <input
                        type="checkbox"
                        checked={!!formData[fieldKey]}
                        onChange={(e) => handleChange(fieldKey, e.target.checked)}
                      />
                      <span style={{ color: "#64748b" }}>Co</span>
                    </div>
                  )}

                  {field.hint && (
                    <div style={{ fontSize: "12px", color: "#94a3b8", fontStyle: "italic" }}>{field.hint}</div>
                  )}

                  {errors[fieldKey] && (
                    <div style={{ color: "#ef4444", fontSize: "13px" }}>{errors[fieldKey]}</div>
                  )}
                </div>
              );
            })}

            {/* Submit button */}
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
                }}
              >
                {isCalculating ? "Dang phan tich..." : "PHAN TICH NGUY CO"}
              </button>
            </div>
          </div>

          {/* Result */}
          {riskResult && (
            <div
              style={{
                marginTop: "40px",
                background: "#f8fafc",
                padding: "24px",
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
                maxWidth: "600px",
                margin: "40px auto 0",
              }}
            >
              <h2 style={{ textAlign: "center" }}>Ket qua Danh gia Nguy co</h2>

              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: "40px",
                  marginTop: "20px",
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    textAlign: "center",
                    padding: "20px",
                    background: "white",
                    borderRadius: "10px",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                    minWidth: "200px",
                  }}
                >
                  <div style={{ fontSize: "16px", color: "#64748b", fontWeight: "600" }}>Muc do Nguy co</div>
                  <div
                    style={{
                      fontSize: "28px",
                      fontWeight: "900",
                      color: getRiskColor(riskResult.risk_level),
                      marginTop: "10px",
                    }}
                  >
                    {getRiskLabel(riskResult.risk_level)}
                  </div>
                </div>

                <div
                  style={{
                    textAlign: "center",
                    padding: "20px",
                    background: "white",
                    borderRadius: "10px",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                    minWidth: "200px",
                  }}
                >
                  <div style={{ fontSize: "16px", color: "#64748b", fontWeight: "600" }}>Diem so (0-100)</div>
                  <div style={{ fontSize: "36px", fontWeight: "900", color: "#1e293b", marginTop: "4px" }}>
                    {riskResult.final_score}
                  </div>
                </div>
              </div>

              {riskResult.explanation && (
                <div
                  style={{
                    marginTop: "20px",
                    padding: "20px",
                    background: "white",
                    borderRadius: "10px",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                  }}
                >
                  <h3 style={{ color: "#334155", marginTop: 0 }}>Chi tiet danh gia</h3>
                  <p style={{ whiteSpace: "pre-wrap", color: "#475569" }}>{riskResult.explanation.summary}</p>

                  {riskResult.recommendations && riskResult.recommendations.length > 0 && (
                    <div style={{ marginTop: "15px" }}>
                      <h4 style={{ color: "#0f766e", marginBottom: "8px" }}>Khuyen nghi:</h4>
                      <ul style={{ margin: 0, paddingLeft: "20px", color: "#475569" }}>
                        {riskResult.recommendations.map((rec, idx) => (
                          <li key={`rec_${idx}`} style={{ marginBottom: "4px" }}>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Breakdown */}
              {riskResult.breakdown && (
                <div
                  style={{
                    marginTop: "20px",
                    padding: "16px",
                    background: "white",
                    borderRadius: "10px",
                    fontSize: "13px",
                    color: "#475569",
                  }}
                >
                  <h4 style={{ color: "#334155", marginTop: 0 }}>Phan tich chi tiet</h4>
                  <p>
                    <strong>Baseline ({riskResult.breakdown.baseline?.stage}):</strong>{" "}
                    {riskResult.breakdown.baseline?.score}
                  </p>

                  {riskResult.breakdown.applied_modifiers?.length > 0 && (
                    <>
                      <p><strong>Yeu to nguy co ap dung:</strong></p>
                      <ul>
                        {riskResult.breakdown.applied_modifiers.map((m, i) => (
                          <li key={i}>
                            {m.description} {m.effect_on_score > 0 ? "+" : ""}
                            {m.effect_on_score?.toFixed(1)} diem
                          </li>
                        ))}
                      </ul>
                    </>
                  )}

                  {riskResult.breakdown.applied_protective?.length > 0 && (
                    <>
                      <p><strong>Yeu to bao ve ap dung:</strong></p>
                      <ul>
                        {riskResult.breakdown.applied_protective.map((p, i) => (
                          <li key={i}>
                            {p.description} {p.effect_on_score?.toFixed(1)} diem
                          </li>
                        ))}
                      </ul>
                    </>
                  )}

                  {riskResult.breakdown.applied_interactions?.length > 0 && (
                    <>
                      <p><strong>Tuong tac yeu to:</strong></p>
                      <ul>
                        {riskResult.breakdown.applied_interactions.map((it, i) => (
                          <li key={i}>
                            {it.description} (x{it.multiplier})
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}