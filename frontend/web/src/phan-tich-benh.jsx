// frontend/src/MainRiskPage.jsx
import { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import "./css/phan-tich-benh.css";

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

// ── UI helpers ──────────────────────────────────────────────────
function riskColorClass(score) {
  return score > 60 ? "high" : score > 30 ? "mid" : "low";
}

function riskColorClassByLevel(level) {
  const l = String(level).toLowerCase();
  return l.includes("high") || l.includes("cao") ? "high"
    : l.includes("medium") || l.includes("trung") ? "mid"
    : "low";
}

function riskHexColor(score) {
  return score > 60 ? "#EF4444" : score > 30 ? "#F59E0B" : "#22C55E";
}

// ── Sub-components ──────────────────────────────────────────────
function EmptyResults() {
  return (
    <div className="ptb-results-empty">
      <div className="ptb-empty-icon">🩺</div>
      <p className="ptb-empty-title">Kết quả xuất hiện tại đây</p>
      <p className="ptb-empty-desc">
        Điền đầy đủ thông tin và nhấn <strong>Phân tích nguy cơ</strong> để
        nhận kết quả từ Rule Engine và AI Model.
      </p>
    </div>
  );
}

function RuleBasedCard({ data }) {
  const cls = riskColorClass(data?.score ?? 0);
  const levelCls = riskColorClassByLevel(data?.risk_level ?? "");

  return (
    <div className="ptb-result-card">
      <div className="ptb-result-card-header">
        <span className="ptb-result-engine-label">
          <span className="ptb-result-engine-icon">📋</span>
          Rule-based Engine
        </span>
        <span
          className="ptb-result-score"
          style={{ color: riskHexColor(data?.score ?? 0) }}
        >
          {(data?.score ?? 0).toFixed(1)}
          <span style={{ fontSize: "0.7em", fontWeight: 500, color: "#94a3b8", marginLeft: 2 }}>điểm</span>
        </span>
      </div>

      <div className="ptb-result-card-body">
        <div className="ptb-score-bar-track">
          <div
            className={`ptb-score-bar-fill ptb-score-bar-fill--${cls}`}
            style={{ width: `${Math.min(data?.score ?? 0, 100)}%` }}
          />
        </div>

        <div className="ptb-risk-level-row">
          <span className="ptb-risk-level-label">Phân tầng nguy cơ</span>
          <span className={`ptb-risk-pill ptb-risk-pill--${levelCls}`}>
            {String(data?.risk_level ?? "").toUpperCase()}
          </span>
        </div>

        {data?.matched_rules?.length > 0 && (
          <div className="ptb-rules-section">
            <p className="ptb-rules-heading">Yếu tố kích hoạt</p>
            {data.matched_rules.map((r, i) => (
              <div key={i} className="ptb-rule-item">
                <span className="ptb-rule-dot" />
                {r.description || r.id}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AIModelCard({ data }) {
  const isReady = data?.status === "READY";
  const pct = (data?.probability ?? 0) * 100;
  const cls = riskColorClass(pct);
  const levelCls = riskColorClassByLevel(data?.risk_level ?? "");

  return (
    <div className="ptb-result-card">
      <div className="ptb-result-card-header">
        <span className="ptb-result-engine-label">
          <span className="ptb-result-engine-icon">🧠</span>
          AI Model
        </span>
        {isReady
          ? <span className="ptb-result-score" style={{ color: riskHexColor(pct) }}>
              {pct.toFixed(1)}
              <span style={{ fontSize: "0.7em", fontWeight: 500, color: "#94a3b8", marginLeft: 2 }}>%</span>
            </span>
          : <span className="ptb-risk-pill ptb-risk-pill--mid">PARTIAL</span>
        }
      </div>

      <div className="ptb-result-card-body">
        {isReady ? (
          <>
            <div className="ptb-score-bar-track">
              <div
                className={`ptb-score-bar-fill ptb-score-bar-fill--${cls}`}
                style={{ width: `${pct}%` }}
              />
            </div>

            <div className="ptb-risk-level-row">
              <span className="ptb-risk-level-label">Phân tầng</span>
              <span className={`ptb-risk-pill ptb-risk-pill--${levelCls}`}>
                {String(data?.risk_level ?? "").toUpperCase()}
              </span>
            </div>

            <div className="ptb-confidence-row">
              <span>Độ tin cậy mô hình</span>
              <span className="ptb-confidence-val">{data?.confidence ?? 0}%</span>
            </div>
          </>
        ) : (
          <div className="ptb-ai-partial">
            <span className="ptb-ai-partial-icon">⚠️</span>
            <p className="ptb-ai-partial-text">
              Cần điền đầy đủ các chỉ số sinh hóa nâng cao trong mục{" "}
              <strong>Hồ sơ sức khỏe</strong> để kích hoạt phân tích AI.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function RecommendationsCard({ recs }) {
  if (!recs?.length) return null;
  return (
    <div className="ptb-rec-card">
      <div className="ptb-rec-card-header">
        <span style={{ fontSize: "1.1rem" }}>💡</span>
        <h4 className="ptb-rec-title">Khuyến nghị cá nhân hóa</h4>
      </div>
      <div className="ptb-rec-body">
        {recs.map((rec, i) => {
          const text = typeof rec === "string" ? rec : rec.text;
          return (
            <div key={i} className="ptb-rec-item">
              <span className="ptb-rec-num">{i + 1}</span>
              {text}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────
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

  const healthProfileRef = useRef(healthProfile);
  useEffect(() => {
    healthProfileRef.current = healthProfile;
  }, [healthProfile]);

  // ── Metadata-driven form init ──────────────────────────────────
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
      "soPhutVanDongMoiTuan", "anMan"];
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
  }, []);

  // ── Data loading ───────────────────────────────────────────────
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
      setSelectedPlugin(prev => prev ?? (normalized.length > 0 ? normalized[0].id : null));
    } catch (e) {
      console.error("Load plugins list error:", e);
    }
  }, []);

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
  }, [buildFormFromMetadata]);

  // ── Lifecycle ──────────────────────────────────────────────────
  useEffect(() => { loadPluginsList(); }, [loadPluginsList]);

  useEffect(() => {
    if (tenDangNhap) fetchHealthProfile();
    else setProfileLoaded(true);
  }, [tenDangNhap, fetchHealthProfile]);

  useEffect(() => {
    if (profileLoaded && selectedPlugin) loadPlugin(selectedPlugin);
  }, [selectedPlugin, profileLoaded, loadPlugin]);

  // ── Input handling ─────────────────────────────────────────────
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

  // ── Risk analysis ──────────────────────────────────────────────
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

  // ── Loading state ──────────────────────────────────────────────
  if (!profileLoaded || (loading && !plugin)) {
    return (
      <div className="ptb-page">
        <div className="ptb-header">
          <div className="ptb-header-mesh">
            <div className="ptb-mesh-blob ptb-mesh-blob--1" />
            <div className="ptb-mesh-blob ptb-mesh-blob--2" />
          </div>
          <div className="ptb-header-inner">
            <div className="ptb-header-text">
              <div className="ptb-breadcrumb">
                <span className="ptb-breadcrumb-dot" />
                Phân Tích Bệnh
              </div>
              <div className="ptb-skeleton" style={{ width: 280, height: 32, marginBottom: 10 }} />
              <div className="ptb-skeleton" style={{ width: 420, height: 18 }} />
            </div>
          </div>
        </div>
        <div className="ptb-body">
          <div className="ptb-form-card">
            <div className="ptb-form-card-header">
              <div className="ptb-skeleton" style={{ width: 200, height: 22 }} />
            </div>
            <div className="ptb-form-body">
              <div className="ptb-fields-grid">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="ptb-field">
                    <div className="ptb-skeleton" style={{ width: 100, height: 14, marginBottom: 4 }} />
                    <div className="ptb-skeleton" style={{ width: "100%", height: 42 }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="ptb-results-panel">
            <EmptyResults />
          </div>
        </div>
      </div>
    );
  }

  const disease = plugin?.disease_info || {};
  const hasProfile = !!healthProfile;

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="ptb-page">

      {/* ── PAGE HEADER ── */}
      <div className="ptb-header">
        <div className="ptb-header-mesh" aria-hidden="true">
          <div className="ptb-mesh-blob ptb-mesh-blob--1" />
          <div className="ptb-mesh-blob ptb-mesh-blob--2" />
        </div>

        <div className="ptb-header-inner">
          <div className="ptb-header-text">
            <div className="ptb-breadcrumb">
              <span className="ptb-breadcrumb-dot" />
              Phân Tích Bệnh Mạn Tính
            </div>
            <h1 className="ptb-page-title">
              Đánh giá nguy cơ{" "}
              <em>{disease.name || "bệnh mạn tính"}</em>
            </h1>
            <p className="ptb-page-desc">
              {disease.description || "Kết hợp Rule Engine và AI Model để phân tích nguy cơ chính xác và có thể giải thích."}
            </p>
          </div>

          {/* Plugin tab selector */}
          {plugins.length > 0 && (
            <div className="ptb-plugin-selector">
              <span className="ptb-selector-label">Mô hình</span>
              <div className="ptb-plugin-tabs">
                {plugins.map(p => (
                  <button
                    key={p.id}
                    className={`ptb-plugin-tab${selectedPlugin === p.id ? " ptb-plugin-tab--active" : ""}`}
                    onClick={() => setSelectedPlugin(p.id)}
                  >
                    {p.icon && <span>{p.icon}</span>}
                    {p.name || p.id}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="ptb-body">

        {/* ── FORM CARD (left) ── */}
        <div className="ptb-form-card">
          <div className="ptb-form-card-header">
            <div className="ptb-form-title-row">
              <div className="ptb-form-disease-icon">
                {disease.icon || "🩺"}
              </div>
              <div>
                <h2 className="ptb-form-title">
                  {disease.name || "Thông số đánh giá"}
                </h2>
                <p className="ptb-form-subtitle">
                  Điền các chỉ số bên dưới để nhận kết quả phân tích
                </p>
              </div>
            </div>

            <div className={`ptb-profile-badge${hasProfile ? "" : " ptb-profile-badge--empty"}`}>
              {hasProfile ? (
                <>
                  <span className="ptb-profile-badge-dot" />
                  Hồ sơ đã tải
                </>
              ) : (
                <>⚠️ Chưa có hồ sơ</>
              )}
            </div>
          </div>

          <div className="ptb-form-body">
            <div className="ptb-fields-grid">
              {plugin?.fields?.map((field) => {
                const key = field.key || field.code;

                // ── BMI group ──
                if (key === "bmi") return (
                  <div key="bmi_group" className="ptb-bmi-group ptb-field--full">
                    <p className="ptb-bmi-hint">
                      <span>ℹ️</span>
                      Chỉ số BMI được tính tự động từ chiều cao và cân nặng.
                    </p>
                    <div className="ptb-bmi-row">
                      <div className="ptb-field">
                        <label className="ptb-label">Chiều cao <span className="ptb-label-unit">(cm)</span></label>
                        <input
                          type="number"
                          className="ptb-input"
                          value={formData.chieuCao || ""}
                          onChange={e => handleChange("chieuCao", e.target.value === "" ? "" : Number(e.target.value))}
                        />
                      </div>
                      <div className="ptb-field">
                        <label className="ptb-label">Cân nặng <span className="ptb-label-unit">(kg)</span></label>
                        <input
                          type="number"
                          className="ptb-input"
                          value={formData.canNang || ""}
                          onChange={e => handleChange("canNang", e.target.value === "" ? "" : Number(e.target.value))}
                        />
                      </div>
                    </div>
                    <div className="ptb-bmi-result">
                      <label className="ptb-label" style={{ color: "#0f766e" }}>
                        BMI <span className="ptb-label-unit">(tự động)</span>
                      </label>
                      <input
                        type="number"
                        readOnly
                        className="ptb-input ptb-input--readonly"
                        value={formData.bmi || ""}
                      />
                    </div>
                  </div>
                );

                // ── Boolean ──
                if (field.type === "boolean") return (
                  <div key={key} className="ptb-field">
                    <label className="ptb-label">
                      {field.label}
                      {field.required && <span className="ptb-label-required"> *</span>}
                    </label>
                    <label className={`ptb-checkbox-label${formData[key] ? " ptb-checkbox-label--checked" : ""}`}>
                      <input
                        type="checkbox"
                        checked={!!formData[key]}
                        onChange={e => handleChange(field, e.target.checked)}
                      />
                      <span className={`ptb-checkbox-text${formData[key] ? " ptb-checkbox-text--checked" : ""}`}>
                        Kích hoạt yếu tố này
                      </span>
                    </label>
                    {errors[key] && <span className="ptb-field-error">⚠ {errors[key]}</span>}
                  </div>
                );

                // ── Select ──
                if (field.type === "select") return (
                  <div key={key} className="ptb-field">
                    <label className="ptb-label">
                      {field.label}
                      {field.unit && <span className="ptb-label-unit"> ({field.unit})</span>}
                      {field.required && <span className="ptb-label-required"> *</span>}
                    </label>
                    <select
                      className={`ptb-select${errors[key] ? " ptb-input--error" : ""}`}
                      value={formData[key] ?? ""}
                      onChange={e => handleChange(field, e.target.value)}
                    >
                      <option value="">-- Chọn --</option>
                      {field.options?.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    {errors[key] && <span className="ptb-field-error">⚠ {errors[key]}</span>}
                  </div>
                );

                // ── Number / Text ──
                return (
                  <div key={key} className="ptb-field">
                    <label className="ptb-label">
                      {field.label}
                      {field.unit && <span className="ptb-label-unit"> ({field.unit})</span>}
                      {field.required && <span className="ptb-label-required"> *</span>}
                    </label>
                    <input
                      type={field.type === "number" ? "number" : "text"}
                      className={`ptb-input${errors[key] ? " ptb-input--error" : ""}`}
                      value={formData[key] ?? ""}
                      min={field.min}
                      max={field.max}
                      step={field.step ?? 1}
                      onChange={e => handleChange(field, field.type === "number"
                        ? (e.target.value === "" ? "" : Number(e.target.value))
                        : e.target.value
                      )}
                    />
                    {errors[key] && <span className="ptb-field-error">⚠ {errors[key]}</span>}
                  </div>
                );
              })}
            </div>

            <button
              className="ptb-analyze-btn"
              onClick={handleAnalyzeClick}
              disabled={isCalculating}
            >
              {isCalculating
                ? <><span>⏳</span> Đang phân tích chỉ số liên tầng...</>
                : <><span>🩺</span> Phân tích nguy cơ</>
              }
            </button>
          </div>
        </div>

        {/* ── RESULTS PANEL (right) ── */}
        <div className="ptb-results-panel">
          {!riskResult ? (
            <EmptyResults />
          ) : (
            <>
              <RuleBasedCard data={riskResult.rule_based} />
              <AIModelCard data={riskResult.ai_based} />
              <RecommendationsCard recs={riskResult.recommendations} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}