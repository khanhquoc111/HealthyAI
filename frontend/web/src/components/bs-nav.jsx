// frontend/src/bs-nav.jsx
import React from "react";
import "./bs-nav.css";

export default function BSNav({ currentTab, setCurrentTab }) {
  return (
    <aside className="bs-nav-container">
      {/* Tiêu đề góc trên cùng Sidebar */}
      <div className="bs-nav-header">
        <i className="fa-solid fa-hospital-user"></i>
        <span>
          HealthyAI
          <br />
          <small
            style={{ fontSize: "12px", color: "#64748B", fontWeight: "500" }}
          >
            {" "}
            Quản lý Y tế{" "}
          </small>
        </span>
      </div>

      <ul className="bs-nav-list">
        <li
          className={`bs-nav-item ${currentTab === "tong-quan" ? "active" : ""}`}
          onClick={() => setCurrentTab("tong-quan")}
        >
          <i className="fa-solid fa-gauge-high"></i> Tổng quan
        </li>

        <li
          className={`bs-nav-item ${currentTab === "danh-sach" ? "active" : ""}`}
          onClick={() => setCurrentTab("danh-sach")}
        >
          <i className="fa-solid fa-users-viewfinder"></i> Danh sách bệnh nhân
        </li>

        <li
          className={`bs-nav-item ${currentTab === "them-chi-so" ? "active" : ""}`}
          onClick={() => setCurrentTab("them-chi-so")}
        >
          <i className="fa-solid fa-vial-virus"></i> Thêm chỉ số mới
        </li>

        <li
          className={`bs-nav-item ${currentTab === "them-luat-benh" ? "active" : ""}`}
          onClick={() => setCurrentTab("them-luat-benh")}
        >
          <i className="fa-solid fa-file-medical"></i> Thêm luật bệnh
        </li>

        

        <li
          className={`bs-nav-item ${currentTab === "them-benh" ? "active" : ""}`}
          onClick={() => setCurrentTab("them-benh")}
        >
          <i className="fa-solid fa-file-circle-plus"></i> Thêm bệnh mới
        </li>

        <li
          className={`bs-nav-item ${currentTab === "cai-dat" ? "active" : ""}`}
          onClick={() => setCurrentTab("cai-dat")}
        >
          <i className="fa-solid fa-user-doctor"></i>
          Hồ sơ bác sĩ
        </li>

        <li
          className={`bs-nav-item ${currentTab === "thong-ke" ? "active" : ""}`}
          onClick={() => setCurrentTab("thong-ke")}
        >
          <i className="fa-solid fa-chart-column"></i> Thống kê nguy cơ
        </li>

        <li
          className={`bs-nav-item ${currentTab === "dang-xuat" ? "active" : ""}`}
          onClick={() => setCurrentTab("dang-xuat")}
        >
          <i className="fa-solid fa-right-from-bracket"></i> Đăng xuất
        </li>
      </ul>
    </aside>
  );
}
