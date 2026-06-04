import { useState, useEffect } from "react";
import MainRiskPage from "./MainRiskPage";
import DangNhap from "./dang_nhap";
import DangKy from "./dang_ky";
import ChiSoSucKhoe from "./cs_suckhoe"; // [THÊM DÒNG NÀY] Import Component mới

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [authMode, setAuthMode] = useState("login");
  
  // [THÊM DÒNG NÀY] Biến để chuyển đổi giữa trang Khám Bệnh và trang Hồ Sơ
  const [currentView, setCurrentView] = useState("risk"); // "risk" hoặc "profile"

  useEffect(() => {
    const token = localStorage.getItem("token");
    const email = localStorage.getItem("userName"); // Lưu ý: ở trước bạn đã đổi thành userName
    if (token) {
      setIsAuthenticated(true);
      setUserEmail(email);
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
    setAuthMode("login");
    setCurrentView("risk"); // Reset view
  };

  if (!isAuthenticated) {
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

  return (
    <div>
      {/* Navbar cập nhật thêm Menu điều hướng */}
      <div style={{ backgroundColor: "#ffffff", padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)" }}>
        
        <div style={{ display: "flex", alignItems: "center", gap: "30px" }}>
          <div style={{ fontWeight: "bold", color: "#0f172a", fontSize: "18px" }}>Risk Engine</div>
          
          {/* CÁC NÚT ĐIỀU HƯỚNG */}
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

      {/* RENDER DỰA TRÊN TAB ĐANG CHỌN */}
      <div style={{ padding: "20px" }}>
        {currentView === "risk" ? <MainRiskPage /> : <ChiSoSucKhoe />}
      </div>

    </div>
  );
}