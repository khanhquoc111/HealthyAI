# backend/database/hs_suckhoe.py
from sqlalchemy import Column, BigInteger, Integer, Float, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from database.database import Base

class HoSoSucKhoe(Base):
    __tablename__ = "hoSoSucKhoe"

    idHoSoSucKhoe    = Column(BigInteger, primary_key=True, autoincrement=True)
    idNguoiDung      = Column(BigInteger, ForeignKey("nguoiDung.idNguoiDung", ondelete="CASCADE"), nullable=False, unique=True)

    tuoi             = Column(Integer,  nullable=True)
    gioiTinh         = Column(String(20), nullable=True)

    chieuCao         = Column(Float, nullable=True)
    canNang          = Column(Float, nullable=True)
    bmi              = Column(Float, nullable=True)
    vongEo           = Column(Float, nullable=True)

    huyetApTamThu    = Column(Float, nullable=True)
    huyetApTamTruong = Column(Float, nullable=True)

    hutThuoc         = Column(String(50), nullable=True)
    anMan            = Column(String(20), nullable=True) 
    uongRuouBia      = Column(String(50), nullable=True)

    soPhutVanDongMoiTuan = Column(Integer, nullable=True)

    ngayTao          = Column(DateTime, server_default=func.now())
    ngayCapNhat      = Column(DateTime, server_default=func.now(), onupdate=func.now())