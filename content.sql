create DATABASE HealthyAI;
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
    idNguoiDung BIGINT NOT NULL,
    
    -- Nhóm Sinh tồn & Thể chất
    tuoi INT,
    gioiTinh VARCHAR(20),
    chieuCao FLOAT,
    canNang FLOAT,
    bmi FLOAT,
    vongEo FLOAT,
    huyetApTamThu FLOAT,
    huyetApTamTruong FLOAT,

    -- Nhóm Lối sống (Lifestyle)
    hutThuoc VARCHAR(50),
    uongRuouBia VARCHAR(50),
    soPhutVanDongMoiTuan INT,
    mucDoAnMan VARCHAR(50),

    -- Nhóm Tiền sử bệnh
    caoHuyetAp TINYINT(1) DEFAULT 0,
    giaDinhCaoHuyetAp TINYINT(1) DEFAULT 0,
    giaDinhTimMach TINYINT(1) DEFAULT 0,
    tieuDuong TINYINT(1) DEFAULT 0,          -- [MỚI] Bản thân mắc tiểu đường
    giaDinhTieuDuong TINYINT(1) DEFAULT 0,   -- [MỚI] Gia đình mắc tiểu đường

    -- Tracking
    ngayTao DATETIME DEFAULT CURRENT_TIMESTAMP,
    ngayCapNhat DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_csSucKhoe_nguoiDung
        FOREIGN KEY (idNguoiDung)
        REFERENCES nguoiDung(idNguoiDung)
        ON DELETE CASCADE
);
