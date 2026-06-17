// src/screens/DangNhapScreen.jsx
import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { login } from "../api/authApi";
import { router } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { COLORS, FONTS, RADIUS } from "../../constants/appTheme";

export default function DangNhapScreen() {
  const { setUser } = useAuth();
  const [form, setForm] = useState({ tenDangNhap: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!form.tenDangNhap || !form.password) {
      setError("Vui lòng điền đầy đủ thông tin.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const data = await login(form.tenDangNhap, form.password);
      setUser(data.tenDangNhap);
    } catch (err: any) {
      console.log("LOGIN ERROR:", JSON.stringify(err?.response?.data));
      console.log("LOGIN MESSAGE:", err?.message);
      console.log("LOGIN CODE:", err?.code);
      setError(
        err?.response?.data?.detail ||
          err?.message ||
          "Đã xảy ra lỗi kết nối với máy chủ!",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>🏥 HealthyAI</Text>
          <Text style={styles.subtitle}>
            Hệ thống đánh giá nguy cơ bệnh mạn tính
          </Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.title}>Đăng Nhập</Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Text style={styles.label}>Tên đăng nhập</Text>
          <TextInput
            style={styles.input}
            placeholder="Nhập tên đăng nhập"
            placeholderTextColor={COLORS.textLight}
            autoCapitalize="none"
            value={form.tenDangNhap}
            onChangeText={(v) => setForm({ ...form, tenDangNhap: v })}
          />

          <Text style={styles.label}>Mật khẩu</Text>
          <TextInput
            style={styles.input}
            placeholder="Nhập mật khẩu"
            placeholderTextColor={COLORS.textLight}
            secureTextEntry
            value={form.password}
            onChangeText={(v) => setForm({ ...form, password: v })}
          />

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Đăng Nhập</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push("/(auth)/dang-ky")}>
            <Text style={styles.switchText}>
              Chưa có tài khoản?{" "}
              <Text style={styles.switchLink}>Đăng ký ngay</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },
  container: { flexGrow: 1, justifyContent: "center", padding: 24 },
  header: { alignItems: "center", marginBottom: 32 },
  logo: { fontSize: FONTS.xxl, fontWeight: "800", color: COLORS.primary },
  subtitle: {
    fontSize: FONTS.sm,
    color: COLORS.textSub,
    marginTop: 6,
    textAlign: "center",
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: 24,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  title: {
    fontSize: FONTS.xl,
    fontWeight: "700",
    color: COLORS.secondary,
    marginBottom: 20,
    textAlign: "center",
  },
  error: {
    backgroundColor: "#fef2f2",
    color: "#b91c1c",
    padding: 10,
    borderRadius: RADIUS.sm,
    marginBottom: 14,
    textAlign: "center",
    fontSize: FONTS.sm,
  },
  label: {
    fontSize: FONTS.sm,
    fontWeight: "600",
    color: COLORS.secondary,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    padding: 12,
    fontSize: FONTS.base,
    color: COLORS.textMain,
  },
  btn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    padding: 14,
    alignItems: "center",
    marginTop: 20,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontSize: FONTS.md, fontWeight: "700" },
  switchText: {
    textAlign: "center",
    marginTop: 18,
    color: COLORS.textSub,
    fontSize: FONTS.sm,
  },
  switchLink: { color: COLORS.primary, fontWeight: "600" },
});
