import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { COLORS, FONTS, RADIUS, SPACING } from "../../constants/appTheme";
import { AppCard } from "../components/ui/AppCard";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { useAuth } from "../context/AuthContext";

type Feature = {
  color: string;
  desc: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  route: string;
  title: string;
};

const FEATURES: Feature[] = [
  {
    icon: "chart-box",
    title: "Phân tích nguy cơ",
    desc: "Đánh giá nguy cơ bệnh mạn tính từ hồ sơ sức khỏe.",
    route: "/(tabs)/phan-tich-benh",
    color: COLORS.primary,
  },
  {
    icon: "clipboard-pulse",
    title: "Hồ sơ sức khỏe",
    desc: "Cập nhật chỉ số cá nhân, xét nghiệm và thói quen sống.",
    route: "/(tabs)/ho-so-suc-khoe",
    color: COLORS.accent,
  },
  {
    icon: "pill",
    title: "Tra cứu thuốc",
    desc: "Tìm công dụng, liều dùng và tác dụng phụ thường gặp.",
    route: "/(tabs)/tra-thuoc",
    color: COLORS.warning,
  },
];

const DISEASES = [
  { icon: "diabetes", name: "Tiểu đường type 2", color: "#dbeafe" },
  { icon: "heart-pulse", name: "Tim mạch", color: "#fee2e2" },
  { icon: "water-percent", name: "Tăng huyết áp", color: "#fef3c7" },
  { icon: "water", name: "Thận mạn tính", color: "#d1fae5" },
  { icon: "brain", name: "Đột quỵ", color: "#ede9fe" },
] as const;

export default function TrangChuScreen() {
  const { user, logout } = useAuth();
  const [hoTen, setHoTen] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem("hoTen").then((name) => setHoTen(name || user));
  }, [user]);

  const displayName = useMemo(() => hoTen || "bạn", [hoTen]);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <View>
          <Text style={styles.greetHi}>Xin chào,</Text>
          <Text style={styles.greetName}>{displayName}</Text>
          <Text style={styles.greetSub}>
            Theo dõi hồ sơ và phân tích nguy cơ sức khỏe của bạn mỗi ngày.
          </Text>
        </View>
        <View style={styles.heroIcon}>
          <MaterialCommunityIcons color="#fff" name="heart-pulse" size={32} />
        </View>
      </View>

      <AppCard style={styles.actionCard}>
        <View style={styles.actionHeader}>
          <View style={styles.actionIcon}>
            <MaterialCommunityIcons color={COLORS.primary} name="clipboard-check" size={24} />
          </View>
          <View style={styles.actionText}>
            <Text style={styles.actionTitle}>Bước tiếp theo</Text>
            <Text style={styles.actionSub}>
              Cập nhật hồ sơ trước khi phân tích để kết quả chính xác hơn.
            </Text>
          </View>
        </View>
        <PrimaryButton onPress={() => router.push("/(tabs)/ho-so-suc-khoe")}>
          Cập nhật hồ sơ
        </PrimaryButton>
      </AppCard>

      <Text style={styles.sectionTitle}>Chức năng chính</Text>
      {FEATURES.map((feature) => (
        <TouchableOpacity
          activeOpacity={0.85}
          key={feature.route}
          onPress={() => router.push(feature.route as never)}
          style={styles.featureCard}
        >
          <View style={[styles.featureIcon, { backgroundColor: feature.color + "1f" }]}>
            <MaterialCommunityIcons color={feature.color} name={feature.icon} size={26} />
          </View>
          <View style={styles.featureText}>
            <Text style={styles.featureTitle}>{feature.title}</Text>
            <Text style={styles.featureDesc}>{feature.desc}</Text>
          </View>
          <MaterialCommunityIcons color={COLORS.textLight} name="chevron-right" size={24} />
        </TouchableOpacity>
      ))}

      <Text style={styles.sectionTitle}>Bệnh được hỗ trợ</Text>
      <View style={styles.diseaseRow}>
        {DISEASES.map((disease) => (
          <View key={disease.name} style={[styles.diseaseChip, { backgroundColor: disease.color }]}>
            <MaterialCommunityIcons color={COLORS.secondary} name={disease.icon} size={16} />
            <Text style={styles.diseaseName}>{disease.name}</Text>
          </View>
        ))}
      </View>

      <PrimaryButton variant="danger" onPress={logout}>
        Đăng xuất
      </PrimaryButton>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  actionCard: {
    gap: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  actionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: SPACING.md,
  },
  actionIcon: {
    alignItems: "center",
    backgroundColor: COLORS.primarySoft,
    borderRadius: RADIUS.md,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  actionSub: {
    color: COLORS.textSub,
    fontSize: FONTS.sm,
    lineHeight: 20,
    marginTop: 2,
  },
  actionText: {
    flex: 1,
  },
  actionTitle: {
    color: COLORS.secondary,
    fontSize: FONTS.base,
    fontWeight: "800",
  },
  container: {
    padding: SPACING.lg,
    paddingBottom: 36,
  },
  diseaseChip: {
    alignItems: "center",
    borderRadius: RADIUS.xl,
    flexDirection: "row",
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  diseaseName: {
    color: COLORS.secondary,
    fontSize: FONTS.sm,
    fontWeight: "700",
  },
  diseaseRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  featureCard: {
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    flexDirection: "row",
    gap: SPACING.md,
    marginBottom: SPACING.md,
    padding: SPACING.lg,
  },
  featureDesc: {
    color: COLORS.textSub,
    fontSize: FONTS.sm,
    lineHeight: 20,
    marginTop: 2,
  },
  featureIcon: {
    alignItems: "center",
    borderRadius: RADIUS.md,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    color: COLORS.secondary,
    fontSize: FONTS.base,
    fontWeight: "800",
  },
  greetHi: {
    color: "rgba(255,255,255,0.82)",
    fontSize: FONTS.base,
  },
  greetName: {
    color: "#fff",
    fontSize: FONTS.xl,
    fontWeight: "800",
    marginTop: 2,
  },
  greetSub: {
    color: "rgba(255,255,255,0.82)",
    fontSize: FONTS.sm,
    lineHeight: 20,
    marginTop: SPACING.sm,
    maxWidth: 260,
  },
  hero: {
    alignItems: "flex-start",
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SPACING.lg,
    padding: SPACING.xl,
  },
  heroIcon: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: RADIUS.xl,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  scroll: {
    backgroundColor: COLORS.background,
    flex: 1,
  },
  sectionTitle: {
    color: COLORS.secondary,
    fontSize: FONTS.md,
    fontWeight: "800",
    marginBottom: SPACING.md,
    marginTop: SPACING.xs,
  },
});
