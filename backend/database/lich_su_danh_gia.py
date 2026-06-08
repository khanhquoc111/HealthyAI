# backend/database/lich_su_danh_gia.py
from sqlalchemy import Column, BigInteger, Float, String, DateTime, JSON, ForeignKey
from sqlalchemy.sql import func
from database.database import Base


class LichSuDanhGia(Base):
    __tablename__ = "lichSuDanhGia"

    idDanhGia   = Column(BigInteger, primary_key=True, autoincrement=True)
    idNguoiDung = Column(BigInteger, ForeignKey("nguoiDung.idNguoiDung", ondelete="CASCADE"), nullable=False)

    maBenh      = Column(String(100), nullable=False)   # "cardiovascular", "diabetes" — đổi từ tenBenh

    diemRule    = Column(Float, nullable=True)
    diemML      = Column(Float, nullable=True)
    diemTong    = Column(Float, nullable=True)

    mucNguyCo   = Column(String(50), nullable=True)

    ketQuaJSON  = Column(JSON, nullable=True)

    ngayDanhGia = Column(DateTime, server_default=func.now())           # đổi từ ngayTao