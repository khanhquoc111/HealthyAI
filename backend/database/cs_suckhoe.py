# backend/database/cs_suckhoe.py
from sqlalchemy import Column, BigInteger, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from database.database import Base


class ChiSoSucKhoe(Base):
    __tablename__ = "chiSoSucKhoe"

    idChiSo     = Column(BigInteger, primary_key=True, autoincrement=True)
    idNguoiDung = Column(BigInteger, ForeignKey("nguoiDung.idNguoiDung", ondelete="CASCADE"), nullable=False)

    maChiSo     = Column(String(100), nullable=False)   # vd: "duongHuyet", "hba1c", "cholesterol"
    giaTri      = Column(String(255), nullable=True)    # luôn lưu dạng string, ép kiểu khi đọc

    ngayTao     = Column(DateTime, server_default=func.now())
    ngayCapNhat = Column(DateTime, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("idNguoiDung", "maChiSo", name="uk_user_chiso"),
    )