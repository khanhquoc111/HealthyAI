import { useState } from "react";

const KIDNEY_FORM_GROUPS = [
  {
    id: "personal",
    title: "Thông tin cá nhân",
    fields: [
      { key: "age", label: "Tuổi (năm)", type: "number", min: 18, max: 100, step: 1 },
      { key: "gender", label: "Giới tính", type: "select", options: ["Nam", "Nữ"] },
    ],
  },
  {
    id: "body",
    title: "Chỉ số cơ thể",
    fields: [
      { key: "height", label: "Chiều cao (cm)", type: "number", min: 140, max: 220, step: 1 },
      { key: "weight", label: "Cân nặng (kg)", type: "number", min: 30, max: 200, step: 0.5 },
    ],
  },
  {
    id: "labs",
    title: "Xét nghiệm máu & nước tiểu",
    fields: [
      { key: "creatinine", label: "Creatinine máu (mg/dL)", type: "number", min: 0.3, max: 15, step: 0.1 },
      { key: "fasting_glucose", label: "Đường huyết lúc đói (mg/dL)", type: "number", min: 50, max: 600, step: 1 },
    ],
  },
  {
    id: "conditions",
    title: "Bệnh lý nền",
    fields: [
      { key: "hypertension", label: "Tăng huyết áp", type: "boolean", trueLabel: "Có", falseLabel: "Không" },
      { key: "nsaid_use", label: "Dùng thuốc giảm đau NSAID thường xuyên", type: "boolean", trueLabel: "Có", falseLabel: "Không" },
    ],
  },
  {
    id: "lifestyle",
    title: "Lối sống",
    fields: [
      { key: "smoke", label: "Hút thuốc lá", type: "boolean", trueLabel: "Có", falseLabel: "Không" },
      { key: "exercise", label: "Vận động thường xuyên", type: "boolean", trueLabel: "Có", falseLabel: "Không" },
    ],
  },
];

export function KidneyAssessment({ profile, onUpdate, onAnalyze, onBack, analysis, loading }) {
  const [showAnalysis, setShowAnalysis] = useState(false);

  function handleUpdate(key, value) {
    onUpdate(key, value);
  }

  function handleAnalyze() {
    onAnalyze();
    setShowAnalysis(true);
  }

  const bmi =
    profile.weight && profile.height
      ? (profile.weight / (profile.height / 100) ** 2).toFixed(1)
      : 0;

  const creatinine = profile.creatinine || 1.0;
  const gender = profile.gender || "Nam";
  let crStatus = "good";
  let crLabel = "Bình thường";
  if (
    (gender === "Nam" && creatinine > 1.2) ||
    (gender === "Nữ" && creatinine > 1.1)
  ) {
    crStatus = "danger";
    crLabel = "Cao";
  } else if (
    (gender === "Nam" && creatinine > 1.0) ||
    (gender === "Nữ" && creatinine > 0.9)
  ) {
    crStatus = "warn";
    crLabel = "Giới hạn";
  }

  return (
    <div className="assessment-page kidney-assessment">
      <div className="assessment-container">
        {/* Header */}
        <div className="assessment-header kidney-header">
          <button className="back-button" onClick={onBack} type="button">
            ← Quay lại chọn bệnh
          </button>
          <h2>Đánh Giá Nguy Cơ Bệnh Thận Mạn Tính</h2>
          <p>Phân tích các yếu tố nguy cơ liên quan đến chức năng thận</p>
        </div>

        {/* Form */}
        <div className="assessment-form">
          {KIDNEY_FORM_GROUPS.map((group) => (
            <fieldset key={group.id} className="form-group">
              <legend>{group.title}</legend>
              <div className="field-grid">
                {group.fields.map((field) => (
                  <div key={field.key} className="field-wrapper">
                    <label htmlFor={field.key}>{field.label}</label>
                    {field.type === "select" ? (
                      <select
                        id={field.key}
                        value={profile[field.key] || ""}
                        onChange={(e) => handleUpdate(field.key, e.target.value)}
                        className="form-input"
                      >
                        <option value="">-- Chọn --</option>
                        {field.options.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : field.type === "boolean" ? (
                      <div className="boolean-group">
                        <button
                          type="button"
                          className={`bool-btn ${profile[field.key] === true ? "active" : ""}`}
                          onClick={() => handleUpdate(field.key, true)}
                        >
                          {field.trueLabel}
                        </button>
                        <button
                          type="button"
                          className={`bool-btn ${profile[field.key] === false ? "active" : ""}`}
                          onClick={() => handleUpdate(field.key, false)}
                        >
                          {field.falseLabel}
                        </button>
                      </div>
                    ) : (
                      <input
                        id={field.key}
                        type="number"
                        value={profile[field.key] || ""}
                        onChange={(e) =>
                          handleUpdate(field.key, parseFloat(e.target.value))
                        }
                        min={field.min}
                        max={field.max}
                        step={field.step}
                        className="form-input"
                      />
                    )}
                  </div>
                ))}
              </div>
            </fieldset>
          ))}

          {/* Metrics Display */}
          <div className="metrics-display">
            <div className="metric-card">
              <span className="metric-label">BMI</span>
              <span className="metric-value">{bmi}</span>
              <span className="metric-unit">kg/m²</span>
            </div>
            <div className={`metric-card ${crStatus}`}>
              <span className="metric-label">Creatinine</span>
              <span className="metric-value">{creatinine}</span>
              <span className="metric-unit">{crLabel}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="form-actions">
            <button
              className="primary-button analyze-button kidney-analyze-btn"
              onClick={handleAnalyze}
              disabled={loading}
              type="button"
            >
              {loading ? "Đang phân tích..." : "Phân tích Ngay"}
            </button>
          </div>
        </div>

        {/* Analysis Results */}
        {showAnalysis && analysis && (
          <div className="analysis-results kidney-results">
            <h3>Kết Quả Đánh Giá Nguy Cơ Bệnh Thận Mạn Tính</h3>
            <KidneyAnalysisPanel analysis={analysis} />
          </div>
        )}
      </div>
    </div>
  );
}

function KidneyAnalysisPanel({ analysis }) {
  if (!analysis?.risks?.items)
    return <p className="muted">Chưa có kết quả</p>;

  const kidneyRisk = analysis.risks.items.find((r) => r.key === "kidney");
  if (!kidneyRisk)
    return <p className="muted">Không tìm thấy dữ liệu bệnh thận</p>;

  const riskLevel = kidneyRisk.level_key;
  const riskScore = kidneyRisk.score || 0;
  const maxScore = kidneyRisk.max_score || 10;
  const percent = (riskScore / maxScore) * 100;

  return (
    <div className={`risk-panel ${riskLevel}`}>
      {/* Risk Level Badge */}
      <div className="risk-header">
        <div className="risk-badge">
          <span className="risk-level">{kidneyRisk.level}</span>
          <span className="risk-score">
            {riskScore}/{maxScore}
          </span>
        </div>
        <div className="risk-meter">
          <div className="meter-bar">
            <div
              className="meter-fill"
              style={{ width: `${percent}%` }}
            ></div>
          </div>
          <div className="meter-labels">
            <span>Thấp</span>
            <span>Trung bình</span>
            <span>Cao</span>
          </div>
        </div>
      </div>

      {/* Risk Reasons */}
      {kidneyRisk.reasons?.length > 0 && (
        <div className="risk-details">
          <h4>Các Yếu Tố Nguy Cơ Phát Hiện:</h4>
          <ul className="reason-list">
            {kidneyRisk.reasons.map((reason, idx) => (
              <li key={idx}>
                <span className="reason-icon">⚠️</span>
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendations */}
      <div className="recommendations">
        <h4>Khuyến Cáo</h4>
        <ul>
          <li>Kiểm tra chức năng thận (creatinine, GFR) định kỳ mỗi 6–12 tháng</li>
          <li>Kiểm soát huyết áp ở mức dưới 130/80 mmHg</li>
          <li>Kiểm soát đường huyết nếu có tiền đái tháo đường hoặc đái tháo đường</li>
          <li>Uống đủ nước (1,5–2 lít/ngày), tránh mất nước</li>
          <li>Hạn chế sử dụng thuốc NSAID (ibuprofen, naproxen) nếu không cần thiết</li>
          <li>Tránh dùng thuốc kháng sinh hoặc thuốc cản quang mà không có chỉ định của bác sĩ</li>
          <li>Ăn ít muối và protein động vật nếu có nguy cơ cao</li>
          {kidneyRisk.level_key === "high" && (
            <li className="urgent">
              Cần khám chuyên khoa thận ngay để đánh giá GFR và protein niệu
            </li>
          )}
        </ul>
      </div>

      {/* Diet Advice */}
      {analysis.diet && <KidneyDietAdvice diet={analysis.diet} />}
    </div>
  );
}

function KidneyDietAdvice({ diet }) {
  if (!diet) return null;

  return (
    <div className="diet-advice">
      <h4>🥦 Gợi Ý Dinh Dưỡng Bảo Vệ Thận</h4>

      {diet.tips?.["ăn nhiều"] && (
        <div className="diet-section good">
          <h5>Ăn Nhiều</h5>
          <ul>
            {diet.tips["ăn nhiều"].map((food, idx) => (
              <li key={idx}>{food}</li>
            ))}
          </ul>
        </div>
      )}

      {diet.tips?.["hạn chế"] && (
        <div className="diet-section warn">
          <h5>Hạn Chế</h5>
          <ul>
            {diet.tips["hạn chế"].map((food, idx) => (
              <li key={idx}>{food}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="diet-note">
        💡 Chế độ ăn ít muối, ít protein và tránh thực phẩm chế biến sẵn giúp làm chậm tiến triển bệnh thận mạn
      </div>
    </div>
  );
}

export default KidneyAssessment;