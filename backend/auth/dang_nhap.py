# backend/auth/dang_nhap.py
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from passlib.context import CryptContext

from database.database import SessionLocal
from database.nguoi_dung import NguoiDung

router = APIRouter(prefix="/auth", tags=["auth"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Đổi email thành tenDangNhap
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
    
    # 3. Trả về thông tin (kèm tenDangNhap thay vì email)
    return {
        "access_token": f"fake-token-for-{db_user.tenDangNhap}",
        "token_type": "bearer",
        "tenDangNhap": db_user.tenDangNhap,
        "hoTen": db_user.hoTen
    }