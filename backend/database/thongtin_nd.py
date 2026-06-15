# backend/database/thongtin_nd.py
from sqlalchemy import Column, BIGINT, VARCHAR, TEXT, DATETIME, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database.database import Base

class ThongTinNguoiDung(Base):
    __tablename__ = "thongTinNguoiDung"

    idThongTin = Column(BIGINT, primary_key=True, autoincrement=True)
    idNguoiDung = Column(BIGINT, ForeignKey("nguoiDung.idNguoiDung", ondelete="CASCADE"), nullable=False, unique=True)
    soDienThoai = Column(VARCHAR(20))
    diaChi = Column(TEXT)
    tinhThanh = Column(VARCHAR(100))
    quanHuyen = Column(VARCHAR(100))
    ngheNghiep = Column(VARCHAR(255))
    anhDaiDien = Column(TEXT)
    
    # Tự động quản lý thời gian
    ngayTao = Column(DATETIME, server_default=func.now())
    ngayCapNhat = Column(DATETIME, server_default=func.now(), onupdate=func.now())

    # Relationship để dễ dàng truy vấn từ NguoiDung (nếu cần)
    nguoi_dung = relationship("NguoiDung", backref="thong_tin")