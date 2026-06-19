import { useEffect, useRef, useState } from "react";
import axios from "axios";
import "../src/css/thongtin-nguoidung.css";

const API_BASE_URL = "http://127.0.0.1:8000";
const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function resolveAvatarUrl(url) {
  if (!url) return "";
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  return `${API_BASE_URL}${url.startsWith("/") ? url : `/${url}`}`;
}

function getPasswordStrength(password) {
  if (!password) return { score: 0, label: "", color: "#E2E8F0", icon: "" };

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const levels = [
    { label: "", color: "#E2E8F0", icon: "" },
    { label: "Yếu", color: "#EF4444", icon: "fa-circle-exclamation" },
    { label: "Trung bình", color: "#F59E0B", icon: "fa-triangle-exclamation" },
    { label: "Khá", color: "#3B82F6", icon: "fa-check-circle" },
    { label: "Mạnh", color: "#10B981", icon: "fa-shield-check" },
    { label: "Rất mạnh", color: "#059669", icon: "fa-shield" },
  ];

  return { score, ...levels[Math.min(score, 5)] };
}

function ProfileTab({ tenDangNhap, onSaveSuccess }) {
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    hoTen: "",
    email: "",
    soDienThoai: "",
    ngheNghiep: "",
    diaChi: "",
    tinhThanh: "",
    quanHuyen: "",
    anhDaiDien: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!tenDangNhap) return;
    fetchProfile();
  }, [tenDangNhap]);

  function showToast(type, message) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  }

  async function fetchProfile() {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/user-info/${tenDangNhap}`);
      const d = res.data;
      setFormData({
        hoTen: d.hoTen || "",
        email: d.email || "",
        soDienThoai: d.soDienThoai || "",
        ngheNghiep: d.ngheNghiep || "",
        diaChi: d.diaChi || "",
        tinhThanh: d.tinhThanh || "",
        quanHuyen: d.quanHuyen || "",
        anhDaiDien: d.anhDaiDien || "",
      });
    } catch {
      showToast("error", "Không thể tải thông tin tài khoản");
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !tenDangNhap) return;

    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      return showToast("error", "Chỉ hỗ trợ ảnh JPG, PNG, WEBP hoặc GIF");
    }

    if (file.size > MAX_AVATAR_SIZE) {
      return showToast("error", "Ảnh đại diện không được vượt quá 2MB");
    }

    const data = new FormData();
    data.append("file", file);
    setAvatarUploading(true);

    try {
      const res = await axios.post(
        `${API_BASE_URL}/user-info/${tenDangNhap}/avatar`,
        data,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      const avatarUrl = res.data?.anhDaiDien || "";
      setFormData((prev) => ({ ...prev, anhDaiDien: avatarUrl }));
      showToast("success", "Cập nhật ảnh đại diện thành công!");
      if (onSaveSuccess) onSaveSuccess(formData.hoTen);
    } catch (err) {
      const detail = err.response?.data?.detail || "Lỗi tải ảnh đại diện";
      showToast("error", detail);
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!tenDangNhap) return;

    setSaving(true);
    try {
      const payload = Object.fromEntries(
        Object.entries(formData).filter(([, v]) => v !== "")
      );
      await axios.put(`${API_BASE_URL}/user-info/${tenDangNhap}`, payload);
      showToast("success", "Cập nhật thông tin thành công!");
      if (onSaveSuccess)
        onSaveSuccess({
          tenDangNhap,
          hoTen: formData.hoTen,
          anhDaiDien: formData.anhDaiDien,
        });
    } catch (err) {
      const detail = err.response?.data?.detail || "Lỗi cập nhật thông tin";
      showToast("error", detail);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="tnd-body">
        <div className="tnd-card">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="tnd-skeleton" style={{ height: 44, marginBottom: 16 }} />
          ))}
        </div>
      </div>
    );
  }

  const initials = formData.hoTen
    ? formData.hoTen.trim().split(" ").slice(-1)[0].slice(0, 2).toUpperCase()
    : tenDangNhap?.slice(0, 2).toUpperCase();

  return (
    <div className="tnd-body">
      {toast && (
        <div className={`tnd-toast tnd-toast--${toast.type}`}>
          <i
            className={`fas ${
              toast.type === "success" ? "fa-circle-check" : "fa-circle-xmark"
            }`}
          ></i>
          <span>{toast.message}</span>
        </div>
      )}

      <div className="tnd-avatar-block">
        <div className="tnd-avatar-container">
          {formData.anhDaiDien ? (
            <img
              src={resolveAvatarUrl(formData.anhDaiDien)}
              alt="avatar"
              className="tnd-avatar-img"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <div className="tnd-avatar-circle">{initials}</div>
          )}
          <button
            type="button"
            className="tnd-avatar-overlay"
            onClick={() => fileInputRef.current?.click()}
            disabled={avatarUploading}
            title="Chọn ảnh đại diện"
          >
            <i className={avatarUploading ? "fas fa-spinner fa-spin" : "fas fa-camera"}></i>
          </button>
        </div>

        <div className="tnd-avatar-meta">
          <p className="tnd-avatar-name">{formData.hoTen || tenDangNhap}</p>
          <p className="tnd-avatar-username">
            <i className="fas fa-user-circle"></i>
            @{tenDangNhap}
          </p>
          <div className="tnd-avatar-actions">
            <input
              ref={fileInputRef}
              className="tnd-avatar-input"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handleAvatarChange}
            />
            <button
              type="button"
              className="tnd-avatar-upload-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
            >
              <i className={avatarUploading ? "fas fa-spinner fa-spin" : "fas fa-image"}></i>
              {avatarUploading ? "Đang tải..." : "Thay đổi ảnh"}
            </button>
            <span className="tnd-avatar-hint">JPG, PNG, WEBP, GIF – Max 2MB</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="tnd-card">
          <div className="tnd-card-header">
            <div className="tnd-card-icon">
              <i className="fas fa-shield-alt"></i>
            </div>
            <h3 className="tnd-card-title">Thông tin tài khoản</h3>
          </div>
          <div className="tnd-card-body">
            <div className="tnd-grid">
              <div className="tnd-field">
                <label className="tnd-label">
                  <i className="fas fa-user"></i>
                  Tên đăng nhập
                </label>
                <input
                  className="tnd-input tnd-input--readonly"
                  value={tenDangNhap}
                  readOnly
                />
              </div>
              <div className="tnd-field">
                <label className="tnd-label">
                  <i className="fas fa-id-card"></i>
                  Họ và tên
                </label>
                <input
                  className="tnd-input"
                  name="hoTen"
                  value={formData.hoTen}
                  onChange={handleChange}
                  placeholder="Nguyen Van A"
                />
              </div>
              <div className="tnd-field tnd-field--full">
                <label className="tnd-label">
                  <i className="fas fa-envelope"></i>
                  Địa chỉ email
                </label>
                <input
                  className="tnd-input"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="example@email.com"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="tnd-card">
          <div className="tnd-card-header">
            <div className="tnd-card-icon">
              <i className="fas fa-address-book"></i>
            </div>
            <h3 className="tnd-card-title">Thông tin liên hệ</h3>
          </div>
          <div className="tnd-card-body">
            <div className="tnd-grid">
              <div className="tnd-field">
                <label className="tnd-label">
                  <i className="fas fa-phone"></i>
                  Số điện thoại
                </label>
                <input
                  className="tnd-input"
                  name="soDienThoai"
                  value={formData.soDienThoai}
                  onChange={handleChange}
                  placeholder="0900 000 000"
                />
              </div>
              <div className="tnd-field">
                <label className="tnd-label">
                  <i className="fas fa-briefcase"></i>
                  Nghề nghiệp
                </label>
                <input
                  className="tnd-input"
                  name="ngheNghiep"
                  value={formData.ngheNghiep}
                  onChange={handleChange}
                  placeholder="Sinh viên, nhân viên văn phòng, ..."
                />
              </div>
              <div className="tnd-field">
                <label className="tnd-label">
                  <i className="fas fa-map-pin"></i>
                  Tỉnh / Thành phố
                </label>
                <input
                  className="tnd-input"
                  name="tinhThanh"
                  value={formData.tinhThanh}
                  onChange={handleChange}
                  placeholder="Cần Thơ"
                />
              </div>
              <div className="tnd-field">
                <label className="tnd-label">
                  <i className="fas fa-location-dot"></i>
                  Quận / Huyện
                </label>
                <input
                  className="tnd-input"
                  name="quanHuyen"
                  value={formData.quanHuyen}
                  onChange={handleChange}
                  placeholder="Ninh Kiều"
                />
              </div>
              <div className="tnd-field tnd-field--full">
                <label className="tnd-label">
                  <i className="fas fa-home"></i>
                  Địa chỉ
                </label>
                <input
                  className="tnd-input"
                  name="diaChi"
                  value={formData.diaChi}
                  onChange={handleChange}
                  placeholder="123 Đường Nguyễn Huệ"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="tnd-actions">
          <button type="button" className="tnd-btn" onClick={fetchProfile}>
            <i className="fas fa-redo"></i>
            Hủy bỏ
          </button>
          <button
            type="submit"
            className="tnd-btn tnd-btn--primary"
            disabled={saving || avatarUploading}
          >
            <i className={saving ? "fas fa-spinner fa-spin" : "fas fa-save"}></i>
            {saving ? "Đang cập nhật..." : "Lưu thay đổi"}
          </button>
        </div>
      </form>
    </div>
  );
}

function PasswordTab({ tenDangNhap }) {
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const strength = getPasswordStrength(formData.newPassword);

  function showToast(type, message) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formData.currentPassword || !formData.newPassword) {
      return showToast("error", "Vui lòng điền đầy đủ thông tin");
    }
    if (formData.newPassword !== formData.confirmPassword) {
      return showToast("error", "Mật khẩu xác nhận không khớp");
    }
    if (formData.newPassword.length < 6) {
      return showToast("error", "Mật khẩu mới phải có ít nhất 6 ký tự");
    }

    setSaving(true);
    try {
      await axios.post(`${API_BASE_URL}/user-info/${tenDangNhap}/change-password`, {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });
      showToast("success", "Đổi mật khẩu thành công!");
      setFormData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      const detail = err.response?.data?.detail || "Lỗi đổi mật khẩu";
      showToast("error", detail);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="tnd-body">
      {toast && (
        <div className={`tnd-toast tnd-toast--${toast.type}`}>
          <i
            className={`fas ${
              toast.type === "success" ? "fa-circle-check" : "fa-circle-xmark"
            }`}
          ></i>
          <span>{toast.message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="tnd-card">
          <div className="tnd-card-header">
            <div className="tnd-card-icon">
              <i className="fas fa-lock"></i>
            </div>
            <h3 className="tnd-card-title">Đổi mật khẩu</h3>
          </div>
          <div className="tnd-card-body">
            <div className="tnd-grid tnd-grid--full">
              <div className="tnd-field">
                <label className="tnd-label">
                  <i className="fas fa-key"></i>
                  Mật khẩu hiện tại
                </label>
                <div className="tnd-password-wrapper">
                  <input
                    className="tnd-input tnd-password-input"
                    type={showCurrent ? "text" : "password"}
                    name="currentPassword"
                    value={formData.currentPassword}
                    onChange={handleChange}
                    placeholder="Nhập mật khẩu hiện tại"
                  />
                  <button
                    type="button"
                    className="tnd-password-toggle"
                    onClick={() => setShowCurrent((p) => !p)}
                    aria-label="Toggle password visibility"
                  >
                    <i className={`fas ${showCurrent ? "fa-eye-slash" : "fa-eye"}`}></i>
                  </button>
                </div>
              </div>

              <div className="tnd-field">
                <label className="tnd-label">
                  <i className="fas fa-lock"></i>
                  Mật khẩu mới
                </label>
                <div className="tnd-password-wrapper">
                  <input
                    className="tnd-input tnd-password-input"
                    type={showNew ? "text" : "password"}
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleChange}
                    placeholder="Ít nhất 6 ký tự"
                  />
                  <button
                    type="button"
                    className="tnd-password-toggle"
                    onClick={() => setShowNew((p) => !p)}
                    aria-label="Toggle password visibility"
                  >
                    <i className={`fas ${showNew ? "fa-eye-slash" : "fa-eye"}`}></i>
                  </button>
                </div>

                {formData.newPassword && (
                  <div className="tnd-strength-container">
                    <div className="tnd-strength-bar">
                      <div
                        className="tnd-strength-fill"
                        style={{
                          width: `${(strength.score / 5) * 100}%`,
                          backgroundColor: strength.color,
                        }}
                      />
                    </div>
                    {strength.label && (
                      <span className="tnd-strength-label" style={{ color: strength.color }}>
                        <i className={`fas ${strength.icon}`}></i>
                        {strength.label}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="tnd-field">
                <label className="tnd-label">
                  <i className="fas fa-check-circle"></i>
                  Xác nhận mật khẩu
                </label>
                <input
                  className={`tnd-input ${
                    formData.confirmPassword && formData.confirmPassword !== formData.newPassword
                      ? "tnd-input--error"
                      : ""
                  }`}
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Nhập lại mật khẩu mới"
                />
                {formData.confirmPassword && formData.confirmPassword !== formData.newPassword && (
                  <span className="tnd-error-text">
                    <i className="fas fa-triangle-exclamation"></i>
                    Mật khẩu xác nhận chưa khớp
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="tnd-actions">
          <button
            type="reset"
            className="tnd-btn"
            onClick={() =>
              setFormData({ currentPassword: "", newPassword: "", confirmPassword: "" })
            }
          >
            <i className="fas fa-times"></i>
            Xóa
          </button>
          <button type="submit" className="tnd-btn tnd-btn--primary" disabled={saving}>
            <i className={saving ? "fas fa-spinner fa-spin" : "fas fa-key"}></i>
            {saving ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function ThongTinNguoiDung({ onProfileUpdate }) {
  const [activeTab, setActiveTab] = useState("profile");
  const tenDangNhap = localStorage.getItem("userName");

  const tabs = [
    { key: "profile", label: "Thông tin cá nhân", icon: "fa-user-circle" },
    { key: "password", label: "Đổi mật khẩu", icon: "fa-lock" },
  ];

  return (
    <div className="tnd-page">
      <div className="tnd-header">
        <div className="tnd-header-mesh">
          <div className="tnd-mesh-blob tnd-mesh-blob--1"></div>
          <div className="tnd-mesh-blob tnd-mesh-blob--2"></div>
        </div>
        <div className="tnd-header-inner">
          <div className="tnd-header-text">
            <div className="tnd-breadcrumb">
              <span className="tnd-breadcrumb-dot"></span>
              <span>Thông tin tài khoản</span>
            </div>
            <h1 className="tnd-page-title">Quản lý tài khoản cá nhân</h1>
            <p className="tnd-page-desc">
              Cập nhật thông tin hồ sơ, ảnh đại diện và bảo mật tài khoản của bạn
            </p>
          </div>
        </div>
      </div>

      <div className="tnd-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`tnd-tab ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <i className={`fas ${tab.icon}`}></i>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "profile" && (
        <ProfileTab
          tenDangNhap={tenDangNhap}
          onSaveSuccess={(hoTen) => {
            if (onProfileUpdate) onProfileUpdate(hoTen);
          }}
        />
      )}

      {activeTab === "password" && <PasswordTab tenDangNhap={tenDangNhap} />}
    </div>
  );
}