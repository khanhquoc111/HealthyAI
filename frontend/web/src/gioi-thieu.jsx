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
              <h2 className="section-title">Về Healthy AI (LuanVanKTPM)</h2>
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

              <div className="project-col project-col--visual">
                <div className="project-visual-card">
                  <div className="visual-header">
                    <div className="visual-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                    <span className="visual-title">
                      Quy trình Đánh giá Nguy cơ
                    </span>
                  </div>
                  <div className="visual-body">
                    <div className="pipeline-item">
                      <span className="pipeline-number">1</span>
                      <span className="pipeline-text">
                        Thu thập Hồ sơ Sức khỏe
                      </span>
                    </div>
                    <div className="pipeline-arrow">
                      <i className="fa-solid fa-arrow-down"></i>
                    </div>
                    <div className="pipeline-item">
                      <span className="pipeline-number">2</span>
                      <span className="pipeline-text">
                        Tải Plugin Bệnh (Metadata)
                      </span>
                    </div>
                    <div className="pipeline-arrow">
                      <i className="fa-solid fa-arrow-down"></i>
                    </div>
                    <div className="pipeline-item">
                      <span className="pipeline-number">3</span>
                      <span className="pipeline-text">
                        Hợp nhất & Chuẩn hóa Dữ liệu
                      </span>
                    </div>
                    <div className="pipeline-arrow">
                      <i className="fa-solid fa-arrow-down"></i>
                    </div>
                    <div className="pipeline-item">
                      <span className="pipeline-number">4</span>
                      <span className="pipeline-text">
                        Dual Engine (Rule + Machine Learning)
                      </span>
                    </div>
                    <div className="pipeline-arrow">
                      <i className="fa-solid fa-arrow-down"></i>
                    </div>
                    <div className="pipeline-item pipeline-item--final">
                      <span
                        className="pipeline-number"
                        style={{ background: "#22c55e" }}
                      >
                        ✓
                      </span>
                      <span className="pipeline-text">
                        Sinh Giải thích & Khuyến nghị
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────
             SECTION 3: TEAM
        ───────────────────────────────────── */}
        <section className="team-section">
          <div className="container">
            <div className="section-header">
              <div className="section-badge">Đội ngũ</div>
              <h2 className="section-title">Những người đứng sau dự án</h2>
            </div>

            {/* Advisors */}
            <div className="team-group">
              <h3 className="team-group-title">Giảng viên hướng dẫn</h3>
              <div className="team-grid team-grid--advisors">
                <div className="team-member">
                  <div className="member-avatar member-avatar--advisor">
                    <img
                      src="https://drive.google.com/thumbnail?id=1ezRKzGVCVNobRF0kEJeWUUtchSdPu_rP&sz=w1000"
                      alt="TS. Trương Minh Thái"
                      className="member-image"
                    />
                  </div>
                  <h4 className="member-name">TS. Trương Minh Thái</h4>
                  <p className="member-role">Hướng dẫn khoa học</p>
                  <p className="member-info">
                    <small>Lĩnh vực: Công Nghệ Phần Mềm</small>
                  </p>
                </div>

                <div className="team-member">
                  <div className="member-avatar member-avatar--advisor">
                    <img
                      src="https://drive.google.com/thumbnail?id=1bM76xY1C0jYUyKYBiO68C7YFt0-j1R8-&sz=w1000"
                      alt="TS. Mã Trường Thành"
                      className="member-image"
                    />
                  </div>
                  <h4 className="member-name">TS. Mã Trường Thành</h4>
                  <p className="member-role">Hướng dẫn kỹ thuật</p>
                  <p className="member-info">
                    <small>Lĩnh vực: Khoa Học Máy Tính</small>
                  </p>
                </div>
              </div>
            </div>

            {/* Team Members - Giữ nguyên layout nhóm nhưng điều chỉnh Role cho phù hợp KTPM */}
            <div className="team-group">
              <h3 className="team-group-title">Đội ngũ thực hiện</h3>

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
                  <p className="member-role">Lập Trình Viên</p>
                  <p className="member-id">B2203561 - DI2296F1</p>
                </div>

                <div className="team-member">
                  <div className="member-avatar">
                    <img
                      src="https://drive.google.com/thumbnail?id=146qa8yRMF_cE44wmgafREtJA9KYYsvip&sz=w1000"
                      alt="Tr. Ng Khánh Quốc"
                      className="member-image"
                    />
                  </div>

                  <h4 className="member-name">Tr. Ng Khánh Quốc</h4>
                  <p className="member-role">Lập Trình Viên</p>
                  <p className="member-id">B2203576 - DI2296F2</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────
             SECTION 4: OBJECTIVES
        ───────────────────────────────────── */}
        <section className="objectives-section">
          <div className="container">
            <div className="section-header">
              <div className="section-badge">Mục tiêu</div>
              <h2 className="section-title">
                Những gì chúng tôi muốn đạt được
              </h2>
            </div>

            <div className="objectives-grid">
              <div className="objective-card">
                <div className="obj-icon obj-icon--1">
                  <i className="fa-solid fa-notes-medical"></i>
                </div>
                <h3 className="obj-title">Hồ sơ sức khỏe dùng chung</h3>
                <p className="obj-desc">
                  Giải quyết vấn đề nhập liệu lặp lại. Người dùng chỉ cần cung
                  cấp chỉ số một lần để đánh giá cho mọi loại bệnh.
                </p>
              </div>

              <div className="objective-card">
                <div className="obj-icon obj-icon--2">
                  <i className="fa-solid fa-puzzle-piece"></i>
                </div>
                <h3 className="obj-title">Kiến trúc Plugin linh hoạt</h3>
                <p className="obj-desc">
                  Cho phép thêm bệnh lý mới vào hệ thống thông qua file JSON mà
                  không cần chỉnh sửa mã nguồn cốt lõi.
                </p>
              </div>

              <div className="objective-card">
                <div className="obj-icon obj-icon--3">
                  <i className="fa-solid fa-scale-balanced"></i>
                </div>
                <h3 className="obj-title">Đánh giá minh bạch</h3>
                <p className="obj-desc">
                  Kết hợp Rule Engine chuẩn y tế với Machine Learning, đảm bảo
                  kết quả có thể giải thích chi tiết, không phải "hộp đen".
                </p>
              </div>

              <div className="objective-card">
                <div className="obj-icon obj-icon--4">
                  <i className="fa-solid fa-brain"></i>
                </div>
                <h3 className="obj-title">AI Fallback thông minh</h3>
                <p className="obj-desc">
                  Mô hình ML dự đoán khi đủ dữ liệu, tự động lui về hệ thống
                  Luật chuyên gia khi thiếu thông số để luôn có kết quả.
                </p>
              </div>

              <div className="objective-card">
                <div className="obj-icon obj-icon--5">
                  <i className="fa-solid fa-comment-medical"></i>
                </div>
                <h3 className="obj-title">Khuyến nghị cá nhân hóa</h3>
                <p className="obj-desc">
                  Explanation Engine tự động sinh ra lời giải thích chi tiết và
                  các khuyến nghị theo dõi, thay đổi lối sống.
                </p>
              </div>

              <div className="objective-card">
                <div className="obj-icon obj-icon--6">
                  <i className="fa-solid fa-shield-halved"></i>
                </div>
                <h3 className="obj-title">Giao diện Metadata-Driven</h3>
                <p className="obj-desc">
                  UI được tự động tạo hình dựa trên cấu hình của từng plugin
                  bệnh, đảm bảo đồng bộ hoàn hảo với backend.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────
             SECTION 5: TECH STACK
        ───────────────────────────────────── */}
        <section className="tech-section">
          <div className="container">
            <div className="section-header">
              <div className="section-badge">Công nghệ</div>
              <h2 className="section-title">Các công nghệ được sử dụng</h2>
            </div>

            <div className="tech-grid">
              <div className="tech-category">
                <h3 className="tech-category-title">Frontend</h3>
                <div className="tech-items">
                  <div className="tech-item">
                    <span className="tech-name">React 18 & Vite</span>
                  </div>
                  <div className="tech-item">
                    <span className="tech-name">Metadata-Driven UI</span>
                  </div>
                  <div className="tech-item">
                    <span className="tech-name">Axios (API Integration)</span>
                  </div>
                </div>
              </div>

              <div className="tech-category">
                <h3 className="tech-category-title">Backend</h3>
                <div className="tech-items">
                  <div className="tech-item">
                    <span className="tech-name">Python & FastAPI</span>
                  </div>
                  <div className="tech-item">
                    <span className="tech-name">Pydantic Validation</span>
                  </div>
                  <div className="tech-item">
                    <span className="tech-name">
                      Plugin Loader Architecture
                    </span>
                  </div>
                </div>
              </div>

              <div className="tech-category">
                <h3 className="tech-category-title">AI & ML</h3>
                <div className="tech-items">
                  <div className="tech-item">
                    <span className="tech-name">Scikit-learn & Pandas</span>
                  </div>
                  <div className="tech-item">
                    <span className="tech-name">XGBoost & Random Forest</span>
                  </div>
                  <div className="tech-item">
                    <span className="tech-name">Dataset từ NHANES</span>
                  </div>
                </div>
              </div>

              <div className="tech-category">
                <h3 className="tech-category-title">Database & Auth</h3>
                <div className="tech-items">
                  <div className="tech-item">
                    <span className="tech-name">SQLite / MySQL</span>
                  </div>
                  <div className="tech-item">
                    <span className="tech-name">SQLAlchemy ORM</span>
                  </div>
                  <div className="tech-item">
                    <span className="tech-name">Bcrypt Password Hashing</span>
                  </div>
                </div>
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
