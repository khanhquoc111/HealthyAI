import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS, FONTS, RADIUS, SHADOW, SPACING } from "../../constants/appTheme";
import { searchMedicine } from "../api/healthApi";
import { AppCard } from "../components/ui/AppCard";
import { StatusMessage } from "../components/ui/StatusMessage";

export default function TraThuocScreen() {
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    const query = keyword.trim();
    if (!query || loading) return;
    setLoading(true);
    setError("");
    setSearched(true);
    try {
      const data = await searchMedicine(query);
      setResults(data.results || data.medicines || []);
    } catch {
      setError("Không thể kết nối tới máy chủ. Vui lòng thử lại.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setKeyword("");
    setResults([]);
    setError("");
    setSearched(false);
  };

  const renderItem = ({ item }: any) => (
    <AppCard style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.drugIcon}>
          <MaterialCommunityIcons color={COLORS.primary} name="pill" size={22} />
        </View>
        <Text style={styles.drugName}>{item.name || item.drug_name || item.tenThuoc}</Text>
      </View>

      {item.uses || item.congDung ? (
        <InfoSection label="Công dụng" value={item.uses || item.congDung} />
      ) : null}
      {item.dosage || item.lieuDung ? (
        <InfoSection label="Liều dùng" value={item.dosage || item.lieuDung} />
      ) : null}
      {item.side_effects || item.tacDungPhu ? (
        <InfoSection label="Tác dụng phụ" tone="warning" value={item.side_effects || item.tacDungPhu} />
      ) : null}
    </AppCard>
  );

  return (
    <View style={styles.flex}>
      <View style={styles.searchPanel}>
        <Text style={styles.title}>Tra cứu thuốc</Text>
        <Text style={styles.subtitle}>Nhập tên thuốc để xem công dụng, liều dùng và lưu ý thường gặp.</Text>
        <View style={styles.searchBar}>
          <MaterialCommunityIcons color={COLORS.textSub} name="magnify" size={22} />
          <TextInput
            autoCapitalize="none"
            onChangeText={setKeyword}
            onSubmitEditing={handleSearch}
            placeholder="Tên thuốc cần tra cứu"
            placeholderTextColor={COLORS.textLight}
            returnKeyType="search"
            style={styles.input}
            value={keyword}
          />
          {keyword ? (
            <TouchableOpacity accessibilityLabel="Xóa tìm kiếm" onPress={clearSearch} style={styles.clearBtn}>
              <MaterialCommunityIcons color={COLORS.textSub} name="close-circle" size={20} />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.85}
            disabled={!keyword.trim() || loading}
            onPress={handleSearch}
            style={[styles.searchBtn, (!keyword.trim() || loading) && styles.searchBtnDisabled]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <MaterialCommunityIcons color="#fff" name="arrow-right" size={20} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {error ? <StatusMessage type="error">{error}</StatusMessage> : null}

      {!loading && !searched ? (
        <EmptyState
          icon="text-search"
          text="Bắt đầu bằng tên thuốc bạn muốn kiểm tra."
        />
      ) : null}

      {!loading && searched && results.length === 0 && !error ? (
        <EmptyState icon="pill-off" text="Không tìm thấy thuốc phù hợp." />
      ) : null}

      <FlatList
        contentContainerStyle={styles.list}
        data={results}
        keyExtractor={(_, index) => String(index)}
        keyboardShouldPersistTaps="handled"
        renderItem={renderItem}
      />
    </View>
  );
}

function InfoSection({
  label,
  tone,
  value,
}: {
  label: string;
  tone?: "warning";
  value: string;
}) {
  return (
    <View style={styles.section}>
      <Text style={[styles.secLabel, tone === "warning" && styles.secLabelWarning]}>{label}</Text>
      <Text style={styles.secValue}>{value}</Text>
    </View>
  );
}

function EmptyState({
  icon,
  text,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  text: string;
}) {
  return (
    <View style={styles.center}>
      <View style={styles.emptyIcon}>
        <MaterialCommunityIcons color={COLORS.primary} name={icon} size={34} />
      </View>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: SPACING.md,
  },
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  center: {
    alignItems: "center",
    gap: SPACING.md,
    justifyContent: "center",
    paddingHorizontal: SPACING.xl,
    paddingTop: 72,
  },
  clearBtn: {
    padding: 4,
  },
  drugIcon: {
    alignItems: "center",
    backgroundColor: COLORS.primarySoft,
    borderRadius: RADIUS.md,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  drugName: {
    color: COLORS.secondary,
    flex: 1,
    fontSize: FONTS.md,
    fontWeight: "800",
  },
  emptyIcon: {
    alignItems: "center",
    backgroundColor: COLORS.primarySoft,
    borderRadius: RADIUS.xl,
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  emptyText: {
    color: COLORS.textSub,
    fontSize: FONTS.base,
    lineHeight: 22,
    textAlign: "center",
  },
  flex: {
    backgroundColor: COLORS.background,
    flex: 1,
  },
  input: {
    color: COLORS.textMain,
    flex: 1,
    fontSize: FONTS.base,
    minHeight: 44,
    paddingVertical: SPACING.sm,
  },
  list: {
    padding: SPACING.lg,
    paddingTop: SPACING.md,
  },
  searchBar: {
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: SPACING.sm,
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.md,
    ...SHADOW.card,
  },
  searchBtn: {
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    height: 38,
    justifyContent: "center",
    width: 42,
  },
  searchBtnDisabled: {
    opacity: 0.55,
  },
  searchPanel: {
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  secLabel: {
    color: COLORS.primary,
    fontSize: FONTS.sm,
    fontWeight: "800",
    marginBottom: 3,
  },
  secLabelWarning: {
    color: "#b45309",
  },
  secValue: {
    color: COLORS.textSub,
    fontSize: FONTS.sm,
    lineHeight: 20,
  },
  section: {
    marginTop: SPACING.md,
  },
  subtitle: {
    color: COLORS.textSub,
    fontSize: FONTS.sm,
    lineHeight: 20,
    marginTop: 4,
  },
  title: {
    color: COLORS.secondary,
    fontSize: FONTS.xl,
    fontWeight: "800",
  },
});
