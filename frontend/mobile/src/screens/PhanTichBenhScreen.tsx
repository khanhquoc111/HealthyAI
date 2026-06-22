import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS, FONTS, RADIUS, SPACING, riskColor, riskColorByLevel } from "../../constants/appTheme";
import { getHealthProfile, getPluginMetadata, getPlugins, scorePlugin } from "../api/healthApi";
import { AppCard } from "../components/ui/AppCard";
import { PillGroup } from "../components/ui/PillGroup";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { StatusMessage } from "../components/ui/StatusMessage";
import { useAuth } from "../context/AuthContext";

const EAV_FALLBACK: Record<string, string> = {
  age: "tuoi",
  systolic: "huyetApTamThu",
  diastolic: "huyetApTamTruong",
  fasting_glucose: "duongHuyet",
  hba1c: "hba1c",
  total_cholesterol: "cholesterol",
  ldl: "ldl",
  hdl: "hdl",
  creatinine: "creatinine",
  waist: "vongEo",
  smoking_status: "hutThuoc",
  exercise_minutes_per_week: "soPhutVanDongMoiTuan",
  alcohol: "uongRuouBia",
  diabetes_status: "tieuDuong",
  family_history_diabetes: "giaDinhTieuDuong",
  family_history_hypertension: "giaDinhCaoHuyetAp",
  family_history_cardiovascular: "giaDinhTimMach",
};

const PLUGIN_LABELS: Record<string, string> = {
  cardiovascular: "Tim mạch",
  diabetes: "Tiểu đường",
  hypertension: "Tăng huyết áp",
  kidney: "Thận mạn",
  stroke: "Đột quỵ",
};

const FIELD_LABELS: Record<string, string> = {
  age: "Tuổi",
  alcohol: "Tình trạng uống rượu bia",
  bmi: "Chỉ số khối cơ thể",
  creatinine: "Creatinine",
  diastolic: "Huyết áp tâm trương",
  exercise_minutes_per_week: "Số phút vận động mỗi tuần",
  family_history_cardiovascular: "Tiền sử gia đình bệnh tim mạch",
  family_history_diabetes: "Tiền sử gia đình tiểu đường",
  family_history_hypertension: "Tiền sử gia đình cao huyết áp",
  fasting_glucose: "Đường huyết đói",
  hba1c: "HbA1c",
  hdl: "Cholesterol HDL",
  ldl: "Cholesterol LDL",
  smoking_status: "Tình trạng hút thuốc",
  systolic: "Huyết áp tâm thu",
  total_cholesterol: "Cholesterol toàn phần",
  waist: "Vòng eo",
};

function resolveFieldValue(field: any, healthProfile: any) {
  const direct = healthProfile?.[field.key];
  const fallbackKey = EAV_FALLBACK[field.health_profile_key || field.key];
  const fallback = healthProfile?.[fallbackKey];
  const value = direct !== undefined && direct !== null && direct !== "" ? direct : fallback;

  if (value === undefined || value === null || value === "") return "";

  if (field.type === "boolean") {
    if (value === true || value === 1 || value === "1" || String(value).toLowerCase() === "true") {
      return "true";
    }
    return "false";
  }

  if (field.type === "select" && field.options) {
    const normalized = String(value).toLowerCase();
    if (normalized === "không" || normalized === "nhạt") return String(field.options[0]?.value ?? value);
    if (normalized === "đã bỏ" || normalized === "vừa" || normalized === "thỉnh thoảng") {
      return String(field.options[1]?.value ?? value);
    }
    if (normalized === "đang hút" || normalized === "mặn" || normalized === "thường xuyên" || normalized === "nhiều") {
      return String(field.options[field.options.length - 1]?.value ?? value);
    }
  }

  return String(value);
}

function getFieldLabel(field: any) {
  return FIELD_LABELS[field.key] || field.label || field.key;
}

function getOptionLabel(option: any) {
  const value = String(option.value);
  const lower = value.toLowerCase();
  if (lower === "true") return "Có";
  if (lower === "false") return "Không";
  if (lower === "never" || value === "0") return "Không";
  if (lower === "former") return "Đã bỏ";
  if (lower === "current" || value === "1") return "Có";
  return option.label || value;
}

function ScoreBar({ color, score }: { color: string; score: number }) {
  return (
    <View style={styles.barTrack}>
      <View style={[styles.barFill, { width: `${Math.min(score, 100)}%`, backgroundColor: color }]} />
    </View>
  );
}

function RiskPill({ color, label }: { color: string; label: string }) {
  return (
    <View style={[styles.riskPill, { backgroundColor: color + "22", borderColor: color }]}>
      <Text style={[styles.riskPillText, { color }]}>{label || "N/A"}</Text>
    </View>
  );
}

function RuleCard({ data }: any) {
  if (!data) return null;
  const score = data.score ?? 0;
  const color = riskColor(score);
  const levelColor = riskColorByLevel(data.risk_level ?? "");

  return (
    <AppCard style={styles.resultCard}>
      <View style={styles.cardHeader}>
        <View style={styles.resultTitleWrap}>
          <MaterialCommunityIcons color={COLORS.primary} name="clipboard-check" size={22} />
          <Text style={styles.cardEngine}>Luật đánh giá</Text>
        </View>
        <Text style={[styles.cardScore, { color }]}>{score.toFixed(1)} điểm</Text>
      </View>
      <ScoreBar color={color} score={score} />
      <View style={styles.levelRow}>
        <Text style={styles.levelLabel}>Phân tầng nguy cơ</Text>
        <RiskPill color={levelColor} label={String(data.risk_level ?? "").toUpperCase()} />
      </View>
      {data.matched_rules?.length > 0 ? (
        <View style={styles.rulesBox}>
          <Text style={styles.rulesHeading}>Yếu tố kích hoạt</Text>
          {data.matched_rules.map((rule: any, index: number) => (
            <Text key={index} style={styles.ruleItem}>
              {rule.description || rule.id}
            </Text>
          ))}
        </View>
      ) : null}
    </AppCard>
  );
}

function AICard({ data }: any) {
  if (!data) return null;
  const ready = data.status === "READY";
  const pct = (data.probability ?? 0) * 100;
  const color = riskColor(pct);
  const levelColor = riskColorByLevel(data.risk_level ?? "");

  return (
    <AppCard style={styles.resultCard}>
      <View style={styles.cardHeader}>
        <View style={styles.resultTitleWrap}>
          <MaterialCommunityIcons color={COLORS.accent} name="brain" size={22} />
          <Text style={styles.cardEngine}>Mô hình AI</Text>
        </View>
        {ready ? <Text style={[styles.cardScore, { color }]}>{pct.toFixed(1)}%</Text> : <RiskPill color={COLORS.warning} label="Thiếu dữ liệu" />}
      </View>
      {ready ? (
        <>
          <ScoreBar color={color} score={pct} />
          <View style={styles.levelRow}>
            <Text style={styles.levelLabel}>Phân tầng</Text>
            <RiskPill color={levelColor} label={String(data.risk_level ?? "").toUpperCase()} />
          </View>
          <Text style={styles.confidence}>Độ tin cậy: {data.confidence ?? 0}%</Text>
        </>
      ) : (
        <StatusMessage type="warning">
          Cần điền thêm chỉ số sinh hóa trong hồ sơ sức khỏe để kích hoạt AI.
        </StatusMessage>
      )}
    </AppCard>
  );
}

function RecsCard({ recs }: any) {
  if (!recs?.length) return null;

  return (
    <AppCard style={styles.resultCard}>
      <View style={styles.resultTitleWrap}>
        <MaterialCommunityIcons color={COLORS.warning} name="lightbulb-on" size={22} />
        <Text style={styles.recsTitle}>Khuyến nghị cá nhân hóa</Text>
      </View>
      {recs.map((rec: any, index: number) => {
        const text = typeof rec === "string" ? rec : rec.text;
        return (
          <View key={index} style={styles.recItem}>
            <View style={styles.recNum}>
              <Text style={styles.recNumText}>{index + 1}</Text>
            </View>
            <Text style={styles.recText}>{text}</Text>
          </View>
        );
      })}
    </AppCard>
  );
}

export default function PhanTichBenhScreen() {
  const { user } = useAuth();
  const [plugins, setPlugins] = useState<string[]>([]);
  const [selectedPlugin, setSelected] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<any>(null);
  const [healthProfile, setProfile] = useState<any>({});
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingPlugins, setLoadingPlugins] = useState(true);

  useEffect(() => {
    Promise.all([getPlugins(), user ? getHealthProfile(user) : Promise.resolve({ data: {} })])
      .then(([pluginsRes, profileRes]) => {
        setPlugins(pluginsRes.plugins || []);
        setProfile(profileRes.data || {});
      })
      .finally(() => setLoadingPlugins(false));
  }, [user]);

  const selectPlugin = useCallback(
    async (id: string) => {
      setSelected(id);
      setResult(null);
      try {
        const meta = await getPluginMetadata(id);
        setMetadata(meta);
        const prefilled: Record<string, string> = {};
        (meta.fields || []).forEach((field: any) => {
          prefilled[field.key] = resolveFieldValue(field, healthProfile);
        });
        setFormValues(prefilled);
      } catch {
        setMetadata(null);
        setResult({ error: "Không thể tải cấu hình phân tích." });
      }
    },
    [healthProfile],
  );

  const requiredFilled = useMemo(() => {
    const required = metadata?.fields?.filter((field: any) => field.required) || [];
    if (!required.length) return true;
    return required.every((field: any) => formValues[field.key] !== undefined && formValues[field.key] !== "");
  }, [formValues, metadata]);

  const handleAnalyze = async () => {
    if (!selectedPlugin || !user || !metadata) return;
    setLoading(true);
    setResult(null);

    try {
      const payload: Record<string, any> = {};
      (metadata.fields || []).forEach((field: any) => {
        const value = formValues[field.key];
        if (value === undefined || value === "") return;
        if (field.type === "boolean") payload[field.key] = value === "true";
        else if (field.type === "number") payload[field.key] = Number(value);
        else payload[field.key] = value;
      });

      const res = await scorePlugin(selectedPlugin, user, payload);
      setResult(res);
    } catch (error: any) {
      const detail = error.response?.data?.detail;
      if (typeof detail === "object" && detail !== null) {
        const errorMsg = detail.message || "Dữ liệu không hợp lệ";
        const validationErrors = detail.errors
          ? detail.errors.map((err: any) => `- ${err.message}`).join("\n")
          : "";
        setResult({ error: validationErrors ? `${errorMsg}:\n${validationErrors}` : errorMsg });
      } else {
        setResult({ error: detail || "Lỗi khi phân tích" });
      }
    } finally {
      setLoading(false);
    }
  };

  const renderField = (field: any) => {
    const value = formValues[field.key] ?? "";
    const label = getFieldLabel(field);

    if (field.type === "boolean") {
      return (
        <View key={field.key} style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>{label}</Text>
          <PillGroup
            onChange={(nextValue) => setFormValues((previous) => ({ ...previous, [field.key]: nextValue }))}
            options={[
              { label: "Có", value: "true" },
              { label: "Không", value: "false" },
            ]}
            value={value}
          />
        </View>
      );
    }

    if (field.type === "select") {
      return (
        <View key={field.key} style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>{label}</Text>
          <PillGroup
            onChange={(nextValue) => setFormValues((previous) => ({ ...previous, [field.key]: nextValue }))}
            options={(field.options || []).map((option: any) => ({
              label: getOptionLabel(option),
              value: String(option.value),
            }))}
            value={value}
          />
        </View>
      );
    }

    return (
      <View key={field.key} style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>
          {label}
          {field.required ? " *" : ""}
          {field.unit ? <Text style={styles.unitInline}> ({field.unit})</Text> : null}
        </Text>
        <TextInput
          keyboardType="decimal-pad"
          onChangeText={(nextValue) => setFormValues((previous) => ({ ...previous, [field.key]: nextValue }))}
          placeholder={field.unit || "-"}
          placeholderTextColor={COLORS.textLight}
          style={styles.input}
          value={String(value)}
        />
      </View>
    );
  };

  if (loadingPlugins) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.primary} size="large" />
        <Text style={styles.loadingText}>Đang tải dữ liệu phân tích...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.pageTitle}>Phân tích nguy cơ</Text>
      <Text style={styles.pageSub}>Chọn bệnh, kiểm tra dữ liệu được lấy từ hồ sơ và chạy đánh giá.</Text>

      <Text style={styles.sectionTitle}>Chọn bệnh cần phân tích</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pluginRow}>
        {plugins.map((plugin) => {
          const active = selectedPlugin === plugin;
          return (
            <TouchableOpacity
              activeOpacity={0.85}
              key={plugin}
              onPress={() => selectPlugin(plugin)}
              style={[styles.pluginChip, active && styles.pluginChipActive]}
            >
              <MaterialCommunityIcons color={active ? "#fff" : COLORS.primary} name="chart-box" size={18} />
              <Text style={[styles.pluginChipText, active && styles.pluginChipTextActive]}>
                {PLUGIN_LABELS[plugin] || plugin}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {metadata ? (
        <AppCard style={styles.formCard}>
          <View style={styles.formHeader}>
            <View>
              <Text style={styles.formTitle}>{PLUGIN_LABELS[selectedPlugin || ""] || "Đánh giá nguy cơ"}</Text>
              <Text style={styles.formHint}>Các trường có dấu * là bắt buộc.</Text>
            </View>
            <View style={styles.prefillBadge}>
              <MaterialCommunityIcons color={COLORS.accent} name="database-check" size={16} />
              <Text style={styles.prefillText}>Từ hồ sơ</Text>
            </View>
          </View>

          {(metadata.fields || []).map(renderField)}

          {!requiredFilled ? (
            <StatusMessage type="warning">Vui lòng điền đủ trường bắt buộc trước khi phân tích.</StatusMessage>
          ) : null}

          <PrimaryButton disabled={!requiredFilled} loading={loading} onPress={handleAnalyze} style={styles.analyzeBtn}>
            Phân tích nguy cơ
          </PrimaryButton>
        </AppCard>
      ) : (
        <AppCard style={styles.emptyCard}>
          <MaterialCommunityIcons color={COLORS.primary} name="gesture-tap" size={34} />
          <Text style={styles.emptyText}>Chọn một bệnh để bắt đầu phân tích.</Text>
        </AppCard>
      )}

      {result?.error ? <StatusMessage type="error">{result.error}</StatusMessage> : null}

      {result && !result.error ? (
        <View>
          <Text style={styles.sectionTitle}>Kết quả phân tích</Text>
          <RuleCard data={result.rule_based} />
          <AICard data={result.ai_based} />
          <RecsCard recs={result.recommendations} />
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  analyzeBtn: {
    marginTop: SPACING.lg,
  },
  barFill: {
    borderRadius: 4,
    height: "100%",
  },
  barTrack: {
    backgroundColor: COLORS.border,
    borderRadius: 4,
    height: 8,
    marginBottom: SPACING.md,
    overflow: "hidden",
  },
  cardEngine: {
    color: COLORS.secondary,
    fontSize: FONTS.base,
    fontWeight: "800",
  },
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SPACING.md,
  },
  cardScore: {
    fontSize: FONTS.lg,
    fontWeight: "900",
  },
  center: {
    alignItems: "center",
    flex: 1,
    gap: SPACING.md,
    justifyContent: "center",
  },
  confidence: {
    color: COLORS.textSub,
    fontSize: FONTS.sm,
    marginTop: SPACING.sm,
  },
  container: {
    padding: SPACING.lg,
    paddingBottom: 44,
  },
  emptyCard: {
    alignItems: "center",
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  emptyText: {
    color: COLORS.textSub,
    fontSize: FONTS.base,
    textAlign: "center",
  },
  fieldLabel: {
    color: COLORS.secondary,
    fontSize: FONTS.sm,
    fontWeight: "800",
    marginBottom: 6,
  },
  fieldRow: {
    marginTop: SPACING.md,
  },
  formCard: {
    marginBottom: SPACING.lg,
  },
  formHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: SPACING.md,
    justifyContent: "space-between",
    marginBottom: SPACING.xs,
  },
  formHint: {
    color: COLORS.textSub,
    fontSize: FONTS.sm,
    marginTop: 2,
  },
  formTitle: {
    color: COLORS.secondary,
    fontSize: FONTS.md,
    fontWeight: "900",
  },
  input: {
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    color: COLORS.textMain,
    fontSize: FONTS.base,
    minHeight: 46,
    padding: SPACING.md,
  },
  levelLabel: {
    color: COLORS.textSub,
    fontSize: FONTS.sm,
  },
  levelRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  loadingText: {
    color: COLORS.textSub,
    fontSize: FONTS.base,
  },
  pageSub: {
    color: COLORS.textSub,
    fontSize: FONTS.sm,
    lineHeight: 20,
    marginBottom: SPACING.lg,
    marginTop: 4,
  },
  pageTitle: {
    color: COLORS.secondary,
    fontSize: FONTS.xl,
    fontWeight: "900",
  },
  pluginChip: {
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    flexDirection: "row",
    gap: SPACING.xs,
    marginRight: SPACING.sm,
    minHeight: 42,
    paddingHorizontal: SPACING.lg,
  },
  pluginChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  pluginChipText: {
    color: COLORS.textSub,
    fontSize: FONTS.sm,
    fontWeight: "800",
  },
  pluginChipTextActive: {
    color: "#fff",
  },
  pluginRow: {
    marginBottom: SPACING.lg,
  },
  prefillBadge: {
    alignItems: "center",
    backgroundColor: COLORS.accentSoft,
    borderRadius: RADIUS.xl,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
  },
  prefillText: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: "800",
  },
  recItem: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  recNum: {
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 11,
    height: 22,
    justifyContent: "center",
    width: 22,
  },
  recNumText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
  },
  recText: {
    color: COLORS.textSub,
    flex: 1,
    fontSize: FONTS.sm,
    lineHeight: 20,
  },
  recsTitle: {
    color: COLORS.secondary,
    fontSize: FONTS.base,
    fontWeight: "800",
  },
  resultCard: {
    marginBottom: SPACING.md,
  },
  resultTitleWrap: {
    alignItems: "center",
    flexDirection: "row",
    gap: SPACING.sm,
  },
  riskPill: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
  },
  riskPillText: {
    fontSize: FONTS.sm,
    fontWeight: "900",
  },
  ruleItem: {
    color: COLORS.textSub,
    fontSize: FONTS.sm,
    lineHeight: 20,
    marginTop: 4,
  },
  rulesBox: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm,
    marginTop: SPACING.md,
    padding: SPACING.md,
  },
  rulesHeading: {
    color: COLORS.secondary,
    fontSize: FONTS.sm,
    fontWeight: "800",
  },
  scroll: {
    backgroundColor: COLORS.background,
    flex: 1,
  },
  sectionTitle: {
    color: COLORS.secondary,
    fontSize: FONTS.md,
    fontWeight: "900",
    marginBottom: SPACING.md,
  },
  unitInline: {
    color: COLORS.textSub,
    fontWeight: "400",
  },
});
