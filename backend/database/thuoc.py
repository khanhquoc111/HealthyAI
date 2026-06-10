from sqlalchemy import Column, BigInteger, String, Text, Integer, DateTime
from sqlalchemy.sql import func
from database.database import Base

class Thuoc(Base):
    __tablename__ = "thuoc"

    idThuoc = Column(BigInteger, primary_key=True, autoincrement=True)
    tenThuoc = Column(String(255), nullable=False)
    
    thanhPhan = Column(Text)
    congDung = Column(Text)
    tacDungPhu = Column(Text)
    nhaSanXuat = Column(String(255))
    
    danhGiaTot = Column(Integer)
    danhGiaTrungBinh = Column(Integer)
    danhGiaKem = Column(Integer)
    
    danhSachHoatChat = Column(Text)
    hinhAnh = Column(Text)
    
    ngayTao = Column(DateTime, server_default=func.now())