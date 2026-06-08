// frontend/src/MainRiskPage.jsx
import { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";

const API_BASE_URL = "http://127.0.0.1:8000";

const AUX_KEYS = new Set(["chieuCao", "canNang"]);

const EAV_FALLBACK = {
  age: "tuoi",
  systolic: "huyetApTamThu",
  diastolic: "huyetApTamTruong",
  fasting_glucose: "duongHuyet",
  hba1c: "hba1c",
  total_cholesterol: "cholesterol",
  ldl: "ldl",
  hdl: "hdl",
  creatinine: "creatinine",
  waist: "vongEo",
  smoking_status: "hutThuoc",
  exercise_minutes_per_week: "soPhutVanDongMoiTuan",
  alcohol: "uongRuouBia",
  diabetes_status: "tieuDuong",
  family_history_diabetes: "giaDinhTieuDuong",
  family_history_hypertension: "giaDinhCaoHuyetAp",
  family_history_cardiovascular: "giaDinhTimMach",
};

export default function MainRiskPage() {
  const [selectedPlugin, setSelectedPlugin] = useState(null);
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

  // ── Dùng ref để giữ healthProfile luôn mới nhất mà không tạo re-render loop ──
  // buildFormFromMetadata đọc từ ref thay vì closure → loadPlugin không cần
  // thêm buildFormFromMetadata vào dep → tránh vòng lặp effect vô tận
  const healthProfileRef = useRef(healthProfile);
  useEffect(() => {
    healthProfileRef.current = healthProfile;
  }, [healthProfile]);

  // ── Metadata-driven form init ──────────────────────────────────────────────
  const buildFormFromMetadata = useCallback((fields) => {
    const data = {};
    const hp = healthProfileRef.current;

    fields.forEach((field) => {
      const key = field.key || field.code;
      data[key] = field.default !== undefined
        ? field.default
        : (field.type === "boolean" ? false : "");
    });

    data.chieuCao = "";
    data.canNang = "";

    if (!hp) return data;

    const hardCols = ["tuoi", "gioiTinh", "chieuCao", "canNang", "bmi", "vongEo",
      "huyetApTamThu", "huyetApTamTruong", "hutThuoc", "uongRuouBia",
      "soPhutVanDongMoiTuan"];
    hardCols.forEach(k => {
      if (hp[k] !== undefined) data[k] = hp[k];
    });

    fields.forEach((field) => {
      const key = field.key || field.code;
      const hpKey = field.health_profile_key || EAV_FALLBACK[key] || key;
      let value = hp[hpKey];

      if (value === undefined || value === null) return;

      if (key === "smoking_status") {
        const map = { "Chưa bao giờ": "never", "Đã bỏ": "former", "Đang hút": "current", "Không": "never" };
        value = map[value] ?? value;
      }
      if (key === "alcohol") {
        const map = { "Không": "0", "Thỉnh thoảng": "0", "Thường xuyên": "1", "Nhiều": "1" };
        value = map[value] ?? "0";
      }
      if (key === "diabetes_status" || key === "htn_status") {
        if (typeof value === "boolean") value = value ? "yes" : "no";
      }

      if (field.type === "boolean") data[key] = Boolean(value);
      else if (field.type === "number") data[key] = Number(value);
      else data[key] = value;
    });

    const h = parseFloat(data.chieuCao);
    const w = parseFloat(data.canNang);
    if (h > 0 && w > 0) data.bmi = Number((w / (h / 100) ** 2).toFixed(1));

    return data;
  }, []); // ← dep rỗng vì đọc healthProfile qua ref, không qua closure

  // ── Data loading ───────────────────────────────────────────────────────────

  const fetchHealthProfile = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/health-profile/${tenDangNhap}`);
      if (res.data.data) setHealthProfile(res.data.data);
    } catch (e) {
      console.error("Fetch health profile error:", e);
    } finally {
      setProfileLoaded(true);
    }
  }, [tenDangNhap]);

  const loadPluginsList = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/plugins`);
      const raw = res.data.plugins || [];
      const normalized = raw.map(p =>
        typeof p === "string" ? { id: p, name: p, icon: "" } : p
      );
      setPlugins(normalized);
      // Dùng functional update: không cần selectedPlugin trong dep
      setSelectedPlugin(prev => prev ?? (normalized.length > 0 ? normalized[0].id : null));
    } catch (e) {
      console.error("Load plugins list error:", e);
    }
  }, []); // ← dep rỗng, chỉ chạy 1 lần duy nhất

  const loadPlugin = useCallback(async (pluginId) => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/plugins/${pluginId}`);
      const pluginData = res.data;
      setPlugin(pluginData);
      setFormData(buildFormFromMetadata(pluginData.fields));
      setRiskResult(null);
      setErrors({});
    } catch (e) {
      console.error("Load plugin error:", e);
    } finally {
      setLoading(false);
    }
  }, [buildFormFromMetadata]); // buildFormFromMetadata ổn định (dep rỗng) → loadPlugin cũng ổn định

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadPluginsList(); }, [loadPluginsList]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (tenDangNhap) fetchHealthProfile();
    else setProfileLoaded(true);
  }, [tenDangNhap, fetchHealthProfile]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (profileLoaded && selectedPlugin) loadPlugin(selectedPlugin);
  }, [selectedPlugin, profileLoaded, loadPlugin]);

  // ── Input handling ─────────────────────────────────────────────────────────

  const handleChange = async (fieldOrKey, value) => {
    const key = typeof fieldOrKey === "object"
      ? (fieldOrKey.key || fieldOrKey.code)
      : fieldOrKey;
    const updated = { ...formData, [key]: value };

    if (key === "chieuCao" || key === "canNang") {
      const h = parseFloat(updated.chieuCao);
      const w = parseFloat(updated.canNang);
      updated.bmi = h > 0 && w > 0
        ? Number((w / (h / 100) ** 2).toFixed(1))
        : "";
    }

    setFormData(updated);

    const isPluginField = plugin?.fields?.some(f => (f.key || f.code) === key);
    if (isPluginField) {
      try {
        const res = await axios.post(
          `${API_BASE_URL}/plugins/${selectedPlugin}/validate-field/${key}`,
          updated
        );
        setErrors(prev => ({
          ...prev,
          [key]: res.data.is_valid ? "" : (res.data.errors?.[0]?.message || ""),
        }));
      } catch (e) {
        console.error("Validate field error:", e);
      }
    }
  };

  // ── Risk analysis ──────────────────────────────────────────────────────────

  const handleAnalyzeClick = () => {
    if (!plugin) return;

    const missing = plugin.fields
      .filter(f => {
        const key = f.key || f.code;
        const val = formData[key];
        return f.required && (val === undefined || val === null || (f.type !== "boolean" && val === ""));
      })
      .map(f => f.label);

    if (missing.length > 0) {
      alert(`⚠️ Thiếu thông tin bắt buộc:\n- ${missing.join("\n- ")}`);
      return;
    }

    calculateRisk(formData);
  };

  const calculateRisk = async (currentData) => {
    try {
      setIsCalculating(true);

      const pluginKeys = new Set(plugin?.fields?.map(f => f.key || f.code) || []);
      const cleanData = {};
      for (const [k, v] of Object.entries(currentData)) {
        if (pluginKeys.has(k) && !AUX_KEYS.has(k) && v !== "" && v !== null && v !== undefined) {
          cleanData[k] = v;
        }
      }

      const response = await axios.post(
        `${API_BASE_URL}/plugins/${selectedPlugin}/score?ten_dang_nhap=${tenDangNhap || ""}`,
        cleanData
      );

      setRiskResult(response.data);
      setErrors({});

      if (tenDangNhap) {
        try {
          const pr = await axios.get(`${API_BASE_URL}/health-profile/${tenDangNhap}`);
          if (pr.data.data) setHealthProfile(pr.data.data);
        } catch {
          // non-blocking
        }
      }
    } catch (error) {
      setRiskResult(null);
      let msg = "Không thể phân tích dữ liệu.";
      if (error.response?.data?.detail?.errors) {
        msg = error.response.data.detail.errors.map(e => `- ${e.field}: ${e.message}`).join("\n");
        msg = `Hệ thống từ chối phân tích:\n\n${msg}`;
      } else if (error.response?.data?.detail) {
        msg = typeof error.response.data.detail === "string"
          ? error.response.data.detail
          : JSON.stringify(error.response.data.detail);
      }
      alert("❌ LỖI:\n" + msg);
    } finally {
      setIsCalculating(false);
    }
  };

  // ── UI helpers ─────────────────────────────────────────────────────────────

  const riskColor = (score) =>
    score > 60 ? "#EF4444" : score > 30 ? "#F59E0B" : "#22C55E";

  const riskColorByLevel = (level) => {
    const l = String(level).toLowerCase();
    return l.includes("high") || l.includes("cao") ? "#EF4444"
      : l.includes("medium") || l.includes("trung") ? "#F59E0B"
        : "#22C55E";
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!profileLoaded || (loading && !plugin)) {
    return <div style={{ padding: "40px", textAlign: "center", color: "#64748B" }}>Đang tải cấu hình dữ liệu y tế...</div>;
  }

  const disease = plugin?.disease_info || {};
  if (riskResult) {
    console.log("🔍 riskResult structure:", JSON.stringify(riskResult, null, 2));
  }

  return (
    <div style={{ width: "100%", maxWidth: "1200px", margin: "0 auto" }}>
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
          transition: all 0.2s;
        }
        .custom-input:focus {
          outline: none;
          border-color: #2563EB;
          box-shadow: 0 0 0 3px rgba(37,99,235,.15);
        }
        select.custom-input option { color: #1E293B !important; background: #FFF !important; }
        .btn-analyze {
          height: 56px; font-size: 18px; font-weight: 700; border-radius: 12px;
          background: #2563EB; color: white; border: none; cursor: pointer;
          transition: all 0.2s; box-shadow: 0 4px 6px -1px rgba(37,99,235,.2);
        }
        .btn-analyze:hover  { transform: translateY(-2px); background: #1D4ED8; }
        .btn-analyze:disabled { background: #94A3B8; cursor: not-allowed; transform: none; }
      `}</style>

      {/* HEADER */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        background: "#FFF", padding: "20px 24px", borderRadius: "12px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)", marginBottom: "32px"
      }}>
        <div>
          <h2 style={{ margin: 0, color: "#1E293B", fontSize: "20px", fontWeight: 700 }}>
            {disease.icon ? `${disease.icon} ` : "🫁 "}{disease.name || "Đánh giá nguy cơ"}
          </h2>
          <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#64748B" }}>
            {disease.description}
          </p>
        </div>

        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <span style={{ fontSize: "14px", fontWeight: 600, color: "#475569" }}>Mô hình đích:</span>
          <select
            value={selectedPlugin || ""}
            onChange={(e) => setSelectedPlugin(e.target.value)}
            className="custom-input"
            style={{ width: "240px", padding: "8px 12px" }}
          >
            {plugins.map(p => (
              <option key={p.id} value={p.id}>
                {p.icon ? `${p.icon} ` : ""}{p.name || p.id}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* FORM */}
      {!loading && plugin && (
        <div style={{
          background: "white", padding: "32px", borderRadius: "16px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)", border: "1px solid #E2E8F0"
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
            {plugin.fields.map((field) => {
              const key = field.key || field.code;

              if (key === "bmi") return (
                <div key="bmi_group" style={{
                  gridColumn: "1 / -1", background: "#F8FAFC",
                  padding: "16px", borderRadius: "8px", border: "1px dashed #CBD5E1"
                }}>
                  <p style={{ margin: "0 0 10px 0", fontSize: "13px", color: "#64748B", fontStyle: "italic" }}>
                    Chỉ số BMI được tự động tính từ chiều cao và cân nặng.
                  </p>
                  <div style={{ display: "flex", gap: "12px", marginBottom: "10px" }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontWeight: 600, color: "#475569", fontSize: "14px", display: "block", marginBottom: 6 }}>
                        Chiều cao (cm)
                      </label>
                      <input type="number" className="custom-input"
                        value={formData.chieuCao || ""}
                        onChange={e => handleChange("chieuCao", e.target.value === "" ? "" : Number(e.target.value))} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontWeight: 600, color: "#475569", fontSize: "14px", display: "block", marginBottom: 6 }}>
                        Cân nặng (kg)
                      </label>
                      <input type="number" className="custom-input"
                        value={formData.canNang || ""}
                        onChange={e => handleChange("canNang", e.target.value === "" ? "" : Number(e.target.value))} />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontWeight: 600, color: "#0F766E", fontSize: "14px", display: "block", marginBottom: 6 }}>
                      BMI (tự động)
                    </label>
                    <input type="number" readOnly className="custom-input"
                      value={formData.bmi || ""}
                      style={{ background: "#F0FDF4 !important", color: "#0F766E", fontWeight: 700 }} />
                  </div>
                </div>
              );

              return (
                <div key={key} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <label style={{ fontWeight: 600, color: "#475569", fontSize: "14px" }}>
                    {field.label}
                    {field.unit && <span style={{ color: "#94A3B8", fontWeight: 400 }}> ({field.unit})</span>}
                    {field.required && <span style={{ color: "#EF4444" }}> *</span>}
                  </label>

                  {field.type === "number" && (
                    <input type="number" className="custom-input"
                      value={formData[key] ?? ""}
                      min={field.min} max={field.max} step={field.step ?? 1}
                      onChange={e => handleChange(field, e.target.value === "" ? "" : Number(e.target.value))} />
                  )}

                  {field.type === "select" && (
                    <select className="custom-input"
                      value={formData[key] ?? ""}
                      onChange={e => handleChange(field, e.target.value)}>
                      <option value="">-- Chọn --</option>
                      {field.options?.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  )}

                  {field.type === "boolean" && (
                    <label style={{
                      display: "flex", alignItems: "center", gap: "10px", padding: "12px",
                      border: `1px solid ${formData[key] ? "#2563EB" : "#D1D5DB"}`,
                      borderRadius: "8px", cursor: "pointer",
                      background: formData[key] ? "#EFF6FF" : "#FFF", transition: "all 0.2s"
                    }}>
                      <input type="checkbox" checked={!!formData[key]}
                        onChange={e => handleChange(field, e.target.checked)}
                        style={{ width: 18, height: 18 }} />
                      <span style={{
                        color: formData[key] ? "#1E40AF" : "#475569", fontSize: 15,
                        fontWeight: formData[key] ? 600 : 500
                      }}>
                        Kích hoạt yếu tố này
                      </span>
                    </label>
                  )}

                  {field.type === "text" && (
                    <input type="text" className="custom-input"
                      value={formData[key] ?? ""}
                      onChange={e => handleChange(field, e.target.value)} />
                  )}

                  {errors[key] && (
                    <div style={{ color: "#EF4444", fontSize: "13px", fontWeight: 500 }}>{errors[key]}</div>
                  )}
                </div>
              );
            })}
          </div>

          <button className="btn-analyze" onClick={handleAnalyzeClick}
            disabled={isCalculating} style={{ width: "100%", marginTop: "32px" }}>
            {isCalculating ? "⏳ Đang phân tích chỉ số liên tầng..." : "🩺 Phân tích nguy cơ"}
          </button>
        </div>
      )}

      {/* KẾT QUẢ DUAL-ENGINE */}
      {riskResult && (
        <div style={{ marginTop: "32px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>

          {/* Rule-based */}
          <div style={{
            background: "white", padding: "24px", borderRadius: "16px",
            border: "1px solid #E2E8F0", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)"
          }}>
            <h3 style={{ margin: "0 0 16px 0", color: "#334155", display: "flex", justifyContent: "space-between" }}>
              <span>📋 Rule-based Engine</span>
              <span style={{ color: "#2563EB", fontWeight: 700 }}>
                {(riskResult.rule_based?.score ?? 0).toFixed(1)} Điểm
              </span>
            </h3>
            <div style={{ width: "100%", height: 12, background: "#F1F5F9", borderRadius: 6, overflow: "hidden", marginBottom: 16 }}>
              <div style={{
                width: `${Math.min(riskResult.rule_based?.score ?? 0, 100)}%`, height: "100%",
                background: riskColor(riskResult.rule_based?.score ?? 0), transition: "width 1s"
              }} />
            </div>
            <p style={{ margin: "0 0 12px 0", color: "#64748B" }}>
              Phân tầng nguy cơ:{" "}
              <strong style={{ color: riskColorByLevel(riskResult.rule_based?.risk_level) }}>
                {String(riskResult.rule_based?.risk_level ?? "").toUpperCase()}
              </strong>
            </p>
            {riskResult.rule_based?.matched_rules?.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <p style={{ margin: "0 0 8px 0", fontSize: 13, fontWeight: 600, color: "#475569" }}>
                  Yếu tố kích hoạt:
                </p>
                {riskResult.rule_based.matched_rules.map((r, i) => (
                  <div key={i} style={{
                    fontSize: 13, color: "#64748B", padding: "4px 0",
                    borderBottom: "1px solid #F1F5F9"
                  }}>
                    • {r.description || r.id}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI Model */}
          <div style={{
            background: "white", padding: "24px", borderRadius: "16px",
            border: "1px solid #E2E8F0", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)"
          }}>
            <h3 style={{ margin: "0 0 16px 0", color: "#334155", display: "flex", justifyContent: "space-between" }}>
              <span>🧠 AI Model</span>
              {riskResult.ai_based?.status === "READY"
                ? <span style={{ color: "#10B981", fontWeight: 700 }}>
                  {((riskResult.ai_based?.probability ?? 0) * 100).toFixed(1)}%
                </span>
                : <span style={{ color: "#F59E0B", fontSize: 14 }}>PARTIAL</span>
              }
            </h3>
            {riskResult.ai_based?.status === "READY" ? (
              <>
                <div style={{ width: "100%", height: 12, background: "#F1F5F9", borderRadius: 6, overflow: "hidden", marginBottom: 16 }}>
                  <div style={{
                    width: `${(riskResult.ai_based?.probability ?? 0) * 100}%`, height: "100%",
                    background: riskColor((riskResult.ai_based?.probability ?? 0) * 100),
                    transition: "width 1s"
                  }} />
                </div>
                <p style={{ margin: "0 0 8px 0", color: "#64748B" }}>
                  Phân tầng:{" "}
                  <strong style={{ color: riskColorByLevel(riskResult.ai_based?.risk_level) }}>
                    {String(riskResult.ai_based?.risk_level ?? "").toUpperCase()}
                  </strong>
                </p>
                <p style={{ margin: 0, color: "#64748B" }}>
                  Độ tin cậy: <strong style={{ color: "#2563EB" }}>{riskResult.ai_based?.confidence ?? 0}%</strong>
                </p>
              </>
            ) : (
              <p style={{ margin: 0, fontSize: 14, color: "#64748B", lineHeight: 1.6 }}>
                Cần điền đầy đủ các chỉ số sinh hóa nâng cao trong mục{" "}
                <strong>Hồ sơ sức khỏe</strong> để kích hoạt phân tích AI.
              </p>
            )}
          </div>

          {/* Khuyến nghị */}
          {riskResult.recommendations?.length > 0 && (
            <div style={{
              gridColumn: "1 / -1", background: "#FFFBEB", padding: "24px",
              borderRadius: "16px", border: "1px solid #FDE68A"
            }}>
              <h3 style={{ margin: "0 0 12px 0", color: "#92400E" }}>💡 Khuyến nghị</h3>
              {riskResult.recommendations.map((rec, i) => {
                const text = typeof rec === "string" ? rec : rec.text;
                return (
                  <div key={i} style={{
                    padding: "8px 0",
                    borderBottom: i < riskResult.recommendations.length - 1 ? "1px solid #FEF3C7" : "none",
                    color: "#78350F", fontSize: 14
                  }}>
                    {i + 1}. {text}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}