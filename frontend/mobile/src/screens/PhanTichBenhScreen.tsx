// src/screens/PhanTichBenhScreen.jsx
import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
} from "react-native";
import {
  getPlugins,
  getPluginMetadata,
  getHealthProfile,
  scorePlugin,
} from "../api/healthApi";
import { useAuth } from "../context/AuthContext";
import {
  COLORS,
  FONTS,
  RADIUS,
  riskColor,
  riskColorByLevel,
} from "../../constants/appTheme";

// EAV fallback — giống hệt web
const EAV_FALLBACK = {
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

function resolveFieldValue(field: any, healthProfile: any) {
  const direct = healthProfile?.[field.key];
  const fallbackKey =
    EAV_FALLBACK[
      (field.health_profile_key || field.key) as keyof typeof EAV_FALLBACK
    ];
  const fallback = healthProfile?.[fallbackKey];

  // Ưu tiên lấy key trực tiếp, nếu không có thì lấy qua fallback
  let v =
    direct !== undefined && direct !== null && direct !== ""
      ? direct
      : fallback;

  if (v === undefined || v === null || v === "") return "";

  // 1. Ép kiểu chuẩn xác cho mục Boolean (Tiền sử gia đình, Bệnh lý)
  if (field.type === "boolean") {
    // Bất kể DB lưu 1, true (boolean) hay "true", đều quy về chuỗi "true" cho giao diện
    if (
      v === true ||
      v === 1 ||
      v === "1" ||
      String(v).toLowerCase() === "true"
    )
      return "true";
    return "false";
  }

  // 2. Ép kiểu cho mục Select (Lối sống) - Phiên dịch Tiếng Việt sang Value Plugin
  if (field.type === "select" && field.options) {
    const strV = String(v).toLowerCase();
    // Tự động map vào option đầu tiên (thường là Không/Nhạt/Never)
    if (strV === "không" || strV === "nhạt")
      return String(field.options[0]?.value ?? v);
    // Tự động map vào option mức trung bình (Đã bỏ/Thỉnh thoảng/Former)
    if (strV === "đã bỏ" || strV === "vừa" || strV === "thỉnh thoảng")
      return String(field.options[1]?.value ?? v);
    // Tự động map vào option mức cao nhất (Đang hút/Nhiều/Current)
    if (
      strV === "đang hút" ||
      strV === "mặn" ||
      strV === "thường xuyên" ||
      strV === "nhiều"
    ) {
      return String(field.options[field.options.length - 1]?.value ?? v);
    }
  }

  return String(v);
}
// ── Sub-components ──────────────────────────────────────────────────────────
function ScoreBar({ score, color }: any) {
  return (
    <View style={styles.barTrack}>
      <View
        style={[
          styles.barFill,
          { width: `${Math.min(score, 100)}%`, backgroundColor: color },
        ]}
      />
    </View>
  );
}

function RuleCard({ data }: any) {
  if (!data) return null;
  const color = riskColor(data.score ?? 0);
  const lvlColor = riskColorByLevel(data.risk_level ?? "");
  return (
    <View style={styles.resultCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardEngine}>📋 Rule-based Engine</Text>
        <Text style={[styles.cardScore, { color }]}>
          {(data.score ?? 0).toFixed(1)} điểm
        </Text>
      </View>
      <ScoreBar score={data.score ?? 0} color={color} />
      <View style={styles.levelRow}>
        <Text style={styles.levelLabel}>Phân tầng nguy cơ</Text>
        <View
          style={[
            styles.pill,
            { backgroundColor: lvlColor + "22", borderColor: lvlColor },
          ]}
        >
          <Text style={[styles.pillText, { color: lvlColor }]}>
            {String(data.risk_level ?? "").toUpperCase()}
          </Text>
        </View>
      </View>
      {data.matched_rules?.length > 0 && (
        <View style={styles.rulesBox}>
          <Text style={styles.rulesHeading}>Yếu tố kích hoạt</Text>
          {data.matched_rules.map((r: any, i: any) => (
            <Text key={i} style={styles.ruleItem}>
              • {r.description || r.id}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

function AICard({ data }: any) {
  if (!data) return null;
  const isReady = data.status === "READY";
  const pct = (data.probability ?? 0) * 100;
  const color = riskColor(pct);
  const lvlColor = riskColorByLevel(data.risk_level ?? "");
  return (
    <View style={styles.resultCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardEngine}>🧠 AI Model</Text>
        {isReady ? (
          <Text style={[styles.cardScore, { color }]}>{pct.toFixed(1)}%</Text>
        ) : (
          <View
            style={[
              styles.pill,
              {
                backgroundColor: COLORS.warning + "22",
                borderColor: COLORS.warning,
              },
            ]}
          >
            <Text style={[styles.pillText, { color: COLORS.warning }]}>
              PARTIAL
            </Text>
          </View>
        )}
      </View>
      {isReady ? (
        <>
          <ScoreBar score={pct} color={color} />
          <View style={styles.levelRow}>
            <Text style={styles.levelLabel}>Phân tầng</Text>
            <View
              style={[
                styles.pill,
                { backgroundColor: lvlColor + "22", borderColor: lvlColor },
              ]}
            >
              <Text style={[styles.pillText, { color: lvlColor }]}>
                {String(data.risk_level ?? "").toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={styles.confidence}>
            Độ tin cậy: {data.confidence ?? 0}%
          </Text>
        </>
      ) : (
        <View style={styles.partialBox}>
          <Text style={styles.partialText}>
            ⚠️ Cần điền đầy đủ chỉ số sinh hóa trong Hồ sơ sức khỏe để kích hoạt
            AI.
          </Text>
          {data.missing_features?.length > 0 && (
            <Text style={styles.missingText}>
              Thiếu: {data.missing_features.join(", ")}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

function RecsCard({ recs }: any) {
  if (!recs?.length) return null;
  return (
    <View
      style={[
        styles.resultCard,
        { borderLeftWidth: 4, borderLeftColor: COLORS.primary },
      ]}
    >
      <Text style={styles.recsTitle}>💡 Khuyến nghị cá nhân hóa</Text>
      {recs.map((rec: any, i: any) => {
        const text = typeof rec === "string" ? rec : rec.text;
        return (
          <View key={i} style={styles.recItem}>
            <View style={styles.recNum}>
              <Text style={styles.recNumText}>{i + 1}</Text>
            </View>
            <Text style={styles.recText}>{text}</Text>
          </View>
        );
      })}
    </View>
  );
}

// ── Main screen ─────────────────────────────────────────────────────────────
export default function PhanTichBenhScreen() {
  const { user } = useAuth();
  const [plugins, setPlugins] = useState<any[]>([]);
  const [selectedPlugin, setSelected] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<any>(null);
  const [healthProfile, setProfile] = useState<any>({});
  const [formValues, setFormValues] = useState<any>({});
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingPlugins, setLoadingPlugins] = useState(true);

  // Load plugins + health profile
  useEffect(() => {
    Promise.all([
      getPlugins(),
      user ? getHealthProfile(user) : Promise.resolve({ data: {} }),
    ])
      .then(([pluginsRes, profileRes]) => {
        setPlugins(pluginsRes.plugins || []);
        setProfile(profileRes.data || {});
      })
      .finally(() => setLoadingPlugins(false));
  }, [user]);

  // Load plugin metadata when selected
  const selectPlugin = useCallback(
    async (id: string) => {
      setSelected(id);
      setResult(null);
      try {
        const meta = await getPluginMetadata(id);
        setMetadata(meta);
        // Pre-fill form from health profile
        const prefilled: any = {};
        (meta.fields || []).forEach((f: any) => {
          prefilled[f.key] = resolveFieldValue(f, healthProfile);
        });
        setFormValues(prefilled);
      } catch {}
    },
    [healthProfile],
  );

  const handleAnalyze = async () => {
    if (!selectedPlugin || !user) return;
    setLoading(true);
    setResult(null);

    try {
      // --- BƯỚC QUAN TRỌNG: PARSE DỮ LIỆU ---
      const payload: Record<string, any> = {};

      (metadata?.fields || []).forEach((f: any) => {
        const val = formValues[f.key];
        if (val === undefined || val === "") return; // Bỏ qua trường rỗng

        if (f.type === "boolean") {
          // Trả về kiểu boolean nguyên thủy (không có dấu nháy kép)
          payload[f.key] = val === "true";
        } else if (f.type === "number") {
          // Chuyển chuỗi thành số thực
          payload[f.key] = Number(val);
        } else {
          // Các dạng select hoặc chuỗi văn bản giữ nguyên
          payload[f.key] = val;
        }
      });

      // Gửi 'payload' đã xử lý lên backend thay vì 'formValues' thô
      const res = await scorePlugin(selectedPlugin, user, payload);
      setResult(res);
    } catch (e: any) {
      const detail = e.response?.data?.detail;

      if (typeof detail === "object" && detail !== null) {
        const errorMsg = detail.message || "Dữ liệu không hợp lệ";
        const validationErrors = detail.errors
          ? detail.errors.map((err: any) => `- ${err.message}`).join("\n")
          : "";

        setResult({
          error: validationErrors
            ? `${errorMsg}:\n${validationErrors}`
            : errorMsg,
        });
      } else {
        setResult({ error: detail || "Lỗi khi phân tích" });
      }
    } finally {
      setLoading(false);
    }
  };

  const renderField = (field: any) => {
    const val = formValues[field.key] ?? "";
    if (field.type === "boolean") {
      return (
        <View key={field.key} style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>{field.label}</Text>
          <View style={styles.pillRow}>
            {["true", "false"].map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[styles.optPill, val === opt && styles.optPillActive]}
                onPress={() =>
                  setFormValues((p: any) => ({ ...p, [field.key]: opt }))
                }
              >
                <Text
                  style={[
                    styles.optPillText,
                    val === opt && styles.optPillTextActive,
                  ]}
                >
                  {opt === "true" ? "Có" : "Không"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      );
    }
    if (field.type === "select") {
      return (
        <View key={field.key} style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>{field.label}</Text>
          <View style={styles.pillRow}>
            {field.options?.map((opt: any) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.optPill,
                  val === opt.value && styles.optPillActive,
                ]}
                onPress={() =>
                  setFormValues((p: any) => ({ ...p, [field.key]: opt.value }))
                }
              >
                <Text
                  style={[
                    styles.optPillText,
                    val === opt.value && styles.optPillTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      );
    }
    // number / text
    return (
      <View key={field.key} style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>
          {field.label}
          {field.required ? " *" : ""}
          {field.unit ? (
            <Text style={styles.unitInline}> ({field.unit})</Text>
          ) : null}
        </Text>
        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          value={String(val)}
          onChangeText={(v) =>
            setFormValues((p: any) => ({ ...p, [field.key]: v }))
          }
          placeholder={field.unit || "-"}
          placeholderTextColor={COLORS.textLight}
        />
      </View>
    );
  };

  if (loadingPlugins) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Đang tải plugin...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.pageTitle}>Phân Tích Nguy Cơ</Text>

      {/* Plugin selector */}
      <Text style={styles.sectionTitle}>Chọn bệnh cần phân tích</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.pluginRow}
      >
        {plugins.map((p) => (
          <TouchableOpacity
            key={p} // <-- Dùng trực tiếp chuỗi 'p' làm key
            style={[
              styles.pluginChip,
              selectedPlugin === p && styles.pluginChipActive,
            ]} // <-- So sánh trực tiếp với 'p'
            onPress={() => selectPlugin(p)} // <-- Truyền trực tiếp 'p' vào hàm
          >
            <Text
              style={[
                styles.pluginChipText,
                selectedPlugin === p && styles.pluginChipTextActive,
              ]}
            >
              {p.toUpperCase()}{" "}
              {/* <-- In hoa tên plugin để giao diện đẹp hơn (VD: DIABETES) */}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Dynamic form */}
      {metadata && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>{metadata.disease_info?.name}</Text>
          {(metadata.fields || []).map(renderField)}

          <TouchableOpacity
            style={[styles.analyzeBtn, loading && styles.analyzeBtnDisabled]}
            onPress={handleAnalyze}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.analyzeBtnText}>🔍 Phân tích nguy cơ</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Results */}
      {result?.error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{result.error}</Text>
        </View>
      )}
      {result && !result.error && (
        <View>
          <Text style={styles.sectionTitle}>Kết quả phân tích</Text>
          <RuleCard data={result.rule_based} />
          <AICard data={result.ai_based} />
          <RecsCard recs={result.recommendations} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: COLORS.background },
  container: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { color: COLORS.textSub, fontSize: FONTS.base },
  pageTitle: {
    fontSize: FONTS.xl,
    fontWeight: "800",
    color: COLORS.secondary,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: FONTS.md,
    fontWeight: "700",
    color: COLORS.secondary,
    marginBottom: 10,
    marginTop: 4,
  },
  pluginRow: { marginBottom: 16 },
  pluginChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    marginRight: 8,
  },
  pluginChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  pluginChipText: {
    fontSize: FONTS.sm,
    color: COLORS.textSub,
    fontWeight: "600",
  },
  pluginChipTextActive: { color: "#fff" },
  formCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  formTitle: {
    fontSize: FONTS.md,
    fontWeight: "700",
    color: COLORS.secondary,
    marginBottom: 12,
  },
  fieldRow: { marginBottom: 14 },
  fieldLabel: {
    fontSize: FONTS.sm,
    fontWeight: "600",
    color: COLORS.secondary,
    marginBottom: 6,
  },
  unitInline: { color: COLORS.textSub, fontWeight: "400" },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    padding: 10,
    fontSize: FONTS.base,
    color: COLORS.textMain,
  },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  optPill: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#f8fafc",
  },
  optPillActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  optPillText: { fontSize: FONTS.sm, color: COLORS.textSub },
  optPillTextActive: { color: "#fff", fontWeight: "600" },
  analyzeBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    padding: 14,
    alignItems: "center",
    marginTop: 16,
  },
  analyzeBtnDisabled: { opacity: 0.6 },
  analyzeBtnText: { color: "#fff", fontSize: FONTS.md, fontWeight: "700" },
  resultCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  cardEngine: {
    fontSize: FONTS.base,
    fontWeight: "700",
    color: COLORS.secondary,
  },
  cardScore: { fontSize: FONTS.lg, fontWeight: "800" },
  barTrack: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    marginBottom: 12,
    overflow: "hidden",
  },
  barFill: { height: "100%", borderRadius: 4 },
  levelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  levelLabel: { fontSize: FONTS.sm, color: COLORS.textSub },
  pill: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
  },
  pillText: { fontSize: FONTS.sm, fontWeight: "700" },
  confidence: { fontSize: FONTS.sm, color: COLORS.textSub, marginTop: 8 },
  rulesBox: {
    marginTop: 12,
    backgroundColor: "#f8fafc",
    borderRadius: RADIUS.sm,
    padding: 10,
  },
  rulesHeading: {
    fontSize: FONTS.sm,
    fontWeight: "700",
    color: COLORS.secondary,
    marginBottom: 6,
  },
  ruleItem: { fontSize: FONTS.sm, color: COLORS.textSub, marginBottom: 3 },
  partialBox: {
    backgroundColor: "#fffbeb",
    borderRadius: RADIUS.sm,
    padding: 12,
    marginTop: 8,
  },
  partialText: { fontSize: FONTS.sm, color: "#92400e" },
  missingText: { fontSize: FONTS.sm, color: COLORS.textSub, marginTop: 4 },
  recsTitle: {
    fontSize: FONTS.base,
    fontWeight: "700",
    color: COLORS.secondary,
    marginBottom: 12,
  },
  recItem: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 8,
    alignItems: "flex-start",
  },
  recNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  recNumText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  recText: {
    flex: 1,
    fontSize: FONTS.sm,
    color: COLORS.textSub,
    lineHeight: 20,
  },
  errorBox: {
    backgroundColor: "#fef2f2",
    borderRadius: RADIUS.sm,
    padding: 14,
    marginBottom: 12,
  },
  errorText: { color: "#b91c1c", fontSize: FONTS.sm },
});
