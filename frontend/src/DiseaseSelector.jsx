import { useState } from "react";

const DISEASES = [
  {
    id: "diabetes",
    name: "Đái Tháo Đường Type 2",
    short: "ĐTĐ",
    icon: "◉",
    description: "Đánh giá nguy cơ mắc bệnh đái tháo đường loại 2",
    color: "diabetes",
    risk_factors: ["Glucose cao", "Thừa cân", "Ít vận động", "Tiền sử gia đình"]
  },
  {
    id: "hypertension",
    name: "Tăng Huyết Áp",
    short: "THA",
    icon: "△",
    description: "Đánh giá nguy cơ tăng huyết áp (cao huyết áp)",
    color: "hypertension",
    risk_factors: ["Huyết áp cao", "Ăn mặn", "Béo phì", "Ít vận động"]
  },
  {
    id: "cardiovascular",
    name: "Bệnh Tim Mạch",
    short: "Tim",
    icon: "♥",
    description: "Đánh giá nguy cơ bệnh tim mạch và mạch vành",
    color: "cardiovascular",
    risk_factors: ["Cholesterol cao", "Hút thuốc", "Thừa cân", "Tăng huyết áp"]
  },
  {
    id: "kidney",
    name: "Bệnh Thận Mạn Tính",
    short: "Thận",
    icon: "◆",
    description: "Đánh giá nguy cơ suy thận mạn tính",
    color: "kidney",
    risk_factors: ["Đái tháo đường", "Tăng huyết áp", "Dùng NSAID", "Tuổi cao"]
  }
];

export function DiseaseSelector({ onSelect }) {
  const [selected, setSelected] = useState(null);

  function handleSelect(disease) {
    setSelected(disease.id);
    onSelect(disease.id);
  }

  return (
    <section className="disease-selector-page">
      <div className="selector-header">
        <h2>Chọn Bệnh Cần Đánh Giá</h2>
        <p>Hệ thống sẽ hỗ trợ phân tích nguy cơ bệnh dựa trên dữ liệu y tế của bạn</p>
      </div>

      <div className="disease-grid">
        {DISEASES.map((disease) => (
          <button
            key={disease.id}
            className={`disease-card ${disease.color} ${selected === disease.id ? "selected" : ""}`}
            onClick={() => handleSelect(disease)}
            type="button"
          >
            <div className="disease-icon">{disease.icon}</div>
            <h3>{disease.name}</h3>
            <p className="disease-desc">{disease.description}</p>
            <div className="risk-tags">
              {disease.risk_factors.map((factor) => (
                <span key={factor} className="tag">{factor}</span>
              ))}
            </div>
            <div className="select-indicator">
              {selected === disease.id ? "✓ Đã chọn" : "Chọn"}
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <div className="selector-help">
          <p>💡 Bạn đã chọn bệnh <strong>{DISEASES.find(d => d.id === selected)?.name}</strong>. Hãy nhập dữ liệu cá nhân để bắt đầu đánh giá.</p>
        </div>
      )}
    </section>
  );
}

export default DiseaseSelector;