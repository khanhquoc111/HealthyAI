// frontend/src/TestPluginPage.jsx
import { useEffect, useState } from "react";
import axios from "axios";

const API_BASE_URL = "http://127.0.0.1:8000";

export default function TestPluginPage() {
  const [selectedPlugin, setSelectedPlugin] = useState("hypertension");
  const [plugins, setPlugins] = useState([]);
  const [plugin, setPlugin] = useState(null);
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [riskResult, setRiskResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadPluginsList(); }, []);
  useEffect(() => { loadPlugin(selectedPlugin); }, [selectedPlugin]);

  useEffect(() => {
    if (!plugin || Object.keys(formData).length === 0) return;
    const timeout = setTimeout(() => calculateRisk(formData), 600);
    return () => clearTimeout(timeout);
  }, [formData, plugin]);

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
      initializeForm(pluginData.fields);
      setRiskResult(null);
    } catch (error) {
      console.error(`Load plugin ${pluginName} error:`, error);
    } finally {
      setLoading(false);
    }
  };

  const initializeForm = (fields) => {
    const initialData = {};
    fields.forEach((field) => {
      initialData[field.key] = field.default !== undefined ? field.default : "";
    });
    setFormData(initialData);
    setErrors({});
  };

  const handleChange = async (field, value) => {
    const updated = { ...formData, [field.key]: value };
    setFormData(updated);
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
      console.error("Validate field error:", e);
    }
  };

  const calculateRisk = async (currentData) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/plugins/${selectedPlugin}/score`,
        currentData
      );
      setRiskResult(response.data);
    } catch (error) {
      console.error("Calculate risk error:", error);
      if (error.response?.data) {
        console.error("Error detail:", error.response.data);
      }
    }
  };

  if (loading || !plugin) return <div style={{ padding: "24px" }}>Đang tải plugin...</div>;

  const disease = plugin.disease_info || plugin;

  const getRiskColor = (level) => level === 'high' ? '#ef4444' : level === 'medium' ? '#f97316' : '#22c55e';
  const getRiskLabel = (level) => level === 'high' ? 'CAO' : level === 'medium' ? 'TRUNG BÌNH' : 'THẤP';

  return (
    <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto", fontFamily: "Segoe UI, Arial, sans-serif", backgroundColor: "#fafbfc" }}>
      <h1 style={{ color: "#1e293b" }}>🏥 Hệ thống Đánh giá Nguy cơ Bệnh Mạn tính</h1>

      <div style={{ marginBottom: "24px" }}>
        <label><strong>Chọn Bệnh:</strong> </label>
        <select value={selectedPlugin} onChange={(e) => setSelectedPlugin(e.target.value)} style={{ padding: "10px", marginLeft: "10px" }}>
          {plugins.map(p => (
            <option key={p} value={p}>
              {p === "hypertension" ? "🩸 Tăng huyết áp" : 
               p === "diabetes" ? "🍬 Tiểu đường" : 
               p === "gout" ? "🔴 Gout" : p}
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
            <input type="number" value={formData[field.key] ?? ""} onChange={(e) => handleChange(field, e.target.value === "" ? "" : Number(e.target.value))} 
              style={{ width: "300px", padding: "10px", border: errors[field.key] ? "2px solid red" : "1px solid #ccc" }} />
          )}

          {field.type === "select" && (
            <select value={formData[field.key] ?? ""} onChange={(e) => handleChange(field, e.target.value)} style={{ width: "300px", padding: "10px" }}>
              <option value="">-- Chọn --</option>
              {field.options?.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          )}

          {field.type === "boolean" && (
            <input type="checkbox" checked={!!formData[field.key]} onChange={(e) => handleChange(field, e.target.checked)} />
          )}

          {errors[field.key] && <div style={{color: "red"}}>{errors[field.key]}</div>}
        </div>
      ))}

      <hr />

      {/* KẾT QUẢ */}
      {riskResult && (
        <div style={{ background: "#f8fafc", padding: "20px", borderRadius: "12px" }}>
          <h2>Kết quả Đánh giá Nguy cơ</h2>
          <p><strong>Điểm:</strong> {riskResult.final_score} / 100</p>
          <p><strong>Mức nguy cơ:</strong> <span style={{color: getRiskColor(riskResult.risk_level), fontWeight: "bold"}}>{getRiskLabel(riskResult.risk_level)}</span></p>

          {riskResult.summary && <p><strong>Tóm tắt:</strong> {riskResult.summary}</p>}

          {riskResult.explanations?.length > 0 && (
            <div>
              <strong>Giải thích:</strong>
              <ul>{riskResult.explanations.map((exp, i) => <li key={i}>{exp}</li>)}</ul>
            </div>
          )}

          {riskResult.risk_factors?.length > 0 && (
            <div>
              <strong>Yếu tố nguy cơ:</strong>
              <ul>{riskResult.risk_factors.map((f, i) => <li key={i}>{typeof f === 'string' ? f : f.description}</li>)}</ul>
            </div>
          )}

          {riskResult.protective_factors?.length > 0 && (
            <div>
              <strong>Yếu tố bảo vệ:</strong>
              <ul>{riskResult.protective_factors.map((f, i) => <li key={i}>{typeof f === 'string' ? f : f.description}</li>)}</ul>
            </div>
          )}

          {riskResult.recommendations?.length > 0 && (
            <div>
              <strong>Khuyến nghị:</strong>
              <ul>
                {riskResult.recommendations.map(rec => (
                  <li key={rec.id}><strong>{rec.action_type}:</strong> {rec.text}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <details>
        <summary>Debug</summary>
        <pre>{JSON.stringify(riskResult, null, 2)}</pre>
      </details>
    </div>
  );
}