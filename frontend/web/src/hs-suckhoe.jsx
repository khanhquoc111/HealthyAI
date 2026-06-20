import { useState, useEffect } from "react";
import axios from "axios";
import "./css/hs-suckhoe.css";

const API_BASE_URL = "http://127.0.0.1:8000";

export default function ChiSoSucKhoe() {
  const [formData, setFormData] = useState({
    tuoi: "", gioiTinh: "Nam", chieuCao: "", canNang: "", bmi: "", vongEo: "",
    huyetApTamThu: "", huyetApTamTruong: "", duongHuyet: "", hba1c: "",
    cholesterol: "", ldl: "", hdl: "", triglyceride: "", creatinine: "", acidUric: "",
    hutThuoc: "Không", uongRuouBia: "Không", soPhutVanDongMoiTuan: "", anMan: "Vừa",
    caoHuyetAp: false, tieuDuong: false, benhTimMach: false, gout: false,
    giaDinhCaoHuyetAp: false, giaDinhTieuDuong: false, giaDinhTimMach: false, giaDinhGout: false
  });

  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [completionRate, setCompletionRate] = useState(0);
  const [missingFields, setMissingFields] = useState([]);
  const [activeAccordion, setActiveAccordion] = useState(1);
  const [healthScore, setHealthScore] = useState(null);
  const [loadingScore, setLoadingScore] = useState(false);
  const [trendData, setTrendData] = useState(null);
  const [loadingTrend, setLoadingTrend] = useState(false);

  const tenDangNhap = localStorage.getItem("userName");

  useEffect(() => {
    const importantFields = {
      bmi: "Thể chất",
      huyetApTamThu: "Huyết áp",
      duongHuyet: "Đường huyết",
      cholesterol: "Cholesterol",
      ldl: "LDL",
      creatinine: "Creatinine"
    };
    let filled = 0;
    let missing = [];
    Object.keys(importantFields).forEach(key => {
      if (formData[key] !== "" && formData[key] !== null) filled++;
      else missing.push(importantFields[key]);
    });
    setCompletionRate(Math.round((filled / Object.keys(importantFields).length) * 100));
    setMissingFields(missing.slice(0, 3));
  }, [formData]);

  useEffect(() => {
    if (tenDangNhap) {
      fetchHealthProfile();
      fetchHealthScore();
      fetchTrendData();
    }
  }, [tenDangNhap]);

  useEffect(() => {
    if (formData.chieuCao && formData.canNang) {
      const heightInM = formData.chieuCao / 100;
      setFormData(prev => ({
        ...prev,
        bmi: (formData.canNang / (heightInM * heightInM)).toFixed(1)
      }));
    }
  }, [formData.chieuCao, formData.canNang]);

  const fetchHealthProfile = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/health-profile/${tenDangNhap}`);
      if (res.data.data) {
        setFormData(prev => ({ ...prev, ...res.data.data }));
      }
    } catch (error) {
      console.error("Lỗi lấy hồ sơ:", error);
    }
  };

  const fetchHealthScore = async () => {
    if (!tenDangNhap) return;
    try {
      setLoadingScore(true);
      const res = await axios.get(`${API_BASE_URL}/health-profile/${tenDangNhap}/health-score`);
      setHealthScore(res.data);
    } catch (error) {
      console.error("Lỗi lấy điểm sức khỏe:", error);
    } finally {
      setLoadingScore(false);
    }
  };

  const fetchTrendData = async () => {
    if (!tenDangNhap) return;
    try {
      setLoadingTrend(true);
      const res = await axios.get(`${API_BASE_URL}/health-profile/${tenDangNhap}/trends`);
      setTrendData(res.data.trends);
    } catch (error) {
      console.error("Lỗi lấy dữ liệu xu hướng:", error);
    } finally {
      setLoadingTrend(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const toggleCheckbox = (name) => {
    setFormData(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!tenDangNhap) return setMessage("Vui lòng đăng nhập trước!");

    try {
      setSaving(true);
      const payload = { tenDangNhap, ...formData };
      const numericFields = [
        "tuoi", "chieuCao", "canNang", "bmi", "vongEo", "huyetApTamThu",
        "huyetApTamTruong", "duongHuyet", "hba1c", "cholesterol", "ldl", "hdl",
        "triglyceride", "creatinine", "acidUric", "soPhutVanDongMoiTuan"
      ];
      numericFields.forEach(k => {
        payload[k] = formData[k] ? Number(formData[k]) : null;
      });

      await axios.post(`${API_BASE_URL}/health-profile/`, payload);
      setMessage("Lưu dữ liệu chỉ số thành công!");
      setTimeout(() => setMessage(""), 3000);
      setTimeout(() => {
        fetchHealthScore();
        fetchTrendData();
      }, 500);
    } catch (error) {
      setMessage("Lỗi khi lưu dữ liệu!");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const renderTrendChart = (metric, records) => {
    if (!records || records.length === 0) return null;
    const maxValue = Math.max(...records.map(r => r.value));
    const minValue = Math.min(...records.map(r => r.value));
    const range = maxValue - minValue || 1;
    const chartHeight = 120;
    const points = records.map((record, idx) => {
      const x = (idx / (records.length - 1 || 1)) * 300;
      const normalizedValue = (record.value - minValue) / range;
      const y = chartHeight - normalizedValue * 100;
      return { x, y, ...record };
    });
    const pathData = points.map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

    return (
      <div className="hsk-trend-chart-container">
        <h4 className="hsk-trend-chart-title">Biểu đồ xu hướng {metric}</h4>
        <svg width="100%" height={chartHeight + 30} viewBox={`0 0 320 ${chartHeight + 30}`} className="hsk-trend-svg">
          <polyline points={pathData} fill="none" stroke="url(#trendGradient)" strokeWidth="2" />
          <defs>
            <linearGradient id="trendGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
          </defs>
          {points.map((p, idx) => (
            <circle key={idx} cx={p.x} cy={p.y} r="3" fill="#2563eb" className="hsk-trend-point" />
          ))}
        </svg>
        <div className="hsk-trend-values">
          {points.map((p, idx) => (
            <span key={idx} className="hsk-trend-value">
              {p.date}: <strong>{p.value.toFixed(1)}</strong>
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="hsk-wrapper">
      {message && (
        <div className={`hsk-message ${message.includes("thành công") ? "hsk-message--success" : "hsk-message--error"}`}>
          <i className={`fa-solid ${message.includes("thành công") ? "fa-check-circle" : "fa-exclamation-circle"}`}></i>
          <span>{message}</span>
        </div>
      )}

      {healthScore && (
        <div className="hsk-score-section">
          <div className="hsk-score-card">
            <div className="hsk-score-card-bg"></div>
            <div className="hsk-score-content">
              <div className="hsk-score-header">
                <i className="fa-solid fa-heart-pulse"></i>
                <span>Điểm Sức Khỏe Cá Nhân</span>
              </div>
              
              <div className="hsk-score-body">
                <div className="hsk-score-display">
                  <div className="hsk-score-number">
                    {healthScore.current_score}
                    <span className="hsk-score-denominator">/{healthScore.max_score}</span>
                  </div>
                  
                  <div className="hsk-score-detail">
                    <div className={`hsk-status-badge hsk-status-${healthScore.current_score >= 70 ? "good" : healthScore.current_score >= 50 ? "warn" : "alert"}`}>
                      <i className={`fa-solid ${healthScore.current_score >= 70 ? "fa-circle-check" : healthScore.current_score >= 50 ? "fa-triangle-exclamation" : "fa-circle-xmark"}`}></i>
                      <span>{healthScore.current_score >= 70 ? "Sức khỏe tốt" : healthScore.current_score >= 50 ? "Cần cải thiện" : "Cần kiểm tra ngay"}</span>
                    </div>
                    
                    <p className="hsk-score-previous">
                      Lần đánh giá trước: <strong>{healthScore.previous_score ?? "--"}/{healthScore.max_score}</strong>
                    </p>
                    
                    {healthScore?.trend?.percentage !== undefined && (
                      <div className={`hsk-trend-indicator hsk-trend-${healthScore.trend.percentage > 0 ? "up" : healthScore.trend.percentage < 0 ? "down" : "stable"}`}>
                        <i className={`fa-solid fa-arrow-${healthScore.trend.percentage > 0 ? "up" : healthScore.trend.percentage < 0 ? "down" : "right"}`}></i>
                        <span>{Math.abs(healthScore.trend.percentage)}% so với tháng trước</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {healthScore?.trend?.insight && (
                  <div className="hsk-score-insight">
                    <i className="fa-solid fa-lightbulb"></i>
                    <p>{healthScore.trend.insight}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="hsk-completion-section">
        <div className="hsk-completion-header">
          <span className="hsk-completion-title">Độ hoàn thiện dữ liệu lâm sàng</span>
          <span className={`hsk-completion-percentage ${completionRate === 100 ? "hsk-complete" : ""}`}>
            {completionRate}%
          </span>
        </div>
        <div className="hsk-completion-track">
          <div className="hsk-completion-bar" style={{ width: `${completionRate}%` }}></div>
        </div>
        {missingFields.length > 0 && (
          <p className="hsk-completion-hint">
            <span className="hsk-hint-label">Đề xuất:</span>
            <span className="hsk-hint-fields">{missingFields.join(", ")}</span>
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="hsk-form">
        {/* SECTION 1 */}
        <div className={`hsk-section ${activeAccordion === 1 ? "hsk-active" : ""}`}>
          <button
            type="button"
            className={`hsk-section-header ${activeAccordion === 1 ? "hsk-open" : ""}`}
            onClick={() => setActiveAccordion(activeAccordion === 1 ? 0 : 1)}
          >
            <div className="hsk-section-title">
              <i className="fa-solid fa-heart-pulse"></i>
              <span>1. Thể chất & Sinh tồn</span>
            </div>
            <i className={`fa-solid fa-chevron-down ${activeAccordion === 1 ? "hsk-rotate" : ""}`}></i>
          </button>
          <div className={`hsk-section-body hsk-section-vitals ${activeAccordion === 1 ? "hsk-open" : ""}`}>
            <div className="hsk-grid-2">
              <div className="hsk-input-group">
                <label>Tuổi</label>
                <input type="number" name="tuoi" value={formData.tuoi} onChange={handleChange} className="hsk-input" />
              </div>
              <div className="hsk-input-group">
                <label>Giới tính</label>
                <select name="gioiTinh" value={formData.gioiTinh} onChange={handleChange} className="hsk-input">
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                </select>
              </div>
              <div className="hsk-input-group">
                <label>Chiều cao (cm)</label>
                <input type="number" name="chieuCao" value={formData.chieuCao} onChange={handleChange} className="hsk-input" />
              </div>
              <div className="hsk-input-group">
                <label>Cân nặng (kg)</label>
                <input type="number" name="canNang" value={formData.canNang} onChange={handleChange} className="hsk-input" />
              </div>
              <div className="hsk-input-group">
                <label>BMI chỉ số</label>
                <input type="number" name="bmi" value={formData.bmi} readOnly className="hsk-input hsk-input--readonly" />
              </div>
              <div className="hsk-input-group">
                <label>Vòng eo (cm)</label>
                <input type="number" name="vongEo" value={formData.vongEo} onChange={handleChange} className="hsk-input" />
              </div>
              <div className="hsk-input-group">
                <label>HA Tâm thu (mmHg)</label>
                <input type="number" name="huyetApTamThu" value={formData.huyetApTamThu} onChange={handleChange} className="hsk-input" />
              </div>
              <div className="hsk-input-group">
                <label>HA Tâm trương (mmHg)</label>
                <input type="number" name="huyetApTamTruong" value={formData.huyetApTamTruong} onChange={handleChange} className="hsk-input" />
              </div>
            </div>
            <div className="hsk-section-nav">
              <button type="button" onClick={() => setActiveAccordion(2)} className="hsk-next-btn">
                Tiếp theo
                <i className="fa-solid fa-arrow-right"></i>
              </button>
            </div>
          </div>
        </div>

        {/* SECTION 2 */}
        <div className={`hsk-section ${activeAccordion === 2 ? "hsk-active" : ""}`}>
          <button
            type="button"
            className={`hsk-section-header ${activeAccordion === 2 ? "hsk-open" : ""}`}
            onClick={() => setActiveAccordion(activeAccordion === 2 ? 0 : 2)}
          >
            <div className="hsk-section-title">
              <i className="fa-solid fa-flask-vial"></i>
              <span>2. Chỉ số Sinh hóa chuyên sâu</span>
            </div>
            <i className={`fa-solid fa-chevron-down ${activeAccordion === 2 ? "hsk-rotate" : ""}`}></i>
          </button>
          <div className={`hsk-section-body hsk-section-biochem ${activeAccordion === 2 ? "hsk-open" : ""}`}>
            <div className="hsk-grid-2">
              <div className="hsk-input-group">
                <label>Đường huyết đói (mg/dL)</label>
                <input type="number" name="duongHuyet" value={formData.duongHuyet} onChange={handleChange} className="hsk-input" />
              </div>
              <div className="hsk-input-group">
                <label>HbA1c (%)</label>
                <input type="number" step="0.1" name="hba1c" value={formData.hba1c} onChange={handleChange} className="hsk-input" />
              </div>
              <div className="hsk-input-group">
                <label>Cholesterol toàn phần (mg/dL)</label>
                <input type="number" name="cholesterol" value={formData.cholesterol} onChange={handleChange} className="hsk-input" />
              </div>
              <div className="hsk-input-group">
                <label>LDL-Cholesterol (mg/dL)</label>
                <input type="number" name="ldl" value={formData.ldl} onChange={handleChange} className="hsk-input" />
              </div>
              <div className="hsk-input-group">
                <label>HDL-Cholesterol (mg/dL)</label>
                <input type="number" name="hdl" value={formData.hdl} onChange={handleChange} className="hsk-input" />
              </div>
              <div className="hsk-input-group">
                <label>Triglyceride (mg/dL)</label>
                <input type="number" name="triglyceride" value={formData.triglyceride} onChange={handleChange} className="hsk-input" />
              </div>
              <div className="hsk-input-group">
                <label>Creatinine máu (mg/dL)</label>
                <input type="number" step="0.01" name="creatinine" value={formData.creatinine} onChange={handleChange} className="hsk-input" />
              </div>
              <div className="hsk-input-group">
                <label>Acid Uric (mg/dL)</label>
                <input type="number" step="0.1" name="acidUric" value={formData.acidUric} onChange={handleChange} className="hsk-input" />
              </div>
            </div>
            <div className="hsk-section-nav">
              <button type="button" onClick={() => setActiveAccordion(3)} className="hsk-next-btn">
                Tiếp theo
                <i className="fa-solid fa-arrow-right"></i>
              </button>
            </div>
          </div>
        </div>

        {/* SECTION 3 */}
        <div className={`hsk-section ${activeAccordion === 3 ? "hsk-active" : ""}`}>
          <button
            type="button"
            className={`hsk-section-header ${activeAccordion === 3 ? "hsk-open" : ""}`}
            onClick={() => setActiveAccordion(activeAccordion === 3 ? 0 : 3)}
          >
            <div className="hsk-section-title">
              <i className="fa-solid fa-person-running"></i>
              <span>3. Lối sống cá nhân</span>
            </div>
            <i className={`fa-solid fa-chevron-down ${activeAccordion === 3 ? "hsk-rotate" : ""}`}></i>
          </button>
          <div className={`hsk-section-body hsk-section-lifestyle ${activeAccordion === 3 ? "hsk-open" : ""}`}>
            <div className="hsk-grid-2">
              <div className="hsk-input-group">
                <label>Tần suất hút thuốc</label>
                <select name="hutThuoc" value={formData.hutThuoc} onChange={handleChange} className="hsk-input">
                  <option value="Không">Không</option>
                  <option value="Đã bỏ">Đã bỏ</option>
                  <option value="Đang hút">Đang hút</option>
                </select>
              </div>
              <div className="hsk-input-group">
                <label>Sử dụng rượu bia</label>
                <select name="uongRuouBia" value={formData.uongRuouBia} onChange={handleChange} className="hsk-input">
                  <option value="Không">Không</option>
                  <option value="Thỉnh thoảng">Thỉnh thoảng</option>
                  <option value="Thường xuyên">Thường xuyên</option>
                </select>
              </div>
              <div className="hsk-input-group">
                <label>Khẩu vị ăn mặn</label>
                <select name="anMan" value={formData.anMan} onChange={handleChange} className="hsk-input">
                  <option value="Nhạt">Nhạt</option>
                  <option value="Vừa">Vừa</option>
                  <option value="Mặn">Mặn</option>
                </select>
              </div>
              <div className="hsk-input-group">
                <label>Vận động thể chất (phút/tuần)</label>
                <input type="number" name="soPhutVanDongMoiTuan" value={formData.soPhutVanDongMoiTuan} onChange={handleChange} className="hsk-input" />
              </div>
            </div>
            <div className="hsk-section-nav">
              <button type="button" onClick={() => setActiveAccordion(4)} className="hsk-next-btn">
                Tiếp theo
                <i className="fa-solid fa-arrow-right"></i>
              </button>
            </div>
          </div>
        </div>

        {/* SECTION 4 */}
        <div className={`hsk-section ${activeAccordion === 4 ? "hsk-active" : ""}`}>
          <button
            type="button"
            className={`hsk-section-header ${activeAccordion === 4 ? "hsk-open" : ""}`}
            onClick={() => setActiveAccordion(activeAccordion === 4 ? 0 : 4)}
          >
            <div className="hsk-section-title">
              <i className="fa-solid fa-triangle-exclamation"></i>
              <span>4. Tiền sử bệnh lý (Cá nhân & Gia đình)</span>
            </div>
            <i className={`fa-solid fa-chevron-down ${activeAccordion === 4 ? "hsk-rotate" : ""}`}></i>
          </button>
          <div className={`hsk-section-body hsk-section-history ${activeAccordion === 4 ? "hsk-open" : ""}`}>
            <div className="hsk-tags-section">
              <h4 className="hsk-tags-title">Tiền sử lâm sàng bản thân:</h4>
              <div className="hsk-tags-group">
                {[
                  { name: "caoHuyetAp", label: "Cao huyết áp" },
                  { name: "tieuDuong", label: "Tiểu đường" },
                  { name: "benhTimMach", label: "Tim mạch" },
                  { name: "gout", label: "Bệnh Gout" }
                ].map(item => (
                  <button
                    key={item.name}
                    type="button"
                    className={`hsk-tag ${formData[item.name] ? "hsk-tag--active" : ""}`}
                    onClick={() => toggleCheckbox(item.name)}
                  >
                    <i className={`fa-solid ${formData[item.name] ? "fa-check" : "fa-plus"}`}></i>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="hsk-tags-section">
              <h4 className="hsk-tags-title">Tiền sử di truyền gia đình:</h4>
              <div className="hsk-tags-group">
                {[
                  { name: "giaDinhCaoHuyetAp", label: "Cao huyết áp" },
                  { name: "giaDinhTieuDuong", label: "Tiểu đường" },
                  { name: "giaDinhTimMach", label: "Tim mạch" },
                  { name: "giaDinhGout", label: "Gout" }
                ].map(item => (
                  <button
                    key={item.name}
                    type="button"
                    className={`hsk-tag ${formData[item.name] ? "hsk-tag--active" : ""}`}
                    onClick={() => toggleCheckbox(item.name)}
                  >
                    <i className={`fa-solid ${formData[item.name] ? "fa-check" : "fa-plus"}`}></i>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <button type="submit" disabled={saving} className="hsk-submit-btn">
          {saving ? (
            <>
              <i className="fa-solid fa-spinner fa-spin"></i>
              <span>Đang kết nối dữ liệu đám mây...</span>
            </>
          ) : (
            <>
              <i className="fa-solid fa-floppy-disk"></i>
              <span>LƯU HỒ SƠ SỨC KHỎE CAN THIỆP</span>
            </>
          )}
        </button>
      </form>

      {trendData && Object.keys(trendData).length > 0 && (
        <div className="hsk-trends-section">
          <h2 className="hsk-trends-title">Phân tích Xu hướng Chỉ số</h2>
          
          {trendData.bmi && (
            <div className="hsk-trend-item">
              <h3 className="hsk-trend-metric">BMI</h3>
              {renderTrendChart("BMI", trendData.bmi.chart_data)}
              {trendData.bmi.has_insight && (
                <p className="hsk-trend-description"><strong>Insight:</strong> {trendData.bmi.insight}</p>
              )}
            </div>
          )}

          {trendData.duongHuyet && (
            <div className="hsk-trend-item">
              <h3 className="hsk-trend-metric">Đường Huyết</h3>
              {renderTrendChart("Đường Huyết", trendData.duongHuyet.chart_data)}
              {trendData.duongHuyet.has_insight && (
                <p className="hsk-trend-description"><strong>Insight:</strong> {trendData.duongHuyet.insight}</p>
              )}
            </div>
          )}

          {trendData.huyetApTamThu && (
            <div className="hsk-trend-item">
              <h3 className="hsk-trend-metric">Huyết Áp Tâm Thu</h3>
              {renderTrendChart("Huyết Áp Tâm Thu", trendData.huyetApTamThu.chart_data)}
              {trendData.huyetApTamThu.has_insight && (
                <p className="hsk-trend-description"><strong>Insight:</strong> {trendData.huyetApTamThu.insight}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
