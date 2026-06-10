# backend/function/cn_tra_thuoc.py
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
import pandas as pd
import logging
import re
from pathlib import Path

from database.database import SessionLocal
from database.nguoi_dung import NguoiDung
from database.hs_suckhoe import HoSoSucKhoe
from database.cs_suckhoe import ChiSoSucKhoe
from app.condition_evaluator import ConditionEvaluator

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/medicines", tags=["Tra Cuu Thuoc"])

# ---------------------------------------------------------------------------
# Duong dan file CSV
# CSV columns: Medicine Name | Composition | Uses | Side_effects | Image URL
#              Manufacturer  | Excellent Review % | Average Review % | Poor Review % | Ingredients_List
# ---------------------------------------------------------------------------

_CSV_PATH = Path(__file__).parent.parent / "data" / "medicine_details.csv"

_medicine_df: Optional[pd.DataFrame] = None


def _load_medicines() -> pd.DataFrame:
    """Tai va cache DataFrame thuoc tu CSV. Goi 1 lan duy nhat."""
    global _medicine_df
    if _medicine_df is None:
        if not _CSV_PATH.exists():
            logger.error("medicine_details.csv khong tim thay tai %s", _CSV_PATH)
            _medicine_df = pd.DataFrame()
        else:
            _medicine_df = pd.read_csv(_CSV_PATH, encoding="utf-8")
            _medicine_df.columns = [c.strip() for c in _medicine_df.columns]
            logger.info("Da tai %d thuoc tu %s", len(_medicine_df), _CSV_PATH)
    return _medicine_df


# ---------------------------------------------------------------------------
# DB session
# ---------------------------------------------------------------------------

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Doc ho so suc khoe nguoi dung
# ---------------------------------------------------------------------------

BOOLEAN_FIELDS = {
    "caoHuyetAp", "tieuDuong", "benhTimMach", "gout",
    "giaDinhCaoHuyetAp", "giaDinhTieuDuong", "giaDinhTimMach", "giaDinhGout",
}

NUMBER_FIELDS = {
    "duongHuyet", "hba1c", "cholesterol", "ldl", "hdl",
    "triglyceride", "creatinine", "acidUric",
}


def _load_user_profile(ten_dang_nhap: str, db: Session) -> Optional[Dict[str, Any]]:
    """Tra ve dict phang ho so suc khoe. None neu khong tim thay user."""
    user = db.query(NguoiDung).filter(
        NguoiDung.tenDangNhap == ten_dang_nhap
    ).first()

    if not user:
        return None

    hoso = db.query(HoSoSucKhoe).filter(
        HoSoSucKhoe.idNguoiDung == user.idNguoiDung
    ).first()

    chisos = db.query(ChiSoSucKhoe).filter(
        ChiSoSucKhoe.idNguoiDung == user.idNguoiDung
    ).all()

    profile: Dict[str, Any] = {}

    if hoso:
        for k, v in hoso.__dict__.items():
            if not k.startswith("_") and v is not None:
                profile[k] = v

    for cs in chisos:
        if cs.giaTri is None:
            continue
        if cs.maChiSo in BOOLEAN_FIELDS:
            profile[cs.maChiSo] = cs.giaTri.lower() in ("true", "1", "yes")
        elif cs.maChiSo in NUMBER_FIELDS:
            try:
                profile[cs.maChiSo] = float(cs.giaTri)
            except ValueError:
                profile[cs.maChiSo] = cs.giaTri
        else:
            profile[cs.maChiSo] = cs.giaTri

    return profile


# ---------------------------------------------------------------------------
# Bo quy tac canh bao y te (Rule-based)
#
# Moi rule:
#   id        – dinh danh duy nhat
#   label     – ten hien thi ngan gon
#   message   – noi dung canh bao day du, co dau tieng Viet
#   severity  – "danger" | "warning" | "info"
#   condition – dieu kien tuong thich ConditionEvaluator
#
# Operators duoc ho tro: gte, gt, lte, lt, eq, neq,
#                        bool_true, bool_false, in, range
# ---------------------------------------------------------------------------

MEDICINE_WARNING_RULES: List[Dict[str, Any]] = [

    # ── Tieu duong ─────────────────────────────────────────────────────────
    {
        "id": "high_glucose",
        "label": "Đường huyết cao",
        "message": (
            "Chỉ số đường huyết của bạn đang ở mức cao (≥ 126 mg/dL). "
            "Một số thuốc có thể ảnh hưởng đến kiểm soát đường huyết "
            "(corticosteroid, thuốc lợi tiểu thiazide). "
            "Tham khảo bác sĩ hoặc dược sĩ trước khi sử dụng thuốc mới."
        ),
        "severity": "danger",
        "condition": {"field": "duongHuyet", "op": "gte", "value": 126},
    },
    {
        "id": "diabetes_diagnosed",
        "label": "Bệnh tiểu đường",
        "message": (
            "Bạn đã được chẩn đoán mắc tiểu đường. "
            "Một số thuốc (corticosteroid, thuốc lợi tiểu) có thể làm tăng đường huyết. "
            "Luôn kiểm tra đường huyết khi bắt đầu dùng thuốc mới."
        ),
        "severity": "danger",
        "condition": {"field": "tieuDuong", "op": "bool_true"},
    },
    {
        "id": "elevated_hba1c",
        "label": "HbA1c cao",
        "message": (
            "Chỉ số HbA1c ≥ 6.5% cho thấy đường huyết trung bình đang ở mức cao. "
            "Cẩn thận với các thuốc có thể gây tăng đường huyết như corticosteroid."
        ),
        "severity": "warning",
        "condition": {"field": "hba1c", "op": "gte", "value": 6.5},
    },

    # ── Huyet ap ───────────────────────────────────────────────────────────
    {
        "id": "hypertension_stage2",
        "label": "Huyết áp cao độ 2",
        "message": (
            "Huyết áp tâm thu của bạn ≥ 140 mmHg (cao huyết áp độ 2). "
            "Tránh dùng thuốc kháng viêm NSAIDs (ibuprofen, naproxen) và thuốc giảm cân "
            "có thể làm tăng huyết áp. Cần theo dõi thường xuyên cùng bác sĩ."
        ),
        "severity": "danger",
        "condition": {"field": "huyetApTamThu", "op": "gte", "value": 140},
    },
    {
        "id": "hypertension_stage1",
        "label": "Huyết áp cao độ 1",
        "message": (
            "Huyết áp tâm thu của bạn trong khoảng 130–139 mmHg (cao huyết áp độ 1). "
            "Một số thuốc có thể làm tăng huyết áp nhẹ (NSAIDs, thuốc giải cảm chứa pseudoephedrine). "
            "Theo dõi huyết áp thường xuyên khi bắt đầu thuốc mới."
        ),
        "severity": "warning",
        "condition": {
            "field": "huyetApTamThu",
            "op": "range",
            "min": 130,
            "max": 139,
        },
    },
    {
        "id": "hypertension_diagnosed",
        "label": "Cao huyết áp (đã chẩn đoán)",
        "message": (
            "Bạn đã được chẩn đoán cao huyết áp. "
            "Tránh dùng NSAIDs kéo dài, thuốc có chứa ma hoàng (pseudoephedrine), "
            "và kiểm tra tương tác thuốc nếu đang dùng thuốc hạ áp."
        ),
        "severity": "warning",
        "condition": {"field": "caoHuyetAp", "op": "bool_true"},
    },

    # ── Than ───────────────────────────────────────────────────────────────
    {
        "id": "high_creatinine",
        "label": "Creatinine cao (nguy cơ suy thận)",
        "message": (
            "Creatinine ≥ 1.3 mg/dL gợi ý chức năng thận có thể bị suy giảm. "
            "Nhiều loại thuốc được thải qua thận (metformin, một số kháng sinh, NSAIDs). "
            "Lưu ý liều dùng và tham khảo ý kiến bác sĩ."
        ),
        "severity": "danger",
        "condition": {"field": "creatinine", "op": "gte", "value": 1.3},
    },

    # ── Tim mach ───────────────────────────────────────────────────────────
    {
        "id": "high_ldl",
        "label": "LDL cao",
        "message": (
            "LDL ≥ 160 mg/dL cho thấy mỡ máu cao. "
            "Một số thuốc (corticosteroid, isotretinoin, thuốc tránh thai) "
            "có thể làm tăng LDL. Nên kiểm tra lipid máu định kỳ."
        ),
        "severity": "warning",
        "condition": {"field": "ldl", "op": "gte", "value": 160},
    },
    {
        "id": "low_hdl",
        "label": "HDL thấp",
        "message": (
            "HDL < 40 mg/dL là yếu tố nguy cơ tim mạch. "
            "Một số loại thuốc có thể làm giảm HDL thêm. "
            "Nên thảo luận với bác sĩ trước khi dùng thêm thuốc."
        ),
        "severity": "info",
        "condition": {"field": "hdl", "op": "lt", "value": 40},
    },
    {
        "id": "heart_disease_diagnosed",
        "label": "Bệnh tim mạch (đã chẩn đoán)",
        "message": (
            "Bạn đã được chẩn đoán bệnh tim mạch. "
            "Tránh dùng NSAIDs (tăng nguy cơ biến cố tim mạch). "
            "Kiểm tra tương tác thuốc nếu đang dùng aspirin, thuốc chống đông máu."
        ),
        "severity": "danger",
        "condition": {"field": "benhTimMach", "op": "bool_true"},
    },
    {
        "id": "high_triglyceride",
        "label": "Triglyceride cao",
        "message": (
            "Triglyceride ≥ 200 mg/dL. "
            "Một số thuốc như corticosteroid, thuốc tránh thai nội tiết, "
            "thuốc hạ huyết áp beta-blocker có thể làm tăng triglyceride."
        ),
        "severity": "warning",
        "condition": {"field": "triglyceride", "op": "gte", "value": 200},
    },

    # ── Gout ───────────────────────────────────────────────────────────────
    {
        "id": "high_uric_acid",
        "label": "Acid uric cao",
        "message": (
            "Acid uric ≥ 7.0 mg/dL. "
            "Một số thuốc lợi tiểu (thiazide, furosemide) và aspirin liều thấp "
            "có thể làm tăng acid uric. Theo dõi nếu có triệu chứng đau khớp."
        ),
        "severity": "warning",
        "condition": {"field": "acidUric", "op": "gte", "value": 7.0},
    },
    {
        "id": "gout_diagnosed",
        "label": "Bệnh Gout (đã chẩn đoán)",
        "message": (
            "Bạn đã được chẩn đoán bệnh Gout. "
            "Tránh dùng aspirin liều thấp, thuốc lợi tiểu nhóm thiazide. "
            "Uống nhiều nước khi sử dụng kháng sinh hoặc thuốc có thể ảnh hưởng đến acid uric."
        ),
        "severity": "warning",
        "condition": {"field": "gout", "op": "bool_true"},
    },

    # ── Loi song ───────────────────────────────────────────────────────────
    {
        "id": "current_smoker",
        "label": "Đang hút thuốc lá",
        "message": (
            "Bạn đang hút thuốc lá. Nicotine ảnh hưởng đến hấp thu và tác dụng "
            "của nhiều loại thuốc (thuốc chống đông, estrogen, một số thuốc tâm thần). "
            "Thông báo cho bác sĩ hoặc dược sĩ biết tình trạng hút thuốc."
        ),
        "severity": "info",
        "condition": {"field": "hutThuoc", "op": "eq", "value": "Đang hút"},
    },
    {
        "id": "frequent_alcohol",
        "label": "Uống rượu bia thường xuyên",
        "message": (
            "Uống rượu bia thường xuyên làm tăng nguy cơ tương tác thuốc nghiêm trọng "
            "(đặc biệt với paracetamol, metronidazole, warfarin, thuốc an thần). "
            "Tránh uống rượu khi đang dùng thuốc."
        ),
        "severity": "danger",
        "condition": {"field": "uongRuouBia", "op": "eq", "value": "Thường xuyên"},
    },

    # ── BMI ────────────────────────────────────────────────────────────────
    {
        "id": "obesity",
        "label": "Béo phì (BMI ≥ 30)",
        "message": (
            "BMI ≥ 30 (béo phì). "
            "Liều dùng một số thuốc cần hiệu chỉnh theo cân nặng. "
            "Trao đổi với bác sĩ hoặc dược sĩ về liều dùng phù hợp."
        ),
        "severity": "info",
        "condition": {"field": "bmi", "op": "gte", "value": 30},
    },

    # ── Tuoi ───────────────────────────────────────────────────────────────
    {
        "id": "elderly",
        "label": "Người cao tuổi (≥ 65)",
        "message": (
            "Người cao tuổi (≥ 65 tuổi) có nguy cơ tác dụng phụ cao hơn. "
            "Chức năng thận và gan có thể suy giảm, ảnh hưởng đến chuyển hóa thuốc. "
            "Nên bắt đầu với liều thấp và theo dõi chặt chẽ."
        ),
        "severity": "info",
        "condition": {"field": "tuoi", "op": "gte", "value": 65},
    },
]


# ---------------------------------------------------------------------------
# Rule engine
# ---------------------------------------------------------------------------

def _evaluate_warnings(profile: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Chay tat ca MEDICINE_WARNING_RULES doi chieu voi ho so. Tra ve danh sach canh bao."""
    triggered = []
    for rule in MEDICINE_WARNING_RULES:
        try:
            matched = ConditionEvaluator.evaluate(rule["condition"], profile)
        except Exception as exc:
            logger.warning("Rule %s loi khi danh gia: %s", rule["id"], exc)
            matched = False

        if matched:
            triggered.append({
                "id": rule["id"],
                "label": rule["label"],
                "message": rule["message"],
                "severity": rule["severity"],
            })

    # Sap xep: danger > warning > info
    severity_order = {"danger": 0, "warning": 1, "info": 2}
    triggered.sort(key=lambda x: severity_order.get(x["severity"], 9))
    return triggered


# ---------------------------------------------------------------------------
# Serializer: chuyen 1 dong DataFrame -> dict chuan
# CSV columns (chinh xac):
#   Medicine Name | Composition  | Uses      | Side_effects
#   Image URL     | Manufacturer | Excellent Review % | Average Review % | Poor Review % | Ingredients_List
# ---------------------------------------------------------------------------

def _serialize_medicine(row: pd.Series) -> Dict[str, Any]:
    """Chuyen 1 hang DataFrame thanh dict thuoc chuan hoa."""
    def safe(val):
        if pd.isna(val):
            return None
        return str(val).strip() if isinstance(val, str) else val

    return {
        "id": int(row.name),
        "tenThuoc": safe(row.get("Medicine Name", "")),
        "thanhPhan": safe(row.get("Composition", "")),
        "congDung": safe(row.get("Uses", "")),
        "tacDungPhu": safe(row.get("Side_effects", "")),
        "nhaSanXuat": safe(row.get("Manufacturer", "")),
        "danhSachHoatChat": safe(row.get("Ingredients_List", "")),
        "hinhAnh": safe(row.get("Image URL", "")),
        "danhGiaTot": safe(row.get("Excellent Review %", 0)),
        "danhGiaTrungBinh": safe(row.get("Average Review %", 0)),
        "danhGiaKem": safe(row.get("Poor Review %", 0)),
    }


# ---------------------------------------------------------------------------
# Tim kiem
# ---------------------------------------------------------------------------

def _search_medicines(query: str, limit: int = 10) -> List[Dict[str, Any]]:
    """Tim thuoc theo ten hoac thanh phan hoat chat. Case-insensitive, partial match."""
    df = _load_medicines()
    if df.empty:
        return []

    q = query.strip().lower()
    if not q:
        return []

    mask = pd.Series([False] * len(df), index=df.index)

    if "Medicine Name" in df.columns:
        mask |= df["Medicine Name"].fillna("").str.lower().str.contains(
            re.escape(q), regex=True
        )
    if "Composition" in df.columns:
        mask |= df["Composition"].fillna("").str.lower().str.contains(
            re.escape(q), regex=True
        )
    if "Ingredients_List" in df.columns:
        mask |= df["Ingredients_List"].fillna("").str.lower().str.contains(
            re.escape(q), regex=True
        )

    results = df[mask].head(limit)
    return [_serialize_medicine(row) for _, row in results.iterrows()]


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class MedicineLookupRequest(BaseModel):
    query: str
    tenDangNhap: Optional[str] = None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/search")
def search_medicines(q: str, limit: int = 10):
    """
    GET /medicines/search?q=paracetamol&limit=10
    Tim kiem cong khai, khong can xac thuc. Chi tra ve danh sach thuoc.
    """
    if not q or len(q.strip()) < 2:
        raise HTTPException(
            status_code=400,
            detail="Từ khóa tìm kiếm phải có ít nhất 2 ký tự."
        )

    results = _search_medicines(q.strip(), limit=min(limit, 30))
    return {
        "query": q,
        "count": len(results),
        "results": results,
    }


@router.post("/lookup")
def lookup_medicine_with_profile(
    payload: MedicineLookupRequest,
    db: Session = Depends(get_db),
):
    """
    POST /medicines/lookup
    Body: { "query": "aspirin", "tenDangNhap": "user123" }

    Tra ve:
    {
      "query": "...",
      "count": N,
      "medicines": [...],
      "health_warnings": [...],
      "profile_available": bool,
      "warning_count": N
    }
    """
    query = payload.query.strip()
    if len(query) < 2:
        raise HTTPException(
            status_code=400,
            detail="Từ khóa tìm kiếm phải có ít nhất 2 ký tự."
        )

    medicines = _search_medicines(query, limit=15)

    health_warnings: List[Dict[str, Any]] = []
    profile_available = False

    if payload.tenDangNhap:
        profile = _load_user_profile(payload.tenDangNhap, db)
        if profile:
            profile_available = True
            health_warnings = _evaluate_warnings(profile)
        else:
            logger.info("Khong tim thay ho so cho user: %s", payload.tenDangNhap)

    return {
        "query": query,
        "count": len(medicines),
        "medicines": medicines,
        "health_warnings": health_warnings,
        "profile_available": profile_available,
        "warning_count": len(health_warnings),
    }


@router.get("/detail/{medicine_name}")
def get_medicine_detail(
    medicine_name: str,
    tenDangNhap: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    GET /medicines/detail/{medicine_name}?tenDangNhap=user123
    Tra ve thuoc khop nhat va canh bao suc khoe ca nhan.
    """
    df = _load_medicines()
    if df.empty:
        raise HTTPException(status_code=503, detail="Không thể tải dữ liệu thuốc.")

    if "Medicine Name" not in df.columns:
        raise HTTPException(status_code=500, detail="Cấu trúc dữ liệu thuốc không hợp lệ.")

    q = medicine_name.strip().lower()
    match = df[df["Medicine Name"].fillna("").str.lower() == q]

    if match.empty:
        match = df[
            df["Medicine Name"].fillna("").str.lower().str.contains(
                re.escape(q), regex=True
            )
        ]

    if match.empty:
        raise HTTPException(
            status_code=404,
            detail=f"Không tìm thấy thuốc '{medicine_name}'."
        )

    medicine = _serialize_medicine(match.iloc[0])

    health_warnings: List[Dict[str, Any]] = []
    profile_available = False

    if tenDangNhap:
        profile = _load_user_profile(tenDangNhap, db)
        if profile:
            profile_available = True
            health_warnings = _evaluate_warnings(profile)

    return {
        "medicine": medicine,
        "health_warnings": health_warnings,
        "profile_available": profile_available,
        "warning_count": len(health_warnings),
    }


@router.get("/warning-rules")
def get_warning_rules():
    """
    GET /medicines/warning-rules
    Tra ve danh sach tat ca cac quy tac canh bao (de debug va tai lieu hoa).
    """
    return {
        "count": len(MEDICINE_WARNING_RULES),
        "rules": [
            {
                "id": r["id"],
                "label": r["label"],
                "severity": r["severity"],
                "condition": r["condition"],
            }
            for r in MEDICINE_WARNING_RULES
        ],
    }