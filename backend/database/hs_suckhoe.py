from sqlalchemy import Column, Integer, Float, String, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from database.database import Base

class HoSoSucKhoe(Base):
    __tablename__ = "hoSoSucKhoe"

    idHoSo         = Column(Integer, primary_key=True, autoincrement=True)
    idNguoiDung    = Column(Integer, ForeignKey("nguoiDung.idNguoiDung"), unique=True)

    # Thể chất & sinh tồn
    tuoi           = Column(Integer, nullable=True)
    gioiTinh       = Column(String(10), nullable=True)
    chieuCao       = Column(Float, nullable=True)
    canNang        = Column(Float, nullable=True)
    bmi            = Column(Float, nullable=True)
    vongEo         = Column(Float, nullable=True)
    huyetApTamThu  = Column(Float, nullable=True)
    huyetApTamTruong = Column(Float, nullable=True)

    # Lối sống
    hutThuoc            = Column(String(20), nullable=True)
    uongRuouBia         = Column(String(20), nullable=True)
    soPhutVanDongMoiTuan = Column(Integer, nullable=True)
    mucDoAnMan          = Column(String(20), nullable=True)

    ngayTao    = Column(DateTime, server_default=func.now())
    ngayCapNhat = Column(DateTime, server_default=func.now(), onupdate=func.now())