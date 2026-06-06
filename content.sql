CREATE DATABASE IF NOT EXISTS HealthyAI;
USE HealthyAI;
-- drop database healthyai;
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

CREATE TABLE hoSoSucKhoe (
    idHoSoSucKhoe BIGINT AUTO_INCREMENT PRIMARY KEY,

    idNguoiDung BIGINT NOT NULL UNIQUE,

    tuoi INT,
    gioiTinh VARCHAR(20),

    chieuCao FLOAT,
    canNang FLOAT,
    bmi FLOAT,
    vongEo FLOAT,

    huyetApTamThu FLOAT,
    huyetApTamTruong FLOAT,

    hutThuoc VARCHAR(50),
    uongRuouBia VARCHAR(50),

    soPhutVanDongMoiTuan INT,

    ngayTao DATETIME DEFAULT CURRENT_TIMESTAMP,
    ngayCapNhat DATETIME DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_hoSoSucKhoe_nguoiDung
        FOREIGN KEY (idNguoiDung)
        REFERENCES nguoiDung(idNguoiDung)
        ON DELETE CASCADE
);

CREATE TABLE chiSoSucKhoe (
    idChiSo BIGINT AUTO_INCREMENT PRIMARY KEY,

    idNguoiDung BIGINT NOT NULL,

    maChiSo VARCHAR(100) NOT NULL,
    giaTri VARCHAR(255),

    ngayTao DATETIME DEFAULT CURRENT_TIMESTAMP,
    ngayCapNhat DATETIME DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_chiSoSucKhoe_nguoiDung
        FOREIGN KEY (idNguoiDung)
        REFERENCES nguoiDung(idNguoiDung)
        ON DELETE CASCADE,

    UNIQUE KEY uk_user_chiso (
        idNguoiDung,
        maChiSo
    )
);

CREATE TABLE duLieuDanhGiaBenh (
    idDuLieuDanhGia BIGINT AUTO_INCREMENT PRIMARY KEY,

    idNguoiDung BIGINT NOT NULL,

    maBenh VARCHAR(100) NOT NULL,

    maTruong VARCHAR(100) NOT NULL,

    giaTri VARCHAR(255),

    ngayTao DATETIME DEFAULT CURRENT_TIMESTAMP,
    ngayCapNhat DATETIME DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_duLieuDanhGiaBenh_nguoiDung
        FOREIGN KEY (idNguoiDung)
        REFERENCES nguoiDung(idNguoiDung)
        ON DELETE CASCADE,

    INDEX idx_benh (maBenh),

    UNIQUE KEY uk_user_benh_truong (
        idNguoiDung,
        maBenh,
        maTruong
    )
);

CREATE TABLE lichSuDanhGia (
    idDanhGia BIGINT AUTO_INCREMENT PRIMARY KEY,

    idNguoiDung BIGINT NOT NULL,

    maBenh VARCHAR(100) NOT NULL,

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