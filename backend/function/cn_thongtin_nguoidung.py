# backend/function/cn_thongtin_nguoidung.py
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from typing import Optional

from database.database import SessionLocal
from database.nguoi_dung import NguoiDung
from database.thongtin_nd import ThongTinNguoiDung

router = APIRouter(prefix="/user-info", tags=["User Info"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Pydantic Schemas
# ---------------------------------------------------------------------------

class UserInfoResponse(BaseModel):
    # From nguoiDung
    tenDangNhap: str
    email: str
    hoTen: Optional[str] = None

    # From thongTinNguoiDung
    soDienThoai: Optional[str] = None
    diaChi: Optional[str] = None
    tinhThanh: Optional[str] = None
    quanHuyen: Optional[str] = None
    ngheNghiep: Optional[str] = None
    anhDaiDien: Optional[str] = None


class UpdateProfileSchema(BaseModel):
    """Fields that can be freely updated (no password, no username)."""
    hoTen: Optional[str] = None
    email: Optional[EmailStr] = None
    soDienThoai: Optional[str] = None
    diaChi: Optional[str] = None
    tinhThanh: Optional[str] = None
    quanHuyen: Optional[str] = None
    ngheNghiep: Optional[str] = None
    anhDaiDien: Optional[str] = None


class ChangePasswordSchema(BaseModel):
    currentPassword: str
    newPassword: str


# ---------------------------------------------------------------------------
# GET  /user-info/{ten_dang_nhap}
# Returns merged data from nguoiDung + thongTinNguoiDung
# ---------------------------------------------------------------------------

@router.get("/{ten_dang_nhap}", response_model=UserInfoResponse)
def get_user_info(ten_dang_nhap: str, db: Session = Depends(get_db)):
    user = db.query(NguoiDung).filter(
        NguoiDung.tenDangNhap == ten_dang_nhap
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="Khong tim thay nguoi dung")

    extra = db.query(ThongTinNguoiDung).filter(
        ThongTinNguoiDung.idNguoiDung == user.idNguoiDung
    ).first()

    return UserInfoResponse(
        tenDangNhap=user.tenDangNhap,
        email=user.email,
        hoTen=user.hoTen,
        soDienThoai=extra.soDienThoai if extra else None,
        diaChi=extra.diaChi if extra else None,
        tinhThanh=extra.tinhThanh if extra else None,
        quanHuyen=extra.quanHuyen if extra else None,
        ngheNghiep=extra.ngheNghiep if extra else None,
        anhDaiDien=extra.anhDaiDien if extra else None,
    )


# ---------------------------------------------------------------------------
# PUT  /user-info/{ten_dang_nhap}
# Upserts nguoiDung (hoTen, email) and thongTinNguoiDung (all extra fields)
# ---------------------------------------------------------------------------

@router.put("/{ten_dang_nhap}")
def update_user_info(
    ten_dang_nhap: str,
    payload: UpdateProfileSchema,
    db: Session = Depends(get_db),
):
    user = db.query(NguoiDung).filter(
        NguoiDung.tenDangNhap == ten_dang_nhap
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="Khong tim thay nguoi dung")

    update_data = payload.dict(exclude_unset=True)

    # ── 1. Fields that belong to nguoiDung ──────────────────────────────────
    nguoi_dung_fields = {"hoTen", "email"}

    for field in nguoi_dung_fields:
        if field in update_data:
            value = update_data.pop(field)

            # Check email uniqueness before writing
            if field == "email" and value != user.email:
                conflict = db.query(NguoiDung).filter(
                    NguoiDung.email == value,
                    NguoiDung.idNguoiDung != user.idNguoiDung,
                ).first()
                if conflict:
                    raise HTTPException(
                        status_code=400,
                        detail="Email da duoc su dung boi tai khoan khac",
                    )

            setattr(user, field, value)

    # ── 2. Remaining fields → thongTinNguoiDung (upsert) ────────────────────
    if update_data:
        extra = db.query(ThongTinNguoiDung).filter(
            ThongTinNguoiDung.idNguoiDung == user.idNguoiDung
        ).first()

        if extra:
            for k, v in update_data.items():
                setattr(extra, k, v)
        else:
            db.add(ThongTinNguoiDung(idNguoiDung=user.idNguoiDung, **update_data))

    try:
        db.commit()
        return {"message": "Cap nhat thong tin thanh cong", "status": "success"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Loi luu du lieu: {str(e)}")


# ---------------------------------------------------------------------------
# POST /user-info/{ten_dang_nhap}/change-password
# Verifies current password then sets new hash
# ---------------------------------------------------------------------------

@router.post("/{ten_dang_nhap}/change-password")
def change_password(
    ten_dang_nhap: str,
    payload: ChangePasswordSchema,
    db: Session = Depends(get_db),
):
    user = db.query(NguoiDung).filter(
        NguoiDung.tenDangNhap == ten_dang_nhap
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="Khong tim thay nguoi dung")

    if not pwd_context.verify(payload.currentPassword, user.matKhauHash):
        raise HTTPException(status_code=400, detail="Mat khau hien tai khong chinh xac")

    safe_new = payload.newPassword
    if len(safe_new.encode("utf-8")) > 72:
        safe_new = safe_new[:72]

    user.matKhauHash = pwd_context.hash(safe_new)

    try:
        db.commit()
        return {"message": "Doi mat khau thanh cong", "status": "success"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Loi luu mat khau: {str(e)}")