import { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView as ScrollViewType,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { COLORS, FONTS, RADIUS, SHADOW, SPACING } from "../../constants/appTheme";
import { login } from "../api/authApi";
import { AppCard } from "../components/ui/AppCard";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { StatusMessage } from "../components/ui/StatusMessage";
import { useAuth } from "../context/AuthContext";

export default function DangNhapScreen() {
  const { setUser } = useAuth();
  const scrollRef = useRef<ScrollViewType>(null);
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
      setError(
        err?.response?.data?.detail ||
          err?.message ||
          "Đã xảy ra lỗi kết nối với máy chủ.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0}
      style={styles.flex}
    >
      <ScrollView
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.logoMark}>
            <MaterialCommunityIcons color="#fff" name="heart-pulse" size={34} />
          </View>
          <Text style={styles.logo}>HealthyAI</Text>
          <Text style={styles.subtitle}>Theo dõi hồ sơ và đánh giá nguy cơ bệnh mạn tính.</Text>
        </View>

        <AppCard style={styles.card}>
          <Text style={styles.title}>Đăng nhập</Text>

          {error ? <StatusMessage type="error">{error}</StatusMessage> : null}

          <Text style={styles.label}>Tên đăng nhập</Text>
          <TextInput
            autoCapitalize="none"
            onChangeText={(value) => setForm({ ...form, tenDangNhap: value })}
            placeholder="Nhập tên đăng nhập"
            placeholderTextColor={COLORS.textLight}
            style={styles.input}
            textContentType="username"
            value={form.tenDangNhap}
          />

          <Text style={styles.label}>Mật khẩu</Text>
          <TextInput
            onChangeText={(value) => setForm({ ...form, password: value })}
            onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120)}
            placeholder="Nhập mật khẩu"
            placeholderTextColor={COLORS.textLight}
            secureTextEntry
            style={styles.input}
            textContentType="password"
            value={form.password}
          />

          <PrimaryButton loading={loading} onPress={handleLogin} style={styles.button}>
            Đăng nhập
          </PrimaryButton>

          <TouchableOpacity onPress={() => router.push("/(auth)/dang-ky")}>
            <Text style={styles.switchText}>
              Chưa có tài khoản? <Text style={styles.switchLink}>Đăng ký ngay</Text>
            </Text>
          </TouchableOpacity>
        </AppCard>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  button: {
    marginTop: SPACING.xl,
  },
  card: {
    padding: SPACING.xxl,
    ...SHADOW.lift,
  },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: SPACING.xxl,
    paddingBottom: 120,
    paddingTop: 48,
  },
  flex: {
    backgroundColor: COLORS.background,
    flex: 1,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  input: {
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    color: COLORS.textMain,
    fontSize: FONTS.base,
    minHeight: 48,
    padding: SPACING.md,
  },
  label: {
    color: COLORS.secondary,
    fontSize: FONTS.sm,
    fontWeight: "700",
    marginBottom: 6,
    marginTop: SPACING.md,
  },
  logo: {
    color: COLORS.primary,
    fontSize: FONTS.xxl,
    fontWeight: "900",
    marginTop: SPACING.md,
  },
  logoMark: {
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.xl,
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  subtitle: {
    color: COLORS.textSub,
    fontSize: FONTS.sm,
    lineHeight: 20,
    marginTop: SPACING.sm,
    textAlign: "center",
  },
  switchLink: {
    color: COLORS.primary,
    fontWeight: "800",
  },
  switchText: {
    color: COLORS.textSub,
    fontSize: FONTS.sm,
    marginTop: SPACING.lg,
    textAlign: "center",
  },
  title: {
    color: COLORS.secondary,
    fontSize: FONTS.xl,
    fontWeight: "800",
    marginBottom: SPACING.lg,
    textAlign: "center",
  },
});
