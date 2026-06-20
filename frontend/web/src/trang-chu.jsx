// frontend/web/src/trang-chu.jsx
import "../src/css/trang-chu.css";

// Feature cards data
const FEATURES = [
  {
    id: 1,
    iconClass: "fc-icon--1",
    icon: <i className="fa-solid fa-puzzle-piece"></i>,
    title: "Plugin-Based Architecture",
    desc: "Thêm bệnh mới chỉ cần tạo metadata.json trong thư mục plugin — không cần sửa code backend hay frontend.",
    featured: false,
  },
  {
    id: 2,
    iconClass: "fc-icon--2",
    icon: <i className="fa-solid fa-heart-pulse"></i>,
    title: "Hồ Sơ Sức Khỏe Trung Tâm",
    desc: "Nhập dữ liệu một lần, sử dụng cho tất cả các bệnh. Health Profile là nguồn dữ liệu chính được tái sử dụng.",
    featured: false,
  },
  {
    id: 3,
    iconClass: "fc-icon--3",
    icon: <i className="fa-solid fa-shield-halved"></i>,
    title: "Rule Engine Minh Bạch",
    desc: "Kết quả dựa trên quy tắc y tế rõ ràng, có thể giải thích từng điểm số — không phải hộp đen.",
    featured: true,
    featuredLabel: "Nổi bật",
  },
  {
    id: 4,
    iconClass: "fc-icon--4",
    icon: <i className="fa-solid fa-brain"></i>,
    title: "ML Engine với Fallback",
    desc: "Mô hình học máy tự động fallback về Rule Engine khi thiếu dữ liệu, đảm bảo kết quả luôn có sẵn.",
    featured: false,
  },
  {
    id: 5,
    iconClass: "fc-icon--5",
    icon: <i className="fa-solid fa-chart-line"></i>,
    title: "Lịch Sử Đánh Giá",
    desc: "Theo dõi xu hướng nguy cơ theo thời gian, so sánh kết quả giữa các lần đánh giá và phát hiện thay đổi sớm.",
    featured: false,
  },
  {
    id: 6,
    iconClass: "fc-icon--6",
    icon: <i className="fa-solid fa-book-medical"></i>,
    title: "5 Bệnh Được Hỗ Trợ",
    desc: "Tiểu đường, cao huyết áp, tim mạch, bệnh thận và đột quỵ — 4 bệnh có cả ML và Rule Engine.",
    featured: false,
  },
];

export default function TrangChu({ setCurrentView, onGoToLogin }) {

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

          <div className="hero-decoration-blob"></div>

          <div className="container hero-container relative-z1">

            {/* Cột trái: Nội dung & Call to Action */}
            <div className="hero-content">
              <div className="hero-badge">
                <i className="badge-icon fa-solid fa-graduation-cap" aria-hidden="true"></i>
                <span className="badge-text">Trường CNTT&TT – ĐH Cần Thơ</span>
              </div>

              <h1 className="hero-title">
                Đánh Giá Nguy Cơ <br />
                <span className="text-gradient">Bệnh Mạn Tính</span> <br />
                Bằng AI & Rule Engine
              </h1>

              <p className="hero-desc">
                Hệ thống dự đoán rủi ro y tế kết hợp giữa trí tuệ nhân tạo (Machine Learning) và bộ luật y khoa chuyên gia, đem lại kết quả chuẩn xác, tường minh và có khả năng giải thích chi tiết.
              </p>

              <div className="hero-cta">
                <button className="btn hero-btn-primary" onClick={() => navigate("risk")}>
                  Bắt đầu đánh giá <i className="fa-solid fa-arrow-right"></i>
                </button>
                <button className="btn hero-btn-secondary" onClick={() => navigate("about")}>
                  <i className="fa-solid fa-circle-info"></i> Tìm hiểu hệ thống
                </button>
              </div>

              {/* Block thống kê: Key Stats Bar */}
              <div className="hero-stats-block">
                <div className="stat-item">
                  <span className="stat-value">X+</span>
                  <span className="stat-label">Bệnh mạn tính</span>
                </div>
                <div className="stat-divider"></div>
                <div className="stat-item">
                  <span className="stat-value">2</span>
                  <span className="stat-label">Engine kết hợp</span>
                </div>
                <div className="stat-divider"></div>
                <div className="stat-item">
                  <span className="stat-value">JSON</span>
                  <span className="stat-label">Cấu hình Plugin</span>
                </div>
              </div>
            </div>

            {/* Cột phải: Card Plugin Overview (Giữ nguyên như bản trước) */}
            <div className="hero-visual">
              <div className="plugin-overview-card">
                {/* ... Nội dung Plugin Card giữ nguyên ... */}
                <div className="poc-header">
                  <h3 className="poc-title">
                    <i className="fa-solid fa-layer-group" style={{ color: '#2563EB', marginRight: '8px' }}></i> Hệ thống Plugin Bệnh Lý
                  </h3>
                  <span className="poc-status-badge">
                    <span className="status-dot"></span> Đang hoạt động
                  </span>
                </div>

                <div className="poc-grid">
                  {/* 1. Tiểu đường */}
                  <div className="poc-item poc-item--diabetes">
                    <div className="poc-icon"><i className="fa-solid fa-droplet"></i></div>
                    <div className="poc-info">
                      <span className="poc-name">Tiểu đường</span>
                      <span className="poc-tech">Rule + ML</span>
                    </div>
                  </div>

                  {/* 2. Tim mạch */}
                  <div className="poc-item poc-item--cardio">
                    <div className="poc-icon"><i className="fa-solid fa-heart-pulse"></i></div>
                    <div className="poc-info">
                      <span className="poc-name">Tim mạch</span>
                      <span className="poc-tech">Rule + ML</span>
                    </div>
                  </div>

                  {/* 3. Cao huyết áp */}
                  <div className="poc-item poc-item--hypertension">
                    <div className="poc-icon"><i className="fa-solid fa-gauge-high"></i></div>
                    <div className="poc-info">
                      <span className="poc-name">Cao huyết áp</span>
                      <span className="poc-tech">Rule + ML</span>
                    </div>
                  </div>

                  {/* 4. Bệnh thận */}
                  <div className="poc-item poc-item--kidney">
                    <div className="poc-icon"><i className="fa-solid fa-staff-snake"></i></div>
                    <div className="poc-info">
                      <span className="poc-name">Bệnh thận</span>
                      <span className="poc-tech">Rule + ML</span>
                    </div>
                  </div>

                  {/* 5. Đột quỵ */}
                  <div className="poc-item poc-item--stroke">
                    <div className="poc-icon"><i className="fa-solid fa-brain"></i></div>
                    <div className="poc-info">
                      <span className="poc-name">Đột quỵ</span>
                      <span className="poc-tech">Rule + ML</span>
                    </div>
                  </div>

                  {/* 6. Mở rộng (Dashed) */}
                  <div className="poc-item poc-item--dashed">
                    <div className="poc-icon"><i className="fa-solid fa-plus"></i></div>
                    <div className="poc-info">
                      <span className="poc-name">Mở rộng bệnh mới</span>
                      <span className="poc-tech">Metadata JSON</span>
                    </div>
                  </div>
                </div>

                <div className="poc-footer">
                  <div className="poc-footer-text">
                    <i className="fa-solid fa-code-branch"></i> Kiến trúc mở rộng linh hoạt, không giới hạn
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ====================================================
            DISEASE STRIP
        ==================================================== */}
        <section className="diseases-section">
          <div className="container">
            <div className="section-header text-center" style={{ marginBottom: "36px" }}>
              
              <h2 className="section-title">Sàng lọc toàn diện các bệnh mạn tính</h2>
              <p className="section-desc">
                Mỗi bệnh lý vận hành như một plugin độc lập, tự động phân luồng xử lý qua Rule Engine hoặc Machine Learning để đảm bảo độ chính xác cao nhất.
              </p>
            </div>

            {/* Lưới 3 cột x 2 hàng */}
            <div className="disease-grid">

              {/* 1. Tiểu đường (Nhóm Chuyển hóa - Xanh dương) */}
              <div className="disease-card disease-card--metabolic">
                <div className="dc-icon-wrapper">
                  <i className="dc-icon fa-solid fa-droplet" aria-hidden="true"></i>
                </div>
                <h3 className="dc-title">Bệnh Tiểu Đường</h3>
                <p className="dc-desc">Sàng lọc sớm nguy cơ đái tháo đường tuýp 2 dựa trên chỉ số Glucose, BMI và tiền sử gia đình.</p>
                <div className="dc-footer">
                  <span className="dc-badge dc-badge--hybrid">ML + RULE ENGINE</span>
                </div>
              </div>

              {/* 2. Cao huyết áp (Nhóm Tim mạch - Đỏ/Cam) */}
              <div className="disease-card disease-card--cardio">
                <div className="dc-icon-wrapper">
                  <i className="dc-icon fa-solid fa-gauge-high" aria-hidden="true"></i>
                </div>
                <h3 className="dc-title">Cao Huyết Áp</h3>
                <p className="dc-desc">Đánh giá rủi ro tăng huyết áp thông qua chỉ số huyết áp tâm thu, tâm trương và nhịp tim.</p>
                <div className="dc-footer">
                  <span className="dc-badge dc-badge--hybrid">ML + RULE ENGINE</span>
                </div>
              </div>

              {/* 3. Tim mạch (Nhóm Tim mạch - Đỏ) */}
              <div className="disease-card disease-card--cardio-red">
                <div className="dc-icon-wrapper">
                  <i className="dc-icon fa-solid fa-heart-pulse" aria-hidden="true"></i>
                </div>
                <h3 className="dc-title">Bệnh Tim Mạch</h3>
                <p className="dc-desc">Phân tích toàn diện nguy cơ suy tim, nhồi máu cơ tim từ bộ hồ sơ lipid máu và lối sống.</p>
                <div className="dc-footer">
                  <span className="dc-badge dc-badge--hybrid">ML + RULE ENGINE</span>
                </div>
              </div>

              {/* 4. Bệnh thận (Đã Fix Icon HealthIcons) */}
              <div className="disease-card disease-card--renal">
                <div className="dc-icon-wrapper">
                  <i className="dc-icon fa-solid fa-hand-holding-medical" aria-hidden="true"></i>
                </div>
                <h3 className="dc-title">Bệnh Thận Mạn</h3>
                <p className="dc-desc">Kiểm tra chức năng lọc của thận thông qua chỉ số Creatinine, huyết áp và protein niệu.</p>
                <div className="dc-footer">
                  <span className="dc-badge dc-badge--hybrid">ML + RULE ENGINE</span>
                </div>
              </div>

              {/* 5. Đột quỵ (Nhóm Thần kinh/Tim mạch) */}
              <div className="disease-card disease-card--stroke">
                <div className="dc-icon-wrapper">
                  <i className="dc-icon fa-solid fa-brain" aria-hidden="true"></i>
                </div>
                <h3 className="dc-title">Nguy Cơ Đột Quỵ</h3>
                <p className="dc-desc">Phát hiện nguy cơ tắc nghẽn mạch máu não dựa trên các chỉ số y khoa chuẩn chuyên gia.</p>
                <div className="dc-footer">
                  <span className="dc-badge dc-badge--rule">RULE ENGINE</span>
                </div>
              </div>

            </div>

            {/* CTA Footer Section */}
            <div className="diseases-cta text-center">
              <button className="btn btn-outline-primary" onClick={() => navigate("risk")}>
                Khám phá chi tiết hệ thống Plugin <i className="fa-solid fa-arrow-right"></i>
              </button>
            </div>
          </div>
        </section>

        {/* ====================================================
            WORKFLOW SECTION
        ==================================================== */}
        <section className="process-section">
          <div className="container">
            <div className="section-header text-center" style={{ marginBottom: "48px" }}>
              <h2 className="section-title">Từ hồ sơ đến kết quả phân tích</h2>
              <p className="section-desc">
                Hệ thống xử lý luồng dữ liệu y tế qua 6 bước khép kín, đảm bảo tính chuẩn xác, minh bạch và cá nhân hóa cho từng người dùng.
              </p>
            </div>

            {/* Dùng class process-grid để khớp với CSS bạn vừa gửi */}
            <div className="process-grid">

              {/* BƯỚC 01 */}
              <div className="process-card">
                <div className="proc-header">
                  <span className="proc-step-badge">BƯỚC 01</span>
                  <i className="proc-icon fa-solid fa-clipboard-list" aria-hidden="true"></i>
                </div>
                <h3 className="proc-title">Thu thập Hồ Sơ Sức Khỏe</h3>
                <p className="proc-desc">Tiếp nhận các chỉ số lâm sàng cơ bản và chuyên sâu từ người dùng. Hệ thống hỗ trợ lưu trữ để không cần nhập lại nhiều lần.</p>
                <div className="proc-tags">
                  <span className="proc-tag tag-input">BMI</span>
                  <span className="proc-tag tag-input">Huyết áp</span>
                  <span className="proc-tag tag-input">Đường huyết</span>
                </div>
              </div>

              {/* BƯỚC 02 */}
              <div className="process-card">
                <div className="proc-header">
                  <span className="proc-step-badge">BƯỚC 02</span>
                  <i className="proc-icon fa-solid fa-puzzle-piece" aria-hidden="true"></i>
                </div>
                <h3 className="proc-title">Ánh xạ Metadata Plugin</h3>
                <p className="proc-desc">Đọc cấu hình JSON của bệnh lý tương ứng để xác định những trường dữ liệu nào là bắt buộc và những trường nào có thể bỏ qua.</p>
                <div className="proc-tags">
                  <span className="proc-tag tag-tech">Plugin-Based</span>
                  <span className="proc-tag tag-tech">JSON Parser</span>
                </div>
              </div>

              {/* BƯỚC 03 */}
              <div className="process-card">
                <div className="proc-header">
                  <span className="proc-step-badge">BƯỚC 03</span>
                  <i className="proc-icon fa-solid fa-filter" aria-hidden="true"></i>
                </div>
                <h3 className="proc-title">Tiền xử lý & Chuẩn hóa</h3>
                <p className="proc-desc">Tự động điền khuyết các dữ liệu bị thiếu bằng thuật toán, sau đó chuẩn hóa thang đo (scaling) để mô hình AI có thể hiểu được.</p>
                <div className="proc-tags">
                  <span className="proc-tag tag-tech">Missing Imputation</span>
                  <span className="proc-tag tag-tech">Standard Scaler</span>
                </div>
              </div>

              {/* BƯỚC 04 */}
              <div className="process-card">
                <div className="proc-header">
                  <span className="proc-step-badge">BƯỚC 04</span>
                  <i className="proc-icon fa-solid fa-scale-balanced" aria-hidden="true"></i>
                </div>
                <h3 className="proc-title">Đánh giá Rule Engine</h3>
                <p className="proc-desc">Đối chiếu dữ liệu với các bộ luật y khoa chuyên gia. Nếu phát hiện rủi ro rõ ràng dựa trên ngưỡng lâm sàng, hệ thống sẽ kết luận ngay.</p>
                <div className="proc-tags">
                  <span className="proc-tag tag-tech">Y khoa chuyên gia</span>
                  <span className="proc-tag tag-tech">Ngưỡng lâm sàng</span>
                </div>
              </div>

              {/* BƯỚC 05 */}
              <div className="process-card">
                <div className="proc-header">
                  <span className="proc-step-badge">BƯỚC 05</span>
                  <i className="proc-icon fa-solid fa-brain" aria-hidden="true"></i>
                </div>
                <h3 className="proc-title">Dự đoán ML Engine</h3>
                <p className="proc-desc">Nếu Rule Engine không chắc chắn, dữ liệu sẽ được chuyển qua mô hình Machine Learning để tính toán xác suất rủi ro tiềm ẩn.</p>
                <div className="proc-tags">
                  <span className="proc-tag tag-tech">XGBoost & RF</span>
                  <span className="proc-tag tag-tech">F-beta Optimized</span>
                </div>
              </div>

              {/* BƯỚC 06 */}
              <div className="process-card">
                <div className="proc-header">
                  <span className="proc-step-badge proc-step-badge--final">BƯỚC 06</span>
                  <i className="proc-icon fa-solid fa-circle-check" aria-hidden="true"></i>
                </div>
                <h3 className="proc-title">Tổng hợp & Giải thích</h3>
                <p className="proc-desc">Xuất báo cáo cuối cùng bao gồm mức độ rủi ro, giải thích lý do (những chỉ số nào gây ảnh hưởng) và đưa ra lời khuyên phù hợp.</p>
                <div className="proc-tags">
                  <span className="proc-tag tag-output">Risk Level</span>
                  <span className="proc-tag tag-output">Explanation</span>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ====================================================
            FEATURES SECTION
        ==================================================== */}
        <section className="features" id="features">
          <div className="container">
            <div className="section-header">
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
