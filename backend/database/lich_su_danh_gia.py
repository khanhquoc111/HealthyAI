# backend/database/lich_su_danh_gia.py
from sqlalchemy import Column, BigInteger, String, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database.database import Base


class LichSuDanhGia(Base):
    __tablename__ = "lichSuDanhGia"

    idDanhGia = Column(BigInteger, primary_key=True, autoincrement=True)
    idNguoiDung = Column(BigInteger, ForeignKey("nguoiDung.idNguoiDung", ondelete="CASCADE"), nullable=False)
    
    maBenh = Column(String(100), nullable=False)
    diemRule = Column(Float)
    diemML = Column(Float)
    diemTong = Column(Float)
    mucNguyCo = Column(String(50))
    ketQuaJSON = Column(JSON)

    ngayDanhGia = Column(DateTime, server_default=func.now())

    nguoi_dung = relationship("NguoiDung", back_populates="lich_su_danh_gia")