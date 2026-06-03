import { useEffect, useMemo, useState } from "react";
import { getJson, postJson } from "./api.js";

import DiseaseSelector from "./DiseaseSelector.jsx";
import DiabetesAssessment from "./DiabetesAssessment.jsx";
import HypertensionAssessment from "./HypertensionAssessment.jsx";
import CardiovascularAssessment from "./CardiovascularAssessment.jsx"; 
import KidneyAssessment from "./KidneyAssessment.jsx";

const DEFAULT_PROFILE = {
  age: 40,
  gender: "Nam",
  height: 165,
  weight: 65,
  waist: 85,
  systolic: 120,
  diastolic: 80,
  fasting_glucose: 95,
  hba1c: 5.4,
  total_cholesterol: 185,
  ldl: 110,
  creatinine: 0.9,
  smoke: false,
  exercise: true,
  alcohol: 0,
  sodium_intake: 2000,
  nsaid_use: false,
  family_diabetes: false,
  family_hypertension: false,
  family_cardiovascular: false,
};

const MENU_ITEMS = [
  { id: "assessment", icon: "□", label: "Đánh giá sức khỏe" },
  { id: "overview", icon: "▣", label: "Tổng Quan" },
  { id: "advice", icon: "✦", label: "Tư Vấn AI", badge: "Gemini" },
  { id: "nutrition", icon: "◈", label: "Dinh Dưỡng & Thuốc", badge: "Mới" },
  { id: "lookup", icon: "☰", label: "Tra Cứu" },
];

const FORM_GROUPS = [
  {
    id: "personal",
    label: "Cá nhân",
    title: "Thông tin cơ bản",
    fields: [
      { key: "age", label: "Tuổi (năm)", type: "number", min: 18, max: 100, step: 1 },
      { key: "gender", label: "Giới tính", type: "select", options: ["Nam", "Nữ"] },
    ],
  },
  {
    id: "body",
    label: "Cơ thể",
    title: "Chỉ số cơ thể & huyết áp",
    fields: [
      { key: "height", label: "Chiều cao (cm)", type: "number", min: 140, max: 220, step: 1 },
      { key: "weight", label: "Cân nặng (kg)", type: "number", min: 30, max: 200, step: 0.5 },
      { key: "waist", label: "Vòng bụng (cm)", type: "number", min: 50, max: 180, step: 1 },
      { key: "systolic", label: "Tâm thu (mmHg)", type: "number", min: 70, max: 220, step: 1 },
      { key: "diastolic", label: "Tâm trương (mmHg)", type: "number", min: 40, max: 140, step: 1 },
    ],
  },
  {
    id: "labs",
    label: "Xét nghiệm",
    title: "Xét nghiệm máu",
    fields: [
      { key: "fasting_glucose", label: "Đường huyết lúc đói (mg/dL)", type: "number", min: 50, max: 600, step: 1 },
      { key: "hba1c", label: "HbA1c (%)", type: "number", min: 3, max: 15, step: 0.1 },
      { key: "total_cholesterol", label: "Cholesterol toàn phần (mg/dL)", type: "number", min: 80, max: 500, step: 1 },
      { key: "ldl", label: "LDL-Cholesterol (mg/dL)", type: "number", min: 30, max: 400, step: 1 },
      { key: "creatinine", label: "Creatinine máu (mg/dL)", type: "number", min: 0.3, max: 15, step: 0.1 },
    ],
  },
  {
    id: "lifestyle",
    label: "Lối sống",
    title: "Thói quen sống",
    fields: [
      { key: "smoke", label: "Hút thuốc lá", type: "boolean", trueLabel: "Có", falseLabel: "Không" },
      { key: "exercise", label: "Vận động thường xuyên", type: "boolean", trueLabel: "Có", falseLabel: "Không" },
      { key: "alcohol", label: "Rượu bia (số ly/ngày)", type: "number", min: 0, max: 20, step: 1 },
      { key: "sodium_intake", label: "Lượng muối ước tính (mg/ngày)", type: "number", min: 500, max: 8000, step: 100 },
      { key: "nsaid_use", label: "Dùng thuốc NSAID thường xuyên", type: "boolean", trueLabel: "Có", falseLabel: "Không" },
    ],
  },
  {
    id: "family",
    label: "Gia đình",
    title: "Tiền sử gia đình",
    fields: [
      { key: "family_diabetes", label: "Đái tháo đường", type: "checkbox" },
      { key: "family_hypertension", label: "Tăng huyết áp", type: "checkbox" },
      { key: "family_cardiovascular", label: "Bệnh tim mạch", type: "checkbox" },
    ],
  },
];

const TIPS = [
  "Khám sức khỏe định kỳ ít nhất 1 lần/năm.",
  "Theo dõi cân nặng và vòng bụng thường xuyên.",
  "Ngủ đủ 7-8 giờ mỗi đêm.",
  "Giảm stress, tập thể dục nhẹ nhàng đều đặn.",
];

function App() {
  const [activeView, setActiveView] = useState("assessment");
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [analysis, setAnalysis] = useState(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedDisease, setSelectedDisease] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const defaults = await getJson("/api/default-profile");
        if (cancelled) return;
        const nextProfile = defaults.profile || DEFAULT_PROFILE;
        setProfile(nextProfile);
        const nextAnalysis = await postJson("/api/analyze", { profile: nextProfile });
        if (!cancelled) setAnalysis(nextAnalysis);
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  async function runAnalysis({ reveal = true } = {}) {
    setLoading(true);
    setError("");
    try {
      const result = await postJson("/api/analyze", { profile });
      setAnalysis(result);
      setDirty(false);
      if (reveal) setShowAnalysis(true);
      return result;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }

  function updateProfile(key, value) {
    setProfile((current) => ({ ...current, [key]: value }));
    setDirty(true);
  }

  function resetProfile() {
    setProfile(DEFAULT_PROFILE);
    setShowAnalysis(false);
    setDirty(true);
  }

  const currentTitle = MENU_ITEMS.find((item) => item.id === activeView)?.label;

  return (
    <div className="app-shell">
      <Sidebar activeView={activeView} onNavigate={setActiveView} />
      <main className="main-panel">
        <Header title={currentTitle} analysis={analysis} />
        {error ? <div className="system-alert">API: {error}</div> : null}

        {/* Nếu đang ở tab Đánh giá và chưa chọn bệnh -> Hiển thị menu chọn bệnh */}
        {activeView === "assessment" && !selectedDisease && (
          <DiseaseSelector onSelect={setSelectedDisease} />
        )}

        {/* Các form tương ứng dựa vào ID bệnh được chọn */}
        {activeView === "assessment" && selectedDisease === "diabetes" && (
          <DiabetesAssessment
            profile={profile}
            analysis={analysis}
            loading={loading}
            onUpdate={updateProfile}
            onAnalyze={() => runAnalysis({ reveal: true })}
            onBack={() => setSelectedDisease(null)}
          />
        )}

        {activeView === "assessment" && selectedDisease === "hypertension" && (
          <HypertensionAssessment
            profile={profile}
            analysis={analysis}
            loading={loading}
            onUpdate={updateProfile}
            onAnalyze={() => runAnalysis({ reveal: true })}
            onBack={() => setSelectedDisease(null)}
          />
        )}

        {activeView === "assessment" && selectedDisease === "cardiovascular" && (
          <CardiovascularAssessment
            profile={profile}
            analysis={analysis}
            loading={loading}
            onUpdate={updateProfile}
            onAnalyze={() => runAnalysis({ reveal: true })}
            onBack={() => setSelectedDisease(null)}
          />
        )}

        {activeView === "assessment" && selectedDisease === "kidney" && (
          <KidneyAssessment
            profile={profile}
            analysis={analysis}
            loading={loading}
            onUpdate={updateProfile}
            onAnalyze={() => runAnalysis({ reveal: true })}
            onBack={() => setSelectedDisease(null)}
          />
        )}
        {activeView === "overview" && (
          <OverviewPage analysis={analysis} dirty={dirty} onRefresh={() => runAnalysis({ reveal: false })} />
        )}
        {activeView === "advice" && <AdvicePage profile={profile} analysis={analysis} />}
        {activeView === "nutrition" && <NutritionMedicationPage profile={profile} analysis={analysis} />}
        {activeView === "lookup" && <LookupPage />}
      </main>
    </div>
  );
}

function Sidebar({ activeView, onNavigate }) {
  return (
    <aside className="sidebar">
      <div className="brand-block">
        <img
          src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSml8Rxo3MX3HSecqWuczzz-GTkuFazmL356A&s"
          alt="CTU"
          className="brand-logo"
        />
        <div className="brand-school">Trường CNTT & Truyền Thông</div>
        <div className="brand-name">Healthy AI</div>
        <div className="brand-caption">Hệ thống hỗ trợ sức khỏe thông minh</div>
      </div>

      <div className="nav-section">Chức năng</div>
      <nav className="side-nav">
        {MENU_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${activeView === item.id ? "active" : ""}`}
            onClick={() => onNavigate(item.id)}
            type="button"
          >
            <span className="nav-icon" aria-hidden="true">
              {item.icon}
            </span>
            <span>{item.label}</span>
            {item.badge ? <span className={`nav-badge ${item.badge === "Mới" ? "warm" : ""}`}>{item.badge}</span> : null}
          </button>
        ))}
      </nav>

      <div className="sidebar-status">
        <div className="status-row">
          <span>Gemini AI</span>
          <strong><i />Hoạt động</strong>
        </div>
        <div className="status-row">
          <span>Phân tích ML</span>
          <strong><i />Sẵn sàng</strong>
        </div>
        <div className="status-row">
          <span>NHANES</span>
          <strong><i />Đã tải</strong>
        </div>
      </div>

      <div className="sidebar-foot">Không thay thế bác sĩ chuyên khoa</div>
    </aside>
  );
}

function Header({ title, analysis }) {
  const riskSummary = analysis?.risks?.items || [];
  return (
    <header className="page-header">
      <div>
        <div className="header-uni">Trường Công Nghệ Thông Tin và Truyền Thông - Đại học Cần Thơ</div>
        <h1>{title}</h1>
        <p>Phân tích sức khỏe cá nhân, phát hiện nguy cơ sớm và hỗ trợ tư vấn theo dữ liệu nhập.</p>
      </div>
      <div className="header-tags">
        {riskSummary.slice(0, 4).map((risk) => (
          <span key={risk.key} className={`mini-risk ${risk.level_key}`}>
            {risk.short}: {risk.level}
          </span>
        ))}
      </div>
    </header>
  );
}

function AssessmentPage({ profile, analysis, dirty, loading, showAnalysis, onUpdate, onAnalyze, onReset }) {
  const [formMode, setFormMode] = useState("tabs");
  const [activeTab, setActiveTab] = useState("personal");
  const groupsToRender = formMode === "full" ? FORM_GROUPS : FORM_GROUPS.filter((group) => group.id === activeTab);

  return (
    <section className="screen-stack">
      <Panel
        title="Nhập thông tin sức khỏe của bạn"
        actions={
          <div className="segmented">
            <button className={formMode === "tabs" ? "selected" : ""} onClick={() => setFormMode("tabs")} type="button">
              Theo nhóm
            </button>
            <button className={formMode === "full" ? "selected" : ""} onClick={() => setFormMode("full")} type="button">
              Một trang
            </button>
          </div>
        }
      >
        {formMode === "tabs" ? (
          <div className="tab-strip compact">
            {FORM_GROUPS.map((group) => (
              <button
                key={group.id}
                className={activeTab === group.id ? "active" : ""}
                onClick={() => setActiveTab(group.id)}
                type="button"
              >
                {group.label}
              </button>
            ))}
          </div>
        ) : null}

        <div className={`form-grid ${formMode === "full" ? "full" : ""}`}>
          {groupsToRender.map((group) => (
            <FormSection key={group.id} group={group} profile={profile} onUpdate={onUpdate} />
          ))}
        </div>

        <div className="form-actions">
          <button className="ghost-button" onClick={onReset} type="button">
            Làm lại
          </button>
          {dirty ? <span className="dirty-note">Dữ liệu đã thay đổi</span> : null}
          <button className="primary-button" onClick={onAnalyze} disabled={loading} type="button">
            {loading ? "Đang phân tích..." : "Phân tích nguy cơ"}
          </button>
        </div>
      </Panel>

      {showAnalysis && analysis ? <AnalysisResults analysis={analysis} /> : null}
    </section>
  );
}

function FormSection({ group, profile, onUpdate }) {
  return (
    <section className="form-section">
      <h3>{group.title}</h3>
      <div className="field-grid">
        {group.fields.map((field) => (
          <Field key={field.key} field={field} value={profile[field.key]} onChange={(value) => onUpdate(field.key, value)} />
        ))}
      </div>
    </section>
  );
}

function Field({ field, value, onChange }) {
  if (field.type === "select") {
    return (
      <label className="field">
        <span>{field.label}</span>
        <select value={value} onChange={(event) => onChange(event.target.value)}>
          {field.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (field.type === "boolean") {
    return (
      <label className="field switch-field">
        <span>{field.label}</span>
        <button className={`switch ${value ? "on" : ""}`} onClick={() => onChange(!value)} type="button">
          <span>{value ? field.trueLabel : field.falseLabel}</span>
        </button>
      </label>
    );
  }

  if (field.type === "checkbox") {
    return (
      <label className="checkbox-field">
        <input type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} />
        <span>{field.label}</span>
      </label>
    );
  }

  return (
    <label className="field">
      <span>{field.label}</span>
      <input
        type="number"
        min={field.min}
        max={field.max}
        step={field.step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function AnalysisResults({ analysis }) {
  const { risks, conclusion } = analysis;

  return (
    <>
      <Panel title="Kết quả phân tích nguy cơ">
        <div className="risk-grid">
          {risks.items.map((risk) => (
            <RiskCard key={risk.key} risk={risk} />
          ))}
        </div>
      </Panel>

      <Panel title="Biểu đồ mức độ nguy cơ tổng hợp">
        <div className="risk-bars">
          {risks.items.map((risk) => (
            <ProgressRow key={risk.key} label={risk.name} percent={risk.percent} levelKey={risk.level_key} />
          ))}
        </div>
      </Panel>

      <Panel title="Kết luận & khuyến nghị khởi đầu">
        <Conclusion conclusion={conclusion} />
        <div className="tip-list">
          {TIPS.map((tip) => (
            <div key={tip} className="soft-tip">
              {tip}
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}

function RiskCard({ risk }) {
  return (
    <article className={`risk-card ${risk.level_key}`}>
      <div className="risk-card-top">
        <span className={`risk-badge ${risk.level_key}`}>Nguy cơ {risk.level}</span>
        <strong>
          {risk.score}/{risk.max_score}
        </strong>
      </div>
      <h3>{risk.name}</h3>
      <ProgressBar percent={risk.percent} levelKey={risk.level_key} />
      <details>
        <summary>Tại sao nguy cơ này?</summary>
        {risk.reasons.length ? (
          <ul>
            {risk.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        ) : (
          <p>Chưa có yếu tố nguy cơ nổi bật.</p>
        )}
      </details>
    </article>
  );
}

function Conclusion({ conclusion }) {
  if (conclusion.high_risks.length) {
    return (
      <div className="conclusion high">
        <strong>Nguy cơ cao</strong> với: {conclusion.high_risks.join(", ")}. Cần gặp bác sĩ chuyên khoa sớm để kiểm tra và tư vấn điều trị.
      </div>
    );
  }
  if (conclusion.medium_risks.length) {
    return (
      <div className="conclusion medium">
        <strong>Nguy cơ trung bình</strong> với: {conclusion.medium_risks.join(", ")}. Nên theo dõi và điều chỉnh lối sống trong thời gian tới.
      </div>
    );
  }
  return (
    <div className="conclusion good">
      <strong>Các chỉ số đang tương đối ổn.</strong> Tiếp tục duy trì lối sống lành mạnh và theo dõi định kỳ.
    </div>
  );
}

function OverviewPage({ analysis, dirty, onRefresh }) {
  if (!analysis) return <EmptyState onRefresh={onRefresh} />;

  const categories = analysis.categories;
  const stats = [
    { tone: "blue", value: categories.bmi.value.toFixed(1), label: "BMI (kg/m²)", sub: categories.bmi.label },
    { tone: "purple", value: categories.blood_pressure.value, label: "Huyết áp (mmHg)", sub: categories.blood_pressure.label },
    { tone: "teal", value: categories.fasting_glucose.value, label: "Đường huyết đói", sub: categories.fasting_glucose.label },
    { tone: "amber", value: `${categories.hba1c.value.toFixed(1)}%`, label: "HbA1c", sub: categories.hba1c.label },
  ];

  const labRows = [
    ["Cholesterol toàn phần", analysis.user_data.total_cholesterol, 300, categories.total_cholesterol],
    ["LDL-Cholesterol", analysis.user_data.ldl, 250, categories.ldl],
    ["Creatinine máu", analysis.user_data.creatinine, 2.5, categories.creatinine],
    ["Đường huyết lúc đói", analysis.user_data.fasting_glucose, 300, categories.fasting_glucose],
  ];

  return (
    <section className="screen-stack">
      {dirty ? (
        <div className="system-alert subtle">
          Hồ sơ đã chỉnh sửa sau lần phân tích gần nhất.
          <button type="button" onClick={onRefresh}>Cập nhật tổng quan</button>
        </div>
      ) : null}

      <Panel title="Chỉ số cơ thể & sinh hiệu">
        <div className="stat-grid">
          {stats.map((stat) => (
            <div key={stat.label} className={`stat-box ${stat.tone}`}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
              <small>{stat.sub}</small>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Đánh giá các chỉ số chi tiết">
        <div className="metric-row">
          {Object.entries(categories).map(([key, item]) => (
            <span key={key} className={`metric-pill ${item.status}`}>
              {metricLabel(key)}: {String(item.label)}
            </span>
          ))}
        </div>
      </Panel>

      <Panel title="Biểu đồ BMI">
        <BmiGauge bmi={analysis.user_data.bmi} />
      </Panel>

      <Panel title="Phân tích mỡ máu & xét nghiệm">
        <div className="lab-grid">
          {labRows.map(([label, value, max, category]) => (
            <div className="lab-row" key={label}>
              <div>
                <span>{label}</span>
                <b className={category.status}>{category.label}</b>
              </div>
              <ProgressBar percent={Math.min(100, (Number(value) / max) * 100)} levelKey={category.status} />
              <small>{value} / {max}</small>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Biểu đồ phân tích">
        <div className="chart-grid">
          <div className="bar-chart">
            {[
              ["BMI", analysis.user_data.bmi, 42],
              ["Tâm thu", analysis.user_data.systolic, 220],
              ["Tâm trương", analysis.user_data.diastolic, 140],
              ["Glucose", analysis.user_data.fasting_glucose, 300],
              ["HbA1c", analysis.user_data.hba1c, 15],
              ["Cholesterol", analysis.user_data.total_cholesterol, 300],
              ["LDL", analysis.user_data.ldl, 250],
            ].map(([label, value, max]) => (
              <div className="bar-item" key={label}>
                <span>{label}</span>
                <div><i style={{ width: `${Math.min(100, (value / max) * 100)}%` }} /></div>
                <b>{Number(value).toFixed(label === "HbA1c" ? 1 : 0)}</b>
              </div>
            ))}
          </div>
          <RiskDonut items={analysis.risks.items} />
        </div>
      </Panel>
    </section>
  );
}

function AdvicePage({ profile }) {
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function requestAdvice() {
    setLoading(true);
    setError("");
    try {
      const data = await postJson("/api/advice", { profile });
      setReply(data.reply || "");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="screen-stack">
      <Panel title="Tư vấn sức khỏe bởi Gemini 2.5 Flash">
        <div className="info-note">
          Hệ thống gửi hồ sơ sức khỏe hiện tại sang Gemini để nhận khuyến nghị tham khảo về rủi ro, ăn uống, vận động và theo dõi.
        </div>
        <button className="primary-button full" type="button" onClick={requestAdvice} disabled={loading}>
          {loading ? "Đang tạo lời khuyên..." : "Nhận lời khuyên từ Gemini"}
        </button>
        {error ? <div className="system-alert">{error}</div> : null}
        {reply ? <MarkdownBlock text={reply} /> : null}
        {reply ? (
          <div className="warning-note">
            Lời khuyên từ AI chỉ mang tính tham khảo. Vui lòng gặp bác sĩ để được khám, chẩn đoán và điều trị chính xác.
          </div>
        ) : null}
      </Panel>
    </section>
  );
}

function NutritionMedicationPage({ profile, analysis }) {
  const [activeTab, setActiveTab] = useState("diet");
  const [diet, setDiet] = useState(null);
  const [dietLoading, setDietLoading] = useState(false);
  const [dietError, setDietError] = useState("");

  useEffect(() => {
    if (activeTab !== "diet") return;
    let cancelled = false;
    async function loadDiet() {
      setDietLoading(true);
      setDietError("");
      try {
        const data = await postJson("/api/diet", { profile });
        if (!cancelled) setDiet(data);
      } catch (err) {
        if (!cancelled) setDietError(err.message);
      } finally {
        if (!cancelled) setDietLoading(false);
      }
    }
    loadDiet();
    return () => {
      cancelled = true;
    };
  }, [activeTab, profile]);

  return (
    <section className="screen-stack">
      <RiskPills analysis={analysis} />
      <Panel title="Dinh dưỡng & thuốc">
        <div className="tab-strip">
          <button className={activeTab === "diet" ? "active" : ""} type="button" onClick={() => setActiveTab("diet")}>
            Gợi ý dinh dưỡng
          </button>
          <button className={activeTab === "meds" ? "active" : ""} type="button" onClick={() => setActiveTab("meds")}>
            Kiểm tra thuốc
          </button>
        </div>

        {activeTab === "diet" ? (
          <DietTab diet={diet} loading={dietLoading} error={dietError} profile={profile} />
        ) : (
          <MedicationTab profile={profile} />
        )}
      </Panel>
    </section>
  );
}

function DietTab({ diet, loading, error, profile }) {
  if (loading) return <div className="loading-line">Đang tải gợi ý dinh dưỡng...</div>;
  if (error) return <div className="system-alert">{error}</div>;
  if (!diet) return null;

  const groups = [
    ["Năng lượng & đa lượng", ["DR1TKCAL", "DR1TPROT", "DR1TCARB", "DR1TSUGR", "DR1TFIBE"]],
    ["Chất béo & cholesterol", ["DR1TTFAT", "DR1TSFAT", "DR1TCHOL", "DR1TALCO"]],
    ["Khoáng chất", ["DR1TSODI", "DR1TPOTA", "DR1TCALC", "DR1TIRON", "DR1TMAGN"]],
  ];

  return (
    <div className="sub-stack">
      <div className="info-note">
        {diet.source === "nhanes_knn"
          ? `Tính toán từ ${diet.n_similar} người trong bộ dữ liệu NHANES có thể trạng tương đồng với tuổi ${profile.age}, BMI ${Number(profile.weight / ((profile.height / 100) ** 2)).toFixed(1)}.`
          : "Đang dùng ngưỡng khuyến nghị chuẩn khi không tìm thấy dữ liệu NHANES phù hợp."}
      </div>

      {groups.map(([title, keys]) => (
        <section key={title} className="nutrition-group">
          <h3>{title}</h3>
          <div className="nutrition-grid">
            {keys.map((key) => {
              const item = diet.benchmark[key];
              if (!item) return null;
              return <NutritionCard key={key} item={item} />;
            })}
          </div>
        </section>
      ))}

      <div className="two-col">
        <FoodList title="Nên ăn nhiều" tone="good" items={diet.tips["ăn nhiều"] || []} />
        <FoodList title="Nên hạn chế" tone="danger" items={diet.tips["hạn chế"] || []} />
      </div>

      <section className="nutrition-group">
        <h3>Thực đơn mẫu 1 ngày</h3>
        <div className="meal-grid">
          {Object.entries(diet.sample_menu).map(([meal, items]) => (
            <div className="meal-card" key={meal}>
              <strong>{meal}</strong>
              {items.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function NutritionCard({ item }) {
  return (
    <article className="nutrition-card">
      <span>{item.label}</span>
      <strong>{Number(item.mean).toFixed(0)}</strong>
      <small>{item.unit}</small>
      <ProgressBar percent={Math.min(100, (Number(item.mean) / Number(item.ref || 1)) * 100)} levelKey={item.status} />
      <em>P25-P75: {Number(item.p25).toFixed(0)}-{Number(item.p75).toFixed(0)}</em>
      <b className={`nutri-badge ${item.status}`}>{item.status === "good" ? "Tốt" : "Chú ý"}</b>
    </article>
  );
}

function FoodList({ title, tone, items }) {
  return (
    <section className={`food-list ${tone}`}>
      <h3>{title}</h3>
      {items.slice(0, 8).map((item) => (
        <div key={item}>{item}</div>
      ))}
    </section>
  );
}

function MedicationTab({ profile }) {
  const [search, setSearch] = useState("");
  const [drugs, setDrugs] = useState([]);
  const [selected, setSelected] = useState([]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const handle = setTimeout(async () => {
      try {
        const data = await getJson(`/api/drugs?search=${encodeURIComponent(search)}&limit=80`);
        if (!cancelled) setDrugs(data.items || []);
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [search]);

  function addDrug(drug) {
    if (!selected.includes(drug)) setSelected((current) => [...current, drug]);
  }

  async function checkSelected() {
    setLoading(true);
    setError("");
    try {
      const data = await postJson("/api/medications/check", { profile, selected_drugs: selected });
      setReport(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="sub-stack">
      <div className="info-note">
        Nhập các thuốc đang sử dụng để kiểm tra ảnh hưởng tiềm ẩn lên đường huyết, huyết áp, mỡ máu và chức năng thận.
      </div>

      <label className="field search-field">
        <span>Tìm kiếm tên thuốc</span>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="METFORMIN, INSULIN, AMLODIPINE..." />
      </label>

      <div className="drug-picker">
        {drugs.map((drug) => (
          <button key={drug} type="button" onClick={() => addDrug(drug)}>
            {drug}
          </button>
        ))}
      </div>

      <div className="selected-drugs">
        {selected.length ? (
          selected.map((drug) => (
            <button key={drug} type="button" onClick={() => setSelected((items) => items.filter((item) => item !== drug))}>
              {drug} ×
            </button>
          ))
        ) : (
          <span>Chưa chọn thuốc.</span>
        )}
      </div>

      <button className="primary-button full" type="button" onClick={checkSelected} disabled={loading || selected.length === 0}>
        {loading ? "Đang kiểm tra..." : "Kiểm tra tương tác & ảnh hưởng"}
      </button>
      {error ? <div className="system-alert">{error}</div> : null}
      {report ? <MedicationReport report={report} /> : null}
    </div>
  );
}

function MedicationReport({ report }) {
  return (
    <div className="sub-stack">
      <div className={`conclusion ${report.has_concern ? "medium" : "good"}`}>
        {report.has_concern
          ? `Phát hiện ${report.warnings.length} cảnh báo cần lưu ý với ${report.selected_drugs.length} thuốc đang dùng.`
          : `Không phát hiện tương tác đáng lo ngại với ${report.selected_drugs.length} thuốc đã chọn.`}
      </div>

      {report.contextual?.length ? (
        <section className="report-section">
          <h3>Cảnh báo quan trọng</h3>
          {report.contextual.map((message) => (
            <div className="context-warning" key={message} dangerouslySetInnerHTML={{ __html: message }} />
          ))}
        </section>
      ) : null}

      {report.warnings?.length ? (
        <section className="report-section">
          <h3>Cảnh báo thuốc cần lưu ý</h3>
          {report.warnings.map((item, index) => (
            <AlertCard key={`${item.drug}-${index}`} item={item} />
          ))}
        </section>
      ) : null}

      {report.info_items?.length ? (
        <section className="report-section">
          <h3>Thông tin thuốc đang điều trị</h3>
          {report.info_items.map((item, index) => (
            <AlertCard key={`${item.drug}-${index}`} item={item} tone="info" />
          ))}
        </section>
      ) : null}

      {Object.entries(report.drug_stats || {}).some(([, stats]) => Object.keys(stats).length) ? (
        <section className="report-section">
          <h3>Thống kê NHANES theo thuốc</h3>
          {Object.entries(report.drug_stats).map(([drug, stats]) =>
            Object.keys(stats).length ? <DrugStats key={drug} drug={drug} stats={stats} /> : null
          )}
        </section>
      ) : null}

      {report.affected_metrics?.length ? (
        <div className="info-note">Nên theo dõi định kỳ: {report.affected_metrics.map(metricLabel).join(", ")}.</div>
      ) : null}
    </div>
  );
}

function AlertCard({ item, tone = "warn" }) {
  return (
    <article className={`alert-card ${tone === "info" ? "info" : item.severity}`}>
      <strong>{item.drug} - {item.effect_label}</strong>
      <span>{item.description}</span>
      <small>Chỉ số liên quan: {item.metrics.join(", ")}</small>
    </article>
  );
}

function DrugStats({ drug, stats }) {
  const total = Object.values(stats).reduce((sum, value) => sum + Number(value), 0) || 1;
  return (
    <div className="drug-stats">
      <strong>{drug}</strong>
      {Object.entries(stats).map(([disease, count]) => {
        const percent = Math.round((Number(count) / total) * 100);
        return (
          <div className="stat-line" key={disease}>
            <span>{disease}</span>
            <div><i style={{ width: `${percent}%` }} /></div>
            <b>{percent}%</b>
          </div>
        );
      })}
    </div>
  );
}

function LookupPage() {
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    getJson("/api/reference")
      .then((data) => {
        if (!cancelled) setPayload(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <div className="system-alert">{error}</div>;
  if (!payload) return <div className="loading-line">Đang tải bảng tra cứu...</div>;

  return (
    <section className="screen-stack">
      <Panel title="Bảng tra cứu chỉ số sức khỏe tham chiếu">
        <div className="reference-table">
          <div className="ref-head">
            <span>Chỉ số</span>
            <span>Bình thường</span>
            <span>Cần lưu ý</span>
            <span>Nguy cơ cao</span>
          </div>
          {payload.reference_rows.map((row) => (
            <div className="ref-row" key={row.metric}>
              <span>{row.metric}</span>
              <span>{row.normal}</span>
              <span>{row.watch}</span>
              <span>{row.high}</span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Hướng dẫn lối sống lành mạnh">
        <div className="tip-grid">
          {payload.lifestyle_cards.map((card) => (
            <article key={card.title} className={`lifestyle-card ${card.tone}`}>
              <h3>{card.title}</h3>
              <ul>
                {card.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </Panel>
    </section>
  );
}

function RiskPills({ analysis }) {
  if (!analysis?.risks?.items) return null;
  return (
    <div className="risk-pill-strip">
      {analysis.risks.items.map((risk) => (
        <span key={risk.key} className={`mini-risk ${risk.level_key}`}>
          {risk.short}: {risk.level}
        </span>
      ))}
    </div>
  );
}

function Panel({ title, children, actions }) {
  return (
    <section className="panel-card">
      <div className="panel-title">
        <h2>{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

function ProgressBar({ percent, levelKey }) {
  return (
    <div className="progress-outer">
      <i className={levelKey} style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
    </div>
  );
}

function ProgressRow({ label, percent, levelKey }) {
  return (
    <div className="risk-bar-row">
      <div>
        <span>{label}</span>
        <b className={levelKey}>{Math.round(percent)}%</b>
      </div>
      <ProgressBar percent={percent} levelKey={levelKey} />
    </div>
  );
}

function BmiGauge({ bmi }) {
  const clamped = Math.max(14, Math.min(42, bmi));
  const left = ((clamped - 14) / (42 - 14)) * 100;
  return (
    <div className="bmi-wrap">
      <div className="bmi-track">
        <span className="under" />
        <span className="normal" />
        <span className="over" />
        <span className="obese" />
      </div>
      <div className="bmi-marker" style={{ left: `${left}%` }}>
        <i />
        <b>BMI {bmi.toFixed(1)}</b>
      </div>
      <div className="bmi-legend">
        <span>Thiếu cân</span>
        <span>Bình thường</span>
        <span>Thừa cân</span>
        <span>Béo phì</span>
      </div>
    </div>
  );
}

function RiskDonut({ items }) {
  const stops = [];
  let cursor = 0;
  const colors = ["#e53935", "#1976d2", "#7c3aed", "#00897b"];
  items.forEach((item, index) => {
    const size = Math.max(6, item.percent / 4);
    stops.push(`${colors[index]} ${cursor}deg ${cursor + size * 3.6}deg`);
    cursor += size * 3.6;
  });
  stops.push(`#e8eef7 ${cursor}deg 360deg`);

  return (
    <div className="donut-wrap">
      <div className="risk-donut" style={{ background: `conic-gradient(${stops.join(", ")})` }}>
        <span>Risk</span>
      </div>
      <div className="donut-legend">
        {items.map((item, index) => (
          <span key={item.key}>
            <i style={{ background: colors[index] }} /> {item.short} {Math.round(item.percent)}%
          </span>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ onRefresh }) {
  return (
    <Panel title="Chưa có dữ liệu phân tích">
      <p className="muted">Hãy phân tích hồ sơ hiện tại để hiển thị tổng quan.</p>
      <button className="primary-button" type="button" onClick={onRefresh}>
        Phân tích ngay
      </button>
    </Panel>
  );
}

function MarkdownBlock({ text }) {
  return <div className="markdown-box" dangerouslySetInnerHTML={{ __html: markdownToHtml(text) }} />;
}

function markdownToHtml(text) {
  return escapeHtml(text)
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br />");
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function metricLabel(key) {
  const labels = {
    bmi: "BMI",
    blood_pressure: "Huyết áp",
    fasting_glucose: "Đường huyết",
    hba1c: "HbA1c",
    total_cholesterol: "Cholesterol",
    ldl: "LDL",
    creatinine: "Creatinine",
    exercise: "Vận động",
    smoke: "Hút thuốc",
    systolic: "Huyết áp tâm thu",
    diastolic: "Huyết áp tâm trương",
    weight: "Cân nặng",
  };
  return labels[key] || key;
}

export default App;
