# backend/function/chiso_suckhoe_cn.py
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
from database.database import SessionLocal
from database.nguoi_dung import NguoiDung
from database.hs_suckhoe import HoSoSucKhoe
from database.cs_suckhoe import ChiSoSucKhoe

router = APIRouter(prefix="/health-profile", tags=["Health Profile"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Tập hợp cột cứng thuộc bảng hoSoSucKhoe
HO_SO_COLS = {
    "tuoi", "gioiTinh", "chieuCao", "canNang", "bmi", "vongEo",
    "huyetApTamThu", "huyetApTamTruong", "hutThuoc", "uongRuouBia",
    "soPhutVanDongMoiTuan",
}

# Các field EAV cần ép kiểu khi đọc về
BOOLEAN_FIELDS = {
    "caoHuyetAp", "tieuDuong", "benhTimMach", "gout",
    "giaDinhCaoHuyetAp", "giaDinhTieuDuong", "giaDinhTimMach", "giaDinhGout",
}
NUMBER_FIELDS = {
    "duongHuyet", "hba1c", "cholesterol", "ldl", "hdl",
    "triglyceride", "creatinine", "acidUric", "mucDoAnMan",
}


class HealthProfileSchema(BaseModel):
    tenDangNhap: str

    # Cột cứng — hoSoSucKhoe
    tuoi: Optional[int] = None
    gioiTinh: Optional[str] = None
    chieuCao: Optional[float] = None
    canNang: Optional[float] = None
    bmi: Optional[float] = None
    vongEo: Optional[float] = None
    huyetApTamThu: Optional[float] = None
    huyetApTamTruong: Optional[float] = None
    hutThuoc: Optional[str] = None
    uongRuouBia: Optional[str] = None
    soPhutVanDongMoiTuan: Optional[int] = None

    # EAV — chiSoSucKhoe
    duongHuyet: Optional[float] = None
    hba1c: Optional[float] = None
    cholesterol: Optional[float] = None
    ldl: Optional[float] = None
    hdl: Optional[float] = None
    triglyceride: Optional[float] = None
    creatinine: Optional[float] = None
    acidUric: Optional[float] = None
    mucDoAnMan: Optional[str] = None
    caoHuyetAp: Optional[bool] = None
    tieuDuong: Optional[bool] = None
    benhTimMach: Optional[bool] = None
    gout: Optional[bool] = None
    giaDinhCaoHuyetAp: Optional[bool] = None
    giaDinhTieuDuong: Optional[bool] = None
    giaDinhTimMach: Optional[bool] = None
    giaDinhGout: Optional[bool] = None


@router.get("/{ten_dang_nhap}")
def get_health_profile(ten_dang_nhap: str, db: Session = Depends(get_db)):
    try:
        user = db.query(NguoiDung).filter(NguoiDung.tenDangNhap == ten_dang_nhap).first()
        if not user:
            raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")

        hoso = db.query(HoSoSucKhoe).filter(HoSoSucKhoe.idNguoiDung == user.idNguoiDung).first()
        chisos = db.query(ChiSoSucKhoe).filter(ChiSoSucKhoe.idNguoiDung == user.idNguoiDung).all()

        if not hoso and not chisos:
            return {"message": "Chưa có hồ sơ", "data": None}

        profile_dict = {}

        # Đọc cột cứng từ hoSoSucKhoe
        if hoso:
            for k, v in hoso.__dict__.items():
                if not k.startswith("_") and v is not None:
                    profile_dict[k] = v

        # Đọc EAV từ chiSoSucKhoe, ép kiểu
        for cs in chisos:
            if cs.giaTri is None:
                continue
            if cs.maChiSo in BOOLEAN_FIELDS:
                profile_dict[cs.maChiSo] = cs.giaTri.lower() in ("true", "1", "yes", "có")
            elif cs.maChiSo in NUMBER_FIELDS:
                try:
                    profile_dict[cs.maChiSo] = float(cs.giaTri)
                except ValueError:
                    profile_dict[cs.maChiSo] = cs.giaTri
            else:
                profile_dict[cs.maChiSo] = cs.giaTri

        return {"message": "Thành công", "data": profile_dict}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi lấy hồ sơ: {str(e)}")


@router.post("/")
def upsert_health_profile(profile_data: HealthProfileSchema, db: Session = Depends(get_db)):
    try:
        user = db.query(NguoiDung).filter(NguoiDung.tenDangNhap == profile_data.tenDangNhap).first()
        if not user:
            raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")

        # Chỉ lấy các field được gửi lên (exclude_unset tránh ghi đè bằng None)
        update_data = profile_data.dict(exclude={"tenDangNhap"}, exclude_unset=True)

        hoso_updates = {}
        chiso_updates = {}

        for key, value in update_data.items():
            if key in HO_SO_COLS:
                hoso_updates[key] = value
            else:
                chiso_updates[key] = value

        # === Lưu hoSoSucKhoe ===
        if hoso_updates:
            existing = db.query(HoSoSucKhoe).filter(HoSoSucKhoe.idNguoiDung == user.idNguoiDung).first()
            if existing:
                for k, v in hoso_updates.items():
                    setattr(existing, k, v)
            else:
                db.add(HoSoSucKhoe(idNguoiDung=user.idNguoiDung, **hoso_updates))

        # === Lưu chiSoSucKhoe (EAV) ===
        for key, value in chiso_updates.items():
            existing = db.query(ChiSoSucKhoe).filter(
                ChiSoSucKhoe.idNguoiDung == user.idNguoiDung,
                ChiSoSucKhoe.maChiSo == key,
            ).first()

            if value is None or value == "":
                # Xóa hàng nếu người dùng xóa dữ liệu
                if existing:
                    db.delete(existing)
            else:
                str_value = ("true" if value else "false") if isinstance(value, bool) else str(value)
                if existing:
                    existing.giaTri = str_value
                else:
                    db.add(ChiSoSucKhoe(idNguoiDung=user.idNguoiDung, maChiSo=key, giaTri=str_value))

        db.commit()
        return {"message": "Đã lưu chỉ số sức khỏe cá nhân thành công!", "status": "success"}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi lưu hồ sơ: {str(e)}")