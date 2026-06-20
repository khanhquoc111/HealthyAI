import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./css/lich-su-tra-cuu.css";

const API_BASE_URL = "http://127.0.0.1:8000";

const HISTORY_TABS = [
  { key: "tra-benh", label: "Tra bệnh", icon: "fa-stethoscope" },
  { key: "phan-tich", label: "Phân tích", icon: "fa-chart-column" },
  { key: "canh-bao", label: "Cảnh báo", icon: "fa-bell" },
];

const RISK_CONFIG = {
  high: { label: "Nguy cơ cao", class: "danger", color: "#ef4444", icon: "fa-triangle-exclamation" },
  medium: { label: "Nguy cơ trung bình", class: "warning", color: "#f59e0b", icon: "fa-circle-exclamation" },
  low: { label: "Nguy cơ thấp", class: "success", color: "#22c55e", icon: "fa-circle-check" },
};

const FORMATTERS = {
  date: (value) => {
    try {
      return new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value));
    } catch {
      return String(value || "");
    }
  },
  number: (value, digits = 1) => {
    const num = Number(value);
    return Number.isFinite(num) ? num.toFixed(digits) : "0.0";
  },
  disease: (value) => {
    if (!value) return "Chưa xác định";
    return String(value)
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^\w/, (m) => m.toUpperCase());
  },
  risk: (level) => {
    const normalized = String(level || "").trim().toLowerCase();
    return RISK_CONFIG[normalized]?.label || "Chưa xác định";
  },
  list: (value) => {
    if (!value) return [];
    if (Array.isArray(value)) {
      return value.map((item) => String(item ?? "").trim()).filter(Boolean);
    }
    return [];
  },
};

const extractAssessmentSummary = (item) => {
  const result = item?.ketQua || {};
  const ruleBased = result?.rule_based || {};
  const aiBased = result?.ai_based || {};
  const recommendations = Array.isArray(result?.recommendations) ? result.recommendations : [];
  const matchedRules = Array.isArray(result?.matched_rules) ? result.matched_rules : ruleBased?.matched_rules || [];

  return {
    ruleScore: ruleBased?.score ?? item?.diemRule ?? 0,
    aiScore: aiBased?.score ?? item?.diemML ?? 0,
    totalScore: result?.final_score ?? item?.diemTong ?? ruleBased?.score ?? 0,
    riskLevel: result?.risk_level ?? item?.mucNguyCo ?? ruleBased?.risk_level ?? "unknown",
    recommendations,
    matchedRules,
    summary: result?.summary || result?.explanations?.[0] || "",
  };
};

const pickTopDisease = (result) => {
  const diseases = Array.isArray(result?.potential_diseases) ? result.potential_diseases : [];
  return diseases.length > 0 ? diseases[0] : null;
};

function SymptomHistoryCard({ item, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const result = item?.ketQua || {};
  const topDisease = useMemo(() => pickTopDisease(result), [result]);
  const symptoms = useMemo(() => FORMATTERS.list(item?.trieuChung), [item?.trieuChung]);

  const highRiskCount = useMemo(
    () =>
      Array.isArray(result?.potential_diseases)
        ? result.potential_diseases.filter((d) => d?.is_high_risk).length
        : 0,
    [result?.potential_diseases]
  );

  const allDiseases = useMemo(
    () => (Array.isArray(result?.potential_diseases) ? result.potential_diseases : []),
    [result?.potential_diseases]
  );

  const riskClass = highRiskCount > 0 ? "danger" : "success";

  return (
    <article className="history-card">
      <div className="history-card__header">
        <div className="history-card__title-group">
          <h3 className="history-card__title">Lần tra cứu #{item.idTraCuu}</h3>
          <p className="history-card__date">
            <i className="fa-regular fa-calendar" /> {FORMATTERS.date(item.ngayTraCuu)}
          </p>
        </div>
        <div className="history-card__actions">
          <div className="history-card__badges">
            <span className={`badge badge--${riskClass}`}>
              {highRiskCount > 0 ? "⚠️ Nguy cơ cao" : "✓ Bình thường"}
            </span>
            {topDisease && <span className="badge badge--primary">{topDisease.disease}</span>}
          </div>
          <button className="icon-btn icon-btn--sm" onClick={() => onDelete?.(item.idTraCuu)} title="Xóa">
            <i className="fa-solid fa-trash-alt" />
          </button>
        </div>
      </div>

      <div className="history-card__body">
        <div className="history-section">
          <h4 className="history-section__title">
            <i className="fa-solid fa-stethoscope" /> Triệu chứng
          </h4>
          <div className="tag-group">
            {symptoms.length > 0 ? (
              symptoms.map((symptom) => (
                <span key={symptom} className="tag tag--symptom">
                  {symptom}
                </span>
              ))
            ) : (
              <span className="text-muted">Không có dữ liệu</span>
            )}
          </div>
          {item?.moTaThem && <p className="history-note">📝 {item.moTaThem}</p>}
        </div>

        {topDisease && (
          <div className={`result-box ${topDisease?.is_high_risk ? "result-box--danger" : ""}`}>
            <div className="result-box__header">
              <div className="result-box__title">{topDisease.disease}</div>
              {topDisease.is_high_risk && (
                <span className="badge badge--danger">
                  <i className="fa-solid fa-exclamation" /> Cảnh báo
                </span>
              )}
            </div>
            <p className="result-box__text">
              {topDisease.is_high_risk
                ? topDisease.warning_message || "Kết quả có dấu hiệu nguy cơ cao."
                : topDisease.description || "Kết quả tham khảo từ hệ thống tra cứu."}
            </p>
            {topDisease.confidence && (
              <div className="result-box__confidence">
                <div className="confidence-meter">
                  <div className="confidence-meter__bar" style={{ width: `${topDisease.confidence * 100}%` }} />
                </div>
                <span className="confidence-meter__label">Độ tin cậy: {FORMATTERS.number(topDisease.confidence * 100)}%</span>
              </div>
            )}
          </div>
        )}

        {allDiseases.length > 1 && (
          <div className="expandable-section">
            <button className="expand-btn" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>
              <i className={`fa-solid fa-chevron-${expanded ? "up" : "down"}`} />
              {expanded ? "Ẩn bệnh khác" : `Xem thêm (${allDiseases.length - 1})`}
            </button>
            {expanded && (
              <div className="disease-list">
                {allDiseases.slice(1).map((disease, idx) => (
                  <div key={idx} className="disease-item">
                    <div className="disease-item__header">
                      <span className="disease-item__name">{disease.disease}</span>
                      <span className="disease-item__confidence">{FORMATTERS.number(disease.confidence * 100)}%</span>
                    </div>
                    {disease.description && <p className="disease-item__desc">{disease.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

function AssessmentHistoryCard({ item, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const summary = useMemo(() => extractAssessmentSummary(item), [item]);

  const riskConfig = RISK_CONFIG[String(summary.riskLevel || "").toLowerCase()] || RISK_CONFIG.low;
  const trend = useMemo(() => item?.trend_analysis || {}, [item?.trend_analysis]);

  return (
    <article className="history-card">
      <div className="history-card__header">
        <div className="history-card__title-group">
          <h3 className="history-card__title">
            Phân tích #{item.idDanhGia} • {FORMATTERS.disease(item.maBenh)}
          </h3>
          <p className="history-card__date">
            <i className="fa-regular fa-calendar" /> {FORMATTERS.date(item.ngayDanhGia)}
          </p>
        </div>
        <div className="history-card__actions">
          <div className="history-card__badges">
            <span className={`badge badge--${riskConfig.class}`}>
              <i className={`fa-solid ${riskConfig.icon}`} /> {riskConfig.label}
            </span>
            <span className="badge badge--info">
              <i className="fa-solid fa-thermometer" /> {FORMATTERS.number(summary.totalScore)}
            </span>
          </div>
          <button className="icon-btn icon-btn--sm" onClick={() => onDelete?.(item.idDanhGia)} title="Xóa">
            <i className="fa-solid fa-trash-alt" />
          </button>
        </div>
      </div>

      <div className="history-card__body">
        <div className="metrics-grid">
          <div className="metric-card">
            <span className="metric-card__label">Rule-based</span>
            <strong className="metric-card__value">{FORMATTERS.number(summary.ruleScore)}</strong>
          </div>
          <div className="metric-card">
            <span className="metric-card__label">AI-based</span>
            <strong className="metric-card__value">{FORMATTERS.number(summary.aiScore)}</strong>
          </div>
          <div className="metric-card">
            <span className="metric-card__label">Tổng</span>
            <strong className="metric-card__value">{FORMATTERS.number(summary.totalScore)}</strong>
          </div>
          <div className="metric-card">
            <span className="metric-card__label">Nguy cơ</span>
            <strong className="metric-card__value">{riskConfig.label}</strong>
          </div>
        </div>

        {trend?.trend && (
          <div className={`trend-box trend-box--${trend.trend}`}>
            <div className="trend-box__header">
              <span className="trend-box__label">
                {trend.trend === "increase"
                  ? "📈 Tăng"
                  : trend.trend === "decrease"
                    ? "📉 Giảm"
                    : "➡️ Ổn định"}
              </span>
              <span className="trend-box__value">
                {FORMATTERS.number(Math.abs(trend.change))} ({FORMATTERS.number(Math.abs(trend.change_percent))}%)
              </span>
            </div>
            {trend.volatility > 0 && (
              <div className="trend-box__volatility">Biến động: {FORMATTERS.number(trend.volatility)}</div>
            )}
            {trend.insight && <p className="trend-box__insight">{trend.insight}</p>}
          </div>
        )}

        {summary.summary && <p className="history-note">{summary.summary}</p>}

        <div className="analysis-footer">
          {summary.recommendations.length > 0 && (
            <div className="insights-box">
              <h5 className="insights-box__title">
                <i className="fa-solid fa-lightbulb" /> Khuyến nghị ({summary.recommendations.length})
              </h5>
              <div className="tag-group">
                {summary.recommendations.slice(0, 3).map((rec, idx) => (
                  <span key={idx} className="tag tag--recommendation">
                    {typeof rec === "object" ? rec.text || rec.id : rec}
                  </span>
                ))}
                {summary.recommendations.length > 3 && <span className="tag tag--muted">+{summary.recommendations.length - 3}</span>}
              </div>
            </div>
          )}

          {summary.matchedRules.length > 0 && (
            <div className="insights-box">
              <h5 className="insights-box__title">
                <i className="fa-solid fa-check-circle" /> Quy tắc ({summary.matchedRules.length})
              </h5>
              <div className="tag-group">
                {summary.matchedRules.slice(0, 3).map((rule, idx) => (
                  <span key={idx} className="tag tag--rule">
                    {typeof rule === "object" ? rule.description || rule.id : rule}
                  </span>
                ))}
                {summary.matchedRules.length > 3 && <span className="tag tag--muted">+{summary.matchedRules.length - 3}</span>}
              </div>
            </div>
          )}
        </div>

        <button className="expand-btn" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>
          <i className={`fa-solid fa-chevron-${expanded ? "up" : "down"}`} />
          {expanded ? "Ẩn chi tiết" : "Xem chi tiết"}
        </button>

        {expanded && (
          <div className="detail-panel">
            {summary.recommendations.length > 0 && (
              <div className="detail-section">
                <h6>Tất cả khuyến nghị</h6>
                <ul className="detail-list">
                  {summary.recommendations.map((rec, idx) => (
                    <li key={idx}>{typeof rec === "object" ? rec.text || rec.id : rec}</li>
                  ))}
                </ul>
              </div>
            )}
            {summary.matchedRules.length > 0 && (
              <div className="detail-section">
                <h6>Tất cả quy tắc khớp</h6>
                <ul className="detail-list">
                  {summary.matchedRules.map((rule, idx) => (
                    <li key={idx}>{typeof rule === "object" ? rule.description || rule.id : rule}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

function InsightsPanel({ insights }) {
  if (!insights || insights.length === 0) return null;

  return (
    <div className="insights-panel">
      <h3 className="insights-panel__title">
        <i className="fa-solid fa-chart-line" /> Phân tích chuyên sâu
      </h3>
      <div className="insights-grid">
        {insights.map((insight, idx) => {
          const iconMap = {
            repeated_disease: "fa-triangle-exclamation",
            symptom_group: "fa-chart-bar",
            trend: "fa-arrow-trend-up",
          };

          return (
            <div key={idx} className={`insight-card insight-card--${insight.loai_insight}`}>
              <div className="insight-card__header">
                <i className={`fa-solid ${iconMap[insight.loai_insight] || "fa-circle-info"}`} />
                <h4>{insight.tieu_de}</h4>
              </div>
              <p className="insight-card__text">{insight.insight}</p>
              {insight.chi_tiet && (
                <div className="insight-card__meta">
                  {Object.entries(insight.chi_tiet).map(([key, value]) => (
                    <span key={key} className="insight-card__detail">
                      <strong>{key}:</strong> {value}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProactiveAlertsSection({ alerts }) {
  if (!alerts || alerts.length === 0) {
    return (
      <div className="empty-state">
        <i className="fa-regular fa-circle-check" />
        <h3>Không có cảnh báo</h3>
        <p>Tình trạng sức khỏe ổn định. Tiếp tục theo dõi thường xuyên.</p>
      </div>
    );
  }

  return (
    <div className="alerts-section">
      <div className="alerts-list">
        {alerts.map((alert, idx) => {
          const isEmergency = alert.loaiCanhBao === "vuot_nguong";
          const isCritical = alert.loaiCanhBao === "tang_lien_tuc";

          return (
            <div
              key={idx}
              className={`alert-card alert-card--${isEmergency ? "emergency" : isCritical ? "critical" : "warning"}`}
            >
              <div className="alert-card__header">
                <div>
                  <h4>{alert.tieuDe}</h4>
                  <p className="alert-card__disease">{FORMATTERS.disease(alert.maBenh)}</p>
                </div>
                <span className={`alert-badge alert-badge--${isEmergency ? "emergency" : isCritical ? "critical" : "warning"}`}>
                  {isCritical ? "📈 Tăng" : "🚨 Vượt"}
                </span>
              </div>

              <p className="alert-card__content">{alert.noiDung}</p>

              <div className="alert-card__advice">
                <h5>
                  <i className="fa-solid fa-lightbulb" /> Khuyến cáo:
                </h5>
                <p>{alert.loiKhuyen}</p>
              </div>

              {alert.lichSuDiem && alert.lichSuDiem.length > 0 && (
                <div className="alert-card__scores">
                  <h5>📊 Lịch sử:</h5>
                  <div className="score-timeline">
                    {alert.lichSuDiem.map((score, scoreIdx) => (
                      <div key={scoreIdx} className="score-point">
                        <span>{FORMATTERS.number(score)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SectionHeader({ title, description, count, onExport }) {
  return (
    <div className="section-header">
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <div className="section-header__controls">
        <button className="btn btn--secondary btn--sm" onClick={onExport} title="Xuất dữ liệu">
          <i className="fa-solid fa-download" />
          Xuất
        </button>
        <span className="count-badge">{count}</span>
      </div>
    </div>
  );
}

function FilterBar({ onFilterChange }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("recent");

  useEffect(() => {
    onFilterChange({ searchTerm, sortBy });
  }, [searchTerm, sortBy, onFilterChange]);

  return (
    <div className="filter-bar">
      <div className="filter-input-group">
        <i className="fa-solid fa-magnifying-glass" />
        <input
          type="text"
          placeholder="Tìm kiếm bệnh, triệu chứng..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="filter-input"
        />
      </div>
      <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="filter-select">
        <option value="recent">Mới nhất</option>
        <option value="oldest">Cũ nhất</option>
        <option value="risk-high">Nguy cơ cao</option>
      </select>
    </div>
  );
}

export default function LichSuTraCuu() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("tra-benh");
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const [symptomHistory, setSymptomHistory] = useState([]);
  const [symptomError, setSymptomError] = useState("");
  const [insights, setInsights] = useState([]);

  const [assessmentHistory, setAssessmentHistory] = useState([]);
  const [assessmentError, setAssessmentError] = useState("");

  const [proactiveAlerts, setProactiveAlerts] = useState([]);
  const [alertsError, setAlertsError] = useState("");

  const [filters, setFilters] = useState({ searchTerm: "", sortBy: "recent" });

  const filteredSymptomHistory = useMemo(() => {
    let result = [...symptomHistory];
    if (filters.searchTerm) {
      result = result.filter((item) => {
        const searchLower = filters.searchTerm.toLowerCase();
        const diseases = FORMATTERS.list(item.ketQua?.potential_diseases?.map((d) => d.disease) || []);
        const symptoms = FORMATTERS.list(item.trieuChung);
        return diseases.some((d) => d.toLowerCase().includes(searchLower)) || symptoms.some((s) => s.toLowerCase().includes(searchLower));
      });
    }
    if (filters.sortBy === "recent") result.sort((a, b) => new Date(b.ngayTraCuu) - new Date(a.ngayTraCuu));
    else if (filters.sortBy === "oldest") result.sort((a, b) => new Date(a.ngayTraCuu) - new Date(b.ngayTraCuu));
    return result;
  }, [symptomHistory, filters]);

  const filteredAssessmentHistory = useMemo(() => {
    let result = [...assessmentHistory];
    if (filters.searchTerm) {
      result = result.filter((item) => FORMATTERS.disease(item.maBenh).toLowerCase().includes(filters.searchTerm.toLowerCase()));
    }
    if (filters.sortBy === "recent") result.sort((a, b) => new Date(b.ngayDanhGia) - new Date(a.ngayDanhGia));
    else if (filters.sortBy === "oldest") result.sort((a, b) => new Date(a.ngayDanhGia) - new Date(b.ngayDanhGia));
    else if (filters.sortBy === "risk-high") {
      const riskOrder = { high: 0, medium: 1, low: 2 };
      result.sort((a, b) => {
        const aRisk = String(extractAssessmentSummary(a).riskLevel || "").toLowerCase();
        const bRisk = String(extractAssessmentSummary(b).riskLevel || "").toLowerCase();
        return (riskOrder[aRisk] ?? 3) - (riskOrder[bRisk] ?? 3);
      });
    }
    return result;
  }, [assessmentHistory, filters]);

  useEffect(() => {
    const currentUser = localStorage.getItem("userName");
    if (!currentUser) {
      setPageError("Vui lòng đăng nhập để xem lịch sử tra cứu.");
      setLoading(false);
      return;
    }

    let active = true;

    async function loadAllData() {
      setLoading(true);
      setPageError("");
      setSymptomError("");
      setAssessmentError("");
      setAlertsError("");

      const encodedUser = encodeURIComponent(currentUser);

      const requests = [
        axios.get(`${API_BASE_URL}/symptom-checker/history/${encodedUser}?limit=20`).catch((err) => ({ error: err })),
        axios.get(`${API_BASE_URL}/assessment/history/${encodedUser}?limit=20`).catch((err) => ({ error: err })),
        axios.get(`${API_BASE_URL}/assessment/alerts/${encodedUser}`).catch((err) => ({ error: err })),
      ];

      const results = await Promise.allSettled(requests);

      if (!active) return;

      if (results[0].status === "fulfilled") {
        const data = results[0].value;
        if (data?.error) {
          setSymptomError(data.error?.response?.data?.detail || "Không thể tải lịch sử tra bệnh.");
        } else {
          const historyList = Array.isArray(data?.data?.history) ? data.data.history : Array.isArray(data?.data) ? data.data : [];
          setSymptomHistory(historyList);

          const insightsList = Array.isArray(data?.data?.insights) ? data.data.insights : [];
          setInsights(insightsList);
        }
      } else {
        setSymptomError(results[0].reason?.response?.data?.detail || "Không thể tải lịch sử tra bệnh.");
      }

      if (results[1].status === "fulfilled") {
        const data = results[1].value;
        if (data?.error) {
          setAssessmentError(data.error?.response?.data?.detail || "Không thể tải lịch sử phân tích.");
        } else {
          const historyList = Array.isArray(data?.data) ? data.data : [];
          setAssessmentHistory(historyList);
        }
      } else {
        setAssessmentError(results[1].reason?.response?.data?.detail || "Không thể tải lịch sử phân tích.");
      }

      if (results[2].status === "fulfilled") {
        const data = results[2].value;
        if (data?.error) {
          setAlertsError(data.error?.response?.data?.detail || "Không thể tải cảnh báo.");
        } else {
          const alertsList = Array.isArray(data?.data) ? data.data : [];
          setProactiveAlerts(alertsList);
        }
      } else {
        setAlertsError(results[2].reason?.response?.data?.detail || "Không thể tải cảnh báo.");
      }

      setLoading(false);
    }

    loadAllData().catch((error) => {
      if (!active) return;
      setPageError(error?.message || "Không thể tải dữ liệu lịch sử.");
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  const handleExport = (data, filename) => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = useCallback((id) => {
    if (activeTab === "tra-benh") {
      setSymptomHistory((prev) => prev.filter((item) => item.idTraCuu !== id));
    } else if (activeTab === "phan-tich") {
      setAssessmentHistory((prev) => prev.filter((item) => item.idDanhGia !== id));
    }
  }, [activeTab]);

  return (
    <div className="page-history">
      <header className="page-hero">
        <div className="page-hero__content">
          <div className="page-hero__kicker">
            <i className="fa-solid fa-clock-rotate-left" />
            Hồ sơ sức khỏe cá nhân
          </div>
          <h1 className="page-hero__title">Lịch Sử Tra Cứu & Phân Tích</h1>
          <p className="page-hero__subtitle">
            Theo dõi lại các lần tra bệnh từ triệu chứng, phân tích chuyên sâu, và nhận cảnh báo chủ động dựa trên lịch sử sức khỏe.
          </p>
        </div>

        <div className="page-hero__stats">
          <div className="stat-card">
            <span>Tra bệnh</span>
            <strong>{symptomHistory.length}</strong>
          </div>
          <div className="stat-card">
            <span>Phân tích</span>
            <strong>{assessmentHistory.length}</strong>
          </div>
          <div className="stat-card stat-card--accent">
            <span>Cảnh báo</span>
            <strong>{proactiveAlerts.length}</strong>
          </div>
        </div>
      </header>

      <div className="page-content">
        <nav className="tab-nav" role="tablist" aria-label="Lịch sử tra cứu">
          {HISTORY_TABS.map((tab) => (
            <button
              key={tab.key}
              className={`tab-nav__item ${activeTab === tab.key ? "tab-nav__item--active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
              role="tab"
              aria-selected={activeTab === tab.key}
            >
              <i className={`fa-solid fa-${tab.icon}`} />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        {loading && (
          <div className="loading-skeleton">
            <div className="skeleton-card" />
            <div className="skeleton-card" />
            <div className="skeleton-card" />
          </div>
        )}

        {!loading && pageError && (
          <div className="error-banner">
            <i className="fa-solid fa-triangle-exclamation" />
            <span>{pageError}</span>
          </div>
        )}

        {!loading && !pageError && activeTab === "tra-benh" && (
          <div className="tab-panel" role="tabpanel">
            <SectionHeader
              title="Lịch sử tra bệnh"
              description="Các lần tra cứu bệnh từ triệu chứng với gợi ý từ AI"
              count={filteredSymptomHistory.length}
              onExport={() => handleExport(filteredSymptomHistory, "lich-su-tra-benh.json")}
            />

            {!symptomError && filteredSymptomHistory.length > 0 && insights.length > 0 && <InsightsPanel insights={insights} />}

            {!symptomError && filteredSymptomHistory.length > 0 && <FilterBar onFilterChange={setFilters} />}

            {symptomError ? (
              <div className="error-banner">
                <i className="fa-solid fa-triangle-exclamation" />
                <span>{symptomError}</span>
              </div>
            ) : filteredSymptomHistory.length === 0 ? (
              <div className="empty-state">
                <i className="fa-regular fa-folder-open" />
                <h3>Chưa có lịch sử tra bệnh</h3>
                <p>Hãy mở chức năng Tra Bệnh để tạo kết quả đầu tiên.</p>
                <button onClick={() => navigate("/tra-benh")} className="btn btn--primary">
                  Đi tới Tra Bệnh
                </button>
              </div>
            ) : (
              <div className="card-list">
                {filteredSymptomHistory.map((item) => (
                  <SymptomHistoryCard key={item.idTraCuu} item={item} onDelete={handleDelete} />
                ))}
              </div>
            )}
          </div>
        )}

        {!loading && !pageError && activeTab === "phan-tich" && (
          <div className="tab-panel" role="tabpanel">
            <SectionHeader
              title="Lịch sử phân tích chuyên sâu"
              description="Chấm điểm nguy cơ từ plugin phân tích, mô hình AI, và phân tích xu hướng"
              count={filteredAssessmentHistory.length}
              onExport={() => handleExport(filteredAssessmentHistory, "lich-su-phan-tich.json")}
            />

            {!assessmentError && filteredAssessmentHistory.length > 0 && <FilterBar onFilterChange={setFilters} />}

            {assessmentError ? (
              <div className="error-banner">
                <i className="fa-solid fa-triangle-exclamation" />
                <span>{assessmentError}</span>
              </div>
            ) : filteredAssessmentHistory.length === 0 ? (
              <div className="empty-state">
                <i className="fa-regular fa-folder-open" />
                <h3>Chưa có lịch sử phân tích</h3>
                <p>Hãy chạy chức năng Phân Tích Bệnh để lưu kết quả đầu tiên.</p>
                <button onClick={() => navigate("/phan-tich-benh")} className="btn btn--primary">
                  Đi tới Phân Tích Bệnh
                </button>
              </div>
            ) : (
              <div className="card-list">
                {filteredAssessmentHistory.map((item) => (
                  <AssessmentHistoryCard key={item.idDanhGia} item={item} onDelete={handleDelete} />
                ))}
              </div>
            )}
          </div>
        )}

        {!loading && !pageError && activeTab === "canh-bao" && (
          <div className="tab-panel" role="tabpanel">
            <SectionHeader
              title="Cảnh báo chủ động"
              description="Phát hiện tự động các xu hướng nguy hiểm từ lịch sử đánh giá"
              count={proactiveAlerts.length}
              onExport={() => handleExport(proactiveAlerts, "lich-su-canh-bao.json")}
            />

            {alertsError ? (
              <div className="error-banner">
                <i className="fa-solid fa-triangle-exclamation" />
                <span>{alertsError}</span>
              </div>
            ) : (
              <ProactiveAlertsSection alerts={proactiveAlerts} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}