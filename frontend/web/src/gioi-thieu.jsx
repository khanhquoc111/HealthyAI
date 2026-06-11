import React from "react";
// Nhớ đảm bảo bạn đã copy nội dung file gioi-thieu.css vào đường dẫn này nhé
import "./css/gioi-thieu.css";

export default function GioiThieu({ setCurrentView }) {
  // Hàm điều hướng nội bộ
  const navigate = (view) => {
    if (setCurrentView) setCurrentView(view);
  };

  return (
    <div className="gioi-thieu-page">
      {/* ═══════════════════════════════════════════
           PAGE HEADER
      ═══════════════════════════════════════════ */}
      <div className="page-header">
        <div className="container">
          <div className="page-header-inner">
            <div>
              <div className="page-badge">
                <span className="badge-dot"></span>
                Về chúng tôi
              </div>
              <h1 className="page-title">Giới Thiệu Healthy AI</h1>
              <p className="page-desc">
                Tìm hiểu về dự án, đội ngũ và công nghệ đằng sau hệ thống đánh
                giá nguy cơ bệnh mạn tính kết hợp Luật chuyên gia và Trí tuệ
                nhân tạo.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
           MAIN CONTENT
      ═══════════════════════════════════════════ */}
      <main>
        {/* ─────────────────────────────────────
             SECTION 1: ABOUT INSTITUTION
        ───────────────────────────────────── */}
        <section className="about-section">
          <div className="container">
            <div className="section-header">
              <div className="section-badge">Cơ sở</div>
              <h2 className="section-title">
                Trường Công Nghệ Thông Tin Và Truyền Thông
              </h2>
            </div>

            <div className="about-grid">
              <div className="about-card">
                <div className="about-icon">
                  <img
                    src="https://www.ctu.edu.vn/images/upload/logo.png"
                    alt="CTU Logo"
                    className="about-logo"
                  />
                </div>
                <h3 className="about-card-title">Đại Học Cần Thơ</h3>
                <p className="about-card-text">
                  Đại học Cần Thơ là một trong những trường đại học hàng đầu khu
                  vực ĐBSCL, đi đầu trong công tác đào tạo, nghiên cứu khoa học
                  và chuyển giao công nghệ. Nhà trường cam kết thúc đẩy chuyển
                  đổi số và ứng dụng công nghệ thông tin vào y tế công cộng.
                </p>
              </div>

              <div className="about-card">
                <div className="about-icon">
                  <img
                    src="https://drive.google.com/thumbnail?id=1eWowijMhg8LRCPTBTXFZEaBl7HcW-NiU&sz=w1000"
                    alt="CICT Logo"
                    className="about-logo"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      borderRadius: "50%",
                    }}
                  />
                </div>
                <h3 className="about-card-title">Trường CNTT & TT (CICT)</h3>
                <p className="about-card-text">
                  Trường Công Nghệ Thông tin & Truyền Thông là đơn vị chủ trì dự
                  án. Với đội ngũ giàu kinh nghiệm, trường là trung tâm nghiên
                  cứu khoa học hàng đầu trong lĩnh vực Kỹ thuật phần mềm, Trí
                  tuệ nhân tạo (AI) và các hệ thống y tế số ứng dụng.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────
             SECTION 2: ABOUT PROJECT
        ───────────────────────────────────── */}
        <section className="project-section">
          <div className="container">
            <div className="section-header">
              <div className="section-badge">Dự án</div>
              <h2 className="section-title">Về Healthy AI</h2>
            </div>

            <div className="project-content">
              <div className="project-col project-col--text">
                <h3 className="project-subtitle">
                  Nền tảng Đánh giá Sức khỏe Kép (Dual-Engine)
                </h3>
                <p className="project-para">
                  <strong>Healthy AI</strong> là nền tảng y tế số quản lý hồ sơ
                  sức khỏe và sàng lọc nguy cơ mắc 5 loại bệnh mạn tính (Tiểu
                  đường, Cao huyết áp, Tim mạch, Bệnh thận, Đột quỵ).
                </p>

                <p className="project-para">
                  Dự án giải quyết bài toán cốt lõi của y tế số bằng{" "}
                  <strong>Kiến trúc Plugin-Based</strong>
                  và cơ chế{" "}
                  <strong>đánh giá kép (Rule Engine + Machine Learning)</strong>
                  , giúp dự đoán chính xác khi có đủ dữ liệu và luôn đảm bảo có
                  kết quả nhờ luật y khoa chuyên gia làm fallback.
                </p>
              </div>

              <div className="project-col project-col--visual">
                <div className="project-highlights">
                  <h4 className="highlights-title">Điểm nổi bật</h4>
                  <ul className="highlights-list">
                    <li>
                      <span className="highlight-icon">
                        <i className="fa-solid fa-check"></i>
                      </span>
                      Hồ sơ sức khỏe trung tâm (nhập 1 lần, dùng N lần)
                    </li>
                    <li>
                      <span className="highlight-icon">
                        <i className="fa-solid fa-check"></i>
                      </span>
                      Kiến trúc Plugin-Based (Thêm bệnh không cần sửa code)
                    </li>
                    <li>
                      <span className="highlight-icon">
                        <i className="fa-solid fa-check"></i>
                      </span>
                      Kết hợp ML Models (XGBoost/RF) và Rule Engine
                    </li>
                    <li>
                      <span className="highlight-icon">
                        <i className="fa-solid fa-check"></i>
                      </span>
                      Tự động sinh lời giải thích (Explanation Engine)
                    </li>
                    <li>
                      <span className="highlight-icon">
                        <i className="fa-solid fa-check"></i>
                      </span>
                      Xây dựng form UI động (Metadata-Driven Design)
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────
             SECTION 3: TEAM
        ───────────────────────────────────── */}
        <section className="team-section">
          <div className="container team-container">
            <div className="section-header">
              <div className="section-badge">Đội ngũ</div>
              <h2 className="section-title">Những người đứng sau dự án</h2>
            </div>

            {/* Advisors */}
            <div className="team-group">
              <h3 className="team-group-title">
                <i className="fa-solid fa-graduation-cap"></i> Giảng viên hướng dẫn
              </h3>
              <div className="team-grid">
                <div className="team-member">
                  <div className="member-avatar">
                    <img
                      src="https://drive.google.com/thumbnail?id=1ezRKzGVCVNobRF0kEJeWUUtchSdPu_rP&sz=w1000"
                      alt="TS. Trương Minh Thái"
                      className="member-image"
                    />
                  </div>
                  <h4 className="member-name">TS. Trương Minh Thái</h4>
                  <span className="member-role-pill">Hướng dẫn khoa học</span>
                  <p className="member-info">Lĩnh vực: Công Nghệ Phần Mềm</p>
                  <p className="member-desc">
                    Định hướng nghiên cứu tổng thể, tư vấn thiết kế kiến trúc phần mềm và đảm bảo tính chuẩn xác của các thuật toán lõi.
                  </p>
                </div>

                <div className="team-member">
                  <div className="member-avatar">
                    <img
                      src="https://drive.google.com/thumbnail?id=1bM76xY1C0jYUyKYBiO68C7YFt0-j1R8-&sz=w1000"
                      alt="TS. Mã Trường Thành"
                      className="member-image"
                    />
                  </div>
                  <h4 className="member-name">TS. Mã Trường Thành</h4>
                  <span className="member-role-pill">Hướng dẫn kỹ thuật</span>
                  <p className="member-info">Lĩnh vực: Khoa Học Máy Tính</p>
                  <p className="member-desc">
                    Hỗ trợ chuyên sâu về xây dựng, huấn luyện mô hình Machine Learning và tối ưu hóa hiệu suất dự đoán AI.
                  </p>
                </div>
              </div>
            </div>

            {/* Team Members */}
            <div className="team-group">
              <h3 className="team-group-title">
                <i className="fa-solid fa-users"></i> Đội ngũ thực hiện
              </h3>
              <div className="team-grid">
                <div className="team-member">
                  <div className="member-avatar">
                    <img
                      src="https://drive.google.com/thumbnail?id=146qa8yRMF_cE44wmgafREtJA9KYYsvip&sz=w1000"
                      alt="T. Lê Gia Linh"
                      className="member-image"
                    />
                  </div>
                  <h4 className="member-name">T. Lê Gia Linh</h4>
                  <span className="member-role-pill">Lập Trình Viên</span>
                  <p className="member-info">MSSV: B2203561 - DI2296F1</p>
                  <p className="member-desc">
                    Phát triển Data Pipeline, huấn luyện các mô hình Machine Learning và xây dựng hệ thống Rule Engine.
                  </p>
                </div>

                <div className="team-member">
                  <div className="member-avatar">
                    <img
                      src="https://drive.google.com/thumbnail?id=10D0bqovpPyguHq2gMIdQQSF124c7VCGM&sz=w1000"
                      alt="Tr. Ng Khánh Quốc"
                      className="member-image"
                    />
                  </div>
                  <h4 className="member-name">Tr. Ng Khánh Quốc</h4>
                  <span className="member-role-pill">Lập Trình Viên</span>
                  <p className="member-info">MSSV: B2203576 - DI2296F2</p>
                  <p className="member-desc">
                    Thiết kế UI/UX, phát triển ứng dụng Frontend và xây dựng kiến trúc Plugin-based API trên FastAPI.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────
             SECTION 4: OBJECTIVES
        ───────────────────────────────────── */}
        <section className="objectives-section">
          <div className="container objectives-container">
            <div className="section-header text-center">
              <div className="section-badge section-badge--eyebrow">MỤC TIÊU CHIẾN LƯỢC</div>
              <h2 className="section-title">Những gì chúng tôi muốn đạt được</h2>
            </div>

            <div className="objectives-grid">
              {/* Nhóm 1: Trải nghiệm người dùng & Cá nhân hóa (Tông màu xanh dương / Indigo) */}
              <div className="objective-card obj-group--ux">
                <div className="obj-icon-wrapper">
                  <i className="fa-solid fa-notes-medical"></i>
                </div>
                <h3 className="obj-card-title">Hồ sơ sức khỏe dùng chung</h3>
                <p className="obj-desc">
                  Giải quyết vấn đề nhập liệu lặp lại. Người dùng chỉ cần cung cấp chỉ số lâm sàng một lần duy nhất để sàng lọc toàn diện cho mọi loại bệnh.
                </p>
              </div>

              <div className="objective-card obj-group--ux">
                <div className="obj-icon-wrapper">
                  <i className="fa-solid fa-comment-medical"></i>
                </div>
                <h3 className="obj-card-title">Khuyến nghị cá nhân hóa</h3>
                <p className="obj-desc">
                  Explanation Engine tự động phân tích kết quả, sinh ra lời giải thích chi tiết cùng các lời khuyên thiết thực về lối sống và y tế.
                </p>
              </div>

              <div className="objective-card obj-group--ux">
                <div className="obj-icon-wrapper">
                  <i className="fa-solid fa-sliders"></i>
                </div>
                <h3 className="obj-card-title">Giao diện Metadata-Driven</h3>
                <p className="obj-desc">
                  Hệ thống UI tự động tạo hình dựa trên cấu hình của từng plugin bệnh lý, đảm bảo sự đồng bộ hoàn hảo, liền mạch tuyệt đối với backend.
                </p>
              </div>

              {/* Nhóm 2: Kỹ thuật số & Cơ chế Backend (Tông màu xanh lá / Teal) */}
              <div className="objective-card obj-group--tech">
                <div className="obj-icon-wrapper">
                  <i className="fa-solid fa-puzzle-piece"></i>
                </div>
                <h3 className="obj-card-title">Kiến trúc Plugin linh hoạt</h3>
                <p className="obj-desc">
                  Cho phép mở rộng mô hình bệnh lý mới vào hệ thống một cách dễ dàng thông qua tệp JSON cấu hình mà không cần sửa đổi mã nguồn cốt lõi.
                </p>
              </div>

              <div className="objective-card obj-group--tech">
                <div className="obj-icon-wrapper">
                  <i className="fa-solid fa-scale-balanced"></i>
                </div>
                <h3 className="obj-card-title">Đánh giá minh bạch</h3>
                <p className="obj-desc">
                  Kết hợp chặt chẽ giữa Rule Engine chuẩn y khoa với Machine Learning, đảm bảo mọi kết quả trả về đều tường minh, loại bỏ hoàn toàn cơ chế "hộp đen".
                </p>
              </div>

              <div className="objective-card obj-group--tech">
                <div className="obj-icon-wrapper">
                  <i className="fa-solid fa-brain"></i>
                </div>
                <h3 className="obj-card-title">AI Fallback thông minh</h3>
                <p className="obj-desc">
                  Mô hình ML đảm nhận dự đoán chính xác khi có đủ dữ liệu, tự động lui về hệ thống Luật chuyên gia khi thiếu thông số để luôn luôn trả ra kết quả.
                </p>
              </div>
            </div>

            {/* Bổ sung CTA Section cuối trang để xóa bỏ khoảng trắng thừa */}
            <div className="objectives-cta">
              <p className="cta-inline-text">Bạn đã sẵn sàng trải nghiệm giải pháp công nghệ y tế số toàn diện chưa?</p>
              <button className="cta-inline-btn" onClick={() => setCurrentView("risk")}>
                Bắt đầu phân tích ngay <i className="fa-solid fa-arrow-right"></i>
              </button>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────
             SECTION 5: TECH STACK
        ───────────────────────────────────── */}
        <section className="tech-section">
          <div className="container tech-container">
            <div className="section-header text-center" style={{ marginBottom: "40px" }}>
              <div className="section-badge section-badge--eyebrow">CÔNG NGHỆ CỐT LÕI</div>
              <h2 className="section-title">Các công nghệ được sử dụng</h2>
            </div>

            {/* Sử dụng lưới 4 cột (Desktop) hoặc 2 cột (Tablet) để cân bằng tuyệt đối */}
            <div className="tech-grid">

              {/* Cột 1: Frontend (Giữ nguyên) */}
              <div className="tech-category">
                <div className="tech-cat-header">
                  <h3 className="tech-category-title">Frontend</h3>
                </div>
                <ul className="tech-items-list">
                  <li className="tech-list-item">
                    <div className="tech-svg-group">
                      <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/react/react-original.svg" alt="React" className="tech-svg" />
                      <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/vitejs/vitejs-original.svg" alt="Vite" className="tech-svg" />
                    </div>
                    <span className="tech-text">React 18 & Vite</span>
                  </li>
                  <li className="tech-list-item">
                    <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/tailwindcss/tailwindcss-original.svg" alt="UI" className="tech-svg" />
                    <span className="tech-text">Metadata-Driven UI</span>
                  </li>
                  <li className="tech-list-item">
                    <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/axios/axios-plain.svg" alt="Axios" className="tech-svg" />
                    <span className="tech-text">Axios Integration</span>
                  </li>
                </ul>
              </div>

              {/* Cột 2: Backend (Đã fix Pydantic và Plugin) */}
              <div className="tech-category">
                <div className="tech-cat-header">
                  <h3 className="tech-category-title">Backend</h3>
                </div>
                <ul className="tech-items-list">
                  <li className="tech-list-item">
                    <div className="tech-svg-group">
                      <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/python/python-original.svg" alt="Python" className="tech-svg" />
                      <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/fastapi/fastapi-original.svg" alt="FastAPI" className="tech-svg" />
                    </div>
                    <span className="tech-text">Python & FastAPI</span>
                  </li>
                  <li className="tech-list-item">
                    {/* Dùng SimpleIcons cho Pydantic với mã màu chuẩn hồng/đỏ của hãng */}
                    <img src="https://cdn.simpleicons.org/pydantic/E92063" alt="Pydantic" className="tech-svg" />
                    <span className="tech-text">Pydantic Validation</span>
                  </li>
                  <li className="tech-list-item">
                    {/* Dùng Iconify (Phosphor Icons) dạng mảnh ghép (puzzle) cho Plugin */}
                    <img src="https://api.iconify.design/ph:puzzle-piece-fill.svg?color=%23475569" alt="Plugin" className="tech-svg" />
                    <span className="tech-text">Plugin Architecture</span>
                  </li>
                </ul>
              </div>

              {/* Cột 3: AI & ML (Đã fix icon cho NHANES Dataset) */}
              <div className="tech-category">
                <div className="tech-cat-header">
                  <h3 className="tech-category-title">AI & ML</h3>
                </div>
                <ul className="tech-items-list">
                  <li className="tech-list-item">
                    <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/scikitlearn/scikitlearn-original.svg" alt="Scikit" className="tech-svg" />
                    <span className="tech-text">Scikit-learn & Pandas</span>
                  </li>
                  <li className="tech-list-item">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/6/69/XGBoost_logo.png" alt="XGBoost" className="tech-svg" style={{ objectFit: 'contain' }} />
                    <span className="tech-text">XGBoost & RF Models</span>
                  </li>
                  <li className="tech-list-item">
                    {/* Dùng Iconify dạng Database cho tập dữ liệu */}
                    <img src="https://api.iconify.design/ph:database-fill.svg?color=%23475569" alt="Dataset" className="tech-svg" />
                    <span className="tech-text">Dataset</span>
                  </li>
                </ul>
              </div>

              {/* Cột 4: Database & Auth (Đã fix icon cho Bcrypt) */}
              <div className="tech-category">
                <div className="tech-cat-header">
                  <h3 className="tech-category-title">Database & Auth</h3>
                </div>
                <ul className="tech-items-list">
                  <li className="tech-list-item">
                    <div className="tech-svg-group">
                      <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/mysql/mysql-original.svg" alt="MySQL" className="tech-svg" />
                      <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/sqlite/sqlite-original.svg" alt="SQLite" className="tech-svg" />
                    </div>
                    <span className="tech-text">MySQL / SQLite</span>
                  </li>
                  <li className="tech-list-item">
                    <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/sqlalchemy/sqlalchemy-original.svg" alt="SQLAlchemy" className="tech-svg" />
                    <span className="tech-text">SQLAlchemy ORM</span>
                  </li>
                  <li className="tech-list-item">
                    {/* Dùng Iconify dạng khiên bảo mật cho Hashing */}
                    <img src="https://api.iconify.design/ph:shield-check-fill.svg?color=%23475569" alt="Security" className="tech-svg" />
                    <span className="tech-text">Bcrypt Hashing</span>
                  </li>
                </ul>
              </div>

            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────
             SECTION 6: CTA & NAVIGATION
        ───────────────────────────────────── */}
        <section className="cta-section">
          <div className="container">
            <div className="cta-content">
              <h2 className="cta-title">Sẵn sàng bảo vệ sức khỏe?</h2>
              <p className="cta-desc">
                Cập nhật Hồ sơ sức khỏe của bạn ngay hôm nay để nhận báo cáo
                phân tích rủi ro chi tiết từ Healthy AI.
              </p>
              <div className="cta-actions">
                <button
                  onClick={() => navigate("risk")}
                  className="cta-btn cta-btn--primary"
                  style={{ border: "none", cursor: "pointer" }}
                >
                  <i className="fa-solid fa-heart-pulse"></i>
                  Bắt đầu đánh giá ngay
                </button>
                <button
                  onClick={() => navigate("profile")}
                  className="cta-btn cta-btn--outline"
                  style={{ cursor: "pointer" }}
                >
                  <i className="fa-solid fa-file-medical"></i>
                  Thiết lập hồ sơ
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
