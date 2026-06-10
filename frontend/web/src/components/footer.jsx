// frontend/web/src/components/footer.jsx
import "./footer.css";

const NAV_LINKS = [
  { label: "Trang Chủ", key: "trang-chu" },
  { label: "Giới Thiệu", key: "gioi-thieu" },
  { label: "Phân Tích Bệnh", key: "phan-tich-benh" },
  { label: "Tư Vấn AI", key: "tu-van-ai" },
  { label: "Tra Thuốc", key: "tra-thuoc" },
  { label: "Thực Đơn", key: "thuc-don" },
];

const DISEASE_LINKS = [
  { label: "Tiểu Đường", key: "diabetes" },
  { label: "Cao Huyết Áp", key: "hypertension" },
  { label: "Tim Mạch", key: "cardiovascular" },
  { label: "Bệnh Thận Mạn", key: "kidney" },
  { label: "Đột Quỵ", key: "stroke" },
];

const ACCOUNT_LINKS = [
  { label: "Hồ Sơ Sức Khỏe", key: "profile" },
  { label: "Lịch Sử Đánh Giá", key: "history" },
  { label: "Quản Lý Thông Tin", key: "quan-ly-thong-tin" },
  { label: "Cài Đặt Tài Khoản", key: "cai-dat" },
];

const CONTACT_ITEMS = [
  { icon: "✉", text: "cict@ctu.edu.vn" },
  { icon: "☎", text: "(0292) 3872 209" },
  { icon: "⌖", text: "Khu II, đường 3/2, Q. Ninh Kiều, TP. Cần Thơ" },
  { icon: "⊞", text: "Trường CNTT&TT – Đại học Cần Thơ" },
];

const TECH_BADGES = [
  { dot: true, label: "Rule Engine" },
  { dot: true, label: "ML Engine" },
  { dot: false, label: "5 Bệnh Plugin" },
  { dot: false, label: "NHANES Dataset" },
];

export default function Footer({ setCurrentView }) {
  function handleNav(key) {
    if (setCurrentView) setCurrentView(key);
  }

  return (
    <footer className="footer">
      <div className="footer-upper">

        {/* ── Brand column ── */}
        <div className="footer-brand">
          <div className="footer-logo-row">
            <img
              src="https://www.ctu.edu.vn/images/upload/logo.png"
              alt="Logo Dai hoc Can Tho"
              className="footer-logo"
            />
            <div className="footer-brand-name">
              <span className="footer-title">Healthy AI</span>
              <span className="footer-subtitle">CICT</span>
            </div>
          </div>

          <p className="footer-tagline">
            Nền tảng sàng lọc nguy cơ bệnh mạn tính kết hợp luật chuyên gia
            và học máy. Kiến trúc Plugin-Based — mở rộng không cần sửa code.
          </p>

          <div className="footer-badges">
            {TECH_BADGES.map((b, i) => (
              <span key={i} className="footer-badge">
                {b.dot && <span className="footer-badge-dot" />}
                {b.label}
              </span>
            ))}
          </div>
        </div>

        {/* ── Navigation column ── */}
        <div className="footer-col">
          <p className="footer-col-heading">Điều Hướng</p>
          <ul className="footer-links">
            {NAV_LINKS.map((item) => (
              <li key={item.key}>
                <button className="footer-link" onClick={() => handleNav(item.key)}>
                  <span className="footer-link-arrow">›</span>
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* ── Disease plugins column ── */}
        <div className="footer-col">
          <p className="footer-col-heading">Bệnh Mạn Tính</p>
          <ul className="footer-links">
            {DISEASE_LINKS.map((item) => (
              <li key={item.key}>
                <button className="footer-link" onClick={() => handleNav(item.key)}>
                  <span className="footer-link-arrow">›</span>
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
          <p className="footer-col-heading" style={{ marginTop: 24 }}>Tài Khoản</p>
          <ul className="footer-links">
            {ACCOUNT_LINKS.map((item) => (
              <li key={item.key}>
                <button className="footer-link" onClick={() => handleNav(item.key)}>
                  <span className="footer-link-arrow">›</span>
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* ── Contact column ── */}
        <div className="footer-col">
          <p className="footer-col-heading">Liên Hệ</p>
          <ul className="footer-links footer-links--contact">
            {CONTACT_ITEMS.map((item, i) => (
              <li key={i} className="footer-contact-item">
                <span className="footer-contact-icon">{item.icon}</span>
                <span className="footer-contact-text">{item.text}</span>
              </li>
            ))}
          </ul>

          <div className="footer-social">
            <p className="footer-col-heading" style={{ marginTop: 24 }}>Mạng Xã Hội</p>
            <div className="footer-social-row">
              <a
                href="https://www.facebook.com/CICT.CTU"
                target="_blank"
                rel="noreferrer"
                className="footer-social-btn"
                aria-label="Facebook CICT"
              >
                fb
              </a>
              <a
                href="https://cit.ctu.edu.vn"
                target="_blank"
                rel="noreferrer"
                className="footer-social-btn"
                aria-label="Website CICT"
              >
                web
              </a>
              <a
                href="mailto:cict@ctu.edu.vn"
                className="footer-social-btn"
                aria-label="Email"
              >
                mail
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="footer-divider" />

      <div className="footer-lower">
        <p className="footer-copy">
          &copy; {new Date().getFullYear()} HealthyAI – CICT, Đại học Cần Thơ.
          All rights reserved.
        </p>
        <div className="footer-meta">
          <span className="footer-meta-item">FastAPI Backend</span>
          <span className="footer-meta-sep" />
          <span className="footer-meta-item">React + Vite</span>
          <span className="footer-meta-sep" />
          <span className="footer-meta-item">SQLite / MySQL</span>
          <span className="footer-meta-sep" />
          <span className="footer-meta-item footer-meta-version">v1.0.0</span>
        </div>
      </div>
    </footer>
  );
}