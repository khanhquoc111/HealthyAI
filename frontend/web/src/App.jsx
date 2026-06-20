// frontend/src/App.jsx
import { useState } from "react";
import { BrowserRouter as Router, useNavigate, useLocation } from "react-router-dom";
import PhanTichBenh from "./phan-tich-benh"; 
import DangNhap from "./dang-nhap";
import DangKy from "./dang-ky";
import ChiSoSucKhoe from "./hs-suckhoe";   
import TrangChu from "./trang-chu";
import GioiThieu from "./gioi-thieu";
import TraThuoc from "./tra-thuoc";
import TraBenh from "./tra-benh";
import LichSuTraCuu from "./lich-su-tra-cuu";
import SoYTe from './so-y-te';
import ThongTinND from "./thongtin-nd.jsx";
import BSTongQuan from "./bs-tongquan.jsx";
import BSChiSoYKhoa from "./bs-ql-csyk.jsx";


import Header from "./components/header.jsx";
import Footer from "./components/footer.jsx";
import BSNav from "./components/bs-nav.jsx";


function getStoredUserProfile() {
  try {
    const raw = localStorage.getItem("currentUser");
    if (raw) return JSON.parse(raw);
  } catch {
    localStorage.removeItem("currentUser");
  }

  const tenDangNhap = localStorage.getItem("userName");
  return tenDangNhap ? { tenDangNhap, hoTen: "", anhDaiDien: "", isDoctor: false } : null;
}

function getUserDisplayName(userProfile) {
  return userProfile?.hoTen || userProfile?.tenDangNhap || "";
}

// Đọc trạng thái auth từ localStorage ngay lúc khởi tạo state
function getInitialAuth() {
  const token = localStorage.getItem("token");
  const userProfile = getStoredUserProfile();
  if (token && userProfile?.tenDangNhap) {
    return { isAuthenticated: true, userProfile };
  }
  // Dọn sạch nếu thiếu một trong hai
  localStorage.removeItem("token");
  localStorage.removeItem("userName");
  localStorage.removeItem("currentUser");
  return { isAuthenticated: false, userProfile: null };
}

const initialAuth = getInitialAuth();

// Component nội dung chính sử dụng logic của Router
function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();

  const [isAuthenticated, setIsAuthenticated] = useState(initialAuth.isAuthenticated);
  const [userProfile, setUserProfile] = useState(initialAuth.userProfile);
  const [authMode, setAuthMode] = useState("login");
  const displayName = getUserDisplayName(userProfile);

  // ĐỒNG BỘ STATE VỚI URL
  const currentView = location.pathname === "/" ? "trang-chu" : location.pathname.substring(1);

  // MOCK FUNCTION
  const setCurrentView = (view) => {
    if (view === "trang-chu") {
      navigate("/");
    } else {
      navigate(`/${view}`);
    }
  };

  const handleLoginSuccess = (profile) => {
    const nextProfile = {
      tenDangNhap: profile?.tenDangNhap || profile,
      hoTen: profile?.hoTen || "",
      anhDaiDien: profile?.anhDaiDien || "",
      isDoctor: profile?.isDoctor || false, // Lưu thêm trạng thái bác sĩ
    };

    setIsAuthenticated(true);
    setUserProfile(nextProfile);
    localStorage.setItem("userName", nextProfile.tenDangNhap);
    localStorage.setItem("currentUser", JSON.stringify(nextProfile));
    
    // --- CẬP NHẬT ĐIỀU HƯỚNG ---
    // Kiểm tra nếu là bác sĩ thì chuyển sang trang quản lý, ngược lại về trang chủ
    if (nextProfile.isDoctor) {
      setCurrentView("bs-quan-ly-chung");
    } else {
      setCurrentView("trang-chu");
    }
  };

  const handleProfileUpdate = (profile) => {
    setUserProfile((prev) => {
      const nextProfile = {
        ...(prev || {}),
        ...(profile || {}),
        tenDangNhap: profile?.tenDangNhap || prev?.tenDangNhap || localStorage.getItem("userName") || "",
      };
      localStorage.setItem("currentUser", JSON.stringify(nextProfile));
      return nextProfile;
    });
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userName");
    localStorage.removeItem("currentUser");
    localStorage.removeItem("is_doctor"); // Xóa cờ bác sĩ nếu có
    setIsAuthenticated(false);
    setUserProfile(null);
    setAuthMode("login");
    setCurrentView("trang-chu");
  };

  // Hàm quản lý render các màn hình theo currentView từ URL
  const renderContent = () => {
    switch (currentView) {
      case "phan-tich-benh":
      case "risk": 
        return <PhanTichBenh />;
      case "profile":
        return <ChiSoSucKhoe />;
      case "thong-tin-nd":
        return <ThongTinND onProfileUpdate={handleProfileUpdate} />;
      case "trang-chu":
        return (
          <TrangChu
            currentView={currentView}
            setCurrentView={setCurrentView}
            userName={displayName}
            onLogout={handleLogout}
          />
        );
      case "gioi-thieu":
        return <GioiThieu setCurrentView={setCurrentView} />;
      case "tra-thuoc":
        return <TraThuoc />;
      case "tra-benh":
        return <TraBenh />;
      case "history":
        return <LichSuTraCuu />;
      case "so-y-te":
        return <SoYTe />;
        
      // --- THÊM ROUTE CHO TRANG BÁC SĨ ---
      case "bs-quan-ly-chung":
        return <BSTongQuan />;
      case "bs-ql-csyk":
        return <BSChiSoYKhoa />;

      // 2. Các đường dẫn từ Header đang chờ phát triển (Placeholder)
      case "tu-van-ai":
      case "thuc-don":
      case "cai-dat":
      case "thong-bao":
      case "dashboard":
        return (
          <div style={{ 
            background: "white", 
            padding: "40px", 
            borderRadius: "16px", 
            textAlign: "center", 
            border: "1px solid #E2E8F0", 
            color: "#64748B",
            marginTop: "20px"
           }}>
            <h3 style={{ fontSize: "20px", color: "#334155", marginBottom: "12px" }}>
              🛠 Tính năng đang phát triển
            </h3>
            <p>
              Phân hệ đường dẫn <strong>{currentView}</strong> hiện đang được xây dựng và đồng bộ hóa.
             </p>
          </div>
        );
      default:
        return (
          <TrangChu
            currentView={currentView}
            setCurrentView={setCurrentView}
            userName={displayName}
            onLogout={handleLogout}
          />
        );
    }
  };

  if (!isAuthenticated) {
    if (authMode === "welcome") {
      return (
        <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", width: "100vw", backgroundColor: "#F8FAFC", margin: 0, padding: 0 }}>
          {/* Style giữ nguyên như của bạn ... */}
          <Header currentView={currentView} setCurrentView={() => setAuthMode("login")} userName="Khách" onLogout={() => setAuthMode("login")} />
          <main style={{ flex: 1, display: "flex", flexDirection: "column", padding: "0", overflowY: "auto", width: "100%", margin: "0 auto" }}>
            <TrangChu onGoToLogin={() => setAuthMode("login")} />
          </main>
          <Footer setCurrentView={() => setAuthMode("login")} />
        </div>
      );
    }

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
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", width: "100vw", backgroundColor: "#F8FAFC", fontFamily: "Segoe UI, sans-serif", margin: 0, padding: 0, boxSizing: "border-box" }}>
      {/* ... style giữ nguyên ... */}
      <Header 
        currentView={currentView}
        setCurrentView={setCurrentView}
        userName={displayName}
        userProfile={userProfile}
        onLogout={handleLogout}
      />
      <main style={{ 
        flex: 1, 
        display: "flex", 
        flexDirection: "column",
        padding: currentView === "trang-chu" ? "0" : "32px",
        overflowY: "auto",
        width: "100%",
        maxWidth: currentView === "trang-chu" ? "100%" : "1400px",
        margin: "0 auto"
      }}>
        {renderContent()}
      </main>
      <Footer setCurrentView={setCurrentView} />
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}