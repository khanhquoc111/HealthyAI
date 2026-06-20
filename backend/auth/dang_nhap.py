# backend/auth/dang_nhap.py
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from passlib.context import CryptContext

from database.database import SessionLocal
from database.nguoi_dung import NguoiDung
from database.thongtin_nd import ThongTinNguoiDung

router = APIRouter(prefix="/auth", tags=["auth"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class UserLoginSchema(BaseModel):
    tenDangNhap: str
    password: str

@router.post("/login")
def login(user: UserLoginSchema, db: Session = Depends(get_db)):
    # 1. Tìm user theo tên đăng nhập
    db_user = db.query(NguoiDung).filter(NguoiDung.tenDangNhap == user.tenDangNhap).first()
    
    # 2. Kiểm tra user có tồn tại và password có khớp không
    if not db_user or not pwd_context.verify(user.password, db_user.matKhauHash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Tên đăng nhập hoặc mật khẩu không chính xác."
        )
    
    # 3. Trả về thông tin bổ sung
    extra = db.query(ThongTinNguoiDung).filter(
        ThongTinNguoiDung.idNguoiDung == db_user.idNguoiDung
    ).first()

    # --- LOGIC MỚI: KIỂM TRA TÀI KHOẢN BÁC SĨ ---
    danh_sach_bac_si = ["bacsi01bv", "bacsi02bv", "bacsi03bv"]
    
    # Xác định đường dẫn điều hướng dựa trên tên đăng nhập
    if db_user.tenDangNhap in danh_sach_bac_si:
        redirect_url = "/bs-quan-ly-chung"
    else:
        redirect_url = "/" # Đường dẫn mặc định cho user thường

    # Trả về thông tin (kèm tenDangNhap thay vì email)
    return {
        "access_token": f"fake-token-for-{db_user.tenDangNhap}",
        "token_type": "bearer",
        "tenDangNhap": db_user.tenDangNhap,
        "hoTen": db_user.hoTen,
        "anhDaiDien": extra.anhDaiDien if extra else None,
        "is_doctor": db_user.tenDangNhap in danh_sach_bac_si, # Cờ đánh dấu tài khoản bác sĩ
        "redirect_to": redirect_url # Đường dẫn frontend cần chuyển tới
    }