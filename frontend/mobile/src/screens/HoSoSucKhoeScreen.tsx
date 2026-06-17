// src/screens/HoSoSucKhoeScreen.jsx
import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
  ActivityIndicator,
} from "react-native";
import { getHealthProfile, saveHealthProfile } from "../api/healthApi";
import { useAuth } from "../context/AuthContext";
import { COLORS, FONTS, RADIUS } from "../../constants/appTheme";

const SECTIONS = [
  {
    id: 1,
    title: "🧍 Thông tin cơ bản",
    fields: [
      { key: "tuoi", label: "Tuổi", unit: "tuổi", keyboardType: "numeric" },
      {
        key: "chieuCao",
        label: "Chiều cao",
        unit: "cm",
        keyboardType: "numeric",
      },
      {
        key: "canNang",
        label: "Cân nặng",
        unit: "kg",
        keyboardType: "numeric",
      },
      { key: "bmi", label: "BMI", unit: "kg/m²", readOnly: true },
      { key: "vongEo", label: "Vòng eo", unit: "cm", keyboardType: "numeric" },
    ],
  },
  {
    id: 2,
    title: "💓 Huyết áp & Tim mạch",
    fields: [
      {
        key: "huyetApTamThu",
        label: "Huyết áp tâm thu",
        unit: "mmHg",
        keyboardType: "numeric",
      },
      {
        key: "huyetApTamTruong",
        label: "Huyết áp tâm trương",
        unit: "mmHg",
        keyboardType: "numeric",
      },
    ],
  },
  {
    id: 3,
    title: "🧪 Xét nghiệm sinh hóa",
    fields: [
      {
        key: "duongHuyet",
        label: "Đường huyết đói",
        unit: "mg/dL",
        keyboardType: "numeric",
      },
      { key: "hba1c", label: "HbA1c", unit: "%", keyboardType: "decimal-pad" },
      {
        key: "cholesterol",
        label: "Cholesterol toàn phần",
        unit: "mg/dL",
        keyboardType: "numeric",
      },
      {
        key: "ldl",
        label: "LDL Cholesterol",
        unit: "mg/dL",
        keyboardType: "numeric",
      },
      {
        key: "hdl",
        label: "HDL Cholesterol",
        unit: "mg/dL",
        keyboardType: "numeric",
      },
      {
        key: "creatinine",
        label: "Creatinine",
        unit: "mg/dL",
        keyboardType: "decimal-pad",
      },
    ],
  },
  {
    id: 4,
    title: "🚬 Lối sống",
    fields: [
      {
        key: "soPhutVanDongMoiTuan",
        label: "Phút vận động/tuần",
        unit: "phút",
        keyboardType: "numeric",
      },
    ],
    selects: [
      {
        key: "hutThuoc",
        label: "Hút thuốc",
        options: ["Không", "Đã bỏ", "Đang hút"],
      },
      {
        key: "uongRuouBia",
        label: "Uống rượu bia",
        options: ["Không", "Thỉnh thoảng", "Thường xuyên", "Nhiều"],
      },
      { key: "anMan", label: "Ăn mặn", options: ["Nhạt", "Vừa", "Mặn"] },
    ],
  },
  {
    id: 5,
    title: "🏥 Bệnh lý hiện tại",
    booleans: [
      { key: "caoHuyetAp", label: "Cao huyết áp" },
      { key: "tieuDuong", label: "Tiểu đường" },
      { key: "benhTimMach", label: "Bệnh tim mạch" },
      { key: "gout", label: "Gout" },
    ],
  },
  {
    id: 6,
    title: "👨‍👩‍👧 Tiền sử gia đình",
    booleans: [
      { key: "giaDinhCaoHuyetAp", label: "Cao huyết áp" },
      { key: "giaDinhTieuDuong", label: "Tiểu đường" },
      { key: "giaDinhTimMach", label: "Tim mạch" },
    ],
  },
];

const DEFAULT_FORM = {
  tuoi: "",
  gioiTinh: "Nam",
  chieuCao: "",
  canNang: "",
  bmi: "",
  vongEo: "",
  huyetApTamThu: "",
  huyetApTamTruong: "",
  duongHuyet: "",
  hba1c: "",
  cholesterol: "",
  ldl: "",
  hdl: "",
  creatinine: "",
  hutThuoc: "Không",
  uongRuouBia: "Không",
  soPhutVanDongMoiTuan: "",
  anMan: "Vừa",
  caoHuyetAp: false,
  tieuDuong: false,
  benhTimMach: false,
  gout: false,
  giaDinhCaoHuyetAp: false,
  giaDinhTieuDuong: false,
  giaDinhTimMach: false,
};

export default function HoSoSucKhoeScreen() {
  const { user } = useAuth();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [activeSection, setActiveSection] = useState(1);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Auto-calc BMI
  useEffect(() => {
    if (form.chieuCao && form.canNang) {
      const h = Number(form.chieuCao) / 100;
      setForm((p) => ({
        ...p,
        bmi: (Number(form.canNang) / (h * h)).toFixed(1),
      }));
    }
  }, [form.chieuCao, form.canNang]);

  // Load profile
  useEffect(() => {
    if (!user) return;
    getHealthProfile(user)
      .then((res) => {
        if (res.data) setForm((p) => ({ ...p, ...res.data }));
      })
      .catch(() => {});
  }, [user]);

  const set = (key: string, val: any) => setForm((p) => ({ ...p, [key]: val }));

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setMessage("");
    try {
      await saveHealthProfile(user, form);
      setMessage("✅ Lưu thành công!");
      setTimeout(() => setMessage(""), 3000);
    } catch {
      setMessage("❌ Lỗi khi lưu dữ liệu!");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.pageTitle}>Hồ Sơ Sức Khỏe</Text>

      {SECTIONS.map((sec) => (
        <View key={sec.id} style={styles.section}>
          {/* Section header */}
          <TouchableOpacity
            style={styles.secHeader}
            onPress={() =>
              setActiveSection(activeSection === sec.id ? 0 : sec.id)
            }
          >
            <Text style={styles.secTitle}>{sec.title}</Text>
            <Text style={styles.secArrow}>
              {activeSection === sec.id ? "▲" : "▼"}
            </Text>
          </TouchableOpacity>

          {activeSection === sec.id && (
            <View style={styles.secBody}>
              {/* Number/text inputs */}
              {sec.fields?.map(
                ({ key, label, unit, keyboardType, readOnly }: any) => (
                  <View key={key} style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>{label}</Text>
                    <View style={styles.inputWrap}>
                      <TextInput
                        style={[styles.input, readOnly && styles.inputReadOnly]}
                        keyboardType={(keyboardType as any) || "default"}
                        value={String(form[key as keyof typeof form] ?? "")}
                        onChangeText={(v) => !readOnly && set(key, v)}
                        editable={!readOnly}
                        placeholderTextColor={COLORS.textLight}
                        placeholder="-"
                      />
                      {unit ? <Text style={styles.unit}>{unit}</Text> : null}
                    </View>
                  </View>
                ),
              )}

              {/* Select options (pill buttons) */}
              {sec.selects?.map(({ key, label, options }) => (
                <View key={key} style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>{label}</Text>
                  <View style={styles.pillRow}>
                    {options.map((opt) => (
                      <TouchableOpacity
                        key={opt}
                        style={[styles.pill, form[key as keyof typeof form] === opt && styles.pillActive]}
                        onPress={() => set(key, opt)}
                      >
                        <Text style={[styles.pillText, form[key as keyof typeof form] === opt && styles.pillTextActive]}>
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}

              {/* Boolean toggles */}
              {sec.booleans?.map(({ key, label }) => (
                <View key={key} style={styles.switchRow}>
                  <Text style={styles.fieldLabel}>{label}</Text>
                  <Switch
                    value={!!form[key as keyof typeof form]}
                    onValueChange={(v) => set(key, v)}
                    trackColor={{ false: COLORS.border, true: COLORS.primary }}
                    thumbColor="#fff"
                  />
                </View>
              ))}
            </View>
          )}
        </View>
      ))}

      {message ? (
        <Text
          style={[
            styles.message,
            message.startsWith("✅") ? styles.msgOk : styles.msgErr,
          ]}
        >
          {message}
        </Text>
      ) : null}

      <TouchableOpacity
        style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveBtnText}>💾 Lưu Hồ Sơ</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: COLORS.background },
  container: { padding: 16, paddingBottom: 40 },
  pageTitle: {
    fontSize: FONTS.xl,
    fontWeight: "800",
    color: COLORS.secondary,
    marginBottom: 16,
  },
  section: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    marginBottom: 10,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  secHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  secTitle: {
    fontSize: FONTS.base,
    fontWeight: "700",
    color: COLORS.secondary,
  },
  secArrow: { fontSize: FONTS.sm, color: COLORS.textSub },
  secBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  fieldRow: { marginTop: 12 },
  fieldLabel: {
    fontSize: FONTS.sm,
    fontWeight: "600",
    color: COLORS.secondary,
    marginBottom: 6,
  },
  inputWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    padding: 10,
    fontSize: FONTS.base,
    color: COLORS.textMain,
  },
  inputReadOnly: { backgroundColor: "#f8fafc", color: COLORS.textSub },
  unit: { fontSize: FONTS.sm, color: COLORS.textSub, minWidth: 44 },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  pill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#f8fafc",
  },
  pillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  pillText: { fontSize: FONTS.sm, color: COLORS.textSub },
  pillTextActive: { color: "#fff", fontWeight: "600" },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  message: {
    padding: 12,
    borderRadius: RADIUS.sm,
    marginBottom: 12,
    textAlign: "center",
    fontSize: FONTS.sm,
  },
  msgOk: { backgroundColor: "#f0fdf4", color: "#15803d" },
  msgErr: { backgroundColor: "#fef2f2", color: "#b91c1c" },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    padding: 15,
    alignItems: "center",
    marginTop: 8,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: "#fff", fontSize: FONTS.md, fontWeight: "700" },
});
