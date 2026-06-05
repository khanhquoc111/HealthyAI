// frontend/src/App.jsx
import { useState, useEffect } from "react";
import MainRiskPage from "./MainRiskPage";
import DangNhap from "./dang_nhap";
import DangKy from "./dang_ky";
import ChiSoSucKhoe from "./cs_suckhoe";
import TrangChu from "./TrangChu";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [authMode, setAuthMode] = useState("welcome");
  const [currentView, setCurrentView] = useState("risk");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const email = localStorage.getItem("userName");
    if (token && email) {
      setIsAuthenticated(true);
      setUserEmail(email);
    } else {
      localStorage.removeItem("token");
      localStorage.removeItem("userName");
      setIsAuthenticated(false);
      setUserEmail("");
      setAuthMode("welcome");
    }
  }, []);

  const handleLoginSuccess = (email) => {
    setIsAuthenticated(true);
    setUserEmail(email);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userName");
    setIsAuthenticated(false);
    setUserEmail("");
    setAuthMode("welcome");
    setCurrentView("risk"); 
  };

  if (!isAuthenticated) {
    if (authMode === "welcome") return <TrangChu onGoToLogin={() => setAuthMode("login")} />;
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", backgroundColor: "#F8FAFC" }}>
        {authMode === "login" ? (
          <DangNhap onLoginSuccess={handleLoginSuccess} onSwitchToRegister={() => setAuthMode("register")} />
        ) : (
          <DangKy onSwitchToLogin={() => setAuthMode("login")} />
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", width: "100vw", backgroundColor: "#F8FAFC", fontFamily: "Segoe UI, sans-serif", margin: 0, padding: 0, boxSizing: "border-box" }}>
      {/* CSS RESET TOÀN CỤC ĐỂ TRÀN VIỀN TOÀN MÀN HÌNH */}
      <style>{`
        body, html, #root {
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          max-width: 100% !important;
          overflow-x: hidden;
          background-color: #F8FAFC;
        }
        * { box-sizing: border-box; }
      `}</style>

      {/* SIDEBAR BÊN TRÁI VỚI CHIỀU CAO CỐ ĐỊNH FULL SCREEN */}
      <div style={{ width: "260px", backgroundColor: "#FFFFFF", borderRight: "1px solid #E2E8F0", display: "flex", flexDirection: "column", height: "100vh", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ padding: "24px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "24px" }}>🩺</span>
          <span style={{ fontWeight: "800", color: "#2563EB", fontSize: "20px", letterSpacing: "-0.5px" }}>HealthyAI</span>
        </div>
        
        {/* DANH SÁCH MENU */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "0 16px" }}>
          <button onClick={() => setCurrentView("dashboard")} style={sidebarBtnStyle(currentView === "dashboard")}>
            📊 Dashboard
          </button>
          <button onClick={() => setCurrentView("risk")} style={sidebarBtnStyle(currentView === "risk")}>
            🧠 Khám bệnh AI
          </button>
          <button onClick={() => setCurrentView("profile")} style={sidebarBtnStyle(currentView === "profile")}>
            📋 Hồ sơ sức khỏe
          </button>
          <button onClick={() => setCurrentView("history")} style={sidebarBtnStyle(currentView === "history")}>
            📈 Lịch sử đánh giá
          </button>
        </div>

        {/* PHẦN ĐÁY SIDEBAR: TẬN DỤNG KHOẢNG TRỐNG ĐỂ THÔNG TIN USER & ĐĂNG XUẤT */}
        <div style={{ marginTop: "auto", padding: "20px", borderTop: "1px solid #E2E8F0", backgroundColor: "#F8FAFC" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "50%", backgroundColor: "#DBEAFE", color: "#2563EB", display: "flex", justifyContent: "center", alignItems: "center", fontWeight: "bold", fontSize: "14px" }}>
              👤
            </div>
            <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <span style={{ fontSize: "12px", color: "#64748B" }}>Tài khoản</span>
              <span style={{ fontWeight: "600", color: "#334155", fontSize: "14px", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{userEmail}</span>
            </div>
          </div>
          <button onClick={handleLogout} style={{ width: "100%", padding: "10px", backgroundColor: "#FEF2F2", color: "#EF4444", border: "1px solid #FECACA", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "14px", transition: "all 0.2s" }} onMouseOver={(e) => e.target.style.backgroundColor = "#FEE2E2"} onMouseOut={(e) => e.target.style.backgroundColor = "#FEF2F2"}>
            Đăng xuất
          </button>
        </div>
      </div>

      {/* NỘI DUNG BÊN PHẢI TOÀN MÀN HÌNH */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* HEADER ĐƠN GIẢN */}
        <div style={{ backgroundColor: "#FFFFFF", height: "64px", padding: "0 32px", display: "flex", justifyContent: "flex-end", alignItems: "center", borderBottom: "1px solid #E2E8F0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
            <span style={{ cursor: "pointer", fontSize: "20px", color: "#64748B" }}>🔔</span>
            <span style={{ color: "#E2E8F0" }}>|</span>
            <span style={{ fontSize: "14px", color: "#64748B", fontWeight: "500" }}>Phiên bản Hệ thống v2.0</span>
          </div>
        </div>

        {/* KHU VỰC NỘI DUNG KHÔNG BỊ GIỚI HẠN CHIỀU RỘNG CHẶT CHẼ */}
        <div style={{ padding: "32px", overflowY: "auto", height: "calc(100vh - 64px)", width: "100%" }}>
          {currentView === "risk" && <MainRiskPage />}
          {currentView === "profile" && <ChiSoSucKhoe />}
          {(currentView === "dashboard" || currentView === "history") && (
            <div style={{ background: "white", padding: "40px", borderRadius: "16px", textAlign: "center", border: "1px solid #E2E8F0", color: "#64748B" }}>
              <h3>📈 Phân vùng dữ liệu</h3>
              <p>Tính năng đang được đồng bộ hóa dữ liệu từ mô hình đám mây.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const sidebarBtnStyle = (isActive) => ({
  padding: "12px 16px",
  backgroundColor: isActive ? "#EFF6FF" : "transparent",
  color: isActive ? "#2563EB" : "#64748B",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: isActive ? "700" : "500",
  textAlign: "left",
  fontSize: "15px",
  transition: "all 0.2s",
  borderLeft: isActive ? "4px solid #2563EB" : "4px solid transparent"
});