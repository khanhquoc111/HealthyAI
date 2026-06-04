// frontend/src/dang_ky.jsx
import { useState } from "react";
import axios from "axios";

const API_BASE_URL = "http://127.0.0.1:8000";

export default function DangKy({ onSwitchToLogin }) {
  const [formData, setFormData] = useState({ 
    tenDangNhap: "", 
    email: "", 
    password: "", 
    hoTen: "" 
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await axios.post(`${API_BASE_URL}/auth/register`, formData);
      alert("Đăng ký thành công! Vui lòng đăng nhập.");
      onSwitchToLogin();
    } catch (err) {
      setError(err.response?.data?.detail || "Đã xảy ra lỗi kết nối với máy chủ!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: "white", padding: "40px", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", width: "100%", maxWidth: "400px" }}>
      <h2 style={{ textAlign: "center", color: "#0f172a", marginBottom: "24px", fontSize: "24px" }}>
        Tạo Tài Khoản Mới
      </h2>

      {error && (
        <div style={{ color: "#b91c1c", backgroundColor: "#fef2f2", padding: "12px", borderRadius: "6px", marginBottom: "20px", textAlign: "center", border: "1px solid #f87171" }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        
        <div>
          <label style={{ fontWeight: "600", display: "block", marginBottom: "6px", color: "#334155" }}>Tên đăng nhập *</label>
          <input 
            type="text" name="tenDangNhap" required
            value={formData.tenDangNhap} onChange={handleChange}
            style={{ width: "100%", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "6px", boxSizing: "border-box" }} 
          />
        </div>

        <div>
          <label style={{ fontWeight: "600", display: "block", marginBottom: "6px", color: "#334155" }}>Họ và tên</label>
          <input 
            type="text" name="hoTen" 
            value={formData.hoTen} onChange={handleChange}
            style={{ width: "100%", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "6px", boxSizing: "border-box" }} 
          />
        </div>

        <div>
          <label style={{ fontWeight: "600", display: "block", marginBottom: "6px", color: "#334155" }}>Email *</label>
          <input 
            type="email" name="email" required
            value={formData.email} onChange={handleChange}
            style={{ width: "100%", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "6px", boxSizing: "border-box" }} 
          />
        </div>
        
        <div>
          <label style={{ fontWeight: "600", display: "block", marginBottom: "6px", color: "#334155" }}>Mật khẩu *</label>
          <input 
            type="password" name="password" required
            value={formData.password} onChange={handleChange}
            style={{ width: "100%", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "6px", boxSizing: "border-box" }} 
          />
        </div>

        <button 
          type="submit" disabled={loading}
          style={{ padding: "12px", backgroundColor: "#2563eb", color: "white", border: "none", borderRadius: "6px", fontSize: "16px", fontWeight: "bold", cursor: loading ? "not-allowed" : "pointer", marginTop: "8px" }}>
          {loading ? "Đang xử lý..." : "Đăng Ký"}
        </button>
      </form>

      <div style={{ textAlign: "center", marginTop: "20px", color: "#64748b", fontSize: "14px" }}>
        Đã có tài khoản?{" "}
        <button 
          onClick={onSwitchToLogin} 
          style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontWeight: "600", padding: "0", fontSize: "14px" }}>
          Đăng nhập tại đây
        </button>
      </div>
    </div>
  );
}