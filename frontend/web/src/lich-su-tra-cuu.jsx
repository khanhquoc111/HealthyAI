import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./css/lich-su-tra-cuu.css";

const API_BASE_URL = "http://127.0.0.1:8000";

const HISTORY_TABS = [
  {
    key: "tra-benh",
    label: "Lịch sử tra bệnh",
    iconClass: "fa-solid fa-stethoscope",
  },
  {
    key: "phan-tich",
    label: "Lịch sử phân tích chuyên sâu",
    iconClass: "fa-solid fa-chart-column",
  },
  {
    key: "canh-bao",
    label: "Cảnh báo chủ động",
    iconClass: "fa-solid fa-bell",
  },
];

function formatDate(value) {
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return String(value || "");
  }
}

function formatNumber(value, digits = 1) {
  const num = Number(value);
  return Number.isFinite(num) ? num.toFixed(digits) : "0.0";
}

function normalizeList(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? "").trim()).filter(Boolean);
  }
  return [];
}

function diseaseLabel(value) {
  if (!value) return "Chưa xác định";
  return String(value)
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\w/, (m) => m.toUpperCase());
}

function riskLabel(level) {
  const normalized = String(level || "")
    .trim()
    .toLowerCase();
  if (normalized === "high") return "Nguy cơ cao";
  if (normalized === "medium") return "Nguy cơ trung bình";
  if (normalized === "low") return "Nguy cơ thấp";
  return normalized ? normalized : "Chưa xác định";
}

function extractAssessmentSummary(item) {
  const result = item?.ketQua || {};
  const ruleBased = result?.rule_based || {};
  const aiBased = result?.ai_based || {};
  const recommendations = Array.isArray(result?.recommendations)
    ? result.recommendations
    : [];
  const matchedRules = Array.isArray(result?.matched_rules)
    ? result.matched_rules
    : ruleBased?.matched_rules || [];

  return {
    ruleScore: ruleBased?.score ?? item?.diemRule ?? 0,
    aiScore: aiBased?.score ?? item?.diemML ?? 0,
    totalScore: result?.final_score ?? item?.diemTong ?? ruleBased?.score ?? 0,
    riskLevel:
      result?.risk_level ??
      item?.mucNguyCo ??
      ruleBased?.risk_level ??
      "unknown",
    recommendations,
    matchedRules,
    summary: result?.summary || result?.explanations?.[0] || "",
  };
}

function pickTopDisease(result) {
  const diseases = Array.isArray(result?.potential_diseases)
    ? result.potential_diseases
    : [];
  return diseases.length > 0 ? diseases[0] : null;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT: Symptom History Card
// ═══════════════════════════════════════════════════════════════════════════
function SymptomHistoryCard({ item }) {
  const [expanded, setExpanded] = useState(false);
  const result = item?.ketQua || {};
  const topDisease = pickTopDisease(result);
  const symptoms = normalizeList(item?.trieuChung);
  const highRiskCount = Array.isArray(result?.potential_diseases)
    ? result.potential_diseases.filter((d) => d?.is_high_risk).length
    : 0;

  const allDiseases = Array.isArray(result?.potential_diseases)
    ? result.potential_diseases
    : [];

  return (
    <article className="history-card history-card--symptom">
      <div className="history-card-header">
        <div>
          <div className="history-card-title">Lần tra cứu #{item.idTraCuu}</div>
          <div className="history-card-subtitle">
            {formatDate(item.ngayTraCuu)}
          </div>
        </div>
        <div className="history-card-badges">
          <span
            className={`history-pill ${highRiskCount > 0 ? "history-pill--danger" : "history-pill--success"}`}
          >
            {highRiskCount > 0 ? "⚠️ Có nguy cơ cao" : "✅ Mức độ thường"}
          </span>
          {topDisease && (
            <span className="history-pill history-pill--info">
              💊 {topDisease.disease}
            </span>
          )}
        </div>
      </div>

      <div className="history-card-body">
        <div className="history-block">
          <h4>Triệu chứng đã nhập</h4>
          <div className="history-chip-list">
            {symptoms.length > 0 ? (
              symptoms.map((symptom) => (
                <span key={symptom} className="history-chip">
                  {symptom}
                </span>
              ))
            ) : (
              <span className="history-muted">Không có dữ liệu.</span>
            )}
          </div>
          {item?.moTaThem && <p className="history-note">📝 {item.moTaThem}</p>}
        </div>

        {topDisease && (
          <div
            className={`history-result ${topDisease?.is_high_risk ? "history-result--danger" : ""}`}
          >
            <div className="history-result-title">{topDisease.disease}</div>
            <p className="history-result-text">
              {topDisease.is_high_risk
                ? topDisease.warning_message ||
                  "Kết quả có dấu hiệu nguy cơ cao."
                : topDisease.description ||
                  "Kết quả tham khảo từ hệ thống tra cứu."}
            </p>
            {topDisease.confidence && (
              <div className="history-confidence">
                Độ tin cậy: {formatNumber(topDisease.confidence * 100)}%
              </div>
            )}
          </div>
        )}

        {allDiseases.length > 1 && (
          <div className="history-expandable">
            <button
              className="history-expand-btn"
              onClick={() => setExpanded(!expanded)}
            >
              <i
                className={`fa-solid fa-chevron-${expanded ? "up" : "down"}`}
              />
              {expanded
                ? "Ẩn các bệnh khác"
                : `Xem thêm (${allDiseases.length - 1} bệnh khác)`}
            </button>
            {expanded && (
              <div className="history-disease-list">
                {allDiseases.slice(1).map((disease, idx) => (
                  <div key={idx} className="history-disease-item">
                    <div className="history-disease-header">
                      <span className="history-disease-name">
                        {disease.disease}
                      </span>
                      <span className="history-disease-confidence">
                        {formatNumber(disease.confidence * 100)}%
                      </span>
                    </div>
                    {disease.description && (
                      <p className="history-disease-desc">
                        {disease.description}
                      </p>
                    )}
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

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT: Assessment History Card with Trend Analysis
// ═══════════════════════════════════════════════════════════════════════════
function AssessmentHistoryCard({ item }) {
  const [expanded, setExpanded] = useState(false);
  const summary = extractAssessmentSummary(item);
  const scorePillClass =
    String(summary.riskLevel || "").toLowerCase() === "high"
      ? "history-pill--danger"
      : String(summary.riskLevel || "").toLowerCase() === "medium"
        ? "history-pill--warning"
        : "history-pill--success";

  const trend = item?.trend_analysis || {};

  return (
    <article className="history-card history-card--analysis">
      <div className="history-card-header">
        <div>
          <div className="history-card-title">
            Phân tích #{item.idDanhGia} - {diseaseLabel(item.maBenh)}
          </div>
          <div className="history-card-subtitle">
            {formatDate(item.ngayDanhGia)}
          </div>
        </div>
        <div className="history-card-badges">
          <span className={`history-pill ${scorePillClass}`}>
            {riskLabel(summary.riskLevel)}
          </span>
          <span className="history-pill history-pill--info">
            📊 {formatNumber(summary.totalScore)}
          </span>
        </div>
      </div>

      <div className="history-card-body">
        <div className="history-analysis-grid">
          <div className="history-analysis-metric">
            <span>Rule-based</span>
            <strong>{formatNumber(summary.ruleScore)}</strong>
          </div>
          <div className="history-analysis-metric">
            <span>AI-based</span>
            <strong>{formatNumber(summary.aiScore)}</strong>
          </div>
          <div className="history-analysis-metric">
            <span>Tổng điểm</span>
            <strong>{formatNumber(summary.totalScore)}</strong>
          </div>
          <div className="history-analysis-metric">
            <span>Nguy cơ</span>
            <strong>{riskLabel(summary.riskLevel)}</strong>
          </div>
        </div>

        {trend?.trend && (
          <div className={`history-trend-box history-trend--${trend.trend}`}>
            <div className="history-trend-header">
              <span className="history-trend-label">
                {trend.trend === "increase"
                  ? "📈 Tăng"
                  : trend.trend === "decrease"
                    ? "📉 Giảm"
                    : "➡️ Ổn định"}
              </span>
              <span className="history-trend-value">
                {formatNumber(Math.abs(trend.change))} (
                {formatNumber(Math.abs(trend.change_percent))}%)
              </span>
            </div>
            {trend.volatility > 0 && (
              <div className="history-trend-volatility">
                Biến động: {formatNumber(trend.volatility)}
              </div>
            )}
            {trend.insight && (
              <p className="history-trend-insight">{trend.insight}</p>
            )}
          </div>
        )}

        {summary.summary && <p className="history-note">{summary.summary}</p>}

        <div className="history-analysis-footer">
          {summary.recommendations.length > 0 && (
            <div className="history-recommendations">
              <h5>💡 Khuyến nghị ({summary.recommendations.length})</h5>
              <div className="history-chip-list">
                {summary.recommendations.slice(0, 3).map((rec, idx) => (
                  <span key={idx} className="history-chip history-chip--soft">
                    {typeof rec === "object" ? rec.text || rec.id : rec}
                  </span>
                ))}
                {summary.recommendations.length > 3 && (
                  <span className="history-chip history-chip--muted">
                    +{summary.recommendations.length - 3} khác
                  </span>
                )}
              </div>
            </div>
          )}

          {summary.matchedRules.length > 0 && (
            <div className="history-matched-rules">
              <h5>✓ Quy tắc khớp ({summary.matchedRules.length})</h5>
              <div className="history-chip-list">
                {summary.matchedRules.slice(0, 3).map((rule, idx) => (
                  <span
                    key={idx}
                    className="history-chip history-chip--outline"
                  >
                    {typeof rule === "object"
                      ? rule.description || rule.id
                      : rule}
                  </span>
                ))}
                {summary.matchedRules.length > 3 && (
                  <span className="history-chip history-chip--muted">
                    +{summary.matchedRules.length - 3} khác
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <button
          className="history-expand-btn"
          onClick={() => setExpanded(!expanded)}
        >
          <i className={`fa-solid fa-chevron-${expanded ? "up" : "down"}`} />
          {expanded ? "Ẩn chi tiết" : "Xem chi tiết"}
        </button>

        {expanded && (
          <div className="history-detail-panel">
            {summary.recommendations.length > 0 && (
              <div className="history-detail-section">
                <h6>Tất cả khuyến nghị</h6>
                <ul className="history-detail-list">
                  {summary.recommendations.map((rec, idx) => (
                    <li key={idx}>
                      {typeof rec === "object" ? rec.text || rec.id : rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {summary.matchedRules.length > 0 && (
              <div className="history-detail-section">
                <h6>Tất cả quy tắc khớp</h6>
                <ul className="history-detail-list">
                  {summary.matchedRules.map((rule, idx) => (
                    <li key={idx}>
                      {typeof rule === "object"
                        ? rule.description || rule.id
                        : rule}
                    </li>
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

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT: Insights Panel
// ═══════════════════════════════════════════════════════════════════════════
function InsightsPanel({ insights }) {
  if (!insights || insights.length === 0) {
    return null;
  }

  return (
    <div className="history-insights-section">
      <h3 className="history-insights-title">
        <i className="fa-solid fa-lightbulb" /> Phân tích và cảnh báo thông minh
      </h3>
      <div className="history-insights-grid">
        {insights.map((insight, idx) => {
          const iconMap = {
            repeated_disease: "fa-triangle-exclamation",
            symptom_group: "fa-chart-bar",
          };
          const icon = iconMap[insight.loai_insight] || "fa-circle-info";

          return (
            <div
              key={idx}
              className={`history-insight-card history-insight--${insight.loai_insight}`}
            >
              <div className="history-insight-header">
                <i className={`fa-solid ${icon}`} />
                <h4>{insight.tieu_de}</h4>
              </div>
              <p className="history-insight-text">{insight.insight}</p>
              {insight.chi_tiet && (
                <div className="history-insight-meta">
                  {Object.entries(insight.chi_tiet).map(([key, value]) => (
                    <span key={key} className="history-insight-detail">
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

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT: Proactive Alerts
// ═══════════════════════════════════════════════════════════════════════════
function ProactiveAlertsSection({ alerts }) {
  if (!alerts || alerts.length === 0) {
    return (
      <div className="history-empty">
        <i className="fa-regular fa-circle-check" />
        <h3>Không có cảnh báo</h3>
        <p>
          Tình trạng sức khỏe của bạn ổn định. Tiếp tục theo dõi thường xuyên.
        </p>
      </div>
    );
  }

  return (
    <div className="history-alerts-section">
      <h3 className="history-alerts-title">
        <i className="fa-solid fa-bell" /> Cảnh báo chủ động
      </h3>
      <div className="history-alerts-list">
        {alerts.map((alert, idx) => {
          const isEmergency = alert.loaiCanhBao === "vuot_nguong";
          const isCritical = alert.loaiCanhBao === "tang_lien_tuc";

          return (
            <div
              key={idx}
              className={`history-alert-card ${isEmergency ? "history-alert-card--emergency" : isCritical ? "history-alert-card--critical" : "history-alert-card--warning"}`}
            >
              <div className="history-alert-header">
                <div>
                  <h4>{alert.tieuDe}</h4>
                  <p className="history-alert-disease">
                    {diseaseLabel(alert.maBenh)}
                  </p>
                </div>
                <span
                  className={`history-alert-badge ${isEmergency ? "history-alert-badge--emergency" : isCritical ? "history-alert-badge--critical" : "history-alert-badge--warning"}`}
                >
                  {alert.loaiCanhBao === "tang_lien_tuc"
                    ? "📈 Tăng liên tục"
                    : "🚨 Vượt ngưỡng"}
                </span>
              </div>

              <p className="history-alert-content">{alert.noiDung}</p>

              <div className="history-alert-advice">
                <h5>💡 Lời khuyên:</h5>
                <p>{alert.loiKhuyen}</p>
              </div>

              {alert.lichSuDiem && alert.lichSuDiem.length > 0 && (
                <div className="history-alert-scores">
                  <h5>📊 Lịch sử điểm số:</h5>
                  <div className="history-score-timeline">
                    {alert.lichSuDiem.map((score, scoreIdx) => (
                      <div key={scoreIdx} className="history-score-point">
                        <span className="history-score-value">
                          {formatNumber(score)}
                        </span>
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

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT: History Section Header
// ═══════════════════════════════════════════════════════════════════════════
function HistorySectionHeader({ title, description, count }) {
  return (
    <div className="history-section-header">
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <span className="history-count-badge">{count}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT: Lich Su Tra Cuu
// ═══════════════════════════════════════════════════════════════════════════
export default function LichSuTraCuu() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("tra-benh");
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  // Symptom History State
  const [symptomHistory, setSymptomHistory] = useState([]);
  const [symptomError, setSymptomError] = useState("");
  const [insights, setInsights] = useState([]);

  // Assessment History State
  const [assessmentHistory, setAssessmentHistory] = useState([]);
  const [assessmentError, setAssessmentError] = useState("");

  // Alerts State
  const [proactiveAlerts, setProactiveAlerts] = useState([]);
  const [alertsError, setAlertsError] = useState("");

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
        axios
          .get(
            `${API_BASE_URL}/symptom-checker/history/${encodedUser}?limit=20`,
          )
          .catch((err) => ({ error: err })),
        axios
          .get(`${API_BASE_URL}/assessment/history/${encodedUser}?limit=20`)
          .catch((err) => ({ error: err })),
        axios
          .get(`${API_BASE_URL}/assessment/alerts/${encodedUser}`)
          .catch((err) => ({ error: err })),
      ];

      const results = await Promise.allSettled(requests);

      if (!active) return;

      // Process Symptom History
      if (results[0].status === "fulfilled") {
        const data = results[0].value;
        if (data?.error) {
          setSymptomError(
            data.error?.response?.data?.detail ||
              "Không thể tải lịch sử tra bệnh.",
          );
        } else {
          const historyList = Array.isArray(data?.data?.history)
            ? data.data.history
            : Array.isArray(data?.data)
              ? data.data
              : [];
          setSymptomHistory(historyList);

          const insightsList = Array.isArray(data?.data?.insights)
            ? data.data.insights
            : [];
          setInsights(insightsList);
        }
      } else {
        setSymptomError(
          results[0].reason?.response?.data?.detail ||
            "Không thể tải lịch sử tra bệnh.",
        );
      }

      // Process Assessment History
      if (results[1].status === "fulfilled") {
        const data = results[1].value;
        if (data?.error) {
          setAssessmentError(
            data.error?.response?.data?.detail ||
              "Không thể tải lịch sử phân tích.",
          );
        } else {
          const historyList = Array.isArray(data?.data) ? data.data : [];
          setAssessmentHistory(historyList);
        }
      } else {
        setAssessmentError(
          results[1].reason?.response?.data?.detail ||
            "Không thể tải lịch sử phân tích.",
        );
      }

      // Process Proactive Alerts
      if (results[2].status === "fulfilled") {
        const data = results[2].value;
        if (data?.error) {
          setAlertsError(
            data.error?.response?.data?.detail || "Không thể tải cảnh báo.",
          );
        } else {
          const alertsList = Array.isArray(data?.data) ? data.data : [];
          setProactiveAlerts(alertsList);
        }
      } else {
        setAlertsError(
          results[2].reason?.response?.data?.detail ||
            "Không thể tải cảnh báo.",
        );
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

  const symptomCount = symptomHistory.length;
  const assessmentCount = assessmentHistory.length;
  const alertsCount = proactiveAlerts.length;

  return (
    <div className="history-page">
      <section className="history-hero">
        <div className="history-hero-copy">
          <div className="history-kicker">
            <i className="fa-solid fa-clock-rotate-left" aria-hidden="true" />
            Lưu vết tra cứu cá nhân
          </div>
          <h1>Lịch Sử Tra Cứu & Phân Tích</h1>
          <p>
            Theo dõi lại các lần tra bệnh từ triệu chứng, phân tích chuyên sâu,
            và nhận cảnh báo chủ động dựa trên lịch sử sức khỏe của bạn.
          </p>
        </div>

        <div className="history-hero-stats">
          <div className="history-stat-card">
            <span>Tra bệnh</span>
            <strong>{symptomCount}</strong>
          </div>
          <div className="history-stat-card">
            <span>Phân tích chuyên sâu</span>
            <strong>{assessmentCount}</strong>
          </div>
          <div className="history-stat-card history-stat-card--accent">
            <span>Cảnh báo</span>
            <strong>{alertsCount}</strong>
          </div>
        </div>
      </section>

      <section className="history-shell">
        {/* Tabs */}
        <div
          className="history-tabs"
          role="tablist"
          aria-label="Lịch sử tra cứu"
        >
          {HISTORY_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`history-tab${activeTab === tab.key ? " history-tab--active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
              role="tab"
              aria-selected={activeTab === tab.key}
            >
              <i className={tab.iconClass} aria-hidden="true" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="history-loading">
            <div className="history-loading-card" />
            <div className="history-loading-card" />
            <div className="history-loading-card" />
          </div>
        )}

        {/* Page Error */}
        {!loading && pageError && (
          <div className="history-alert history-alert--error">
            <i
              className="fa-solid fa-triangle-exclamation"
              aria-hidden="true"
            />
            <span>{pageError}</span>
          </div>
        )}

        {/* TAB: Lịch sử tra bệnh */}
        {!loading && !pageError && activeTab === "tra-benh" && (
          <div className="history-panel" role="tabpanel">
            <HistorySectionHeader
              title="Lịch sử tra bệnh"
              description="Các lần tra cứu bệnh cơ bản từ triệu chứng đã nhập với gợi ý bệnh từ AI."
              count={symptomHistory.length}
            />

            {/* Insights Section */}
            {!symptomError &&
              symptomHistory.length > 0 &&
              insights.length > 0 && <InsightsPanel insights={insights} />}

            {/* Symptom Error */}
            {symptomError ? (
              <div className="history-alert history-alert--error">
                <i
                  className="fa-solid fa-triangle-exclamation"
                  aria-hidden="true"
                />
                <span>{symptomError}</span>
              </div>
            ) : symptomHistory.length === 0 ? (
              <div className="history-empty">
                <i className="fa-regular fa-folder-open" aria-hidden="true" />
                <h3>Chưa có lịch sử tra bệnh</h3>
                <p>Hãy mở chức năng Tra Bệnh để tạo các kết quả đầu tiên.</p>
                <button onClick={() => navigate("/tra-benh")}>
                  Đi tới Tra Bệnh
                </button>
              </div>
            ) : (
              <div className="history-list">
                {symptomHistory.map((item) => (
                  <SymptomHistoryCard key={item.idTraCuu} item={item} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: Lịch sử phân tích chuyên sâu */}
        {!loading && !pageError && activeTab === "phan-tich" && (
          <div className="history-panel" role="tabpanel">
            <HistorySectionHeader
              title="Lịch sử phân tích chuyên sâu"
              description="Các lần chấm điểm nguy cơ từ plugin phân tích, mô hình AI, và phân tích xu hướng."
              count={assessmentHistory.length}
            />

            {assessmentError ? (
              <div className="history-alert history-alert--error">
                <i
                  className="fa-solid fa-triangle-exclamation"
                  aria-hidden="true"
                />
                <span>{assessmentError}</span>
              </div>
            ) : assessmentHistory.length === 0 ? (
              <div className="history-empty">
                <i className="fa-regular fa-folder-open" aria-hidden="true" />
                <h3>Chưa có lịch sử phân tích</h3>
                <p>
                  Hãy chạy chức năng Phân Tích Bệnh để lưu lại kết quả đầu tiên.
                </p>
                <button onClick={() => navigate("/phan-tich-benh")}>
                  Đi tới Phân Tích Bệnh
                </button>
              </div>
            ) : (
              <div className="history-list">
                {assessmentHistory.map((item) => (
                  <AssessmentHistoryCard key={item.idDanhGia} item={item} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: Cảnh báo chủ động */}
        {!loading && !pageError && activeTab === "canh-bao" && (
          <div className="history-panel" role="tabpanel">
            <HistorySectionHeader
              title="Cảnh báo chủ động"
              description="Hệ thống tự động phát hiện các xu hướng nguy hiểm dựa trên lịch sử đánh giá của bạn."
              count={proactiveAlerts.length}
            />

            {alertsError ? (
              <div className="history-alert history-alert--error">
                <i
                  className="fa-solid fa-triangle-exclamation"
                  aria-hidden="true"
                />
                <span>{alertsError}</span>
              </div>
            ) : (
              <ProactiveAlertsSection alerts={proactiveAlerts} />
            )}
          </div>
        )}
      </section>
    </div>
  );
}
