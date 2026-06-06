// frontend/src/App.jsx
import { useState, useEffect } from "react";
import axios from "axios";

import MainRiskPage from "./MainRiskPage";
import DangNhap from "./dang_nhap";
import DangKy from "./dang_ky";
import ChiSoSucKhoe from "./hoso_suckhoe";   // ← ĐÃ SỬA
import TrangChu from "./TrangChu";

const API_BASE_URL = "http://127.0.0.1:8000";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  
  const [authMode, setAuthMode] = useState("welcome"); // "welcome", "login", "register"
  const [currentView, setCurrentView] = useState("risk"); // "risk" hoặc "profile"

  useEffect(() => {
    const token = localStorage.getItem("token");
    const email = localStorage.getItem("userName");
    if (token && email) {
      setIsAuthenticated(true);
      setUserEmail(email);
      checkInitialRoute(email);
    } else {
      localStorage.removeItem("token");
      localStorage.removeItem("userName");
      setIsAuthenticated(false);
      setUserEmail("");
      setAuthMode("welcome");
    }
  }, []);

  const checkInitialRoute = async (email) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/health-profile/${email}`);
      if (!res.data.data) {
        setCurrentView("profile");
      } else {
        setCurrentView("risk");
      }
    } catch (error) {
      console.error("Lỗi kiểm tra hồ sơ", error);
      setCurrentView("risk");
    }
  };

  const handleLoginSuccess = async (email) => {
    setIsAuthenticated(true);
    setUserEmail(email);
    await checkInitialRoute(email);
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

  return (
    <div>
      {/* Navbar */}
      <div style={{ backgroundColor: "#ffffff", padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)" }}>
        
        <div style={{ display: "flex", alignItems: "center", gap: "30px" }}>
          <div style={{ fontWeight: "bold", color: "#0f172a", fontSize: "18px", cursor: "pointer" }} onClick={() => setAuthMode("welcome")}>
            Risk Engine
          </div>
          
          <div style={{ display: "flex", gap: "10px" }}>
            <button 
              onClick={() => setCurrentView("risk")}
              style={{ padding: "8px 16px", backgroundColor: currentView === "risk" ? "#eff6ff" : "transparent", color: currentView === "risk" ? "#2563eb" : "#64748b", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}>
              Khám Bệnh (AI & Rule)
            </button>
            <button 
              onClick={() => setCurrentView("profile")}
              style={{ padding: "8px 16px", backgroundColor: currentView === "profile" ? "#eff6ff" : "transparent", color: currentView === "profile" ? "#2563eb" : "#64748b", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}>
              Hồ Sơ Sức Khỏe
            </button>
          </div>
        </div>

        <div>
          <span style={{ marginRight: "20px", color: "#64748b" }}>
            Xin chào, <strong>{userEmail}</strong>
          </span>
          <button 
            onClick={handleLogout}
            style={{ padding: "8px 16px", backgroundColor: "#ef4444", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}>
            Đăng xuất
          </button>
        </div>
      </div>

      <div style={{ padding: "20px" }}>
        {currentView === "risk" ? <MainRiskPage /> : <ChiSoSucKhoe />}
      </div>
    </div>
  );
}