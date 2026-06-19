import json

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import asc
from typing import Optional, List, Dict
from datetime import datetime

from database.database import SessionLocal
from database.nguoi_dung import NguoiDung
from database.hs_suckhoe import HoSoSucKhoe
from database.cs_suckhoe import ChiSoSucKhoe
from database.lich_su_danh_gia import LichSuDanhGia

router = APIRouter(prefix="/health-profile", tags=["Health Profile"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

HO_SO_COLS = {
    "tuoi", "gioiTinh", "chieuCao", "canNang", "bmi", "vongEo",
    "huyetApTamThu", "huyetApTamTruong", "hutThuoc", "uongRuouBia",
    "soPhutVanDongMoiTuan", "anMan"
}

BOOLEAN_FIELDS = {
    "caoHuyetAp", "tieuDuong", "benhTimMach", "gout",
    "giaDinhCaoHuyetAp", "giaDinhTieuDuong", "giaDinhTimMach", "giaDinhGout",
}
NUMBER_FIELDS = {
    "duongHuyet", "hba1c", "cholesterol", "ldl", "hdl",
    "triglyceride", "creatinine", "acidUric"
}

class HealthProfileSchema(BaseModel):
    tenDangNhap: str
    tuoi: Optional[int] = None
    gioiTinh: Optional[str] = None
    chieuCao: Optional[float] = None
    canNang: Optional[float] = None
    bmi: Optional[float] = None
    vongEo: Optional[float] = None
    huyetApTamThu: Optional[float] = None
    huyetApTamTruong: Optional[float] = None
    hutThuoc: Optional[str] = None
    uongRuouBia: Optional[str] = None
    soPhutVanDongMoiTuan: Optional[int] = None
    anMan: Optional[str] = None
    duongHuyet: Optional[float] = None
    hba1c: Optional[float] = None
    cholesterol: Optional[float] = None
    ldl: Optional[float] = None
    hdl: Optional[float] = None
    triglyceride: Optional[float] = None
    creatinine: Optional[float] = None
    acidUric: Optional[float] = None
    caoHuyetAp: Optional[bool] = None
    tieuDuong: Optional[bool] = None
    benhTimMach: Optional[bool] = None
    gout: Optional[bool] = None
    giaDinhCaoHuyetAp: Optional[bool] = None
    giaDinhTieuDuong: Optional[bool] = None
    giaDinhTimMach: Optional[bool] = None
    giaDinhGout: Optional[bool] = None


@router.get("/{ten_dang_nhap}")
def get_health_profile(ten_dang_nhap: str, db: Session = Depends(get_db)):
    try:
        user = db.query(NguoiDung).filter(NguoiDung.tenDangNhap == ten_dang_nhap).first()
        if not user:
            raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")

        hoso = db.query(HoSoSucKhoe).filter(HoSoSucKhoe.idNguoiDung == user.idNguoiDung).first()
        chisos = db.query(ChiSoSucKhoe).filter(ChiSoSucKhoe.idNguoiDung == user.idNguoiDung).all()

        if not hoso and not chisos:
            return {"message": "Chưa có hồ sơ", "data": None}

        profile_dict = {}

        if hoso:
            for k, v in hoso.__dict__.items():
                if not k.startswith("_") and v is not None:
                    profile_dict[k] = v

        for cs in chisos:
            if cs.giaTri is None:
                continue
            if cs.maChiSo in BOOLEAN_FIELDS:
                profile_dict[cs.maChiSo] = cs.giaTri.lower() in ("true", "1", "yes", "có")
            elif cs.maChiSo in NUMBER_FIELDS:
                try:
                    profile_dict[cs.maChiSo] = float(cs.giaTri)
                except ValueError:
                    profile_dict[cs.maChiSo] = cs.giaTri
            else:
                profile_dict[cs.maChiSo] = cs.giaTri

        return {"message": "Thành công", "data": profile_dict}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi lấy hồ sơ: {str(e)}")


@router.post("/")
def upsert_health_profile(profile_data: HealthProfileSchema, db: Session = Depends(get_db)):
    try:
        user = db.query(NguoiDung).filter(NguoiDung.tenDangNhap == profile_data.tenDangNhap).first()
        if not user:
            raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")

        update_data = profile_data.dict(exclude={"tenDangNhap"}, exclude_unset=True)

        hoso_updates = {}
        chiso_updates = {}

        for key, value in update_data.items():
            if key in HO_SO_COLS:
                hoso_updates[key] = value
            else:
                chiso_updates[key] = value

        if hoso_updates:
            existing = db.query(HoSoSucKhoe).filter(HoSoSucKhoe.idNguoiDung == user.idNguoiDung).first()
            if existing:
                for k, v in hoso_updates.items():
                    setattr(existing, k, v)
            else:
                db.add(HoSoSucKhoe(idNguoiDung=user.idNguoiDung, **hoso_updates))

        for key, value in chiso_updates.items():
            existing = db.query(ChiSoSucKhoe).filter(
                ChiSoSucKhoe.idNguoiDung == user.idNguoiDung,
                ChiSoSucKhoe.maChiSo == key,
            ).first()

            if value is None or value == "":
                if existing:
                    db.delete(existing)
            else:
                str_value = ("true" if value else "false") if isinstance(value, bool) else str(value)
                if existing:
                    existing.giaTri = str_value
                else:
                    db.add(ChiSoSucKhoe(idNguoiDung=user.idNguoiDung, maChiSo=key, giaTri=str_value))

        db.commit()
        return {"message": "Đã lưu chỉ số sức khỏe cá nhân thành công!", "status": "success"}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi lưu hồ sơ: {str(e)}")


@router.get("/{ten_dang_nhap}/trends")
def get_health_metrics_trend(ten_dang_nhap: str, db: Session = Depends(get_db)):
    """
    API trích xuất lịch sử các chỉ số từ ketQuaJSON của bảng LichSuDanhGia 
    để phân tích Trend và phục vụ vẽ biểu đồ (Line Chart).
    """
    user = db.query(NguoiDung).filter(NguoiDung.tenDangNhap == ten_dang_nhap).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")

    assessments = (
        db.query(LichSuDanhGia)
        .filter(LichSuDanhGia.idNguoiDung == user.idNguoiDung)
        .order_by(asc(LichSuDanhGia.ngayDanhGia))
        .all()
    )

    if len(assessments) < 2:
        return {"message": "Chưa đủ dữ liệu lịch sử để phân tích xu hướng", "trends": {}}

    metrics_history = {"bmi": [], "duongHuyet": [], "huyetApTamThu": []}
    
    for record in assessments:
        form_data = {}
        if record.ketQuaJSON:
                if isinstance(record.ketQuaJSON, str):
                    try:
                        form_data = json.loads(record.ketQuaJSON).get("form_data", {})
                    except: pass
        elif isinstance(record.ketQuaJSON, dict):
                        form_data = record.ketQuaJSON.get("form_data", {})
                        
        date_str = record.ngayDanhGia.strftime("%Y-%m-%d")

        if "bmi" in form_data and form_data["bmi"] is not None:
            try:
                metrics_history["bmi"].append({"date": date_str, "value": float(form_data["bmi"])})
            except (ValueError, TypeError): pass
            
        fg_val = form_data.get("fasting_glucose") or form_data.get("duongHuyet")
        if fg_val is not None:
            try:
                metrics_history["duongHuyet"].append({"date": date_str, "value": float(fg_val)})
            except (ValueError, TypeError): pass
            
        sys_val = form_data.get("systolic") or form_data.get("huyetApTamThu")
        if sys_val is not None:
            try:
                metrics_history["huyetApTamThu"].append({"date": date_str, "value": float(sys_val)})
            except (ValueError, TypeError): pass

    results = {}
    for metric, records in metrics_history.items():
        if len(records) >= 2:
            analysis_result = analyze_metric_trend(metric, records)
            analysis_result["chart_data"] = records 
            results[metric] = analysis_result

    return {"message": "Thành công", "trends": results}


def analyze_metric_trend(metric_name: str, records: List[Dict]) -> Dict:
    if len(records) < 2:
        return {"has_insight": False, "insight": ""}

    latest = records[-1]["value"]
    oldest = records[0]["value"]
    previous = records[-2]["value"]
    
    overall_change = latest - oldest
    overall_change_percent = (overall_change / oldest * 100) if oldest > 0 else 0.0
    
    continuous_increase = 0
    for i in range(len(records) - 1, 0, -1):
        if records[i]["value"] > records[i-1]["value"]:
            continuous_increase += 1
        else:
            break

    insight_messages = []
    
    if metric_name == "bmi":
        if continuous_increase >= 3:
            insight_messages.append(f"BMI tăng liên tục trong {continuous_increase + 1} lần đo gần nhất.")
        if overall_change_percent > 10:
            insight_messages.append(f"Cảnh báo: BMI đã tăng {round(overall_change_percent, 1)}% trong chu kỳ theo dõi.")
        if latest >= 25.0 and previous < 25.0:
            insight_messages.append("Chỉ số BMI của bạn đã chuyển sang ngưỡng Thừa cân.")
            
    elif metric_name == "duongHuyet":
        if continuous_increase >= 2:
            base_msg = "Đường huyết đang có xu hướng tăng đều."
            if 100 <= latest < 126:
                base_msg = "Đường huyết đang tăng đều và đã vượt ngưỡng tiền tiểu đường."
            elif latest >= 126:
                base_msg = "Đường huyết đang tăng đều và đã vượt ngưỡng bệnh lý."
            insight_messages.append(base_msg)
            
    elif metric_name == "huyetApTamThu":
        if latest >= 130 and previous < 130:
            insight_messages.append("Huyết áp tâm thu đã vượt ngưỡng an toàn (130 mmHg).")
        if continuous_increase >= 3:
            insight_messages.append("Huyết áp của bạn đang tăng liên tục qua các lần đo.")

    if insight_messages:
        return {
            "has_insight": True,
            "metric": metric_name,
            "overall_change_percent": round(overall_change_percent, 1),
            "insight": " ".join(insight_messages)
        }
        
    return {"has_insight": False, "insight": ""}

@router.get("/{ten_dang_nhap}/health-score")
def get_personal_health_score(ten_dang_nhap: str, db: Session = Depends(get_db)):
    """
    API tính toán Personal Health Score (0-100) dựa trên hồ sơ hiện tại 
    và so sánh với kết quả đánh giá tháng trước.
    """
    user = db.query(NguoiDung).filter(NguoiDung.tenDangNhap == ten_dang_nhap).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")

    # 1. Lấy dữ liệu hồ sơ hiện tại
    hoso = db.query(HoSoSucKhoe).filter(HoSoSucKhoe.idNguoiDung == user.idNguoiDung).first()
    chisos = db.query(ChiSoSucKhoe).filter(ChiSoSucKhoe.idNguoiDung == user.idNguoiDung).all()
    
    if not hoso:
        return {"message": "Chưa có đủ dữ liệu để tính điểm", "score": 0}

    # Đưa các chỉ số phụ vào một dictionary để dễ truy xuất
    chiso_dict = {cs.maChiSo: float(cs.giaTri) if cs.giaTri.replace('.', '', 1).isdigit() else cs.giaTri for cs in chisos if cs.giaTri}

    # 2. Hàm tính điểm chi tiết
    def calculate_score(bmi, sys_bp, dia_bp, glucose, exercise, smoke, alcohol):
        score = 0
        
        # BMI (Max 20)
        if bmi:
            if 18.5 <= bmi <= 24.9: score += 20
            elif 25 <= bmi <= 29.9: score += 10
            
        # Huyết áp (Max 20)
        if sys_bp and dia_bp:
            if sys_bp < 120 and dia_bp < 80: score += 20
            elif sys_bp < 130 and dia_bp < 80: score += 15
            elif sys_bp < 140 or dia_bp < 90: score += 10
            
        # Đường huyết (Max 20)
        if glucose:
            if glucose < 100: score += 20
            elif 100 <= glucose <= 125: score += 10
            
        # Vận động (Max 15)
        if exercise is not None:
            if exercise >= 150: score += 15
            elif exercise >= 90: score += 10
            elif exercise > 0: score += 5
            
        # Hút thuốc (Max 15)
        if smoke in ["Không", "Chưa bao giờ", "never"]: score += 15
        elif smoke in ["Đã bỏ", "former"]: score += 10
        
        # Rượu bia (Max 10)
        if alcohol in ["Không", "0", 0.0]: score += 10
        elif alcohol == "Thỉnh thoảng": score += 5
        
        return score

    # 3. Tính điểm hiện tại
    current_score = calculate_score(
        bmi=hoso.bmi,
        sys_bp=hoso.huyetApTamThu,
        dia_bp=hoso.huyetApTamTruong,
        glucose=chiso_dict.get("duongHuyet"),
        exercise=hoso.soPhutVanDongMoiTuan,
        smoke=hoso.hutThuoc,
        alcohol=hoso.uongRuouBia
    )

    # 4. Tìm điểm lịch sử (Tháng trước) từ bảng LichSuDanhGia
    assessments = (
        db.query(LichSuDanhGia)
        .filter(LichSuDanhGia.idNguoiDung == user.idNguoiDung)
        .order_by(asc(LichSuDanhGia.ngayDanhGia))
        .all()
    )

    previous_score = current_score # Mặc định nếu không có lịch sử
    if len(assessments) >= 2:
        # Lấy form_data từ lần đánh giá trước đó
        prev_form = assessments[-2].ketQuaJSON.get("form_data", {})
        
        # Mapping ngược lại các key tiếng Anh sang tiếng Việt để tính điểm
        prev_sys = prev_form.get("systolic") or prev_form.get("huyetApTamThu")
        prev_dia = prev_form.get("diastolic") or prev_form.get("huyetApTamTruong")
        prev_glucose = prev_form.get("fasting_glucose") or prev_form.get("duongHuyet")
        prev_smoke = prev_form.get("smoking_status") or prev_form.get("hutThuoc")
        prev_alcohol = prev_form.get("alcohol") or prev_form.get("uongRuouBia")
        prev_exercise = prev_form.get("exercise_minutes_per_week") or prev_form.get("soPhutVanDongMoiTuan")
        
        previous_score = calculate_score(
            bmi=prev_form.get("bmi"),
            sys_bp=prev_sys,
            dia_bp=prev_dia,
            glucose=prev_glucose,
            exercise=prev_exercise,
            smoke=prev_smoke,
            alcohol=prev_alcohol
        )

    # 5. Phân tích Insight
    percent_change = 0.0
    insight = "Duy trì thói quen tốt để cải thiện điểm số sức khỏe."
    
    if previous_score > 0:
        percent_change = ((current_score - previous_score) / previous_score) * 100
        percent_change = round(percent_change, 1)
        
        if percent_change > 0:
            insight = f"Tuyệt vời! Sức khỏe tổng quát của bạn đã cải thiện {abs(percent_change)}% so với lần đánh giá trước."
        elif percent_change < 0:
            insight = f"Chú ý: Điểm sức khỏe giảm {abs(percent_change)}%. Hãy xem lại chế độ dinh dưỡng và vận động."
        else:
            insight = "Sức khỏe tổng quát của bạn đang duy trì ở mức ổn định."

    return {
        "current_score": current_score,
        "previous_score": previous_score,
        "max_score": 100,
        "trend": {
            "percentage": percent_change,
            "status": "increase" if percent_change > 0 else "decrease" if percent_change < 0 else "stable",
            "insight": insight
        }
    }