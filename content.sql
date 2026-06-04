CREATE DATABASE HealthyAI;
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

CREATE TABLE hsSucKhoe (
    idHoSoSucKhoe BIGINT AUTO_INCREMENT PRIMARY KEY,
    idNguoiDung BIGINT NOT NULL,
    tuoi INT,
    gioiTinh VARCHAR(20),
    chieuCao FLOAT,
    canNang FLOAT,
    bmi FLOAT,
    vongEo FLOAT,
    hutThuoc VARCHAR(50),
    uongRuouBia VARCHAR(50),
    soPhutVanDongMoiTuan INT,
    huyetApTamThu FLOAT,
    huyetApTamTruong FLOAT,

    ngayTao DATETIME DEFAULT CURRENT_TIMESTAMP,
    ngayCapNhat DATETIME DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_hsSucKhoe_nguoiDung
        FOREIGN KEY (idNguoiDung)
        REFERENCES nguoiDung(idNguoiDung)
        ON DELETE CASCADE
);
