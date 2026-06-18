// src/screens/TrangChuScreen.jsx
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { router } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { COLORS, FONTS, RADIUS } from "../../constants/appTheme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useState, useEffect } from "react";

const FEATURES = [
  { icon: "🩺", title: "Phân tích Nguy cơ",  desc: "Đánh giá nguy cơ 5 bệnh mạn tính bằng AI",  screen: "PhanTichBenh" },
  { icon: "📋", title: "Hồ sơ Sức khỏe",     desc: "Cập nhật chỉ số sinh hóa và thông tin cá nhân", screen: "HoSoSucKhoe" },
  { icon: "💊", title: "Tra cứu Thuốc",       desc: "Tìm kiếm thông tin thuốc và tác dụng phụ",  screen: "TraThuoc" },
];

const DISEASES = [
  { icon: "🩸", name: "Tiểu đường Type 2",  color: "#dbeafe" },
  { icon: "❤️", name: "Tim mạch",           color: "#fee2e2" },
  { icon: "🫀", name: "Tăng huyết áp",      color: "#fef3c7" },
  { icon: "🫘", name: "Thận mạn tính",       color: "#d1fae5" },
  { icon: "🧠", name: "Đột quỵ",            color: "#ede9fe" },
];

export default function TrangChuScreen() {
  const { user, logout } = useAuth();
  const [hoTen, setHoTen] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem("hoTen").then((name) => {
      // Nếu API có trả về họ tên thì dùng, nếu không thì hiện tên đăng nhập
      setHoTen(name || user); 
    });
  }, [user]);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      {/* Greeting */}
      <View style={styles.greetCard}>
        <Text style={styles.greetHi}>Xin chào, 👋</Text>
        <Text style={styles.greetName}>{hoTen}</Text>
        <Text style={styles.greetSub}>Hãy theo dõi sức khỏe của bạn mỗi ngày</Text>
      </View>

      {/* Feature cards */}
      <Text style={styles.sectionTitle}>Chức năng chính</Text>
      {FEATURES.map((f) => (
        <TouchableOpacity
          key={f.screen}
          style={styles.featureCard}
          onPress={() => router.push(`/(tabs)/${f.screen.replace(/([A-Z])/g, '-$1').toLowerCase().slice(1)}` as any)}
          activeOpacity={0.8}
        >
          <Text style={styles.featureIcon}>{f.icon}</Text>
          <View style={styles.featureText}>
            <Text style={styles.featureTitle}>{f.title}</Text>
            <Text style={styles.featureDesc}>{f.desc}</Text>
          </View>
          <Text style={styles.featureArrow}>›</Text>
        </TouchableOpacity>
      ))}

      {/* Disease chips */}
      <Text style={styles.sectionTitle}>Bệnh được hỗ trợ</Text>
      <View style={styles.diseaseRow}>
        {DISEASES.map((d) => (
          <View key={d.name} style={[styles.diseaseChip, { backgroundColor: d.color }]}>
            <Text style={styles.diseaseIcon}>{d.icon}</Text>
            <Text style={styles.diseaseName}>{d.name}</Text>
          </View>
        ))}
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>Đăng xuất</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll:        { flex: 1, backgroundColor: COLORS.background },
  container:     { padding: 16, paddingBottom: 32 },
  greetCard:     { backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, padding: 20, marginBottom: 20 },
  greetHi:       { color: "rgba(255,255,255,0.8)", fontSize: FONTS.base },
  greetName:     { color: "#fff", fontSize: FONTS.xl, fontWeight: "800", marginTop: 2 },
  greetSub:      { color: "rgba(255,255,255,0.75)", fontSize: FONTS.sm, marginTop: 6 },
  sectionTitle:  { fontSize: FONTS.md, fontWeight: "700", color: COLORS.secondary, marginBottom: 10, marginTop: 4 },
  featureCard:   { backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: 16, marginBottom: 10, flexDirection: "row", alignItems: "center", elevation: 2, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  featureIcon:   { fontSize: 28, marginRight: 14 },
  featureText:   { flex: 1 },
  featureTitle:  { fontSize: FONTS.base, fontWeight: "700", color: COLORS.secondary },
  featureDesc:   { fontSize: FONTS.sm, color: COLORS.textSub, marginTop: 2 },
  featureArrow:  { fontSize: 24, color: COLORS.textLight },
  diseaseRow:    { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 24 },
  diseaseChip:   { flexDirection: "row", alignItems: "center", borderRadius: RADIUS.xl, paddingVertical: 6, paddingHorizontal: 12, gap: 4 },
  diseaseIcon:   { fontSize: 14 },
  diseaseName:   { fontSize: FONTS.sm, fontWeight: "600", color: COLORS.secondary },
  logoutBtn:     { borderWidth: 1, borderColor: COLORS.danger, borderRadius: RADIUS.sm, padding: 13, alignItems: "center" },
  logoutText:    { color: COLORS.danger, fontWeight: "600", fontSize: FONTS.base },
});
