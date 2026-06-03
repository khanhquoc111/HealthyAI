import { useState } from "react";

const HYPERTENSION_PROFILE = {
  age: 40,
  gender: "Nam",
  height: 165,
  weight: 65,
  systolic: 120,
  diastolic: 80,
  sodium_intake: 2300,
  alcohol: 0,
  smoke: false,
  exercise: true,
  family_hypertension: false,
};

const HYPERTENSION_FORM_GROUPS = [
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
    id: "vitals",
    title: "Huyết áp (rất quan trọng)",
    fields: [
      { key: "systolic", label: "Tâm thu (mmHg)", type: "number", min: 70, max: 220, step: 1 },
      { key: "diastolic", label: "Tâm trương (mmHg)", type: "number", min: 40, max: 140, step: 1 },
    ],
  },
  {
    id: "diet",
    title: "Chế độ ăn",
    fields: [
      { key: "sodium_intake", label: "Lượng muối ước tính (mg/ngày)", type: "number", min: 500, max: 8000, step: 100 },
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
      { key: "family_hypertension", label: "Tiền sử tăng huyết áp trong gia đình", type: "boolean", trueLabel: "Có", falseLabel: "Không" },
    ],
  },
];

export function HypertensionAssessment({ profile, onUpdate, onAnalyze, onBack, analysis, loading }) {
  const [showAnalysis, setShowAnalysis] = useState(false);

  function handleUpdate(key, value) {
    onUpdate(key, value);
  }

  function handleAnalyze() {
    onAnalyze();
    setShowAnalysis(true);
  }

  const bmi = profile.weight && profile.height ? (profile.weight / ((profile.height / 100) ** 2)).toFixed(1) : 0;
  const systolic = profile.systolic || 120;
  const diastolic = profile.diastolic || 80;

  // BP Categories
  let bpStatus = "good", bpLabel = "Bình thường";
  if (systolic >= 140 || diastolic >= 90) {
    bpStatus = "danger";
    bpLabel = "Cao độ 2+";
  } else if (systolic >= 130 || diastolic >= 80) {
    bpStatus = "warn";
    bpLabel = "Cao độ 1";
  } else if (systolic < 120 && diastolic < 80) {
    bpStatus = "good";
    bpLabel = "Bình thường";
  }

  return (
    <div className="assessment-page hypertension-assessment">
      <div className="assessment-container">
        {/* Header */}
        <div className="assessment-header">
          <button className="back-button" onClick={onBack} type="button">
            ← Quay lại chọn bệnh
          </button>
          <h2>Đánh Giá Nguy Cơ Tăng Huyết Áp</h2>
          <p>Theo dõi huyết áp và các yếu tố nguy cơ liên quan</p>
        </div>

        {/* Form */}
        <div className="assessment-form">
          {HYPERTENSION_FORM_GROUPS.map((group) => (
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
            <div className={`metric-card ${bpStatus}`}>
              <span className="metric-label">Huyết áp</span>
              <span className="metric-value">{systolic}/{diastolic}</span>
              <span className="metric-unit">{bpLabel}</span>
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
          <div className="analysis-results hypertension-results">
            <h3>Kết Quả Đánh Giá Nguy Cơ Tăng Huyết Áp</h3>
            <HypertensionAnalysisPanel analysis={analysis} />
          </div>
        )}
      </div>
    </div>
  );
}

function HypertensionAnalysisPanel({ analysis }) {
  if (!analysis?.risks?.items) return <p className="muted">Chưa có kết quả</p>;
  
const htnRisk = analysis.risks.items.find(r => r.key === "hypertension");
  if (!htnRisk) return <p className="muted">Không tìm thấy dữ liệu tăng huyết áp</p>;

  const riskLevel = htnRisk.level_key;
  const riskScore = htnRisk.score || 0;
  const maxScore = htnRisk.max_score || 14;
  const percent = (riskScore / maxScore) * 100;

  return (
    <div className={`risk-panel ${riskLevel}`}>
      {/* Risk Level Badge */}
      <div className="risk-header">
        <div className="risk-badge">
          <span className="risk-level">{htnRisk.level}</span>
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
      {htnRisk.reasons?.length > 0 && (
        <div className="risk-details">
          <h4>Các Yếu Tố Nguy Cơ Phát Hiện:</h4>
          <ul className="reason-list">
            {htnRisk.reasons.map((reason, idx) => (
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
          <li>Khám huyết áp định kỳ 3-6 tháng 1 lần</li>
          <li>Giảm lượng muối dưới 2,300 mg/ngày (tương đương khoảng 1 thìa cà phê)</li>
          <li>Tăng cường hoạt động thể chất 150 phút/tuần</li>
          <li>Duy trì cân nặng lành mạnh (BMI 18.5-24.9)</li>
          <li>Hạn chế rượu bia, dừa hút thuốc lá</li>
          <li>Tăng cường bầu rau xanh, trái cây, đặc biệt là khoai lang, chuối (giàu kali)</li>
          {htnRisk.level_key === "high" && (
            <li className="urgent">Cần khám bác sĩ ngay và có thể cần dùng thuốc kiểm soát huyết áp</li>
          )}
        </ul>
      </div>

      {/* Diet Advice */}
      {analysis.diet && (
        <HypertensionDietAdvice diet={analysis.diet} />
      )}
    </div>
  );
}

function HypertensionDietAdvice({ diet }) {
  if (!diet) return null;

  return (
    <div className="diet-advice">
      <h4>🍎 Gợi Ý Dinh Dưỡng DASH</h4>
      
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
        💡 Chế độ ăn DASH (Dietary Approaches to Stop Hypertension) giúp giảm huyết áp lên đến 11 mmHg
      </div>
    </div>
  );
}

export default HypertensionAssessment;