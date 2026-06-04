from sqlalchemy import Column
from sqlalchemy import BigInteger
from sqlalchemy import Integer
from sqlalchemy import Float
from sqlalchemy import String
from sqlalchemy import ForeignKey

from database.database import Base


class HsSucKhoe(Base):
    __tablename__ = "hsSucKhoe"

    idHoSoSucKhoe = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True
    )

    idNguoiDung = Column(
        BigInteger,
        ForeignKey("nguoiDung.idNguoiDung"),
        unique=True,
        nullable=False
    )

    tuoi = Column(Integer)

    gioiTinh = Column(String(20))

    chieuCao = Column(Float)
    canNang = Column(Float)
    bmi = Column(Float)

    vongEo = Column(Float)

    hutThuoc = Column(String(50))
    uongRuouBia = Column(String(50))

    soPhutVanDongMoiTuan = Column(Integer)

    huyetApTamThu = Column(Float)
    huyetApTamTruong = Column(Float)