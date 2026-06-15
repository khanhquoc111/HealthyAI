// frontend/src/thongtin-nd.jsx
import { useState, useEffect } from "react";
import axios from "axios";
import "../src/css/thongtin-nd.css";

const API_BASE_URL = "http://127.0.0.1:8000";

// ---------------------------------------------------------------------------
// Password strength helper
// ---------------------------------------------------------------------------
function getPasswordStrength(password) {
  if (!password) return { score: 0, label: "", color: "#E2E8F0" };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const levels = [
    { label: "", color: "#E2E8F0" },
    { label: "Yeu", color: "#EF4444" },
    { label: "Trung binh", color: "#F59E0B" },
    { label: "Kha", color: "#3B82F6" },
    { label: "Manh", color: "#10B981" },
    { label: "Rat manh", color: "#059669" },
  ];
  return { score, ...levels[Math.min(score, 5)] };
}

// ---------------------------------------------------------------------------
// Sub-component: Profile tab
// ---------------------------------------------------------------------------
function ProfileTab({ tenDangNhap, onSaveSuccess }) {
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
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!tenDangNhap) return;
    setLoading(true);
    axios
      .get(`${API_BASE_URL}/user-info/${tenDangNhap}`)
      .then((res) => {
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
      })
      .catch(() => showToast("error", "Không tải được thông tin tài khoản"))
      .finally(() => setLoading(false));
  }, [tenDangNhap]);

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
    if (!tenDangNhap) return;
    setSaving(true);
    try {
      // Only send non-empty fields to avoid clearing existing data
      const payload = Object.fromEntries(
        Object.entries(formData).filter(([, v]) => v !== "")
      );
      await axios.put(`${API_BASE_URL}/user-info/${tenDangNhap}`, payload);
      showToast("success", "Cập nhật thông tin thành công!");
      if (onSaveSuccess) onSaveSuccess(formData.hoTen);
    } catch (err) {
      const detail = err.response?.data?.detail || "Lỗi cập nhật thông tin";
      showToast("error", detail);
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    // Re-fetch to discard edits
    if (!tenDangNhap) return;
    setLoading(true);
    axios
      .get(`${API_BASE_URL}/user-info/${tenDangNhap}`)
      .then((res) => {
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
      })
      .finally(() => setLoading(false));
  }

  if (loading) {
    return (
      <div className="tn-card">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="tn-skeleton"
            style={{ height: 42, marginBottom: 16 }}
          />
        ))}
      </div>
    );
  }

  const initials = formData.hoTen
    ? formData.hoTen.trim().split(" ").slice(-1)[0].slice(0, 2).toUpperCase()
    : tenDangNhap?.slice(0, 2).toUpperCase();

  return (
    <>
      {/* Avatar block */}
      <div className="tn-avatar-block">
        {formData.anhDaiDien ? (
          <img
            src={formData.anhDaiDien}
            alt="avatar"
            className="tn-avatar-img"
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
        ) : (
          <div className="tn-avatar-circle">{initials}</div>
        )}
        <div className="tn-avatar-meta">
          <p className="tn-avatar-name">
            {formData.hoTen || tenDangNhap}
          </p>
          <p className="tn-avatar-username">@{tenDangNhap}</p>
        </div>
      </div>

      {toast && (
        <div className={`tn-toast tn-toast--${toast.type}`}>
          {toast.type === "success" ? "Lưu thành công!" : "Lỗi: "}
          {toast.message}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Account info */}
        <div className="tn-card">
          <p className="tn-card-title">Thông tin tài khoản</p>
          <div className="tn-grid">
            <div className="tn-field">
              <label className="tn-label">Tên đăng nhập</label>
              <input
                className="tn-input tn-input--readonly"
                value={tenDangNhap}
                readOnly
              />
            </div>
            <div className="tn-field">
              <label className="tn-label">Họ và tên</label>
              <input
                className="tn-input"
                name="hoTen"
                value={formData.hoTen}
                onChange={handleChange}
                placeholder="Nguyen Van A"
              />
            </div>
            <div className="tn-field tn-field--full">
              <label className="tn-label">Địa chỉ email</label>
              <input
                className="tn-input"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="example@email.com"
              />
            </div>
          </div>
        </div>

        {/* Contact info */}
        <div className="tn-card">
          <p className="tn-card-title">Thông tin liên hệ</p>
          <div className="tn-grid">
            <div className="tn-field">
              <label className="tn-label">Số điện thoại</label>
              <input
                className="tn-input"
                name="soDienThoai"
                value={formData.soDienThoai}
                onChange={handleChange}
                placeholder="0900 000 000"
              />
            </div>
            <div className="tn-field">
              <label className="tn-label">Nghề nghiệp</label>
              <input
                className="tn-input"
                name="ngheNghiep"
                value={formData.ngheNghiep}
                onChange={handleChange}
                placeholder="Sinh vien, Nhan vien van phong, ..."
              />
            </div>
            <div className="tn-field">
              <label className="tn-label">Tỉnh / Thành phố</label>
              <input
                className="tn-input"
                name="tinhThanh"
                value={formData.tinhThanh}
                onChange={handleChange}
                placeholder="Can Tho"
              />
            </div>
            <div className="tn-field">
              <label className="tn-label">Quận / Huyện</label>
              <input
                className="tn-input"
                name="quanHuyen"
                value={formData.quanHuyen}
                onChange={handleChange}
                placeholder="Ninh Kieu"
              />
            </div>
            <div className="tn-field tn-field--full">
              <label className="tn-label">Địa chỉ cụ thể</label>
              <input
                className="tn-input"
                name="diaChi"
                value={formData.diaChi}
                onChange={handleChange}
                placeholder="So nha, duong, phuong / xa"
              />
            </div>
            <div className="tn-field tn-field--full">
              <label className="tn-label">URL ảnh đại diện</label>
              <input
                className="tn-input"
                name="anhDaiDien"
                value={formData.anhDaiDien}
                onChange={handleChange}
                placeholder="https://example.com/avatar.jpg"
              />
            </div>
          </div>
        </div>

        <div className="tn-actions">
          <button
            type="button"
            className="tn-btn tn-btn--ghost"
            onClick={handleReset}
            disabled={saving}
          >
            Hủy thay đổi
          </button>
          <button
            type="submit"
            className="tn-btn tn-btn--primary"
            disabled={saving}
          >
            {saving ? "Đang lưu..." : "Lưu thông tin"}
          </button>
        </div>
      </form>
    </>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: Password tab
// ---------------------------------------------------------------------------
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
      await axios.post(
        `${API_BASE_URL}/user-info/${tenDangNhap}/change-password`,
        {
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }
      );
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
    <>
      {toast && (
        <div className={`tn-toast tn-toast--${toast.type}`}>
          {toast.message}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="tn-card">
          <p className="tn-card-title">Đổi mật khẩu</p>
          <div className="tn-grid tn-grid--full">
            <div className="tn-field">
              <label className="tn-label">Mật khẩu hiện tại</label>
              <div style={{ position: "relative" }}>
                <input
                  className="tn-input"
                  type={showCurrent ? "text" : "password"}
                  name="currentPassword"
                  value={formData.currentPassword}
                  onChange={handleChange}
                  placeholder="Nhập mật khẩu hiện tại"
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((p) => !p)}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#94A3B8",
                    fontSize: 16,
                    padding: 0,
                  }}
                >
                  {showCurrent ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="tn-field">
              <label className="tn-label">Mật khẩu mới</label>
              <div style={{ position: "relative" }}>
                <input
                  className="tn-input"
                  type={showNew ? "text" : "password"}
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  placeholder="Ít nhất 6 ký tự"
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowNew((p) => !p)}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#94A3B8",
                    fontSize: 16,
                    padding: 0,
                  }}
                >
                  {showNew ? "Hide" : "Show"}
                </button>
              </div>

              {formData.newPassword && (
                <>
                  <div className="tn-strength-bar">
                    <div
                      className="tn-strength-fill"
                      style={{
                        width: `${(strength.score / 5) * 100}%`,
                        backgroundColor: strength.color,
                      }}
                    />
                  </div>
                  {strength.label && (
                    <span
                      className="tn-strength-label"
                      style={{ color: strength.color }}
                    >
                      {strength.label}
                    </span>
                  )}
                </>
              )}
            </div>

            <div className="tn-field">
              <label className="tn-label">Xác nhận mật khẩu mới</label>
              <input
                className="tn-input"
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Nhập lại mật khẩu mới"
                style={{
                  borderColor:
                    formData.confirmPassword &&
                    formData.confirmPassword !== formData.newPassword
                      ? "#EF4444"
                      : undefined,
                }}
              />
              {formData.confirmPassword &&
                formData.confirmPassword !== formData.newPassword && (
                  <span style={{ fontSize: 12, color: "#EF4444", marginTop: 2 }}>
                    Mật khẩu xác nhận chưa khớp
                  </span>
                )}
            </div>
          </div>
        </div>

        <div className="tn-actions">
          <button
            type="submit"
            className="tn-btn tn-btn--primary"
            disabled={saving}
          >
            {saving ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
          </button>
        </div>
      </form>
    </>
  );
}

// ---------------------------------------------------------------------------
// Root component
// ---------------------------------------------------------------------------
export default function ThongTinNguoiDung({ onProfileUpdate }) {
  const [activeTab, setActiveTab] = useState("profile");

  const tenDangNhap = localStorage.getItem("userName");

  const tabs = [
    { key: "profile", label: "Thông tin cá nhân" },
    { key: "password", label: "Đổi mật khẩu" },
  ];

  return (
    <div className="tn-page">
      {/* Tab bar */}
      <div className="tn-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`tn-tab${activeTab === tab.key ? " active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
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

      {activeTab === "password" && (
        <PasswordTab tenDangNhap={tenDangNhap} />
      )}
    </div>
  );
}