from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.plugin_api import router as plugin_router

app = FastAPI(title="LuanVanKTPM - Disease Risk Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(plugin_router)


@app.get("/")
def root():
    return {"message": "LuanVanKTPM Backend Running - Plugin Architecture v2.0"}