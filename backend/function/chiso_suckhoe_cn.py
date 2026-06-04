# backend/function/chiso_suckhoe_cn.py
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
from database.database import SessionLocal
from database.nguoi_dung import NguoiDung
from database.cs_suc_khoe import CsSucKhoe

router = APIRouter(prefix="/health-profile", tags=["Health Profile"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class HealthProfileSchema(BaseModel):
    tenDangNhap: str
    tuoi: Optional[int] = None
    gioiTinh: Optional[str] = "Nam"
    chieuCao: Optional[float] = None
    canNang: Optional[float] = None
    bmi: Optional[float] = None
    vongEo: Optional[float] = None
    huyetApTamThu: Optional[float] = None
    huyetApTamTruong: Optional[float] = None
    
    # Sinh hóa đồng bộ mở rộng
    duongHuyet: Optional[float] = None
    hba1c: Optional[float] = None
    cholesterol: Optional[float] = None
    ldl: Optional[float] = None
    hdl: Optional[float] = None
    triglyceride: Optional[float] = None
    creatinine: Optional[float] = None
    acidUric: Optional[float] = None
    
    hutThuoc: Optional[str] = "Không"
    uongRuouBia: Optional[str] = "Không"
    soPhutVanDongMoiTuan: Optional[int] = None
    mucDoAnMan: Optional[str] = "Vừa"
    
    caoHuyetAp: Optional[bool] = False
    tieuDuong: Optional[bool] = False
    benhTimMach: Optional[bool] = False
    gout: Optional[bool] = False
    
    giaDinhCaoHuyetAp: Optional[bool] = False
    giaDinhTieuDuong: Optional[bool] = False
    giaDinhTimMach: Optional[bool] = False
    giaDinhGout: Optional[bool] = False

@router.get("/{ten_dang_nhap}")
def get_health_profile(ten_dang_nhap: str, db: Session = Depends(get_db)):
    try:
        user = db.query(NguoiDung).filter(NguoiDung.tenDangNhap == ten_dang_nhap).first()
        if not user:
            raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
        profile = db.query(CsSucKhoe).filter(CsSucKhoe.idNguoiDung == user.idNguoiDung).first()
        if not profile:
            return {"message": "Chưa có hồ sơ", "data": None}
        profile_dict = {k: v for k, v in profile.__dict__.items() if not k.startswith('_') and v is not None}
        return {"message": "Thành công", "data": profile_dict}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi lấy hồ sơ: {str(e)}")

@router.post("/")
def upsert_health_profile(profile_data: HealthProfileSchema, db: Session = Depends(get_db)):
    try:
        user = db.query(NguoiDung).filter(NguoiDung.tenDangNhap == profile_data.tenDangNhap).first()
        if not user:
            raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
        existing_profile = db.query(CsSucKhoe).filter(CsSucKhoe.idNguoiDung == user.idNguoiDung).first()
        
        # Chuyển đổi dữ liệu, loại bỏ key định danh
        update_data = profile_data.dict(exclude={"tenDangNhap"})
        if existing_profile:
            for key, value in update_data.items():
                if value is not None:
                    setattr(existing_profile, key, value)
        else:
            new_profile = CsSucKhoe(idNguoiDung=user.idNguoiDung, **update_data)
            db.add(new_profile)
        db.commit()
        return {"message": "Đã lưu chỉ số sức khỏe cá nhân thành công!", "status": "success"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi lưu hồ sơ: {str(e)}")