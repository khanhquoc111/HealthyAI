# backend/database/du_lieu_danh_gia_benh.py
from sqlalchemy import Column, BigInteger, String, DateTime, ForeignKey, Index, UniqueConstraint
from sqlalchemy.sql import func
from database.database import Base


class DuLieuDanhGiaBenh(Base):
    __tablename__ = "duLieuDanhGiaBenh"

    idDuLieuDanhGia = Column(BigInteger, primary_key=True, autoincrement=True)
    idNguoiDung     = Column(BigInteger, ForeignKey("nguoiDung.idNguoiDung", ondelete="CASCADE"), nullable=False)

    maBenh          = Column(String(100), nullable=False)   # vd: "cardiovascular", "diabetes"
    maTruong        = Column(String(100), nullable=False)   # vd: "systolic", "alcohol"
    giaTri          = Column(String(255), nullable=True)

    ngayTao         = Column(DateTime, server_default=func.now())
    ngayCapNhat     = Column(DateTime, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index("idx_benh", "maBenh"),
        UniqueConstraint("idNguoiDung", "maBenh", "maTruong", name="uk_user_benh_truong"),
    )