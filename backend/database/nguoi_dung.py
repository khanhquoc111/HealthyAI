from sqlalchemy import Column
from sqlalchemy import BigInteger
from sqlalchemy import String
from sqlalchemy import DateTime
from sqlalchemy.sql import func

from database.database import Base


class NguoiDung(Base):
    __tablename__ = "nguoiDung"

    idNguoiDung = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True
    )

    tenDangNhap = Column(
        String(100),
        unique=True,
        nullable=False
    )

    email = Column(
        String(255),
        unique=True,
        nullable=False
    )

    matKhauHash = Column(
        String(255),
        nullable=False
    )

    hoTen = Column(String(255))

    ngayTao = Column(
        DateTime,
        server_default=func.now()
    )

    ngayCapNhat = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now()
    )