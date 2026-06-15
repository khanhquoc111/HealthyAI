// frontend/src/dang_ky.jsx
import { useState } from "react";
import axios from "axios";
import "./css/auth.css";

const API_BASE_URL = "http://127.0.0.1:8000";

export default function DangKy({ onSwitchToLogin }) {
  const [formData, setFormData] = useState({
    tenDangNhap: "",
    email: "",
    password: "",
    hoTen: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
          <div className="auth-brand-icon">🩺</div>
          <span className="auth-brand-name">Healthy<span>AI</span></span>
        </div>
        <span className="auth-brand-tagline">Hệ thống đánh giá nguy cơ bệnh mãn tính</span>
      </div>

      {/* Card */}
      <div className="auth-card">
        <div className="auth-card-header">
          <div className="auth-badge">
            <span className="auth-badge-dot" />
            Miễn phí &amp; An toàn
          </div>
          <h2 className="auth-card-title">Tạo tài khoản <em>mới</em></h2>
          <p className="auth-card-desc">Điền thông tin bên dưới để bắt đầu sử dụng hệ thống</p>
        </div>

        <div className="auth-card-body">
          {/* Error banner */}
          {error && (
            <div className="auth-error">
              <span className="auth-error-icon">⚠️</span>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: "contents" }}>
            {/* Tên đăng nhập & Họ tên – 2 cột */}
            <div className="auth-fields-row">
              <div className="auth-field">
                <label className="auth-label" htmlFor="reg-username">
                  Tên đăng nhập
                  <span className="auth-label-required">*</span>
                </label>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon">👤</span>
                  <input
                    id="reg-username"
                    className="auth-input"
                    type="text"
                    name="tenDangNhap"
                    required
                    autoComplete="username"
                    placeholder="vd: nguyen_van_a"
                    value={formData.tenDangNhap}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="auth-field">
                <label className="auth-label" htmlFor="reg-hoten">
                  Họ và tên
                  <span className="auth-label-optional">&nbsp;(tuỳ chọn)</span>
                </label>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon">🪪</span>
                  <input
                    id="reg-hoten"
                    className="auth-input"
                    type="text"
                    name="hoTen"
                    autoComplete="name"
                    placeholder="Nguyễn Văn A"
                    value={formData.hoTen}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            {/* Email */}
            <div className="auth-field">
              <label className="auth-label" htmlFor="reg-email">
                Email
                <span className="auth-label-required">*</span>
              </label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon">✉️</span>
                <input
                  id="reg-email"
                  className="auth-input"
                  type="email"
                  name="email"
                  required
                  autoComplete="email"
                  placeholder="email@example.com"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Mật khẩu */}
            <div className="auth-field">
              <label className="auth-label" htmlFor="reg-password">
                Mật khẩu
                <span className="auth-label-required">*</span>
              </label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon">🔒</span>
                <input
                  id="reg-password"
                  className="auth-input"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  required
                  autoComplete="new-password"
                  placeholder="Tối thiểu 8 ký tự"
                  value={formData.password}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  className="auth-pw-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showPassword ? "🙈" : "👁️"}
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
                <>✅ Tạo Tài Khoản</>
              )}
            </button>
          </form>

          {/* Switch */}
          <div className="auth-divider">hoặc</div>
          <div className="auth-switch">
            Đã có tài khoản?{" "}
            <button className="auth-switch-btn" onClick={onSwitchToLogin}>
              Đăng nhập tại đây
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