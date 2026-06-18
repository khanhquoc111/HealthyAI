import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_BASE_URL = "http://127.0.0.1:8000";

function formatDate(value) {
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return String(value || "");
  }
}

function normalizeList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean).map((item) => String(item).trim()).filter(Boolean);
  return [];
}

export default function LichSuTraCuu() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const currentUser = localStorage.getItem("userName");
    if (!currentUser) {
      setError("Vui lòng đăng nhập để xem lịch sử tra cứu.");
      setLoading(false);
      return;
    }

    let active = true;
    async function loadHistory() {
      try {
        const response = await axios.get(`${API_BASE_URL}/symptom-checker/history/${encodeURIComponent(currentUser)}?limit=20`);
        if (!active) return;
        setHistory(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        if (!active) return;
        setError(err.response?.data?.detail || "Không thể tải lịch sử tra cứu.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadHistory();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px" }}>
      <div style={{ marginBottom: "18px" }}>
        <h2 style={{ color: "#0F172A", margin: 0, fontSize: "28px" }}>
          <i className="fa-solid fa-clock-rotate-left" style={{ color: "#2563EB", marginRight: "10px" }}></i>
          Lịch Sử Tra Cứu
        </h2>
        <p style={{ color: "#64748B", marginTop: "8px" }}>
          Các lần tra bệnh gần nhất của bạn được lưu tự động để xem lại khi cần.
        </p>
      </div>

      {loading && (
        <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "20px", color: "#475569" }}>
          Đang tải lịch sử...
        </div>
      )}

      {error && !loading && (
        <div style={{ background: "#FEF2F2", color: "#991B1B", padding: "16px", borderRadius: "12px", border: "1px solid #FECACA" }}>
          <i className="fa-solid fa-triangle-exclamation"></i> {error}
        </div>
      )}

      {!loading && !error && history.length === 0 && (
        <div style={{ background: "white", border: "1px dashed #CBD5E1", borderRadius: "16px", padding: "32px", textAlign: "center" }}>
          <div style={{ fontSize: "44px", color: "#94A3B8", marginBottom: "12px" }}>
            <i className="fa-regular fa-folder-open"></i>
          </div>
          <h3 style={{ margin: "0 0 8px", color: "#0F172A" }}>Chưa có lịch sử tra cứu</h3>
          <p style={{ color: "#64748B", marginBottom: "18px" }}>
            Hãy thử chức năng tra bệnh để tạo các kết quả đầu tiên.
          </p>
          <button
            onClick={() => navigate("/tra-benh")}
            style={{ background: "#2563EB", color: "white", border: "none", borderRadius: "10px", padding: "10px 18px", fontWeight: "600", cursor: "pointer" }}
          >
            Đi tới Tra Bệnh
          </button>
        </div>
      )}

      {!loading && !error && history.length > 0 && (
        <div style={{ display: "grid", gap: "16px" }}>
          {history.map((item) => {
            const result = item.ketQua || {};
            const diseases = Array.isArray(result.potential_diseases) ? result.potential_diseases : [];
            const topDisease = diseases[0];
            const symptoms = normalizeList(item.trieuChung);
            const highRiskCount = diseases.filter((d) => d?.is_high_risk).length;

            return (
              <div
                key={item.idTraCuu}
                style={{
                  background: "white",
                  border: "1px solid #E2E8F0",
                  borderRadius: "16px",
                  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
                  overflow: "hidden",
                }}
              >
                <div style={{ padding: "18px 20px", display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", borderBottom: "1px solid #E2E8F0", background: "#F8FAFC" }}>
                  <div>
                    <div style={{ fontWeight: 700, color: "#0F172A", marginBottom: "4px" }}>
                      Lần tra cứu #{item.idTraCuu}
                    </div>
                    <div style={{ color: "#64748B", fontSize: "14px" }}>
                      {formatDate(item.ngayTraCuu)}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ padding: "6px 12px", borderRadius: "999px", background: highRiskCount > 0 ? "#FEE2E2" : "#DCFCE7", color: highRiskCount > 0 ? "#991B1B" : "#166534", fontWeight: 700, fontSize: "13px" }}>
                      {highRiskCount > 0 ? "Có nguy cơ cao" : "Dạng thường"}
                    </span>
                    {topDisease && (
                      <span style={{ padding: "6px 12px", borderRadius: "999px", background: "#E0F2FE", color: "#075985", fontWeight: 700, fontSize: "13px" }}>
                        Gợi ý: {topDisease.disease}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ padding: "20px" }}>
                  <div style={{ marginBottom: "16px" }}>
                    <strong style={{ color: "#0F172A", display: "block", marginBottom: "10px" }}>Triệu chứng đã nhập</strong>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      {symptoms.length > 0 ? symptoms.map((sym, idx) => (
                        <span key={idx} style={{ background: "#EFF6FF", color: "#1D4ED8", borderRadius: "999px", padding: "6px 12px", fontSize: "13px" }}>
                          {sym}
                        </span>
                      )) : <span style={{ color: "#64748B" }}>Không có.</span>}
                    </div>
                    {item.moTaThem && (
                      <p style={{ marginTop: "12px", color: "#334155", lineHeight: 1.6 }}>
                        <strong>Mô tả thêm:</strong> {item.moTaThem}
                      </p>
                    )}
                  </div>

                  {topDisease ? (
                    <div style={{ background: topDisease.is_high_risk ? "#FEF2F2" : "#F8FAFC", border: `1px solid ${topDisease.is_high_risk ? "#FECACA" : "#E2E8F0"}`, borderRadius: "12px", padding: "16px" }}>
                      <div style={{ fontWeight: 700, color: topDisease.is_high_risk ? "#991B1B" : "#0F172A", marginBottom: "8px" }}>
                        {topDisease.disease}
                      </div>
                      <p style={{ margin: "0 0 12px", color: "#475569", lineHeight: 1.6 }}>
                        {topDisease.is_high_risk
                          ? topDisease.warning_message || "Kết quả có dấu hiệu nguy cơ cao, hãy đi khám sớm."
                          : topDisease.description || "Không có mô tả tham khảo."}
                      </p>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        <span style={{ padding: "6px 10px", borderRadius: "999px", background: "#FEF3C7", color: "#92400E", fontWeight: 700, fontSize: "12px" }}>
                          Khớp: {topDisease.match_rate}%
                        </span>
                        {topDisease.is_high_risk && (
                          <span style={{ padding: "6px 10px", borderRadius: "999px", background: "#991B1B", color: "white", fontWeight: 700, fontSize: "12px" }}>
                            Nguy cơ cao
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: "#64748B" }}>Không có bệnh gợi ý phù hợp.</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
