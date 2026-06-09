# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import router từ thư mục app, auth, và function nằm cùng cấp
from app.plugin_api import router as plugin_router
from auth.dang_ky import router as register_router
from auth.dang_nhap import router as login_router
from function.cn_hs_suckhoe import router as health_router  # <-- [THÊM DÒNG NÀY] Import API Chỉ Số Sức Khỏe

app = FastAPI(title="LuanVanKTPM - Disease Risk Engine")

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

@app.get("/")
def root():
    return {"message": "LuanVanKTPM Backend Running - Thư mục gốc độc lập"}