import { useState } from "react";
import axios from "axios";

const API_BASE_URL = "http://127.0.0.1:8000";

export default function DangNhap({ onLoginSuccess, onSwitchToRegister }) {
  // Đổi state email thành tenDangNhap
  const [formData, setFormData] = useState({ tenDangNhap: "", password: "" });
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
      const res = await axios.post(`${API_BASE_URL}/auth/login`, formData);
      
      // Lưu token và Tên đăng nhập vào localStorage
      localStorage.setItem("token", res.data.access_token);
      localStorage.setItem("userName", res.data.tenDangNhap);
      
      // Gửi tên đăng nhập lên App.jsx để hiển thị "Xin chào, ..."
      onLoginSuccess(res.data.tenDangNhap);
    } catch (err) {
      setError(err.response?.data?.detail || "Đã xảy ra lỗi kết nối với máy chủ!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: "white", padding: "40px", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", width: "100%", maxWidth: "400px" }}>
      <h2 style={{ textAlign: "center", color: "#0f172a", marginBottom: "24px", fontSize: "24px" }}>
        Đăng Nhập Hệ Thống
      </h2>

      {error && (
        <div style={{ color: "#b91c1c", backgroundColor: "#fef2f2", padding: "12px", borderRadius: "6px", marginBottom: "20px", textAlign: "center", border: "1px solid #f87171" }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div>
          <label style={{ fontWeight: "600", display: "block", marginBottom: "8px", color: "#334155" }}>Tên đăng nhập</label>
          <input 
            type="text" name="tenDangNhap" required
            value={formData.tenDangNhap} onChange={handleChange}
            style={{ width: "100%", padding: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", boxSizing: "border-box", fontSize: "15px" }} 
          />
        </div>
        
        <div>
          <label style={{ fontWeight: "600", display: "block", marginBottom: "8px", color: "#334155" }}>Mật khẩu</label>
          <input 
            type="password" name="password" required
            value={formData.password} onChange={handleChange}
            style={{ width: "100%", padding: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", boxSizing: "border-box", fontSize: "15px" }} 
          />
        </div>

        <button 
          type="submit" disabled={loading}
          style={{ padding: "14px", backgroundColor: "#2563eb", color: "white", border: "none", borderRadius: "6px", fontSize: "16px", fontWeight: "bold", cursor: loading ? "not-allowed" : "pointer", marginTop: "12px", transition: "background-color 0.2s" }}>
          {loading ? "Đang xử lý..." : "Đăng Nhập"}
        </button>
      </form>

      <div style={{ textAlign: "center", marginTop: "24px", color: "#64748b", fontSize: "14px" }}>
        Chưa có tài khoản?{" "}
        <button 
          onClick={onSwitchToRegister} 
          style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontWeight: "600", padding: "0", fontSize: "14px" }}>
          Đăng ký ngay
        </button>
      </div>
    </div>
  );
}