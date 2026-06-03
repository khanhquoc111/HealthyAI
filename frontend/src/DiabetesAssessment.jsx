import { useEffect, useState } from "react";
import { postJson } from "./api.js";

const DIABETES_PROFILE = {
  age: 40,
  gender: "Nam",
  height: 165,
  weight: 65,
  waist: 85,
  systolic: 120,
  diastolic: 80,
  fasting_glucose: 95,
  hba1c: 5.4,
  smoke: false,
  exercise: true,
  alcohol: 0,
  family_diabetes: false,
  hypertension: false,
};

const DIABETES_FORM_GROUPS = [
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
      { key: "waist", label: "Vòng bụng (cm)", type: "number", min: 50, max: 180, step: 1 },
    ],
  },
  {
    id: "vitals",
    title: "Huyết áp",
    fields: [
      { key: "systolic", label: "Tâm thu (mmHg)", type: "number", min: 70, max: 220, step: 1 },
      { key: "diastolic", label: "Tâm trương (mmHg)", type: "number", min: 40, max: 140, step: 1 },
    ],
  },
  {
    id: "labs",
    title: "Xét nghiệm máu",
    fields: [
      { key: "fasting_glucose", label: "Đường huyết lúc đói (mg/dL)", type: "number", min: 50, max: 600, step: 1 },
      { key: "hba1c", label: "HbA1c (%)", type: "number", min: 3, max: 15, step: 0.1 },
    ],
  },
  {
    id: "lifestyle",
    title: "Lối sống",
    fields: [
      { key: "smoke", label: "Hút thuốc lá", type: "boolean", trueLabel: "Có", falseLabel: "Không" },
      { key: "exercise", label: "Vận động thường xuyên", type: "boolean", trueLabel: "Có", falseLabel: "Không" },
      { key: "alcohol", label: "Rượu bia (số ly/ngày)", type: "number", min: 0, max: 20, step: 1 },
    ],
  },
  {
    id: "family",
    title: "Tiền sử gia đình",
    fields: [
      { key: "family_diabetes", label: "Tiền sử đái tháo đường trong gia đình", type: "boolean", trueLabel: "Có", falseLabel: "Không" },
    ],
  },
];

export function DiabetesAssessment({ profile, onUpdate, onAnalyze, onBack, analysis, loading }) {
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [dirty, setDirty] = useState(false);

  function handleUpdate(key, value) {
    onUpdate(key, value);
    setDirty(true);
  }

  function handleAnalyze() {
    onAnalyze();
    setShowAnalysis(true);
  }

  const bmi = profile.weight && profile.height ? (profile.weight / ((profile.height / 100) ** 2)).toFixed(1) : 0;

  return (
    <div className="assessment-page diabetes-assessment">
      <div className="assessment-container">
        {/* Header */}
        <div className="assessment-header">
          <button className="back-button" onClick={onBack} type="button">
            ← Quay lại chọn bệnh
          </button>
          <h2>Đánh Giá Nguy Cơ Đái Tháo Đường Type 2</h2>
          <p>Điền thông tin sức khỏe để nhận kết quả phân tích chi tiết</p>
        </div>

        {/* Form */}
        <div className="assessment-form">
          {DIABETES_FORM_GROUPS.map((group) => (
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
                          <option key={opt} value={opt}>{opt}</option>
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
                        onChange={(e) => handleUpdate(field.key, parseFloat(e.target.value))}
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
          </div>

          {/* Action Buttons */}
          <div className="form-actions">
            <button
              className="primary-button analyze-button"
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
          <div className="analysis-results diabetes-results">
            <h3>Kết Quả Đánh Giá Nguy Cơ Đái Tháo Đường</h3>
            
            <DiabetesAnalysisPanel analysis={analysis} />
          </div>
        )}
      </div>
    </div>
  );
}

function DiabetesAnalysisPanel({ analysis }) {
  if (!analysis?.risks?.items) return <p className="muted">Chưa có kết quả</p>;

  const diabetesRisk = analysis.risks.items.find(r => r.key === "diabetes");
  if (!diabetesRisk) return <p className="muted">Không tìm thấy dữ liệu bệnh tiểu đường</p>;

  const riskLevel = diabetesRisk.level_key;
  const riskScore = diabetesRisk.score || 0;
  const maxScore = diabetesRisk.max_score || 16;
  const percent = (riskScore / maxScore) * 100;

  return (
    <div className={`risk-panel ${riskLevel}`}>
      {/* Risk Level Badge */}
      <div className="risk-header">
        <div className="risk-badge">
          <span className="risk-level">{diabetesRisk.level}</span>
          <span className="risk-score">{riskScore}/{maxScore}</span>
        </div>
        <div className="risk-meter">
          <div className="meter-bar">
            <div className="meter-fill" style={{ width: `${percent}%` }}></div>
          </div>
          <div className="meter-labels">
            <span>Thấp</span>
            <span>Trung bình</span>
            <span>Cao</span>
          </div>
        </div>
      </div>

      {/* Risk Reasons */}
      {diabetesRisk.reasons?.length > 0 && (
        <div className="risk-details">
          <h4>Các Yếu Tố Nguy Cơ Phát Hiện:</h4>
          <ul className="reason-list">
            {diabetesRisk.reasons.map((reason, idx) => (
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
          <li>Khám sức khỏe định kỳ 6 tháng 1 lần</li>
          <li>Tăng cường hoạt động thể chất ít nhất 30 phút/ngày, 5 ngày/tuần</li>
          <li>Kiểm soát chỉ số BMI dưới 25</li>
          <li>Giảm lượng đường, chất béo, muối trong bữa ăn</li>
          <li>Duy trì trọng lượng cân đối</li>
          {diabetesRisk.level_key === "high" && (
            <li className="urgent">Liên hệ bác sĩ chuyên khoa nội tiết ngay để tư vấn chi tiết</li>
          )}
        </ul>
      </div>

      {/* Diet Advice */}
      {analysis.diet && (
        <DiabetesDietAdvice diet={analysis.diet} />
      )}
    </div>
  );
}

function DiabetesDietAdvice({ diet }) {
  if (!diet) return null;

  return (
    <div className="diet-advice">
      <h4>🍎 Gợi Ý Dinh Dưỡng</h4>
      
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
    </div>
  );
}

export default DiabetesAssessment;