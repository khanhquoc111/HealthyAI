// src/screens/DangKyScreen.jsx
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
import { register } from "../api/authApi";
import { router } from "expo-router";
import { COLORS, FONTS, RADIUS } from "../../constants/appTheme";

export default function DangKyScreen() {
  const [form, setForm] = useState({
    tenDangNhap: "",
    hoTen: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleRegister = async () => {
    if (!form.tenDangNhap || !form.password || !form.hoTen) {
      setError("Vui lòng điền đầy đủ các trường bắt buộc.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await register(form);
      setSuccess("✅ Đăng ký thành công! Đang chuyển đến trang đăng nhập...");
      setTimeout(() => router.replace("/(auth)/dang-nhap"), 1500);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Đã xảy ra lỗi khi đăng ký!");
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    {
      key: "tenDangNhap",
      label: "Tên đăng nhập *",
      placeholder: "Nhập tên đăng nhập",
    },
    { key: "hoTen", label: "Họ và tên *", placeholder: "Nhập họ và tên" },
    { key: "email", label: "Email", placeholder: "Nhập email (tuỳ chọn)" },
    {
      key: "password",
      label: "Mật khẩu *",
      placeholder: "Nhập mật khẩu",
      secure: true,
    },
    {
      key: "confirmPassword",
      label: "Xác nhận mật khẩu *",
      placeholder: "Nhập lại mật khẩu",
      secure: true,
    },
  ];

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.title}>Tạo Tài Khoản</Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {success ? <Text style={styles.success}>{success}</Text> : null}

          {fields.map(({ key, label, placeholder, secure }) => (
            <View key={key}>
              <Text style={styles.label}>{label}</Text>
              <TextInput
                style={styles.input}
                placeholder={placeholder}
                placeholderTextColor={COLORS.textLight}
                secureTextEntry={!!secure}
                autoCapitalize="none"
                onChangeText={(v) =>
                  setForm({ ...form, [key as keyof typeof form]: v })
                }
              />
            </View>
          ))}

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Đăng Ký</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.switchText}>
              Đã có tài khoản? <Text style={styles.switchLink}>Đăng nhập</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
    paddingVertical: 40,
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
  success: {
    backgroundColor: "#f0fdf4",
    color: "#15803d",
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
