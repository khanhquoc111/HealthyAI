import { useState, useRef, useEffect } from "react";
import "./header.css";

const API_BASE_URL = "http://127.0.0.1:8000";

function resolveAvatarUrl(url) {
  if (!url) return "";
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  return `${API_BASE_URL}${url.startsWith("/") ? url : `/${url}`}`;
}

export default function Header({ currentView, setCurrentView, userName, userProfile, onLogout }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const dropdownRef = useRef(null);
  
  const displayName = userProfile?.hoTen || userName || userProfile?.tenDangNhap || "AI";
  // Cập nhật fallback cho loginName để luôn lấy được tên đăng nhập
  const loginName = userProfile?.tenDangNhap || userName || ""; 
  const avatarUrl = !avatarFailed ? resolveAvatarUrl(userProfile?.anhDaiDien) : "";

  const initials = displayName
    ? displayName.trim().slice(0, 2).toUpperCase()
    : "AI";

  useEffect(() => {
    setAvatarFailed(false);
  }, [userProfile?.anhDaiDien]);

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
    { key: "tra-benh", label: "Tra Bệnh" },
    { key: "tra-thuoc", label: "Tra Thuốc" },
  ];

  const menuItems = [
    { iconClass: "fa-solid fa-user-gear", label: "Quản Lý Thông Tin", key: "thong-tin-nd" },
    { iconClass: "fa-solid fa-heart-pulse", label: "Hồ Sơ Sức Khỏe", key: "profile" },
    { iconClass: "fa-solid fa-chart-line", label: "Lịch Sử Đánh Giá", key: "history" },
    { iconClass: "fa-solid fa-gear", label: "Cài Đặt Tài Khoản", key: "cai-dat" },
    { iconClass: "fa-solid fa-bell", label: "Thông Báo", key: "thong-bao" },
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
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Anh dai dien"
                className="avatar-img"
                onError={() => setAvatarFailed(true)}
              />
            ) : (
              <span className="avatar-initials">{initials}</span>
            )}
            <i className={`avatar-caret fa-solid ${dropdownOpen ? "fa-chevron-up" : "fa-chevron-down"}`} aria-hidden="true"></i>
          </button>

          {dropdownOpen && (
            <div className="avatar-dropdown">
              <div className="dropdown-header">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Anh dai dien"
                    className="dropdown-avatar-img"
                    onError={() => setAvatarFailed(true)}
                  />
                ) : (
                  <div className="dropdown-avatar-lg">{initials}</div>
                )}
                
                {/* ĐÃ CHỈNH SỬA Ở ĐÂY: Hiển thị tên đăng nhập thay cho "Người dùng" */}
                <div className="dropdown-user-info">
                  <span className="dropdown-username">{displayName}</span>
                  <span className="dropdown-role">{loginName}</span>
                </div>
                {/* KẾT THÚC CHỈNH SỬA */}

              </div>

              <div className="dropdown-divider" />

              <ul className="dropdown-menu-list">
                {menuItems.map((item) => (
                  <li key={item.key}>
                    <button
                      className="dropdown-item"
                      onClick={() => handleMenuItemClick(item.key)}
                    >
                      <i className={`dropdown-item-icon ${item.iconClass}`} aria-hidden="true"></i>
                      <span>{item.label}</span>
                    </button>
                  </li>
                ))}
              </ul>

              <div className="dropdown-divider" />

              <button className="dropdown-logout" onClick={onLogout}>
                <i className="fa-solid fa-right-from-bracket" aria-hidden="true"></i>
                <span>Đăng Xuất</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}