from sqlalchemy import (
    Column,
    BigInteger,
    String,
    Text,
    Float,
    DateTime,
    ForeignKey
)
from sqlalchemy.sql import func
from database.database import Base


class CanhBaoThuoc(Base):
    __tablename__ = "canhBaoThuoc"

    idCanhBao = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True
    )

    idThuoc = Column(
        BigInteger,
        ForeignKey(
            "thuoc.idThuoc",
            ondelete="CASCADE"
        ),
        nullable=False
    )

    maChiSo = Column(
        String(100),
        nullable=False
    )

    toanTu = Column(
        String(10)
    )

    nguong = Column(
        Float
    )

    thongDiepCanhBao = Column(
        Text
    )

    ngayTao = Column(
        DateTime,
        server_default=func.now()
    )