# backend/migrate_db.py
from database.database import Base, engine
from database.nguoi_dung import NguoiDung      # thêm dòng này
from database.hs_suckhoe import HoSoSucKhoe
from database.cs_suckhoe import ChiSoSucKhoe

Base.metadata.create_all(bind=engine, tables=[
    HoSoSucKhoe.__table__,
    ChiSoSucKhoe.__table__,
])
print("✅ Tạo bảng hoSoSucKhoe và chiSoSucKhoe thành công")