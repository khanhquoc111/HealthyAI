# backend/database/lich_su_danh_gia.py
from sqlalchemy import Column, BigInteger, String, Float, JSON, DateTime, ForeignKey
from sqlalchemy.sql import func
from database.database import Base

class LichSuDanhGia(Base):
    __tablename__ = "lichSuDanhGia"

    idDanhGia = Column(BigInteger, primary_key=True, autoincrement=True)
    idNguoiDung = Column(BigInteger, ForeignKey("nguoiDung.idNguoiDung", ondelete="CASCADE"), nullable=False)
    tenBenh = Column(String(100), nullable=False)
    diemRule = Column(Float)
    diemML = Column(Float)
    diemTong = Column(Float)
    mucNguyCo = Column(String(50))
    ketQuaJSON = Column(JSON)
    ngayDanhGia = Column(DateTime, server_default=func.now())