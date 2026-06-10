// frontend/web/src/trang-chu.jsx
import "../src/css/trang-chu.css";

// SVG icons as inline components – no external dependencies
function IconHeartPulse() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function IconDatabase() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  );
}

function IconBrain() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 2a5 5 0 0 1 5 5v4a5 5 0 0 1-5 5H5a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5z" />
      <path d="M14.5 2a5 5 0 0 1 5 5v4a5 5 0 0 1-5 5H10" />
      <path d="M9.5 16v6" />
      <path d="M14.5 16v6" />
      <path d="M6 22h12" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconUser() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconPlugin() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  );
}

function IconActivity() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function IconBook() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

function IconPlay() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function IconInfo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}

// Disease cards data
const DISEASES = [
  {
    id: "diabetes",
    name: "Tiểu Đường",
    desc: "Đánh giá nguy cơ đái tháo đường type 2 dựa trên đường huyết và HbA1c",
    icon: "🩸",
    iconClass: "dc-icon--red",
    tag: "ML + Rule",
    featured: false,
  },
  {
    id: "hypertension",
    name: "Cao Huyết Áp",
    desc: "Phân tích huyết áp, BMI và lối sống để đánh giá nguy cơ tăng huyết áp",
    icon: "💊",
    iconClass: "dc-icon--blue",
    tag: "ML + Rule",
    featured: true,
  },
  {
    id: "cardiovascular",
    name: "Tim Mạch",
    desc: "Dự đoán nguy cơ bệnh tim mạch từ cholesterol và các yếu tố rủi ro",
    icon: "🫀",
    iconClass: "dc-icon--amber",
    tag: "ML + Rule",
    featured: false,
  },
  {
    id: "kidney",
    name: "Bệnh Thận",
    desc: "Đánh giá suy thận mạn qua creatinine, acid uric và hồ sơ sinh hóa",
    icon: "🔬",
    iconClass: "dc-icon--purple",
    tag: "ML + Rule",
    featured: false,
  },
  {
    id: "stroke",
    name: "Đột Quỵ",
    desc: "Phân tích yếu tố nguy cơ đột quỵ dựa trên quy tắc chuyên gia",
    icon: "🧠",
    iconClass: "dc-icon--teal",
    tag: "Rule Engine",
    featured: false,
  },
];

// Workflow steps data
const WORKFLOW_STEPS = [
  {
    id: 1,
    icon: <IconUser />,
    iconVariant: "",
    title: "Xây dựng Hồ Sơ Sức Khỏe",
    desc: "Người dùng nhập các chỉ số sinh tồn, sinh hóa, lối sống và tiền sử bệnh một lần duy nhất. Dữ liệu được lưu vào Health Profile và tái sử dụng cho mọi lần đánh giá.",
    tags: [
      { label: "BMI", cls: "ws-tag--blue" },
      { label: "Huyết áp", cls: "ws-tag--blue" },
      { label: "Đường huyết", cls: "ws-tag--blue" },
      { label: "Cholesterol", cls: "ws-tag--blue" },
    ],
    cardVariant: "",
    isLast: false,
  },
  {
    id: 2,
    icon: <IconPlugin />,
    iconVariant: "",
    title: "Tải Plugin Bệnh Động",
    desc: "Người dùng chọn bệnh cần đánh giá. Hệ thống tự động tải plugin tương ứng từ metadata.json và sinh form nhập liệu mà không cần code mới.",
    tags: [
      { label: "Plugin-Based", cls: "ws-tag--blue" },
      { label: "Metadata-Driven", cls: "ws-tag--blue" },
      { label: "No-Code Form", cls: "ws-tag" },
    ],
    cardVariant: "",
    isLast: false,
  },
  {
    id: 3,
    icon: <IconDatabase />,
    iconVariant: "",
    title: "Hợp Nhất Dữ Liệu",
    desc: "Backend kết hợp Health Profile từ cơ sở dữ liệu với dữ liệu bổ sung từ form. Form data được ưu tiên khi xung đột, tạo ra bộ dữ liệu hợp nhất để đưa vào engine.",
    tags: [
      { label: "Health Profile", cls: "ws-tag" },
      { label: "Form Data", cls: "ws-tag" },
      { label: "Unified Data", cls: "ws-tag--blue" },
    ],
    cardVariant: "",
    isLast: false,
  },
  {
    id: 4,
    icon: <IconShield />,
    iconVariant: "ws-icon--highlight",
    title: "Rule Engine Đánh Giá",
    desc: "Rule Engine luôn chạy, tính điểm rủi ro dựa trên các quy tắc y tế được định nghĩa rõ ràng — baseline mapping, risk modifiers, protective factors và interactions.",
    tags: [
      { label: "Luôn hoạt động", cls: "ws-tag--blue" },
      { label: "Giải thích được", cls: "ws-tag--blue" },
      { label: "Có Fallback", cls: "ws-tag" },
    ],
    cardVariant: "ws-card--highlight",
    isLast: false,
  },
  {
    id: 5,
    icon: <IconBrain />,
    iconVariant: "ws-icon--highlight",
    title: "ML Engine Dự Đoán",
    desc: "Mô hình học máy huấn luyện từ dữ liệu NHANES tính xác suất mắc bệnh. Chạy song song với Rule Engine khi đủ dữ liệu đầu vào, tự động fallback nếu thiếu đặc trưng.",
    tags: [
      { label: "XGBoost", cls: "ws-tag--blue" },
      { label: "F-beta Optimized", cls: "ws-tag--blue" },
      { label: "NHANES Dataset", cls: "ws-tag" },
    ],
    cardVariant: "ws-card--highlight",
    isLast: false,
  },
  {
    id: 6,
    icon: <IconCheck />,
    iconVariant: "ws-icon--success",
    title: "Kết Quả & Khuyến Nghị",
    desc: "Hệ thống trả về mức độ nguy cơ từ Rule Engine và ML Engine cùng giải thích chi tiết và các khuyến nghị cá nhân hóa. Kết quả được lưu vào lịch sử đánh giá.",
    tags: [
      { label: "Risk Level", cls: "ws-tag--green" },
      { label: "Explanation", cls: "ws-tag--green" },
      { label: "Recommendations", cls: "ws-tag--green" },
    ],
    cardVariant: "ws-card--success",
    isLast: true,
  },
];

// Feature cards data
const FEATURES = [
  {
    id: 1,
    iconClass: "fc-icon--1",
    icon: <IconPlugin />,
    title: "Plugin-Based Architecture",
    desc: "Thêm bệnh mới chỉ cần tạo metadata.json trong thư mục plugin — không cần sửa code backend hay frontend.",
    featured: false,
  },
  {
    id: 2,
    iconClass: "fc-icon--2",
    icon: <IconHeartPulse />,
    title: "Hồ Sơ Sức Khỏe Trung Tâm",
    desc: "Nhập dữ liệu một lần, sử dụng cho tất cả các bệnh. Health Profile là nguồn dữ liệu chính được tái sử dụng.",
    featured: false,
  },
  {
    id: 3,
    iconClass: "fc-icon--3",
    icon: <IconShield />,
    title: "Rule Engine Minh Bạch",
    desc: "Kết quả dựa trên quy tắc y tế rõ ràng, có thể giải thích từng điểm số — không phải hộp đen.",
    featured: true,
    featuredLabel: "Nổi bật",
  },
  {
    id: 4,
    iconClass: "fc-icon--4",
    icon: <IconBrain />,
    title: "ML Engine với Fallback",
    desc: "Mô hình học máy tự động fallback về Rule Engine khi thiếu dữ liệu, đảm bảo kết quả luôn có sẵn.",
    featured: false,
  },
  {
    id: 5,
    iconClass: "fc-icon--5",
    icon: <IconActivity />,
    title: "Lịch Sử Đánh Giá",
    desc: "Theo dõi xu hướng nguy cơ theo thời gian, so sánh kết quả giữa các lần đánh giá và phát hiện thay đổi sớm.",
    featured: false,
  },
  {
    id: 6,
    iconClass: "fc-icon--6",
    icon: <IconBook />,
    title: "5 Bệnh Được Hỗ Trợ",
    desc: "Tiểu đường, cao huyết áp, tim mạch, bệnh thận và đột quỵ — 4 bệnh có cả ML và Rule Engine.",
    featured: false,
  },
];

export default function TrangChu({ setCurrentView, userName, onLogout, onGoToLogin }) {

  // Hàm navigate an toàn — nếu chưa đăng nhập (setCurrentView undefined) thì gọi onGoToLogin
  function navigate(key) {
    if (setCurrentView) {
      setCurrentView(key);
    } else if (onGoToLogin) {
      onGoToLogin();
    }
  }

  return (
    <div className="tc-page">
      <main>
        {/* ====================================================
            HERO
        ==================================================== */}
        <section className="hero">
          <div className="hero-bg-mesh" aria-hidden="true">
            <div className="mesh-circle mesh-circle--1" />
            <div className="mesh-circle mesh-circle--2" />
            <div className="mesh-circle mesh-circle--3" />
          </div>

          <div className="container hero-container">
            {/* Left: Text */}
            <div className="hero-text">
              <div className="hero-badge">
                <span className="badge-dot" />
                Trường Công Nghệ Thông Tin &amp; Truyền Thông – Đại Học Cần Thơ
              </div>

              <h1 className="hero-heading">
                Đánh Giá Nguy Cơ<br />
                <em>Bệnh Mạn Tính</em> Bằng<br />
                AI &amp; Rule Engine
              </h1>

              <p className="hero-desc">
                Nền tảng sàng lọc sức khỏe thông minh kết hợp luật chuyên gia
                và mô hình học máy. Hỗ trợ 5 nhóm bệnh mạn tính phổ biến với
                kiến trúc Plugin-Based mở rộng linh hoạt.
              </p>

              <div className="hero-cta">
                <button
                  className="btn btn--primary"
                  onClick={() => navigate("risk")}
                >
                  <IconPlay />
                  Bắt đầu đánh giá
                </button>
                <button
                  className="btn btn--outline"
                  onClick={() => navigate("gioi-thieu")}
                >
                  <IconInfo />
                  Tìm hiểu hệ thống
                </button>
              </div>

              <div className="hero-trust">
                <div className="trust-item">
                  <span className="trust-num">5</span>
                  <span className="trust-label">Bệnh mạn tính</span>
                </div>
                <div className="trust-divider" />
                <div className="trust-item">
                  <span className="trust-num">2 Engine</span>
                  <span className="trust-label">Rule + ML kết hợp</span>
                </div>
                <div className="trust-divider" />
                <div className="trust-item">
                  <span className="trust-num">NHANES</span>
                  <span className="trust-label">Dữ liệu huấn luyện</span>
                </div>
              </div>
            </div>

            {/* Right: Risk Assessment Card */}
            <div className="hero-visual" aria-hidden="true">
              <div className="visual-card--main">
                <div className="vc-header">
                  <div className="vc-dots">
                    <span />
                    <span />
                    <span />
                  </div>
                  <span className="vc-title">Kết quả đánh giá · Nguy cơ tổng hợp</span>
                </div>
                <div className="vc-body">
                  <div className="vc-patient-row">
                    <div className="vc-patient-avatar">NV</div>
                    <div className="vc-patient-info">
                      <span className="vc-patient-name">Nguyễn Văn A</span>
                      <span className="vc-patient-meta">45 tuổi · Nam · BMI 26.4</span>
                    </div>
                  </div>

                  <div className="vc-risk-list">
                    <div className="vc-risk-item">
                      <div className="vc-risk-label">
                        <span>Tiểu Đường</span>
                        <span className="vc-risk-pct" style={{ color: "#f59e0b" }}>62%</span>
                      </div>
                      <div className="vc-risk-bar-track">
                        <div className="vc-risk-bar-fill vc-risk-bar-fill--mid" style={{ width: "62%" }} />
                      </div>
                    </div>
                    <div className="vc-risk-item">
                      <div className="vc-risk-label">
                        <span>Cao Huyết Áp</span>
                        <span className="vc-risk-pct" style={{ color: "#ef4444" }}>81%</span>
                      </div>
                      <div className="vc-risk-bar-track">
                        <div className="vc-risk-bar-fill vc-risk-bar-fill--high" style={{ width: "81%" }} />
                      </div>
                    </div>
                    <div className="vc-risk-item">
                      <div className="vc-risk-label">
                        <span>Tim Mạch</span>
                        <span className="vc-risk-pct" style={{ color: "#22c55e" }}>28%</span>
                      </div>
                      <div className="vc-risk-bar-track">
                        <div className="vc-risk-bar-fill vc-risk-bar-fill--low" style={{ width: "28%" }} />
                      </div>
                    </div>
                  </div>

                  <div className="vc-footer-meta">
                    <span className="vc-meta-chip">Rule + ML Engine</span>
                    <span className="vc-meta-status">
                      <span className="vc-meta-dot" />
                      Đã phân tích
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================
            DISEASE STRIP
        ==================================================== */}
        <section className="diseases">
          <div className="container">
            <div className="section-header">
              <div className="section-badge">5 Bệnh Được Hỗ Trợ</div>
              <h2 className="section-title">Sàng lọc toàn diện các bệnh mạn tính</h2>
              <p className="section-desc">
                Mỗi bệnh là một plugin độc lập — thêm mới mà không cần sửa code, 
                mỗi plugin tích hợp cả Rule Engine và ML Engine.
              </p>
            </div>

            <div className="disease-grid">
              {DISEASES.map((d) => (
                <div
                  key={d.id}
                  className={`disease-card${d.featured ? " disease-card--featured" : ""}`}
                >
                  <div className={`dc-icon ${d.iconClass}`}>
                    {d.icon}
                  </div>
                  <div className="dc-name">{d.name}</div>
                  <div className="dc-desc">{d.desc}</div>
                  <span className="dc-tag">{d.tag}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ====================================================
            WORKFLOW SECTION
        ==================================================== */}
        <section className="workflow" id="workflow">
          <div className="container">
            <div className="section-header">
              <div className="section-badge">Quy Trình Đánh Giá</div>
              <h2 className="section-title">Từ hồ sơ đến kết quả phân tích</h2>
              <p className="section-desc">
                Pipeline kết hợp Rule Engine và ML Engine — đảm bảo kết quả
                luôn có, dù dữ liệu đầy đủ hay chưa.
              </p>
            </div>

            <div className="workflow-timeline">
              {WORKFLOW_STEPS.map((step) => (
                <div
                  key={step.id}
                  className={`workflow-step${step.isLast ? " workflow-step--last" : ""}`}
                >
                  <div className="ws-icon-wrap">
                    <div className={`ws-icon ${step.iconVariant}`}>
                      {step.icon}
                    </div>
                    {!step.isLast && <div className="ws-connector" />}
                  </div>
                  <div className={`ws-card ${step.cardVariant}`}>
                    <span className="ws-step-num">BƯỚC {String(step.id).padStart(2, "0")}</span>
                    <h3 className="ws-title">{step.title}</h3>
                    <p className="ws-desc">{step.desc}</p>
                    <div className="ws-tags">
                      {step.tags.map((t) => (
                        <span key={t.label} className={`ws-tag ${t.cls}`}>{t.label}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ====================================================
            FEATURES SECTION
        ==================================================== */}
        <section className="features" id="features">
          <div className="container">
            <div className="section-header">
              <div className="section-badge">Tính Năng</div>
              <h2 className="section-title">Thiết kế cho độ mở rộng và tin cậy</h2>
              <p className="section-desc">
                Kiến trúc Plugin-Based với Metadata-Driven Design — 
                thêm bệnh mới không cần sửa code, hệ thống luôn có kết quả.
              </p>
            </div>

            <div className="features-grid">
              {FEATURES.map((feat) => (
                <div
                  key={feat.id}
                  className={`feature-card${feat.featured ? " feature-card--featured" : ""}`}
                >
                  <div className={`fc-icon ${feat.iconClass}`}>
                    {feat.icon}
                  </div>
                  <h3 className="fc-title">{feat.title}</h3>
                  <p className="fc-desc">{feat.desc}</p>
                  {feat.featured && feat.featuredLabel && (
                    <div className="fc-featured-tag">{feat.featuredLabel}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}