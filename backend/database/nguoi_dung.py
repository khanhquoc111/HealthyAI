# backend/database/nguoi_dung.py
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class NguoiDung(Base):
    __tablename__ = "nguoiDung"

    idNguoiDung = Column(Integer, primary_key=True, autoincrement=True)
    tenDangNhap = Column(String(50), unique=True, nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    matKhauHash = Column(String(255), nullable=False)
    hoTen = Column(String(100))
    ngayTao = Column(DateTime, default=datetime.utcnow)
    ngayCapNhat = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship (chỉ giữ những cái đang tồn tại)
    ho_so_suc_khoe = relationship("HoSoSucKhoe", back_populates="nguoi_dung", uselist=False)
    chi_so_suc_khoe = relationship("ChiSoSucKhoe", back_populates="nguoi_dung", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<NguoiDung {self.tenDangNhap}>"