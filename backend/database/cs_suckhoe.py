from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.sql import func
from database.database import Base

class ChiSoSucKhoe(Base):
    __tablename__ = "chiSoSucKhoe"

    idChiSo     = Column(Integer, primary_key=True, autoincrement=True)
    idNguoiDung = Column(Integer, ForeignKey("nguoiDung.idNguoiDung"))
    maChiSo     = Column(String(50), nullable=False)   # vd: "duongHuyet", "hba1c"
    giaTri      = Column(String(100), nullable=True)   # luôn lưu dạng string

    ngayCapNhat = Column(DateTime, server_default=func.now(), onupdate=func.now())