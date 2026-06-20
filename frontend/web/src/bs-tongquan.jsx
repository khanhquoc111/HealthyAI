// frontend/src/bs-tongquan.jsx
import { useState } from "react";
import BSNav from "./components/bs-nav.jsx";
import BSChiSoYKhoa from "./bs-ql-csyk.jsx";
import "./css/bs-tongquan.css";

export default function BSTongQuan() {
  const [currentTab, setCurrentTab] = useState("tong-quan");
  const tenBacSi = localStorage.getItem("userName") || "Bác sĩ";

  const [thongKe, setThongKe] = useState({
    soBenhManTinh: 0,
    soChiSoSucKhoe: 0,
    soCauHoiDanhGia: 0,
    soNguoiDung: 0,
    soLuotDanhGia: 0
  });

  const [tinhTrangHeThong, setTinhTrangHeThong] = useState({
    diseaseFramework: "Đang tải...",
    healthIndicatorFramework: "Đang tải..."
  });

  const [hoatDongGanDay, setHoatDongGanDay] = useState([]);
  const [canhBaoGoiY, setCanhBaoGoiY] = useState([]);

  return (
    <div className="tq-layout">
      {/* Sidebar thanh điều hướng bên trái */}
      <BSNav currentTab={currentTab} setCurrentTab={setCurrentTab} />

      {/* Khu vực nội dung hiển thị bên phải */}
      <div className="tq-main-content">
        
        {/* TAB TỔNG QUAN (DASHBOARD) */}
        {currentTab === "tong-quan" && (
          <div className="tq-dashboard">
            {/* Lời chào & Tổng quan hệ thống */}
            <header className="tq-header">
              <h1><i className="fa-solid fa-hospital-user"></i> Trung tâm điều hành HealthyAI</h1>
              <p>Xin chào bác sĩ <strong>{tenBacSi}</strong>! Dưới đây là bức tranh toàn cảnh về trạng thái vận hành của hệ thống.</p>
            </header>

            <hr className="tq-divider" />

            {/* Lối tắt (Quick Shortcuts) */}
            <section>
              <h3 className="tq-section-title"><i className="fa-solid fa-bolt"></i> Lối tắt thao tác nhanh</h3>
              <div className="tq-shortcuts">
                <button className="tq-btn tq-btn-primary">
                  <i className="fa-solid fa-plus"></i> Thêm bệnh mới
                </button>
                <button className="tq-btn tq-btn-primary">
                  <i className="fa-solid fa-vial-virus"></i> Thêm chỉ số sức khỏe
                </button>
                <button className="tq-btn tq-btn-secondary">
                  <i className="fa-solid fa-list-check"></i> Quản lý câu hỏi đánh giá
                </button>
                <button className="tq-btn tq-btn-secondary">
                  <i className="fa-solid fa-chart-pie"></i> Xem báo cáo thống kê
                </button>
              </div>
            </section>

            {/* BỐ CỤC DẠNG LƯỚI CHO CÁC KHỐI THÔNG TIN */}
            <div className="tq-grid">
              
              {/* Thống kê dữ liệu cốt lõi */}
              <section className="tq-card">
                <h3 className="tq-card-title"><i className="fa-solid fa-chart-simple"></i> Thống kê tổng quan</h3>
                <ul className="tq-list">
                  <li><span>Bệnh lý đang quản lý:</span> <strong>{thongKe.soBenhManTinh}</strong></li>
                  <li><span>Chỉ số sức khỏe (Sổ Y Tế):</span> <strong>{thongKe.soChiSoSucKhoe}</strong></li>
                  <li><span>Tổng số câu hỏi đánh giá:</span> <strong>{thongKe.soCauHoiDanhGia}</strong></li>
                  <li><span>Người dùng đã đăng ký:</span> <strong>{thongKe.soNguoiDung}</strong></li>
                  <li><span>Lượt đánh giá nguy cơ:</span> <strong>{thongKe.soLuotDanhGia}</strong></li>
                </ul>
              </section>

              {/* Tình trạng hệ thống */}
              <section className="tq-card">
                <h3 className="tq-card-title"><i className="fa-solid fa-server"></i> Tình trạng hoạt động</h3>
                <ul className="tq-list">
                  <li>
                    <span><strong>Disease Framework:</strong></span> 
                    <span className="tq-status">{tinhTrangHeThong.diseaseFramework}</span>
                  </li>
                  <li>
                    <span><strong>Health Indicator:</strong></span> 
                    <span className="tq-status">{tinhTrangHeThong.healthIndicatorFramework}</span>
                  </li>
                </ul>
              </section>

              {/* Hoạt động gần đây */}
              <section className="tq-card">
                <h3 className="tq-card-title"><i className="fa-solid fa-clock-rotate-left"></i> Lịch sử hoạt động gần đây</h3>
                {hoatDongGanDay.length === 0 ? (
                  <p className="tq-empty-text">Chưa có hoạt động cập nhật nào gần đây trong hệ thống.</p>
                ) : (
                  <ul className="tq-list">
                    {hoatDongGanDay.map((hoatDong, index) => (
                      <li key={index}><i className="fa-solid fa-circle-dot" style={{fontSize: '8px'}}></i> {hoatDong}</li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Cảnh báo & Gợi ý chất lượng dữ liệu */}
              <section className="tq-card">
                <h3 className="tq-card-title warning"><i className="fa-solid fa-triangle-exclamation"></i> Cảnh báo & Gợi ý cải thiện</h3>
                <p className="tq-alert-subtitle">Phát hiện dữ liệu chưa hoàn chỉnh cần bổ sung:</p>
                {canhBaoGoiY.length === 0 ? (
                  <p className="tq-success-text">
                    <i className="fa-solid fa-circle-check"></i> Hệ thống không ghi nhận dữ liệu nào bị thiếu.
                  </p>
                ) : (
                  <ul className="tq-alert-list">
                    {canhBaoGoiY.map((canhBao, index) => (
                      <li key={index}>
                        <i className="fa-solid fa-circle-exclamation"></i>
                        {canhBao}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

            </div>
          </div>
        )}

        {/* 2. TAB THÊM CHỈ SỐ (ĐÂY LÀ PHẦN BẠN CẦN THÊM VÀO) */}
        {currentTab === "them-chi-so" && (
            <BSChiSoYKhoa />
        )}

        {/* CÁC TAB KHÁC ĐỂ MỞ RỘNG */}
        {/* {currentTab !== "tong-quan" && (
          <div>
            <h2>Khu vực chức năng: {currentTab}</h2>
            <p>Nội dung phân hệ này sẽ được tích hợp sau.</p>
          </div>
        )} */}

      </div>

    </div>
  );
}