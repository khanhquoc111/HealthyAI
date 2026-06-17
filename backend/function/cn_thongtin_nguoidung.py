# backend/function/cn_thongtin_nguoidung.py
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Depends, File, UploadFile
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from typing import Optional

from database.database import SessionLocal
from database.nguoi_dung import NguoiDung
from database.thongtin_nd import ThongTinNguoiDung

router = APIRouter(prefix="/user-info", tags=["User Info"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

BASE_DIR = Path(__file__).resolve().parents[1]
AVATAR_DIR = BASE_DIR / "static" / "avatars"
AVATAR_DIR.mkdir(parents=True, exist_ok=True)
ALLOWED_AVATAR_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}
MAX_AVATAR_SIZE = 2 * 1024 * 1024


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


def get_or_create_extra(user: NguoiDung, db: Session) -> ThongTinNguoiDung:
    extra = db.query(ThongTinNguoiDung).filter(
        ThongTinNguoiDung.idNguoiDung == user.idNguoiDung
    ).first()

    if not extra:
        extra = ThongTinNguoiDung(idNguoiDung=user.idNguoiDung)
        db.add(extra)
        db.flush()

    return extra


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
        extra = get_or_create_extra(user, db)

        for k, v in update_data.items():
            setattr(extra, k, v)

    try:
        db.commit()
        return {"message": "Cap nhat thong tin thanh cong", "status": "success"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Loi luu du lieu: {str(e)}")


# ---------------------------------------------------------------------------
# POST /user-info/{ten_dang_nhap}/avatar
# Uploads avatar image from user's computer and stores its public URL
# ---------------------------------------------------------------------------

@router.post("/{ten_dang_nhap}/avatar")
async def upload_avatar(
    ten_dang_nhap: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    user = db.query(NguoiDung).filter(
        NguoiDung.tenDangNhap == ten_dang_nhap
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="Khong tim thay nguoi dung")

    extension = ALLOWED_AVATAR_TYPES.get(file.content_type or "")
    if not extension:
        raise HTTPException(
            status_code=400,
            detail="Chi ho tro anh JPG, PNG, WEBP hoac GIF",
        )

    content = await file.read()
    if len(content) > MAX_AVATAR_SIZE:
        raise HTTPException(
            status_code=400,
            detail="Anh dai dien khong duoc vuot qua 2MB",
        )

    filename = f"{user.idNguoiDung}_{uuid4().hex}{extension}"
    avatar_path = AVATAR_DIR / filename
    avatar_path.write_bytes(content)

    avatar_url = f"/static/avatars/{filename}"
    extra = get_or_create_extra(user, db)
    old_avatar = extra.anhDaiDien
    extra.anhDaiDien = avatar_url

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        if avatar_path.exists():
            avatar_path.unlink()
        raise HTTPException(status_code=500, detail=f"Loi luu anh dai dien: {str(e)}")

    if old_avatar and old_avatar.startswith("/static/avatars/"):
        old_path = BASE_DIR.joinpath(*old_avatar.lstrip("/").split("/"))
        if old_path.exists() and old_path != avatar_path:
            old_path.unlink()

    return {
        "message": "Tai anh dai dien thanh cong",
        "status": "success",
        "anhDaiDien": avatar_url,
    }


# ---------------------------------------------------------------------------
# POST /user-info/{ten_dang_nhap}/change-password
# Verifies current password then sets new hash
# ---------------------------------------------------------------------------

# backend/function/cn_thongtin_nguoidung.py

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

    # [BẢN VÁ]: Cắt mật khẩu hiện tại xuống 72 bytes để tránh ValueError của bcrypt
    safe_current = payload.currentPassword
    if len(safe_current.encode("utf-8")) > 72:
        safe_current = safe_current[:72]

    if not pwd_context.verify(safe_current, user.matKhauHash):
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