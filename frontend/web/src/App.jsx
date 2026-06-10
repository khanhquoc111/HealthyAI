// frontend/src/App.jsx
import { useState } from "react";
import PhanTichBenh from "./phan-tich-benh"; 
import DangNhap from "./dang-nhap";
import DangKy from "./dang-ky";
import ChiSoSucKhoe from "./hs-suckhoe";   
import TrangChu from "./trang-chu";
import GioiThieu from "./gioi-thieu";
import TraThuoc from "./tra-thuoc";

import Header from "./components/header.jsx";
import Footer from "./components/footer.jsx"; // <-- ĐÃ THÊM IMPORT FOOTER

// Đọc trạng thái auth từ localStorage ngay lúc khởi tạo state
function getInitialAuth() {
  const token = localStorage.getItem("token");
  const email = localStorage.getItem("userName");
  if (token && email) {
    return { isAuthenticated: true, userEmail: email };
  }
  // Dọn sạch nếu thiếu một trong hai
  localStorage.removeItem("token");
  localStorage.removeItem("userName");
  return { isAuthenticated: false, userEmail: "" };
}

const initialAuth = getInitialAuth();

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(initialAuth.isAuthenticated);
  const [userEmail, setUserEmail] = useState(initialAuth.userEmail);
  // ĐỂ MỞ TRANG ĐĂNG NHẬP ĐẦU TIÊN: Đổi trạng thái mặc định từ "welcome" thành "login"
  const [authMode, setAuthMode] = useState("login");
  const [currentView, setCurrentView] = useState("trang-chu");

  const handleLoginSuccess = (email) => {
    setIsAuthenticated(true);
    setUserEmail(email);
    setCurrentView("trang-chu");
    // Đăng nhập thành công trả về trang chủ
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userName");
    setIsAuthenticated(false);
    setUserEmail("");
    setAuthMode("login");
    // Khi đăng xuất, điều hướng quay lại màn hình đăng nhập
    setCurrentView("trang-chu");
  };

  // Hàm quản lý render các màn hình theo currentView từ Header
  const renderContent = () => {
    switch (currentView) {
      // 1. Các component đã có sẵn
      case "phan-tich-benh":
      case "risk": 
        return <PhanTichBenh />;
      case "profile":
        return <ChiSoSucKhoe />;
      case "trang-chu":
        return (
          <TrangChu
            currentView={currentView}
            setCurrentView={setCurrentView}
            userName={userEmail}
            onLogout={handleLogout}
          />
        );
      case "gioi-thieu":
        return <GioiThieu setCurrentView={setCurrentView} />;
      case "tra-thuoc":
        return <TraThuoc />;
      // 2. Các đường dẫn từ Header đang chờ phát triển (Placeholder)
      case "tu-van-ai":
      case "y-te":
      case "thuc-don":
      case "quan-ly-thong-tin":
      case "history":
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
            userName={userEmail}
            onLogout={handleLogout}
          />
        );
    }
  };

  if (!isAuthenticated) {
    // Khối hiển thị giao diện Khách xem trước (chỉ kích hoạt nếu thiết lập authMode về "welcome")
    if (authMode === "welcome") {
      return (
        <div style={{ 
          display: "flex", 
          flexDirection: "column", 
          minHeight: "100vh", 
          width: "100vw", 
          backgroundColor: "#F8FAFC", 
          margin: 0, 
          padding: 0 
        }}>
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
          
          <Header 
            currentView={currentView}
            setCurrentView={() => setAuthMode("login")}
            userName="Khách"
            onLogout={() => setAuthMode("login")}
          />
          
           <main style={{ 
            flex: 1, 
            display: "flex", 
            flexDirection: "column",
            padding: "0",
            overflowY: "auto",
            width: "100%",
            margin: "0 auto"
          }}>
            <TrangChu onGoToLogin={() => setAuthMode("login")} />
          </main>

          {/* <-- ĐÃ THÊM FOOTER CHO CHẾ ĐỘ KHÁCH --> */}
          <Footer setCurrentView={() => setAuthMode("login")} />
        </div>
      );
    }

    // Mặc định render khối này trước khi chưa đăng nhập
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

  // Giao diện chính sau khi đã xác thực tài khoản thành công
  return (
    <div style={{ 
      display: "flex", 
      flexDirection: "column", 
      minHeight: "100vh", 
      width: "100vw", 
      backgroundColor: "#F8FAFC", 
      fontFamily: "Segoe UI, sans-serif", 
      margin: 0, 
      padding: 0, 
      boxSizing: "border-box" 
    }}>
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

      {/* Header hệ thống */}
      <Header 
        currentView={currentView}
        setCurrentView={setCurrentView}
        userName={userEmail}
        onLogout={handleLogout}
      />

      {/* Nội dung tương ứng với các phân hệ điều hướng */}
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

      {/* <-- ĐÃ THÊM FOOTER CHO GIAO DIỆN ĐÃ ĐĂNG NHẬP --> */}
      <Footer setCurrentView={setCurrentView} />

    </div>
  );
}