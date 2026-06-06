# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="LuanVanKTPM - Healthy AI",
    version="2.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import routers
try:
    from app.plugin_api import router as plugin_router
    from function.cn_hs_suckhoe import router as health_router
    from auth.dang_ky import router as register_router
    from auth.dang_nhap import router as login_router

    app.include_router(plugin_router)
    app.include_router(health_router)
    app.include_router(register_router)
    app.include_router(login_router)

    logger.info("✅ All routers loaded successfully")
except Exception as e:
    logger.error(f"❌ Error loading routers: {e}")
    raise

@app.get("/")
def root():
    return {"message": "Healthy AI Backend is running", "status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)