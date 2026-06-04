CREATE DATABASE IF NOT EXISTS HealthyAI;
USE HealthyAI;
CREATE TABLE nguoiDung (
    idNguoiDung BIGINT AUTO_INCREMENT PRIMARY KEY,

    tenDangNhap VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    matKhauHash VARCHAR(255) NOT NULL,

    hoTen VARCHAR(255),

    ngayTao DATETIME DEFAULT CURRENT_TIMESTAMP,
    ngayCapNhat DATETIME DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE csSucKhoe (
    idChiSoSucKhoe BIGINT AUTO_INCREMENT PRIMARY KEY,

    idNguoiDung BIGINT NOT NULL UNIQUE,

    tuoi INT,
    gioiTinh VARCHAR(20),

    chieuCao FLOAT,
    canNang FLOAT,
    bmi FLOAT,
    vongEo FLOAT,

    huyetApTamThu FLOAT,
    huyetApTamTruong FLOAT,

    duongHuyet FLOAT,
    hba1c FLOAT,

    cholesterol FLOAT,
    ldl FLOAT,
    hdl FLOAT,
    triglyceride FLOAT,

    creatinine FLOAT,
    acidUric FLOAT,

    hutThuoc VARCHAR(50),
    uongRuouBia VARCHAR(50),
    soPhutVanDongMoiTuan INT,
    mucDoAnMan VARCHAR(50),

    caoHuyetAp BOOLEAN DEFAULT FALSE,
    tieuDuong BOOLEAN DEFAULT FALSE,
    benhTimMach BOOLEAN DEFAULT FALSE,
    gout BOOLEAN DEFAULT FALSE,

    giaDinhCaoHuyetAp BOOLEAN DEFAULT FALSE,
    giaDinhTieuDuong BOOLEAN DEFAULT FALSE,
    giaDinhTimMach BOOLEAN DEFAULT FALSE,
    giaDinhGout BOOLEAN DEFAULT FALSE,

    ngayTao DATETIME DEFAULT CURRENT_TIMESTAMP,
    ngayCapNhat DATETIME DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_csSucKhoe_nguoiDung
        FOREIGN KEY (idNguoiDung)
        REFERENCES nguoiDung(idNguoiDung)
        ON DELETE CASCADE
);

CREATE TABLE lichSuDanhGia (
    idDanhGia BIGINT AUTO_INCREMENT PRIMARY KEY,

    idNguoiDung BIGINT NOT NULL,

    tenBenh VARCHAR(100) NOT NULL,

    diemRule FLOAT,
    diemML FLOAT,
    diemTong FLOAT,

    mucNguyCo VARCHAR(50),

    ketQuaJSON JSON,

    ngayDanhGia DATETIME DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_lichSuDanhGia_nguoiDung
        FOREIGN KEY (idNguoiDung)
        REFERENCES nguoiDung(idNguoiDung)
        ON DELETE CASCADE
);