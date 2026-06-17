// src/api/healthApi.ts
import api from "./config";

// ── Hồ sơ sức khỏe ──────────────────────────────────────────────
export const getHealthProfile = async (tenDangNhap: string) => {
  const res = await api.get(`/health-profile/${tenDangNhap}`);
  return res.data;
};

export const saveHealthProfile = async (tenDangNhap: string, formData: Record<string, any>) => {
  const numericFields = [
    "tuoi", "chieuCao", "canNang", "bmi", "vongEo",
    "huyetApTamThu", "huyetApTamTruong", "duongHuyet", "hba1c",
    "cholesterol", "ldl", "hdl", "triglyceride", "creatinine",
    "acidUric", "soPhutVanDongMoiTuan",
  ];
  const payload: Record<string, any> = { tenDangNhap, ...formData };
  numericFields.forEach((k) => {
    payload[k] = formData[k] ? Number(formData[k]) : null;
  });
  const res = await api.post("/health-profile/", payload);
  return res.data;
};

// ── Plugin / Phân tích bệnh ──────────────────────────────────────
export const getPlugins = async () => {
  const res = await api.get("/plugins");
  return res.data;
};

export const getPluginMetadata = async (pluginId: string) => {
  const res = await api.get(`/plugins/${pluginId}`);
  return res.data;
};

export const scorePlugin = async (pluginId: string, tenDangNhap: string, formData: Record<string, any>) => {
  const res = await api.post(
    `/plugins/${pluginId}/score?ten_dang_nhap=${tenDangNhap}`,
    formData
  );
  return res.data;
};

export const validateField = async (pluginId: string, fieldKey: string, value: any) => {
  const res = await api.post(
    `/plugins/${pluginId}/validate-field/${fieldKey}`,
    { value }
  );
  return res.data;
};

// ── Tra cứu thuốc ───────────────────────────────────────────────
export const searchMedicine = async (keyword: string) => {
  const res = await api.get(`/medicines/search?q=${encodeURIComponent(keyword)}`);
  return res.data;
};