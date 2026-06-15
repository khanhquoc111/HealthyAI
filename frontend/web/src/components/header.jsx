import { useState, useRef, useEffect } from "react";
import "./header.css";

export default function Header({ currentView, setCurrentView, userName, onLogout }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const initials = userName
    ? userName.slice(0, 2).toUpperCase()
    : "AI";

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navItems = [
    { key: "gioi-thieu", label: "Giới Thiệu" },
    { key: "trang-chu", label: "Trang Chủ" },
    { key: "phan-tich-benh", label: "Phân Tích Bệnh" },
    { key: "tu-van-ai", label: "Tư Vấn AI" },
    { key: "y-te", label: "Y Tế" },
    { key: "thuc-don", label: "Thực Đơn" },
    { key: "tra-thuoc", label: "Tra Thuốc" },
  ];

  const menuItems = [
    { icon: "👤", label: "Quản Lý Thông Tin", key: "thong-tin-nd" },
    { icon: "🫀", label: "Hồ Sơ Sức Khỏe", key: "profile" },
    { icon: "📈", label: "Lịch Sử Đánh Giá", key: "history" },
    { icon: "⚙️", label: "Cài Đặt Tài Khoản", key: "cai-dat" },
    { icon: "🔔", label: "Thông Báo", key: "thong-bao" },
  ];

  function handleMenuItemClick(key) {
    setCurrentView(key);
    setDropdownOpen(false);
  }

  return (
    <header className="navbar" id="navbar">
      <div className="nav-container">
        <div className="nav-brand">
          <img
            src="https://www.ctu.edu.vn/images/upload/logo.png"
            alt="Logo Dai hoc Can Tho"
            className="nav-logo"
          />
          <div className="nav-title-group">
            <span className="nav-title">Healthy AI</span>
            <span className="nav-subtitle">CICT</span>
          </div>
        </div>

        <nav className="nav-menu" aria-label="Dieu huong chinh">
          {navItems.map((item) => (
            <a
              key={item.key}
              onClick={() => setCurrentView(item.key)}
              className={`nav-link${currentView === item.key ? " nav-link--active" : ""}`}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="nav-actions" ref={dropdownRef}>
          <button
            className="avatar-btn"
            onClick={() => setDropdownOpen((prev) => !prev)}
            aria-label="Mo menu nguoi dung"
            aria-expanded={dropdownOpen}
          >
            <span className="avatar-initials">{initials}</span>
            <span className="avatar-caret">{dropdownOpen ? "▲" : "▼"}</span>
          </button>

          {dropdownOpen && (
            <div className="avatar-dropdown">
              <div className="dropdown-header">
                <div className="dropdown-avatar-lg">{initials}</div>
                <div className="dropdown-user-info">
                  <span className="dropdown-username">{userName}</span>
                  <span className="dropdown-role">Nguoi dung</span>
                </div>
              </div>

              <div className="dropdown-divider" />

              <ul className="dropdown-menu-list">
                {menuItems.map((item) => (
                  <li key={item.key}>
                    <button
                      className="dropdown-item"
                      onClick={() => handleMenuItemClick(item.key)}
                    >
                      <span className="dropdown-item-icon">{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  </li>
                ))}
              </ul>

              <div className="dropdown-divider" />

              <button className="dropdown-logout" onClick={onLogout}>
                <span>🚪</span>
                <span>Đăng Xuất</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}