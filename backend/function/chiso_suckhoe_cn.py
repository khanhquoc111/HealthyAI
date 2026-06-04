# backend/function/chiso_suckhoe_cn.py
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

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
    
    # Thông tin nhân khẩu học
    tuoi: Optional[int] = None
    gioiTinh: Optional[str] = "Nam"
    chieuCao: Optional[float] = None
    canNang: Optional[float] = None
    bmi: Optional[float] = None
    vongEo: Optional[float] = None
    
    # Chỉ số huyết áp
    huyetApTamThu: Optional[float] = None
    huyetApTamTruong: Optional[float] = None
    
    # Thói quen sống
    hutThuoc: Optional[str] = "Không"
    uongRuouBia: Optional[str] = "Không"
    soPhutVanDongMoiTuan: Optional[int] = None
    mucDoAnMan: Optional[str] = "Vừa"
    
    # Tiền sử bệnh
    caoHuyetAp: Optional[bool] = False
    giaDinhCaoHuyetAp: Optional[bool] = False
    giaDinhTimMach: Optional[bool] = False
    tieuDuong: Optional[bool] = False           # Bản thân tiểu đường
    giaDinhTieuDuong: Optional[bool] = False    # Gia đình tiểu đường

    class Config:
        schema_extra = {
            "example": {
                "tenDangNhap": "user123",
                "tuoi": 45,
                "chieuCao": 170,
                "canNang": 75,
                "bmi": 25.95,
                "vongEo": 90,
                "huyetApTamThu": 135,
                "huyetApTamTruong": 85,
                "hutThuoc": "Đang hút",
                "tieuDuong": True,
                "giaDinhTieuDuong": False
            }
        }

@router.get("/{ten_dang_nhap}")
def get_health_profile(ten_dang_nhap: str, db: Session = Depends(get_db)):
    try:
        user = db.query(NguoiDung).filter(NguoiDung.tenDangNhap == ten_dang_nhap).first()
        if not user:
            raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")

        profile = db.query(CsSucKhoe).filter(CsSucKhoe.idNguoiDung == user.idNguoiDung).first()
        if not profile:
            return {"message": "Chưa có hồ sơ", "data": None}
        
        profile_dict = {k: v for k, v in profile.__dict__.items() 
                       if not k.startswith('_') and v is not None}
        
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

        if existing_profile:
            for key, value in profile_data.dict(exclude={"tenDangNhap"}).items():
                if value is not None:
                    setattr(existing_profile, key, value)
        else:
            new_profile = CsSucKhoe(
                idNguoiDung=user.idNguoiDung,
                **profile_data.dict(exclude={"tenDangNhap"})
            )
            db.add(new_profile)

        db.commit()
        return {"message": "Đã lưu chỉ số sức khỏe cá nhân thành công!", "status": "success"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi lưu hồ sơ: {str(e)}")