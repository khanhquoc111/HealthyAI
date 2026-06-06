from sqlalchemy import Column, BigInteger, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database.database import Base

class HoSoSucKhoe(Base):
    __tablename__ = "hoSoSucKhoe"

    idHoSoSucKhoe = Column(BigInteger, primary_key=True, autoincrement=True)
    idNguoiDung = Column(BigInteger, ForeignKey("nguoiDung.idNguoiDung", ondelete="CASCADE"), nullable=False, unique=True)
    
    tuoi = Column(Integer)
    gioiTinh = Column(String(20))
    chieuCao = Column(Float)
    canNang = Column(Float)
    bmi = Column(Float)
    vongEo = Column(Float)
    huyetApTamThu = Column(Float)
    huyetApTamTruong = Column(Float)
    hutThuoc = Column(String(50))
    uongRuouBia = Column(String(50))
    soPhutVanDongMoiTuan = Column(Integer)

    ngayTao = Column(DateTime, server_default=func.now())
    ngayCapNhat = Column(DateTime, server_default=func.now(), onupdate=func.now())

    nguoi_dung = relationship("NguoiDung", back_populates="ho_so_suc_khoe")