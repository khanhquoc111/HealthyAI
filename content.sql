DROP DATABASE IF EXISTS HealthyAI;
CREATE DATABASE HealthyAI;
USE HealthyAI;

-- 1. Bảng Người Dùng
CREATE TABLE nguoiDung (
    idNguoiDung BIGINT AUTO_INCREMENT PRIMARY KEY,
    tenDangNhap VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    matKhauHash VARCHAR(255) NOT NULL,
    hoTen VARCHAR(255),
    ngayTao DATETIME DEFAULT CURRENT_TIMESTAMP,
    ngayCapNhat DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Bảng Hồ Sơ Sức Khỏe (anMan đã được đặt đúng vị trí)
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
    anMan VARCHAR(20),
    uongRuouBia VARCHAR(50),
    soPhutVanDongMoiTuan INT,
    ngayTao DATETIME DEFAULT CURRENT_TIMESTAMP,
    ngayCapNhat DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_hoSoSucKhoe_nguoiDung FOREIGN KEY (idNguoiDung) REFERENCES nguoiDung(idNguoiDung) ON DELETE CASCADE
);

-- 3. Bảng Chỉ Số Sức Khỏe (EAV)
CREATE TABLE chiSoSucKhoe (
    idChiSo BIGINT AUTO_INCREMENT PRIMARY KEY,
    idNguoiDung BIGINT NOT NULL,
    maChiSo VARCHAR(100) NOT NULL,
    giaTri VARCHAR(255),
    ngayTao DATETIME DEFAULT CURRENT_TIMESTAMP,
    ngayCapNhat DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_chiSoSucKhoe_nguoiDung FOREIGN KEY (idNguoiDung) REFERENCES nguoiDung(idNguoiDung) ON DELETE CASCADE,
    UNIQUE KEY uk_user_chiso (idNguoiDung, maChiSo)
);

-- 4. Bảng Dữ Liệu Đánh Giá Bệnh
CREATE TABLE duLieuDanhGiaBenh (
    idDuLieuDanhGia BIGINT AUTO_INCREMENT PRIMARY KEY,
    idNguoiDung BIGINT NOT NULL,
    maBenh VARCHAR(100) NOT NULL,
    maTruong VARCHAR(100) NOT NULL,
    giaTri VARCHAR(255),
    ngayTao DATETIME DEFAULT CURRENT_TIMESTAMP,
    ngayCapNhat DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_duLieuDanhGiaBenh_nguoiDung FOREIGN KEY (idNguoiDung) REFERENCES nguoiDung(idNguoiDung) ON DELETE CASCADE,
    INDEX idx_benh (maBenh),
    UNIQUE KEY uk_user_benh_truong (idNguoiDung, maBenh, maTruong)
);

-- 5. Bảng Lịch Sử Đánh Giá (Đã dùng maBenh và ngayDanhGia)
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
    CONSTRAINT fk_lichSuDanhGia_nguoiDung FOREIGN KEY (idNguoiDung) REFERENCES nguoiDung(idNguoiDung) ON DELETE CASCADE
);

-- 6. Bảng Thuốc & Cảnh Báo
CREATE TABLE thuoc (
    idThuoc BIGINT AUTO_INCREMENT PRIMARY KEY,
    tenThuoc VARCHAR(255) NOT NULL,
    thanhPhan TEXT,
    congDung TEXT,
    tacDungPhu TEXT,
    nhaSanXuat VARCHAR(255),
    danhGiaTot INT,
    danhGiaTrungBinh INT,
    danhGiaKem INT,
    danhSachHoatChat TEXT,
    hinhAnh TEXT,
    ngayTao DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE canhBaoThuoc (
    idCanhBao BIGINT AUTO_INCREMENT PRIMARY KEY,
    idThuoc BIGINT NOT NULL,
    maChiSo VARCHAR(100) NOT NULL,
    toanTu VARCHAR(10),
    nguong FLOAT,
    thongDiepCanhBao TEXT,
    ngayTao DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (idThuoc) REFERENCES thuoc(idThuoc) ON DELETE CASCADE
);