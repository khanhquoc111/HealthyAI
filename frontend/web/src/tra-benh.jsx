// frontend/web/src/tra-benh.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./css/tra-benh.css";

const API_BASE_URL = "http://127.0.0.1:8000";

function normalizeList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean).map((item) => String(item).trim()).filter(Boolean);
  if (typeof value !== "string") return [];

  const text = value.trim();
  if (!text || text === "[]") return [];

  try {
    const parsed = JSON.parse(text.replace(/'/g, '"'));
    if (Array.isArray(parsed)) {
      return parsed.filter(Boolean).map((item) => String(item).trim()).filter(Boolean);
    }
  } catch {
    // fallback below
  }

  return text
    .replace(/^\[/, "")
    .replace(/\]$/, "")
    .split(",")
    .map((item) => item.trim().replace(/^['"]|['"]$/g, ""))
    .filter(Boolean);
}

// ────────────────────────────────────────────────────────────
// COMPONENT: SectionList - Hiển thị danh sách tư vấn
// ────────────────────────────────────────────────────────────
function SectionList({ title, iconClass, items, color = "#334155", background = "#F8FAFC", borderColor = "#E2E8F0" }) {
  const list = normalizeList(items);
  return (
    <div className="tb-section-list" style={{ background, border: `1px solid ${borderColor}`, borderRadius: "12px", padding: "16px" }}>
      <strong className="tb-section-title" style={{ color }}>
        <i className={`${iconClass}`} style={{ marginRight: "8px" }}></i> {title}
      </strong>
      <ul className="tb-list-items" style={{ color }}>
        {list.length > 0 ? list.map((item, idx) => (
          <li key={idx} className="tb-list-item">
            <i className="fa-solid fa-check tb-list-check"></i>
            {item}
          </li>
        )) : <li className="tb-list-empty">Không có dữ liệu.</li>}
      </ul>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// COMPONENT: DiseaseCard - Thẻ kết quả bệnh
// ────────────────────────────────────────────────────────────
function DiseaseCard({ disease, index, navigate }) {
  const isHighRisk = disease.is_high_risk;
  const advice = normalizeList(disease.health_advice);
  const diets = normalizeList(disease.diet_recommendations);
  const lifestyle = normalizeList(disease.lifestyle_recommendations);

  return (
    <div className={`tb-disease-card ${isHighRisk ? "tb-disease-card--high-risk" : ""}`}>
      
      {/* Header với tiêu đề và badge */}
      <div className="tb-disease-card-header">
        <div className="tb-disease-card-left">
          <h3 className="tb-disease-name">{disease.disease.toUpperCase()}</h3>
          <p className="tb-disease-confidence">
            <i className="fa-solid fa-signal"></i> Độ tin cậy: {(disease.confidence * 100).toFixed(0)}%
          </p>
        </div>
        <div className="tb-disease-badges">
          
          {isHighRisk && (
            <span className="tb-badge tb-badge-danger">
              <i className="fa-solid fa-triangle-exclamation"></i> Nguy Cơ Cao
            </span>
          )}
        </div>
      </div>

      {/* Phần nội dung chính */}
      <div className="tb-disease-card-body">
        {isHighRisk ? (
          // Trường hợp nguy cơ cao
          <div className="tb-high-risk-section">
            <div className="tb-warning-box">
              <i className="fa-solid fa-exclamation-triangle"></i>
              <span className="tb-warning-text">{disease.warning_message}</span>
            </div>
            
            {advice.length > 0 && (
              <div style={{ marginTop: "16px" }}>
                <SectionList
                  title="Khuyến Nghị Cần Làm Ngay"
                  iconClass="fa-solid fa-shield-heart"
                  items={advice}
                  color="#991B1B"
                  background="#FEF2F2"
                  borderColor="#FECACA"
                />
              </div>
            )}

            <button 
              onClick={() => navigate("/phan-tich-benh")}
              className="tb-btn tb-btn-danger"
            >
              <i className="fa-solid fa-notes-medical"></i> Chuyển sang Phân Tích Chuyên Sâu
            </button>
          </div>
        ) : (
          // Trường hợp nguy cơ thường
          <div className="tb-normal-risk-section">
            {disease.description && (
              <div className="tb-description-box">
                <strong><i className="fa-solid fa-book-medical"></i> Giới thiệu bệnh:</strong>
                <p>{disease.description}</p>
              </div>
            )}

            {disease.reasoning && (
              <div className="tb-reasoning-box">
                <strong><i className="fa-solid fa-lightbulb"></i> Lý do gợi ý:</strong>
                <p>{disease.reasoning}</p>
              </div>
            )}

            {/* Lưới 3 cột cho dinh dưỡng, sinh hoạt, chăm sóc */}
            <div className="tb-recommendations-grid">
              {diets.length > 0 && (
                <SectionList
                  title="Dinh Dưỡng"
                  iconClass="fa-solid fa-utensils"
                  items={diets}
                  color="#166534"
                  background="#F0FDF4"
                  borderColor="#BBF7D0"
                />
              )}

              {lifestyle.length > 0 && (
                <SectionList
                  title="Sinh Hoạt"
                  iconClass="fa-solid fa-person-running"
                  items={lifestyle}
                  color="#1E40AF"
                  background="#EFF6FF"
                  borderColor="#BFDBFE"
                />
              )}

              {advice.length > 0 && (
                <SectionList
                  title="Chăm Sóc"
                  iconClass="fa-solid fa-shield-heart"
                  items={advice}
                  color="#854D0E"
                  background="#FFFBEB"
                  borderColor="#FEF08A"
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// MAIN COMPONENT: TraBenh
// ────────────────────────────────────────────────────────────
export default function TraBenh() {
  const navigate = useNavigate();
  
  const [symptoms, setSymptoms] = useState(["", "", "", ""]);
  const [moTaThem, setMoTaThem] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");

  const handleSymptomChange = (index, value) => {
    const newSymptoms = [...symptoms];
    newSymptoms[index] = value;
    setSymptoms(newSymptoms);
  };

  const handleTraCuu = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResults(null);

    const currentUser = localStorage.getItem("userName");
    
    if (!currentUser) {
      setError("Vui lòng đăng nhập để sử dụng tính năng tra cứu triệu chứng.");
      setLoading(false);
      return;
    }

    const payload = {
      tenDangNhap: currentUser,
      trieuChung1: symptoms[0] || "",
      trieuChung2: symptoms[1] || "",
      trieuChung3: symptoms[2] || "",
      trieuChung4: symptoms[3] || "",
      moTaThem: moTaThem.trim() || ""
    };

    console.log("📤 Payload gửi đi:", payload);

    try {
      const response = await axios.post(`${API_BASE_URL}/symptom-checker/analyze`, payload);
      console.log("✅ Response:", response.data);
      setResults(response.data);
      
      // Cuộn đến kết quả
      setTimeout(() => {
        const resultsSection = document.getElementById("tb-results");
        if (resultsSection) {
          resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 300);
    } catch (err) {
      console.error("❌ Error response:", err.response?.data);
      setError(err.response?.data?.detail || "Có lỗi xảy ra khi phân tích triệu chứng.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tb-page">

      {/* ════════════════════════════════════════
          HEADER / BANNER
      ════════════════════════════════════════ */}
      <div className="tb-banner">
        <div className="tb-banner-mesh">
          <div className="tb-mesh-blob tb-mesh-blob--1"></div>
          <div className="tb-mesh-blob tb-mesh-blob--2"></div>
        </div>

        <div className="tb-banner-content">
          <div className="tb-banner-badge">
            <span className="tb-badge-dot"></span>
            Tra Cứu Triệu Chứng Ban Đầu
          </div>
          <h1 className="tb-banner-title">
            Phân Tích Triệu Chứng <em>Bằng AI</em>
          </h1>
          <p className="tb-banner-desc">
            Sử dụng Luật Y Học, Dữ Liệu Y Tế và Trí Tuệ Nhân Tạo để phân tích triệu chứng bạn mô tả, 
            từ đó gợi ý những bệnh lý có thể phù hợp kèm lời khuyên chăm sóc.
          </p>
        </div>
      </div>

      {/* ════════════════════════════════════════
          MAIN CONTENT
      ════════════════════════════════════════ */}
      <div className="tb-container">

        {/* ─────────────────────────────────────
            KHUNG NHẬP LIỆU
        ───────────────────────────────────── */}
        <div className="tb-input-card">

          <div className="tb-input-card-header">
            <div className="tb-input-header-content">
              <h2 className="tb-input-title">Nhập Triệu Chứng Của Bạn</h2>
              <p className="tb-input-subtitle">
                Vui lòng mô tả chi tiết các triệu chứng bạn đang gặp để hệ thống AI có thể phân tích chính xác.
              </p>
            </div>
            <div className="tb-input-icon-wrapper">
              <i className="fa-solid fa-stethoscope"></i>
            </div>
          </div>

          <form onSubmit={handleTraCuu} className="tb-form">

            {/* ─ Khối nhập triệu chứng ─ */}
            <div className="tb-form-section">
              <div className="tb-form-section-header">
                <i className="fa-solid fa-list-check"></i>
                <div>
                  <h3 className="tb-section-heading">Chọn Triệu Chứng Chính (Tối Đa 4)</h3>
                  <p className="tb-section-description">
                    Nhập từng triệu chứng bạn đang gặp phải. Ví dụ: đau đầu, chóng mặt, buồn nôn, v.v.
                  </p>
                </div>
              </div>

              <div className="tb-symptoms-grid">
                {symptoms.map((sym, index) => (
                  <div key={index} className="tb-symptom-input-wrapper">
                    <label className="tb-symptom-label">Triệu chứng {index + 1}</label>
                    <input
                      type="text"
                      placeholder={`VD: Đau đầu, Chóng mặt, Buồn nôn...`}
                      value={sym}
                      onChange={(e) => handleSymptomChange(index, e.target.value)}
                      className="tb-symptom-input"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* ─ Khối mô tả thêm ─ */}
            <div className="tb-form-section">
              <div className="tb-form-section-header">
                <i className="fa-solid fa-pen-to-square"></i>
                <div>
                  <h3 className="tb-section-heading">Mô Tả Chi Tiết (Rất Quan Trọng)</h3>
                  <p className="tb-section-description">
                    Hãy mô tả cụ thể: thời gian xuất hiện triệu chứng, mức độ nặng nhẹ, 
                    các hoạt động gây ảnh hưởng, v.v. Càng chi tiết giúp AI phân tích chính xác hơn.
                  </p>
                </div>
              </div>

              <textarea
                rows="4"
                placeholder="Ví dụ: Tôi bị đau đầu từ chiều, chủ yếu vùng trán. Buồn nôn từ sáng khi ăn cơm chưa chín. Cảm thấy chóng mặt khi đứng dậy nhanh..."
                value={moTaThem}
                onChange={(e) => setMoTaThem(e.target.value)}
                className="tb-description-textarea"
              ></textarea>
            </div>

            {/* ─ Nút gửi ─ */}
            <button 
              type="submit" 
              disabled={loading} 
              className={`tb-btn tb-btn-primary ${loading ? "tb-btn--loading" : ""}`}
            >
              {loading ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i> 
                  Đang phân tích bằng AI...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-magnifying-glass"></i> 
                  Bắt Đầu Phân Tích
                </>
              )}
            </button>

            {/* Error message */}
            {error && (
              <div className="tb-error-banner">
                <i className="fa-solid fa-triangle-exclamation"></i>
                <span>{error}</span>
              </div>
            )}
          </form>
        </div>

        {/* ─────────────────────────────────────
            KHU VỰC KẾT QUẢ
        ───────────────────────────────────── */}
        {results && (
          <div id="tb-results" className="tb-results-section">

            {/* Triệu chứng đã nhập */}
            <div className="tb-confirmed-symptoms">
              <div className="tb-confirmed-header">
                <i className="fa-solid fa-circle-check"></i>
                <strong>Hệ thống đã ghi nhận</strong>
              </div>
              <div className="tb-confirmed-tags">
                {results.final_symptoms.map((symptom, idx) => (
                  <span key={idx} className="tb-symptom-tag">
                    {symptom}
                  </span>
                ))}
              </div>
            </div>

            {/* Thời gian phân tích */}
            <div className="tb-analysis-meta">
              <span className="tb-meta-divider"></span>
              <span className="tb-meta-item">
                <i className="fa-solid fa-microchip"></i> 
                Engine: {results.potential_diseases?.length > 0 ? "AI-Driven Analysis" : "Chưa có kết quả"}
              </span>
            </div>

            {/* Danh sách bệnh gợi ý */}
            {results.potential_diseases && results.potential_diseases.length > 0 ? (
              <div className="tb-diseases-list">
                <div className="tb-diseases-header">
                  <h3 className="tb-diseases-title">
                    <i className="fa-solid fa-stethoscope"></i> 
                    Kết Quả Phân Tích ({results.potential_diseases.length})
                  </h3>
                  <p className="tb-diseases-subtitle">
                    Các bệnh lý được gợi ý dựa trên triệu chứng và phân tích AI. 
                    Xếp hạng theo độ tin cậy và khả năng khớp.
                  </p>
                </div>

                <div className="tb-diseases-container">
                  {results.potential_diseases.map((disease, index) => (
                    <DiseaseCard 
                      key={index} 
                      disease={disease} 
                      index={index}
                      navigate={navigate}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="tb-no-results">
                <i className="fa-solid fa-inbox"></i>
                <p className="tb-no-results-text">
                  Không tìm thấy bệnh lý phù hợp. Vui lòng mô tả chi tiết hơn hoặc thử lại.
                </p>
              </div>
            )}

            {/* Footer với disclaimer */}
            <div className="tb-results-footer">
              <div className="tb-disclaimer-box">
                <i className="fa-solid fa-circle-info"></i>
                <strong>Lưu Ý Quan Trọng:</strong>
                <p>
                  {results.disclaimer || 
                  "Đây là công cụ sàng lọc sơ bộ dựa trên trí tuệ nhân tạo. Kết quả không thay thế chẩn đoán y khoa chính thức từ bác sĩ. Vui lòng liên hệ với cơ sở y tế để được khám xét chi tiết và chẩn đoán chính xác."}
                </p>
              </div>

              <div className="tb-action-buttons">
                <button 
                  onClick={() => navigate("/phan-tich-benh")}
                  className="tb-btn tb-btn-secondary"
                >
                  <i className="fa-solid fa-flask-vial"></i> Phân Tích Chuyên Sâu
                </button>
                <button 
                  onClick={() => window.location.reload()}
                  className="tb-btn tb-btn-outline"
                >
                  <i className="fa-solid fa-arrow-rotate-left"></i> Tra Cứu Lại
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Empty state - khi chưa có kết quả */}
        {!results && !loading && (
          <div className="tb-empty-state">
            <div className="tb-empty-icon">
              <i className="fa-solid fa-magnifying-glass"></i>
            </div>
            <h3 className="tb-empty-title">Chưa Có Kết Quả</h3>
            <p className="tb-empty-text">
              Nhập triệu chứng và mô tả chi tiết ở trên, 
              sau đó nhấn nút "Bắt Đầu Phân Tích" để hệ thống AI 
              phân tích và gợi ý những bệnh lý có khả năng.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}