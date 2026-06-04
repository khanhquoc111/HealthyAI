# backend/database/cs_suc_khoe.py
from sqlalchemy import Column, BigInteger, Integer, Float, String, ForeignKey, Boolean, DateTime
from sqlalchemy.sql import func
from database.database import Base

class CsSucKhoe(Base):
    __tablename__ = "csSucKhoe"

    idChiSoSucKhoe = Column(BigInteger, primary_key=True, autoincrement=True)
    idNguoiDung = Column(BigInteger, ForeignKey("nguoiDung.idNguoiDung"), unique=True, nullable=False)

    # Nhóm Sinh tồn & Thể chất
    tuoi = Column(Integer)
    gioiTinh = Column(String(20))
    chieuCao = Column(Float)
    canNang = Column(Float)
    bmi = Column(Float)
    vongEo = Column(Float)
    huyetApTamThu = Column(Float)
    huyetApTamTruong = Column(Float)

    # Nhóm Lối sống
    hutThuoc = Column(String(50))
    uongRuouBia = Column(String(50))
    soPhutVanDongMoiTuan = Column(Integer)
    mucDoAnMan = Column(String(50))

    # Nhóm Tiền sử bệnh
    caoHuyetAp = Column(Boolean, default=False)
    giaDinhCaoHuyetAp = Column(Boolean, default=False)
    giaDinhTimMach = Column(Boolean, default=False)
    tieuDuong = Column(Boolean, default=False)           # Bản thân mắc tiểu đường
    giaDinhTieuDuong = Column(Boolean, default=False)   # Gia đình mắc tiểu đường

    # Tracking
    ngayTao = Column(DateTime, server_default=func.now())
    ngayCapNhat = Column(DateTime, server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<CsSucKhoe(idNguoiDung={self.idNguoiDung})>"