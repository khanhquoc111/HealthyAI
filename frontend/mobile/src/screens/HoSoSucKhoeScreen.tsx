import { useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS, FONTS, RADIUS, SHADOW, SPACING } from "../../constants/appTheme";
import { getHealthProfile, saveHealthProfile } from "../api/healthApi";
import { AppCard } from "../components/ui/AppCard";
import { PillGroup } from "../components/ui/PillGroup";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { StatusMessage } from "../components/ui/StatusMessage";
import { useAuth } from "../context/AuthContext";

type FieldConfig = {
  key: string;
  keyboardType?: string;
  label: string;
  readOnly?: boolean;
  unit?: string;
};

type SelectConfig = {
  key: string;
  label: string;
  options: string[];
};

type BooleanConfig = {
  key: string;
  label: string;
};

type ProfileSection = {
  booleans?: BooleanConfig[];
  fields?: FieldConfig[];
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  id: number;
  selects?: SelectConfig[];
  title: string;
};

const SECTIONS: ProfileSection[] = [
  {
    id: 1,
    icon: "account-heart",
    title: "Thông tin cơ bản",
    fields: [
      { key: "tuoi", label: "Tuổi", unit: "tuổi", keyboardType: "numeric" },
      { key: "chieuCao", label: "Chiều cao", unit: "cm", keyboardType: "numeric" },
      { key: "canNang", label: "Cân nặng", unit: "kg", keyboardType: "numeric" },
      { key: "bmi", label: "BMI", unit: "kg/m²", readOnly: true },
      { key: "vongEo", label: "Vòng eo", unit: "cm", keyboardType: "numeric" },
    ],
  },
  {
    id: 2,
    icon: "heart-pulse",
    title: "Huyết áp và tim mạch",
    fields: [
      { key: "huyetApTamThu", label: "Huyết áp tâm thu", unit: "mmHg", keyboardType: "numeric" },
      { key: "huyetApTamTruong", label: "Huyết áp tâm trương", unit: "mmHg", keyboardType: "numeric" },
    ],
  },
  {
    id: 3,
    icon: "test-tube",
    title: "Xét nghiệm sinh hóa",
    fields: [
      { key: "duongHuyet", label: "Đường huyết đói", unit: "mg/dL", keyboardType: "numeric" },
      { key: "hba1c", label: "HbA1c", unit: "%", keyboardType: "decimal-pad" },
      { key: "cholesterol", label: "Cholesterol toàn phần", unit: "mg/dL", keyboardType: "numeric" },
      { key: "ldl", label: "LDL Cholesterol", unit: "mg/dL", keyboardType: "numeric" },
      { key: "hdl", label: "HDL Cholesterol", unit: "mg/dL", keyboardType: "numeric" },
      { key: "creatinine", label: "Creatinine", unit: "mg/dL", keyboardType: "decimal-pad" },
    ],
  },
  {
    id: 4,
    icon: "run",
    title: "Lối sống",
    fields: [
      { key: "soPhutVanDongMoiTuan", label: "Phút vận động/tuần", unit: "phút", keyboardType: "numeric" },
    ],
    selects: [
      { key: "hutThuoc", label: "Hút thuốc", options: ["Không", "Đã bỏ", "Đang hút"] },
      { key: "uongRuouBia", label: "Uống rượu bia", options: ["Không", "Thỉnh thoảng", "Thường xuyên", "Nhiều"] },
      { key: "anMan", label: "Ăn mặn", options: ["Nhạt", "Vừa", "Mặn"] },
    ],
  },
  {
    id: 5,
    icon: "hospital-box",
    title: "Bệnh lý hiện tại",
    booleans: [
      { key: "caoHuyetAp", label: "Cao huyết áp" },
      { key: "tieuDuong", label: "Tiểu đường" },
      { key: "benhTimMach", label: "Bệnh tim mạch" },
      { key: "gout", label: "Gout" },
    ],
  },
  {
    id: 6,
    icon: "account-group",
    title: "Tiền sử gia đình",
    booleans: [
      { key: "giaDinhCaoHuyetAp", label: "Cao huyết áp" },
      { key: "giaDinhTieuDuong", label: "Tiểu đường" },
      { key: "giaDinhTimMach", label: "Tim mạch" },
    ],
  },
];

const DEFAULT_FORM: Record<string, any> = {
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

function sectionProgress(section: ProfileSection, form: Record<string, any>) {
  const keys = [
    ...(section.fields?.map((field) => field.key) ?? []),
    ...(section.selects?.map((field) => field.key) ?? []),
    ...(section.booleans?.map((field) => field.key) ?? []),
  ];
  if (!keys.length) return 0;

  const filled = keys.filter((key) => {
    const value = form[key];
    return value !== "" && value !== null && value !== undefined;
  }).length;

  return Math.round((filled / keys.length) * 100);
}

export default function HoSoSucKhoeScreen() {
  const { user } = useAuth();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [activeSection, setActiveSection] = useState(1);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (form.chieuCao && form.canNang) {
      const height = Number(form.chieuCao) / 100;
      if (height > 0) {
        setForm((previous) => ({
          ...previous,
          bmi: (Number(form.canNang) / (height * height)).toFixed(1),
        }));
      }
    }
  }, [form.chieuCao, form.canNang]);

  useEffect(() => {
    if (!user) return;
    getHealthProfile(user)
      .then((res) => {
        if (res.data) setForm((previous) => ({ ...previous, ...res.data }));
      })
      .catch(() => {});
  }, [user]);

  const completedPercent = useMemo(() => {
    const editableKeys = Object.keys(DEFAULT_FORM).filter((key) => key !== "bmi");
    const filled = editableKeys.filter((key) => {
      const value = form[key];
      return value !== "" && value !== null && value !== undefined;
    }).length;
    return Math.round((filled / editableKeys.length) * 100);
  }, [form]);

  const set = (key: string, value: any) => setForm((previous) => ({ ...previous, [key]: value }));

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setMessage("");
    try {
      await saveHealthProfile(user, form);
      setMessage("Lưu hồ sơ thành công.");
      setTimeout(() => setMessage(""), 3000);
    } catch {
      setMessage("Không thể lưu dữ liệu. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.pageTitle}>Hồ sơ sức khỏe</Text>
          <Text style={styles.pageSub}>Cập nhật chỉ số giúp kết quả phân tích đáng tin hơn.</Text>
        </View>
        <View style={styles.progressBadge}>
          <Text style={styles.progressValue}>{completedPercent}%</Text>
          <Text style={styles.progressLabel}>đủ dữ liệu</Text>
        </View>
      </View>

      {SECTIONS.map((section) => {
        const active = activeSection === section.id;
        const progress = sectionProgress(section, form);

        return (
          <AppCard key={section.id} style={styles.section}>
            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.8}
              onPress={() => setActiveSection(active ? 0 : section.id)}
              style={styles.secHeader}
            >
              <View style={styles.secTitleWrap}>
                <View style={styles.secIcon}>
                  <MaterialCommunityIcons color={COLORS.primary} name={section.icon} size={22} />
                </View>
                <View style={styles.secTitleText}>
                  <Text style={styles.secTitle}>{section.title}</Text>
                  <Text style={styles.secProgress}>{progress}% hoàn thành</Text>
                </View>
              </View>
              <MaterialCommunityIcons
                color={COLORS.textSub}
                name={active ? "chevron-up" : "chevron-down"}
                size={24}
              />
            </TouchableOpacity>

            {active && (
              <View style={styles.secBody}>
                {section.fields?.map(({ key, label, unit, keyboardType, readOnly }) => (
                  <View key={key} style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>{label}</Text>
                    <View style={styles.inputWrap}>
                      <TextInput
                        editable={!readOnly}
                        keyboardType={(keyboardType as any) || "default"}
                        onChangeText={(value) => !readOnly && set(key, value)}
                        placeholder="-"
                        placeholderTextColor={COLORS.textLight}
                        style={[styles.input, readOnly && styles.inputReadOnly]}
                        value={String(form[key] ?? "")}
                      />
                      {unit ? <Text style={styles.unit}>{unit}</Text> : null}
                    </View>
                  </View>
                ))}

                {section.selects?.map(({ key, label, options }) => (
                  <View key={key} style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>{label}</Text>
                    <PillGroup
                      onChange={(value) => set(key, value)}
                      options={options.map((option) => ({ label: option, value: option }))}
                      value={String(form[key] ?? "")}
                    />
                  </View>
                ))}

                {section.booleans?.map(({ key, label }) => (
                  <View key={key} style={styles.switchRow}>
                    <Text style={styles.fieldLabel}>{label}</Text>
                    <Switch
                      onValueChange={(value) => set(key, value)}
                      thumbColor="#fff"
                      trackColor={{ false: COLORS.border, true: COLORS.primary }}
                      value={!!form[key]}
                    />
                  </View>
                ))}
              </View>
            )}
          </AppCard>
        );
      })}

      {message ? (
        <StatusMessage type={message.includes("thành công") ? "success" : "error"}>
          {message}
        </StatusMessage>
      ) : null}

      <View style={styles.saveBar}>
        <PrimaryButton loading={saving} onPress={handleSave}>
          Lưu hồ sơ
        </PrimaryButton>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: SPACING.lg,
    paddingBottom: 96,
  },
  fieldLabel: {
    color: COLORS.secondary,
    fontSize: FONTS.sm,
    fontWeight: "700",
    marginBottom: 6,
  },
  fieldRow: {
    marginTop: SPACING.md,
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: SPACING.md,
    justifyContent: "space-between",
    marginBottom: SPACING.lg,
  },
  input: {
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    color: COLORS.textMain,
    flex: 1,
    fontSize: FONTS.base,
    minHeight: 44,
    padding: SPACING.md,
  },
  inputReadOnly: {
    backgroundColor: COLORS.surface,
    color: COLORS.textSub,
  },
  inputWrap: {
    alignItems: "center",
    flexDirection: "row",
    gap: SPACING.sm,
  },
  pageSub: {
    color: COLORS.textSub,
    fontSize: FONTS.sm,
    lineHeight: 20,
    marginTop: 4,
    maxWidth: 230,
  },
  pageTitle: {
    color: COLORS.secondary,
    fontSize: FONTS.xl,
    fontWeight: "800",
  },
  progressBadge: {
    alignItems: "center",
    backgroundColor: COLORS.accentSoft,
    borderRadius: RADIUS.md,
    minWidth: 82,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  progressLabel: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  progressValue: {
    color: COLORS.accent,
    fontSize: FONTS.lg,
    fontWeight: "900",
  },
  saveBar: {
    backgroundColor: COLORS.background,
    bottom: 0,
    left: 0,
    paddingTop: SPACING.sm,
    position: "absolute",
    right: 0,
  },
  scroll: {
    backgroundColor: COLORS.background,
    flex: 1,
  },
  secBody: {
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    marginTop: SPACING.md,
    paddingTop: SPACING.xs,
  },
  secHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  secIcon: {
    alignItems: "center",
    backgroundColor: COLORS.primarySoft,
    borderRadius: RADIUS.md,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  secProgress: {
    color: COLORS.textSub,
    fontSize: FONTS.sm,
    marginTop: 2,
  },
  secTitle: {
    color: COLORS.secondary,
    fontSize: FONTS.base,
    fontWeight: "800",
  },
  secTitleText: {
    flex: 1,
  },
  secTitleWrap: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: SPACING.md,
  },
  section: {
    marginBottom: SPACING.md,
    padding: SPACING.lg,
    ...SHADOW.card,
  },
  switchRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: SPACING.md,
  },
  unit: {
    color: COLORS.textSub,
    fontSize: FONTS.sm,
    minWidth: 52,
  },
});
