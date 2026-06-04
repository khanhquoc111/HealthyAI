// frontend/src/TrangChu.jsx
import React from "react";

export default function TrangChu({ onGoToLogin }) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "100vh",
      backgroundColor: "#f8fafc",
      fontFamily: "Segoe UI, Arial, sans-serif",
      textAlign: "center",
      padding: "20px"
    }}>
      <div style={{
        background: "white",
        padding: "40px 60px",
        borderRadius: "16px",
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
        maxWidth: "500px",
        width: "100%"
      }}>
        <h1 style={{ color: "#1e293b", fontSize: "36px", marginBottom: "10px", fontWeight: "800" }}>
          Hello 👋
        </h1>
        <h3 style={{ color: "#475569", fontWeight: "500", marginBottom: "24px", lineHeight: "1.5" }}>
          Chào mừng bạn đến với Hệ thống Đánh giá Nguy cơ Bệnh Mạn tính ứng dụng Trí tuệ nhân tạo (AI & Rule Engine)
        </h3>
        <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "32px" }}>
          Vui lòng đăng nhập tài khoản để quản lý hồ sơ chỉ số sức khỏe cá nhân và nhận các phân tích chuẩn hóa từ mô hình học máy.
        </p>
        <button
          onClick={onGoToLogin}
          style={{
            width: "100%",
            padding: "14px",
            backgroundColor: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "16px",
            fontWeight: "bold",
            cursor: "pointer",
            boxShadow: "0 4px 6px -1px rgba(37, 99, 235, 0.2)",
            transition: "all 0.2s ease-in-out"
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#1d4ed8"}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#2563eb"}
        >
          🔑 ĐĂNG NHẬP NGAY
        </button>
      </div>
    </div>
  );
}