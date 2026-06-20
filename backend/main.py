# backend/main.py
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# Import router từ thư mục app, auth, và function nằm cùng cấp
from app.plugin_api import router as plugin_router
from auth.dang_ky import router as register_router
from auth.dang_nhap import router as login_router
from function.cn_hs_suckhoe import router as health_router
from function.cn_lichsu_trabenh import router as history_router
from function.cn_tra_thuoc import router as medicine_router
from function.cn_thongtin_nguoidung import router as user_info_router 
from function.cn_tra_cuu_trieu_chung import router as trieu_chung_router # <-- [THÊM DÒNG NÀY] Import API Thông Tin Người Dùng
from function.cn_lichsu_trabenh import router as lich_su_trabenh_router # <-- [THÊM DÒNG NÀY] Import API Lịch Sử Tra Bệnh 
from knowledge.knowledge_api import router as knowledge_router

app = FastAPI(title="LuanVanKTPM - Disease Risk Engine")

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
STATIC_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Cho phép frontend gọi API 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Đăng ký toàn bộ các tuyến đường API
app.include_router(plugin_router)
app.include_router(register_router)
app.include_router(login_router)
app.include_router(health_router)  # <-- [THÊM DÒNG NÀY] Khai báo để FastAPI nhận diện router mới
app.include_router(history_router)
app.include_router(medicine_router)  # <-- [THÊM DÒNG NÀY] Khai báo để FastAPI nhận diện router mới
app.include_router(user_info_router)  # <-- [THÊM DÒNG NÀY] Khai báo để FastAPI nhận diện router mới
app.include_router(trieu_chung_router)  # <-- [THÊM DÒNG NÀY] Khai báo để FastAPI nhận diện router mới
app.include_router(lich_su_trabenh_router)  # <-- [THÊM DÒNG NÀY] Khai báo để FastAPI nhận diện router mới
app.include_router(knowledge_router)  # <-- [THÊM DÒNG NÀY] Khai báo để FastAPI nhận diện router mới

@app.get("/")
def root():
    return {"message": "LuanVanKTPM Backend Running - Thư mục gốc độc lập"}
