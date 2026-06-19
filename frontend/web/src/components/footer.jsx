import "./footer.css";

const NAV_LINKS = [
  { label: "Trang Chủ", key: "trang-chu" },
  { label: "Giới Thiệu", key: "gioi-thieu" },
  { label: "Phân Tích Bệnh", key: "phan-tich-benh" },
  { label: "Tư Vấn AI", key: "tu-van-ai" },
  { label: "Thực Đơn", key: "thuc-don" },
  { label: "Tra Bệnh", key: "tra-benh" },
  { label: "Tra Thuốc", key: "tra-thuoc" },
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
  { label: "Lịch Sử Tra Cứu", key: "history" },
  { label: "Quản Lý Thông Tin", key: "quan-ly-thong-tin" },
  { label: "Cài Đặt Tài Khoản", key: "cai-dat" },
];

const CONTACT_ITEMS = [
  { iconClass: "fa-solid fa-envelope", text: "cict@ctu.edu.vn" },
  { iconClass: "fa-solid fa-phone", text: "(0292) 3872 209" },
  { iconClass: "fa-solid fa-location-dot", text: "Khu II, đường 3/2, Q. Ninh Kiều, TP. Cần Thơ" },
  { iconClass: "fa-solid fa-building-columns", text: "Trường CNTT&TT - Đại học Cần Thơ" },
];

export default function Footer({ setCurrentView }) {
  function handleNav(key) {
    if (setCurrentView) setCurrentView(key);
  }

  return (
    <footer className="footer">
      <div className="footer-upper">
        <div className="footer-brand">
          <div className="footer-logo-row">
            <img
              src="https://www.ctu.edu.vn/images/upload/logo.png"
              alt="Logo Đại học Cần Thơ"
              className="footer-logo"
            />
            <div className="footer-brand-name">
              <span className="footer-title">Healthy AI</span>
              <span className="footer-subtitle">CICT</span>
            </div>
          </div>

          <p className="footer-tagline">
            Nền tảng sàng lọc nguy cơ bệnh mạn tính kết hợp luật chuyên gia và học máy.
            Kiến trúc Plugin-Based giúp mở rộng mà không cần sửa code.
          </p>
        </div>

        <div className="footer-col">
          <p className="footer-col-heading">Điều Hướng</p>
          <ul className="footer-links">
            {NAV_LINKS.map((item) => (
              <li key={item.key}>
                <button className="footer-link" onClick={() => handleNav(item.key)}>
                  <i className="footer-link-arrow fa-solid fa-chevron-right" aria-hidden="true" />
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="footer-col">
          <p className="footer-col-heading">Bệnh Mạn Tính</p>
          <ul className="footer-links">
            {DISEASE_LINKS.map((item) => (
              <li key={item.key}>
                <button className="footer-link" onClick={() => handleNav(item.key)}>
                  <i className="footer-link-arrow fa-solid fa-chevron-right" aria-hidden="true" />
                  {item.label}
                </button>
              </li>
            ))}
          </ul>

          <p className="footer-col-heading" style={{ marginTop: 24 }}>
            Tài Khoản
          </p>
          <ul className="footer-links">
            {ACCOUNT_LINKS.map((item) => (
              <li key={item.key}>
                <button className="footer-link" onClick={() => handleNav(item.key)}>
                  <i className="footer-link-arrow fa-solid fa-chevron-right" aria-hidden="true" />
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="footer-col">
          <p className="footer-col-heading">Liên Hệ</p>
          <ul className="footer-links footer-links--contact">
            {CONTACT_ITEMS.map((item, i) => (
              <li key={i} className="footer-contact-item">
                <i className={`footer-contact-icon ${item.iconClass}`} aria-hidden="true" />
                <span className="footer-contact-text">{item.text}</span>
              </li>
            ))}
          </ul>

          <div className="footer-social">
            <p className="footer-col-heading" style={{ marginTop: 24 }}>
              Mạng Xã Hội
            </p>
            <div className="footer-social-row">
              <a
                href="https://www.facebook.com/CICT.CTU"
                target="_blank"
                rel="noreferrer"
                className="footer-social-btn"
                aria-label="Facebook CICT"
              >
                <i className="fa-brands fa-facebook-f" aria-hidden="true" />
              </a>
              <a
                href="https://cit.ctu.edu.vn"
                target="_blank"
                rel="noreferrer"
                className="footer-social-btn"
                aria-label="Website CICT"
              >
                <i className="fa-solid fa-globe" aria-hidden="true" />
              </a>
              <a href="mailto:cict@ctu.edu.vn" className="footer-social-btn" aria-label="Email">
                <i className="fa-solid fa-envelope" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="footer-divider" />

      <div className="footer-lower">
        <p className="footer-copy">
          &copy; {new Date().getFullYear()} HealthyAI – CICT, Đại học Cần Thơ. All rights reserved.
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
