// src/screens/TraThuocScreen.jsx
import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { searchMedicine } from "../api/healthApi";
import { COLORS, FONTS, RADIUS } from "../../constants/appTheme";

export default function TraThuocScreen() {
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    const q = keyword.trim();
    if (!q) return;
    setLoading(true);
    setError("");
    setSearched(true);
    try {
      const data = await searchMedicine(q);
      setResults(data.results || data.medicines || []);
    } catch {
      setError("Không thể kết nối tới máy chủ.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: any) => (
    <View style={styles.card}>
      <Text style={styles.drugName}>
        {item.name || item.drug_name || item.tenThuoc}
      </Text>
      {item.uses || item.congDung ? (
        <View style={styles.section}>
          <Text style={styles.secLabel}>Công dụng</Text>
          <Text style={styles.secValue}>{item.uses || item.congDung}</Text>
        </View>
      ) : null}
      {item.side_effects || item.tacDungPhu ? (
        <View style={styles.section}>
          <Text style={styles.secLabel}>Tác dụng phụ</Text>
          <Text style={styles.secValue}>
            {item.side_effects || item.tacDungPhu}
          </Text>
        </View>
      ) : null}
      {item.dosage || item.lieuDung ? (
        <View style={styles.section}>
          <Text style={styles.secLabel}>Liều dùng</Text>
          <Text style={styles.secValue}>{item.dosage || item.lieuDung}</Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={styles.flex}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.input}
          placeholder="Nhập tên thuốc cần tra cứu..."
          placeholderTextColor={COLORS.textLight}
          value={keyword}
          onChangeText={setKeyword}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
          <Text style={styles.searchBtnText}>Tra</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!loading && searched && results.length === 0 && !error && (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>💊</Text>
          <Text style={styles.emptyText}>Không tìm thấy thuốc phù hợp.</Text>
        </View>
      )}

      {!loading && !searched && (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyText}>
            Nhập tên thuốc để tra cứu thông tin
          </Text>
        </View>
      )}

      <FlatList
        data={results}
        keyExtractor={(_, i) => String(i)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },
  searchBar: {
    flexDirection: "row",
    padding: 16,
    gap: 10,
    backgroundColor: COLORS.card,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    padding: 10,
    fontSize: FONTS.base,
    color: COLORS.textMain,
  },
  searchBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 18,
    justifyContent: "center",
  },
  searchBtnText: { color: "#fff", fontWeight: "700", fontSize: FONTS.base },
  list: { padding: 16 },
  card: {
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
  drugName: {
    fontSize: FONTS.md,
    fontWeight: "800",
    color: COLORS.secondary,
    marginBottom: 10,
  },
  section: { marginTop: 8 },
  secLabel: {
    fontSize: FONTS.sm,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: 2,
  },
  secValue: { fontSize: FONTS.sm, color: COLORS.textSub, lineHeight: 20 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingTop: 60,
  },
  emptyIcon: { fontSize: 40 },
  emptyText: {
    fontSize: FONTS.base,
    color: COLORS.textSub,
    textAlign: "center",
  },
  error: { color: COLORS.danger, padding: 16, textAlign: "center" },
});
