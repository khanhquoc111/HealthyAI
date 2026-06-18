# backend/database/lich_su_tra_cuu.py
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from database.database import Base

class LichSuTraCuuTrieuChung(Base):
    __tablename__ = "lichSuTraCuuTrieuChung"

    idTraCuu = Column(Integer, primary_key=True, index=True, autoincrement=True)
    idNguoiDung = Column(Integer, ForeignKey("nguoiDung.idNguoiDung", ondelete="CASCADE"), nullable=False)
    
    trieuChung1 = Column(String(255), nullable=True)
    trieuChung2 = Column(String(255), nullable=True)
    trieuChung3 = Column(String(255), nullable=True)
    trieuChung4 = Column(String(255), nullable=True)
    
    moTaThem = Column(Text, nullable=True)
    ketQuaJSON = Column(JSON, nullable=True)
    ngayTraCuu = Column(DateTime, default=datetime.utcnow)