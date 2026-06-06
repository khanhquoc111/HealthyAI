from sqlalchemy import Column, BigInteger, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database.database import Base

class ChiSoSucKhoe(Base):
    __tablename__ = "chiSoSucKhoe"

    idChiSo = Column(BigInteger, primary_key=True, autoincrement=True)
    idNguoiDung = Column(BigInteger, ForeignKey("nguoiDung.idNguoiDung", ondelete="CASCADE"), nullable=False)
    
    maChiSo = Column(String(100), nullable=False)
    giaTri = Column(String(255))

    ngayTao = Column(DateTime, server_default=func.now())
    ngayCapNhat = Column(DateTime, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint('idNguoiDung', 'maChiSo', name='uk_user_chiso'),
    )

    nguoi_dung = relationship("NguoiDung", back_populates="chi_so_suc_khoe")