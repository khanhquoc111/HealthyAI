# backend/auth/dang_ky.py
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from passlib.context import CryptContext

from database.database import SessionLocal

# FIX: Cập nhật đường dẫn chuẩn xác tới thư mục database
from database.nguoi_dung import NguoiDung 

router = APIRouter(prefix="/auth", tags=["auth"])

# Cấu hình mã hóa mật khẩu
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Schema cập nhật thêm tenDangNhap và hoTen
class UserRegisterSchema(BaseModel):
    tenDangNhap: str
    email: EmailStr
    password: str
    hoTen: str = None

@router.post("/register")
def register(user: UserRegisterSchema, db: Session = Depends(get_db)):
    # 1. Kiểm tra email hoặc tên đăng nhập đã tồn tại chưa
    existing_user = db.query(NguoiDung).filter(
        (NguoiDung.email == user.email) | (NguoiDung.tenDangNhap == user.tenDangNhap)
    ).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Email hoặc Tên đăng nhập đã được sử dụng."
        )
    
    # 2. Mã hóa mật khẩu
    hashed_password = pwd_context.hash(user.password)
    
    # 3. Tạo record mới
    new_user = NguoiDung(
        tenDangNhap=user.tenDangNhap,
        email=user.email,
        matKhauHash=hashed_password,
        hoTen=user.hoTen
    )
    
    # 4. Lưu vào DB
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return {"message": "Đăng ký thành công", "email": new_user.email}