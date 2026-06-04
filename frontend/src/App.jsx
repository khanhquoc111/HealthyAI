// frontend/src/App.jsx
import { useState, useEffect } from "react";
import MainRiskPage from "./MainRiskPage";
import DangNhap from "./dang_nhap";
import DangKy from "./dang_ky";
import ChiSoSucKhoe from "./cs_suckhoe";
import TrangChu from "./TrangChu"; // <-- [THÊM MỚI] Import trang chủ vừa tạo

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  
  // SỬA ĐỔI QUAN TRỌNG: Mặc định chế độ auth ban đầu là "welcome" 
  // thay vì nhảy bổ trực tiếp vào form đăng nhập để tránh bug tự động lấy dữ liệu lỗi.
  const [authMode, setAuthMode] = useState("welcome"); // "welcome", "login", "register"
  const [currentView, setCurrentView] = useState("risk"); // "risk" hoặc "profile"

  useEffect(() => {
    const token = localStorage.getItem("token");
    const email = localStorage.getItem("userName");
    if (token && email) {
      setIsAuthenticated(true);
      setUserEmail(email);
    } else {
      // Nếu không có token hợp lệ, làm sạch bộ nhớ tránh bẫy dữ liệu cũ
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
    setAuthMode("welcome"); // Reset về trang chủ welcome ban đầu có chữ Hello
    setCurrentView("risk"); 
  };

  // ==================== ĐIỀU PHỐI LUỒNG CHƯA ĐĂNG NHẬP ====================
  if (!isAuthenticated) {
    if (authMode === "welcome") {
      return <TrangChu onGoToLogin={() => setAuthMode("login")} />;
    }
    
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", backgroundColor: "#f1f5f9" }}>
        {authMode === "login" ? (
          <DangNhap 
            onLoginSuccess={handleLoginSuccess} 
            onSwitchToRegister={() => setAuthMode("register")} 
          />
        ) : (
          <DangKy 
            onSwitchToLogin={() => setAuthMode("login")} 
          />
        )}
      </div>
    );
  }

  // ==================== DIỆN MẠO SAU KHI ĐĂNG NHẬP THÀNH CÔNG ====================
  return (
    <div>
      {/* Navbar Menu điều hướng hệ thống */}
      <div style={{ backgroundColor: "#ffffff", padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)" }}>
        
        <div style={{ display: "flex", alignItems: "center", gap: "30px" }}>
          <div style={{ fontWeight: "bold", color: "#0f172a", fontSize: "18px", cursor: "pointer" }} onClick={() => setAuthMode("welcome")}>
            Risk Engine
          </div>
          
          {/* CÁC NÚT TẢI CÔNG CỤ DUAL-ENGINE */}
          <div style={{ display: "flex", gap: "10px" }}>
            <button 
              onClick={() => setCurrentView("risk")}
              style={{ padding: "8px 16px", backgroundColor: currentView === "risk" ? "#eff6ff" : "transparent", color: currentView === "risk" ? "#2563eb" : "#64748b", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}>
              Khám Bệnh (AI & Rule)
            </button>
            <button 
              onClick={() => setCurrentView("profile")}
              style={{ padding: "8px 16px", backgroundColor: currentView === "profile" ? "#eff6ff" : "transparent", color: currentView === "profile" ? "#2563eb" : "#64748b", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}>
              Hồ Sơ Sức Khỏe Cá Nhân
            </button>
          </div>
        </div>

        <div>
          <span style={{ marginRight: "20px", color: "#64748b" }}>
            Xin chào, <strong>{userEmail}</strong>
          </span>
          <button 
            onClick={handleLogout}
            style={{ padding: "8px 16px", backgroundColor: "#ef4444", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600", transition: "background-color 0.2s" }}>
            Đăng xuất
          </button>
        </div>
      </div>

      {/* HIỂN THỊ PHÂN VÙNG CHỨC NĂNG */}
      <div style={{ padding: "20px" }}>
        {currentView === "risk" ? <MainRiskPage /> : <ChiSoSucKhoe />}
      </div>
    </div>
  );
}