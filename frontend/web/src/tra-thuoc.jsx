// frontend/web/src/tra-thuoc.jsx
import { useState, useCallback, useRef } from "react";
import axios from "axios";
import "./css/tra-thuoc.css";

const API_BASE_URL = "http://localhost:8000";

// ---------------------------------------------------------------------------
// Cau hinh hien thi theo muc do canh bao
// ---------------------------------------------------------------------------

const SEVERITY_CONFIG = {
  danger: {
    bullet: "tt-warning-bullet--danger",
    label: "tt-warning-label--danger",
    item: "tt-warning-item--danger",
    icon: "!",
    accordionHeader: "tt-warnings-accordion-header--danger",
    accordionTitle: "tt-accordion-title--danger",
    listClass: "tt-warnings-list--danger",
    countBadge: "tt-count-badge--danger",
  },
  warning: {
    bullet: "tt-warning-bullet--warning",
    label: "tt-warning-label--warning",
    item: "tt-warning-item--warning",
    icon: "!",
    accordionHeader: "tt-warnings-accordion-header--warning",
    accordionTitle: "tt-accordion-title--warning",
    listClass: "tt-warnings-list--warning",
    countBadge: "tt-count-badge--warning",
  },
  info: {
    bullet: "tt-warning-bullet--info",
    label: "tt-warning-label--info",
    item: "tt-warning-item--info",
    icon: "i",
    accordionHeader: "tt-warnings-accordion-header--warning",
    accordionTitle: "tt-accordion-title--warning",
    listClass: "tt-warnings-list--warning",
    countBadge: "tt-count-badge--info",
  },
};

// ---------------------------------------------------------------------------
// Sub-component: Thanh tim kiem
// ---------------------------------------------------------------------------

function SearchBar({ value, onChange, onSearch, loading }) {
  const handleKeyDown = (e) => {
    if (e.key === "Enter") onSearch();
  };

  return (
    <div className="tt-search-row">
      <div className="tt-search-input-wrap">
        <input
          type="text"
          className="tt-search-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Nhập tên thuốc hoặc hoạt chất (ví dụ: aspirin, amoxicillin, ibuprofen…)"
        />
      </div>
      <button
        className="tt-search-btn"
        onClick={onSearch}
        disabled={loading || !value.trim()}
      >
        {loading ? "Đang tìm…" : "Tìm kiếm"}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: Card thuoc trong danh sach
// ---------------------------------------------------------------------------

function MedicineCard({ medicine, isSelected, onClick }) {
  return (
    <div
      className={`tt-medicine-card${isSelected ? " selected" : ""}`}
      onClick={onClick}
    >
      <div className="tt-medicine-card-name">
        {medicine.tenThuoc || "Không rõ tên"}
      </div>
      {medicine.thanhPhan && (
        <div className="tt-medicine-card-ingredient">
          {medicine.thanhPhan.length > 60
            ? medicine.thanhPhan.slice(0, 60) + "…"
            : medicine.thanhPhan}
        </div>
      )}
      {medicine.nhaSanXuat && (
        <div className="tt-medicine-card-mfr">{medicine.nhaSanXuat}</div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: Chi tiet thuoc
// ---------------------------------------------------------------------------

function MedicineDetail({ medicine }) {
  if (!medicine) return null;

  const hasRatings =
    medicine.danhGiaTot || medicine.danhGiaTrungBinh || medicine.danhGiaKem;

  return (
    <div className="tt-medicine-detail-card">
      <div className="tt-detail-header">
        <div>
          <h3 className="tt-detail-name">{medicine.tenThuoc}</h3>
          {medicine.nhaSanXuat && (
            <p className="tt-detail-mfr">Nhà sản xuất: {medicine.nhaSanXuat}</p>
          )}
        </div>

        {hasRatings && (
          <div className="tt-ratings">
            {medicine.danhGiaTot != null && (
              <div className="tt-rating-item">
                <span className="tt-rating-num tt-rating-num--good">
                  {medicine.danhGiaTot}%
                </span>
                <span className="tt-rating-label">Tốt</span>
              </div>
            )}
            {medicine.danhGiaTrungBinh != null && (
              <div className="tt-rating-item">
                <span className="tt-rating-num tt-rating-num--avg">
                  {medicine.danhGiaTrungBinh}%
                </span>
                <span className="tt-rating-label">TB</span>
              </div>
            )}
            {medicine.danhGiaKem != null && (
              <div className="tt-rating-item">
                <span className="tt-rating-num tt-rating-num--poor">
                  {medicine.danhGiaKem}%
                </span>
                <span className="tt-rating-label">Kém</span>
              </div>
            )}
          </div>
        )}
      </div>

      {medicine.congDung && (
        <div className="tt-detail-section tt-detail-section--uses">
          <div className="tt-detail-section-title">Công dụng</div>
          <p className="tt-detail-section-text">{medicine.congDung}</p>
        </div>
      )}

      {medicine.thanhPhan && (
        <div className="tt-detail-section tt-detail-section--composition">
          <div className="tt-detail-section-title">Thành phần / Hoạt chất</div>
          <p className="tt-detail-section-text">{medicine.thanhPhan}</p>
        </div>
      )}

      {medicine.tacDungPhu && (
        <div className="tt-detail-section tt-detail-section--side-effects">
          <div className="tt-detail-section-title">Tác dụng phụ có thể gặp</div>
          <p className="tt-detail-section-text">{medicine.tacDungPhu}</p>
        </div>
      )}

      {medicine.danhSachHoatChat && (
        <span className="tt-ingredient-tag">
          Nhóm hoạt chất: {medicine.danhSachHoatChat}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: Canh bao suc khoe
// ---------------------------------------------------------------------------

function HealthWarnings({ warnings, profileAvailable, tenDangNhap }) {
  const [expanded, setExpanded] = useState(true);

  // Chua dang nhap
  if (!tenDangNhap) {
    return (
      <div className="tt-warning-notice tt-warning-notice--neutral">
        <span className="tt-notice-icon tt-notice-icon--neutral">i</span>
        <span>
          Đăng nhập để xem cảnh báo dựa trên hồ sơ sức khỏe cá nhân.
        </span>
      </div>
    );
  }

  // Chua co ho so
  if (!profileAvailable) {
    return (
      <div className="tt-warning-notice tt-warning-notice--alert">
        <span>⚠</span>
        <span>
          Chưa có hồ sơ sức khỏe. Vui lòng cập nhật hồ sơ sức khỏe để nhận
          cảnh báo phù hợp.
        </span>
      </div>
    );
  }

  // Khong co canh bao
  if (warnings.length === 0) {
    return (
      <div className="tt-warning-notice tt-warning-notice--safe">
        <span className="tt-notice-icon tt-notice-icon--safe">✓</span>
        <span>
          Không có cảnh báo đặc biệt dựa trên hồ sơ sức khỏe hiện tại của bạn.
        </span>
      </div>
    );
  }

  const dangerCount = warnings.filter((w) => w.severity === "danger").length;
  const warnCount = warnings.filter((w) => w.severity === "warning").length;
  const hasDanger = dangerCount > 0;

  const headerClass = hasDanger
    ? "tt-warnings-accordion-header tt-warnings-accordion-header--danger"
    : "tt-warnings-accordion-header tt-warnings-accordion-header--warning";

  const titleClass = hasDanger
    ? "tt-accordion-title tt-accordion-title--danger"
    : "tt-accordion-title tt-accordion-title--warning";

  const listClass = hasDanger
    ? "tt-warnings-list tt-warnings-list--danger"
    : "tt-warnings-list tt-warnings-list--warning";

  return (
    <div>
      <div
        className={headerClass}
        onClick={() => setExpanded(!expanded)}
        style={{
          borderRadius: expanded ? "8px 8px 0 0" : "8px",
        }}
      >
        <div className="tt-accordion-header-left">
          <span className={titleClass}>
            Cảnh báo sức khỏe ({warnings.length})
          </span>
          <div className="tt-accordion-badges">
            {dangerCount > 0 && (
              <span className="tt-count-badge tt-count-badge--danger">
                {dangerCount}
              </span>
            )}
            {warnCount > 0 && (
              <span className="tt-count-badge tt-count-badge--warning">
                {warnCount}
              </span>
            )}
          </div>
        </div>
        <span className="tt-accordion-toggle">
          {expanded ? "Thu gọn ▲" : "Mở rộng ▼"}
        </span>
      </div>

      {expanded && (
        <div className={listClass}>
          {warnings.map((w, idx) => {
            const cfg = SEVERITY_CONFIG[w.severity] || SEVERITY_CONFIG.info;
            return (
              <div key={w.id || idx} className={`tt-warning-item ${cfg.item}`}>
                <span className={`tt-warning-bullet ${cfg.bullet}`}>
                  {cfg.icon}
                </span>
                <div>
                  <div className={`tt-warning-label ${cfg.label}`}>
                    {w.label}
                  </div>
                  <p className="tt-warning-message">{w.message}</p>
                </div>
              </div>
            );
          })}

          <div className="tt-warnings-disclaimer">
            Các cảnh báo này dựa trên Rule Engine đối chiếu với hồ sơ sức khỏe
            cá nhân. Đây không phải lời khuyên y tế chính thức — vui lòng tham
            khảo bác sĩ hoặc dược sĩ trước khi sử dụng thuốc.
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function TraThuoc() {
  const tenDangNhap = localStorage.getItem("userName") || "";

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [medicines, setMedicines] = useState([]);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [healthWarnings, setHealthWarnings] = useState([]);
  const [profileAvailable, setProfileAvailable] = useState(false);
  const [searchDone, setSearchDone] = useState(false);

  const resultRef = useRef(null);

  const handleSearch = useCallback(async () => {
    const q = query.trim();
    if (q.length < 2) {
      setError("Vui lòng nhập ít nhất 2 ký tự để tìm kiếm.");
      return;
    }

    setLoading(true);
    setError("");
    setSelectedMedicine(null);
    setMedicines([]);
    setHealthWarnings([]);
    setSearchDone(false);

    try {
      const res = await axios.post(`${API_BASE_URL}/medicines/lookup`, {
        query: q,
        tenDangNhap: tenDangNhap || null,
      });

      const data = res.data;
      setMedicines(data.medicines || []);
      setHealthWarnings(data.health_warnings || []);
      setProfileAvailable(data.profile_available || false);
      setSearchDone(true);

      if ((data.medicines || []).length === 1) {
        setSelectedMedicine(data.medicines[0]);
      }

      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(detail || "Lỗi kết nối máy chủ. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }, [query, tenDangNhap]);

  const handleSelectMedicine = (medicine) => {
    setSelectedMedicine((prev) =>
      prev?.id === medicine.id && prev?.tenThuoc === medicine.tenThuoc
        ? null
        : medicine
    );
  };

  return (
    <div className="tt-page">

      {/* ── Page Header ── */}
      <div className="tt-page-header">
        <div className="tt-page-badge">
          <span className="tt-badge-dot" />
          Tra Cứu Thuốc
        </div>
        <h1 className="tt-page-title">Tra Cứu Thông Tin Thuốc</h1>
        <p className="tt-page-desc">
          Tìm kiếm theo tên thuốc hoặc hoạt chất.{" "}
          {tenDangNhap
            ? "Hệ thống sẽ tự động đối chiếu hồ sơ sức khỏe để đưa ra cảnh báo phù hợp."
            : "Đăng nhập để nhận cảnh báo sức khỏe cá nhân hóa."}
        </p>
      </div>

      {/* ── Search Box ── */}
      <div className="tt-search-box">
        <SearchBar
          value={query}
          onChange={setQuery}
          onSearch={handleSearch}
          loading={loading}
        />

        {error && (
          <div className="tt-error-banner">
            <span>⚠</span>
            <span>{error}</span>
          </div>
        )}

        {!tenDangNhap && (
          <div className="tt-login-hint">
            <span className="tt-hint-icon">i</span>
            Đăng nhập để kích hoạt chức năng cảnh báo sức khỏe cá nhân.
          </div>
        )}
      </div>

      {/* ── Ket qua ── */}
      {searchDone && (
        <div ref={resultRef}>
          {medicines.length === 0 ? (
            <div className="tt-no-results">
              <span className="tt-no-results-icon">🔍</span>
              <p className="tt-no-results-text">
                Không tìm thấy thuốc nào khớp với từ khóa{" "}
                <strong>"{query}"</strong>. Thử tìm với tên khác hoặc tên hoạt
                chất.
              </p>
            </div>
          ) : (
            <div className="tt-results-layout">

              {/* Cot trai: danh sach thuoc */}
              <div className="tt-medicine-list-panel">
                <div className="tt-list-heading">
                  {medicines.length} kết quả
                </div>
                {medicines.map((med) => (
                  <MedicineCard
                    key={med.id ?? med.tenThuoc}
                    medicine={med}
                    isSelected={
                      selectedMedicine?.id === med.id &&
                      selectedMedicine?.tenThuoc === med.tenThuoc
                    }
                    onClick={() => handleSelectMedicine(med)}
                  />
                ))}
              </div>

              {/* Cot phai: chi tiet + canh bao */}
              <div className="tt-detail-panel">
                {selectedMedicine ? (
                  <>
                    <MedicineDetail medicine={selectedMedicine} />

                    <div className="tt-warnings-card">
                      <h4 className="tt-warnings-card-title">
                        Cảnh báo dựa trên Hồ sơ Sức khỏe
                      </h4>
                      <p className="tt-warnings-card-desc">
                        Kết quả phân tích từ Rule Engine đối chiếu với các chỉ
                        số sức khỏe hiện tại.
                      </p>
                      <HealthWarnings
                        warnings={healthWarnings}
                        profileAvailable={profileAvailable}
                        tenDangNhap={tenDangNhap}
                      />
                    </div>
                  </>
                ) : (
                  <div className="tt-select-prompt">
                    <span className="tt-select-prompt-icon">💊</span>
                    Chọn một thuốc từ danh sách bên trái để xem thông tin chi
                    tiết và cảnh báo sức khỏe.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Trang thai cho truoc khi tim kiem */}
      {!searchDone && !loading && (
        <div className="tt-empty-state">
          <span className="tt-empty-icon">💊</span>
          <p className="tt-empty-text">
            Nhập tên thuốc hoặc hoạt chất và nhấn "Tìm kiếm" để bắt đầu.
          </p>
        </div>
      )}
    </div>
  );
}