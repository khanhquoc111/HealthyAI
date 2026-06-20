// frontend/src/dang_nhap.jsx
import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom"; // Import thêm useNavigate
import "./css/auth.css";

const API_BASE_URL = "http://127.0.0.1:8000";

export default function DangNhap({ onLoginSuccess, onSwitchToRegister }) {
  const [formData, setFormData] = useState({ tenDangNhap: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const navigate = useNavigate(); // Khởi tạo hook điều hướng

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await axios.post(`${API_BASE_URL}/auth/login`, formData);
      
      // Lưu thông tin cơ bản vào LocalStorage
      localStorage.setItem("token", res.data.access_token);
      localStorage.setItem("userName", res.data.tenDangNhap);
      
      // (Tuỳ chọn) Lưu cờ bác sĩ vào storage để tái sử dụng ở các component khác nếu cần
      if (res.data.is_doctor) {
        localStorage.setItem("is_doctor", "true");
      }

      // Gọi callback báo cho parent component biết đã login thành công
      onLoginSuccess({
        tenDangNhap: res.data.tenDangNhap,
        hoTen: res.data.hoTen,
        anhDaiDien: res.data.anhDaiDien,
        isDoctor: res.data.is_doctor, // Bổ sung trạng thái bác sĩ
      });

      // --- LOGIC MỚI: CHUYỂN HƯỚNG DỰA TRÊN DỮ LIỆU TỪ BACKEND ---
      if (res.data.redirect_to) {
        navigate(res.data.redirect_to); // Chuyển tới "/bs-quan-ly-chung" hoặc "/"
      }

    } catch (err) {
      setError(err.response?.data?.detail || "Đã xảy ra lỗi kết nối với máy chủ!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Background mesh */}
      <div className="auth-bg-mesh" aria-hidden="true">
        <div className="auth-mesh-blob auth-mesh-blob--1" />
        <div className="auth-mesh-blob auth-mesh-blob--2" />
        <div className="auth-mesh-blob auth-mesh-blob--3" />
      </div>

      {/* Brand */}
      <div className="auth-brand">
        <div className="auth-brand-logo">
          <div className="auth-brand-icon"><i className="fa-solid fa-heart-pulse" aria-hidden="true"></i></div>
          <span className="auth-brand-name">Healthy<span>AI</span></span>
        </div>
        <span className="auth-brand-tagline">Hệ thống đánh giá nguy cơ bệnh mãn tính</span>
      </div>

      {/* Card */}
      <div className="auth-card">
        <div className="auth-card-header">
          <div className="auth-badge">
            <span className="auth-badge-dot" />
            Bảo mật &amp; Riêng tư
          </div>
          <h2 className="auth-card-title">Đăng nhập <em>hệ thống</em></h2>
          <p className="auth-card-desc">Nhập thông tin tài khoản để tiếp tục</p>
        </div>

        <div className="auth-card-body">
          {/* Error banner */}
          {error && (
            <div className="auth-error">
              <i className="auth-error-icon fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: "contents" }}>
            {/* Tên đăng nhập */}
            <div className="auth-field">
              <label className="auth-label" htmlFor="login-username">
                Tên đăng nhập
                <span className="auth-label-required">*</span>
              </label>
              <div className="auth-input-wrap">
                <i className="auth-input-icon fa-solid fa-user" aria-hidden="true"></i>
                <input
                  id="login-username"
                  className="auth-input"
                  type="text"
                  name="tenDangNhap"
                  required
                  autoComplete="username"
                  placeholder="Nhập tên đăng nhập"
                  value={formData.tenDangNhap}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Mật khẩu */}
            <div className="auth-field">
              <label className="auth-label" htmlFor="login-password">
                Mật khẩu
                <span className="auth-label-required">*</span>
              </label>
              <div className="auth-input-wrap">
                <i className="auth-input-icon fa-solid fa-lock" aria-hidden="true"></i>
                <input
                  id="login-password"
                  className="auth-input"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  required
                  autoComplete="current-password"
                  placeholder="Nhập mật khẩu"
                  value={formData.password}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  className="auth-pw-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  <i className={`fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"}`} aria-hidden="true"></i>
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="auth-submit-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="auth-spinner" />
                  Đang xử lý...
                </>
              ) : (
                <><i className="fa-solid fa-right-to-bracket" aria-hidden="true"></i> Đăng Nhập</>
              )}
            </button>
          </form>

          {/* Switch */}
          <div className="auth-divider">hoặc</div>
          <div className="auth-switch">
            Chưa có tài khoản?{" "}
            <button className="auth-switch-btn" onClick={onSwitchToRegister}>
              Đăng ký ngay
            </button>
          </div>
        </div>
      </div>

      <p className="auth-footer-note">
        © {new Date().getFullYear()} HealthyAI · Hệ thống đánh giá nguy cơ bệnh mãn tính
      </p>
    </div>
  );
}