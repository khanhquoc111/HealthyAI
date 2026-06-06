# backend/function/chiso_suckhoe_cn.py
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
from database.database import SessionLocal

# Import chính xác từ các file đặt tên mới tách riêng biệt
from database.nguoi_dung import NguoiDung
from database.hs_suckhoe import HoSoSucKhoe
from database.cs_suckhoe import ChiSoSucKhoe

router = APIRouter(prefix="/health-profile", tags=["Health Profile"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class HealthProfileSchema(BaseModel):
    tenDangNhap: str
    tuoi: Optional[int] = None
    gioiTinh: Optional[str] = "Nam"
    chieuCao: Optional[float] = None
    canNang: Optional[float] = None
    bmi: Optional[float] = None
    vongEo: Optional[float] = None
    huyetApTamThu: Optional[float] = None
    huyetApTamTruong: Optional[float] = None
    
    # Sinh hóa đồng bộ mở rộng (Lưu EAV vào chiSoSucKhoe)
    duongHuyet: Optional[float] = None
    hba1c: Optional[float] = None
    cholesterol: Optional[float] = None
    ldl: Optional[float] = None
    hdl: Optional[float] = None
    triglyceride: Optional[float] = None
    creatinine: Optional[float] = None
    acidUric: Optional[float] = None
    
    hutThuoc: Optional[str] = "Không"
    uongRuouBia: Optional[str] = "Không"
    soPhutVanDongMoiTuan: Optional[int] = None
    mucDoAnMan: Optional[str] = "Vừa"
    
    caoHuyetAp: Optional[bool] = False
    tieuDuong: Optional[bool] = False
    benhTimMach: Optional[bool] = False
    gout: Optional[bool] = False
    
    giaDinhCaoHuyetAp: Optional[bool] = False
    giaDinhTieuDuong: Optional[bool] = False
    giaDinhTimMach: Optional[bool] = False
    giaDinhGout: Optional[bool] = False


@router.get("/{ten_dang_nhap}")
def get_health_profile(ten_dang_nhap: str, db: Session = Depends(get_db)):
    try:
        # 1. Tìm người dùng dựa trên tên đăng nhập
        user = db.query(NguoiDung).filter(NguoiDung.tenDangNhap == ten_dang_nhap).first()
        if not user:
            raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
            
        # 2. Lấy thông tin thể chất nền tảng từ bảng hoSoSucKhoe
        hoso = db.query(HoSoSucKhoe).filter(HoSoSucKhoe.idNguoiDung == user.idNguoiDung).first()
        
        # 3. Lấy tất cả các chỉ số xét nghiệm/lối sống động từ bảng chiSoSucKhoe
        chisos = db.query(ChiSoSucKhoe).filter(ChiSoSucKhoe.idNguoiDung == user.idNguoiDung).all()
        
        if not hoso and not chisos:
            return {"message": "Chưa có hồ sơ", "data": None}
            
        profile_dict = {}
        
        # Đọc dữ liệu từ bảng hoSoSucKhoe gộp vào kết quả trả về
        if hoso:
            for k, v in hoso.__dict__.items():
                if not k.startswith('_') and v is not None:
                    profile_dict[k] = v
                    
        # Định nghĩa phân nhóm định dạng để ép kiểu ngược lại cho Frontend nhận diện chuẩn xác
        BOOLEAN_FIELDS = {
            "caoHuyetAp", "tieuDuong", "benhTimMach", "gout",
            "giaDinhCaoHuyetAp", "giaDinhTieuDuong", "giaDinhTimMach", "giaDinhGout"
        }
        NUMBER_FIELDS = {
            "duongHuyet", "hba1c", "cholesterol", "ldl", "hdl", "triglyceride", "creatinine", "acidUric"
        }
        
        # Đọc dữ liệu EAV từ bảng chiSoSucKhoe chuyển đổi định dạng và gộp vào kết quả
        for cs in chisos:
            if cs.giaTri is not None:
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
        
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi lấy hồ sơ: {str(e)}")


@router.post("/")
def upsert_health_profile(profile_data: HealthProfileSchema, db: Session = Depends(get_db)):
    try:
        user = db.query(NguoiDung).filter(NguoiDung.tenDangNhap == profile_data.tenDangNhap).first()
        if not user:
            raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
            
        # exclude_unset=True cực kỳ quan trọng, giúp chỉ lọc ra đúng trường dữ liệu gửi lên
        # từ hàm autoSaveField của frontend chứ không lấy các trường mặc định khác của Pydantic
        update_data = profile_data.dict(exclude={"tenDangNhap"}, exclude_unset=True)
        
        # Tập hợp chính xác các cột thuộc cứng ở bảng hoSoSucKhoe cấu trúc mới
        HO_SO_COLS = {
            "tuoi", "gioiTinh", "chieuCao", "canNang", "bmi", "vongEo",
            "huyetApTamThu", "huyetApTamTruong", "hutThuoc", "uongRuouBia",
            "soPhutVanDongMoiTuan"
        }
        
        hoso_updates = {}
        chiso_updates = {}
        
        # Phân tách payload gửi lên thành 2 nhóm đích danh
        for key, value in update_data.items():
            if key in HO_SO_COLS:
                hoso_updates[key] = value
            else:
                chiso_updates[key] = value
                
        # ===== 1. XỬ LÝ ĐỒNG BỘ BẢNG hoSoSucKhoe =====
        if hoso_updates:
            existing_hoso = db.query(HoSoSucKhoe).filter(HoSoSucKhoe.idNguoiDung == user.idNguoiDung).first()
            if existing_hoso:
                for key, value in hoso_updates.items():
                    setattr(existing_hoso, key, value)
            else:
                new_hoso = HoSoSucKhoe(idNguoiDung=user.idNguoiDung, **hoso_updates)
                db.add(new_hoso)
                
        # ===== 2. XỬ LÝ ĐỒNG BỘ BẢNG chiSoSucKhoe (MÔ HÌNH EAV) =====
        for key, value in chiso_updates.items():
            existing_chiso = db.query(ChiSoSucKhoe).filter(
                ChiSoSucKhoe.idNguoiDung == user.idNguoiDung,
                ChiSoSucKhoe.maChiSo == key
            ).first()
            
            if value in [None, ""]:
                # Nếu giá trị truyền lên rỗng/null chứng tỏ người dùng xóa dữ liệu, thực hiện dọn dẹp hàng tương ứng
                if existing_chiso:
                    db.delete(existing_chiso)
            else:
                # Đồng bộ và ép kiểu dữ liệu thành chuỗi để lưu vào cột VARCHAR giaTri
                str_value = str(value)
                if isinstance(value, bool):
                    str_value = "true" if value else "false"
                    
                if existing_chiso:
                    existing_chiso.giaTri = str_value
                else:
                    new_chiso = ChiSoSucKhoe(
                        idNguoiDung=user.idNguoiDung,
                        maChiSo=key,
                        giaTri=str_value
                    )
                    db.add(new_chiso)
                    
        db.commit()
        return {"message": "Đã lưu chỉ số sức khỏe cá nhân thành công!", "status": "success"}
        
    except HTTPException as he:
        raise he
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi lưu hồ sơ: {str(e)}")