from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class DuLieuDanhGiaBenh(Base):
    __tablename__ = "duLieuDanhGiaBenh"

    id = Column(Integer, primary_key=True, autoincrement=True)
    idNguoiDung = Column(Integer)
    maBenh = Column(String(50))
    maTruong = Column(String(100))
    giaTri = Column(Text)
    ngayTao = Column(DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<DuLieuDanhGiaBenh {self.maBenh}>"