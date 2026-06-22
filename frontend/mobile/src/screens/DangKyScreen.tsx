import { useRef, useState } from "react";
import {
  KeyboardTypeOptions,
  KeyboardAvoidingView,
  Platform,
  ScrollView as ScrollViewType,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
} from "react-native";
import { router } from "expo-router";
import { COLORS, FONTS, SHADOW, RADIUS, SPACING } from "../../constants/appTheme";
import { register } from "../api/authApi";
import { AppCard } from "../components/ui/AppCard";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { StatusMessage } from "../components/ui/StatusMessage";

type RegisterField = {
  key: keyof RegisterForm;
  keyboardType?: KeyboardTypeOptions;
  label: string;
  placeholder: string;
  secure?: boolean;
  textContentType?: TextInputProps["textContentType"];
};

type RegisterForm = {
  confirmPassword: string;
  email: string;
  hoTen: string;
  password: string;
  tenDangNhap: string;
};

const FIELDS: RegisterField[] = [
  { key: "tenDangNhap", label: "Tên đăng nhập *", placeholder: "Nhập tên đăng nhập", textContentType: "username" },
  { key: "hoTen", label: "Họ và tên *", placeholder: "Nhập họ và tên", textContentType: "name" },
  { key: "email", label: "Email", placeholder: "Nhập email (tùy chọn)", keyboardType: "email-address", textContentType: "emailAddress" },
  { key: "password", label: "Mật khẩu *", placeholder: "Nhập mật khẩu", secure: true, textContentType: "newPassword" },
  { key: "confirmPassword", label: "Xác nhận mật khẩu *", placeholder: "Nhập lại mật khẩu", secure: true, textContentType: "newPassword" },
];

export default function DangKyScreen() {
  const scrollRef = useRef<ScrollViewType>(null);
  const [form, setForm] = useState<RegisterForm>({
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
      setSuccess("Đăng ký thành công. Đang chuyển đến trang đăng nhập...");
      setTimeout(() => router.replace("/(auth)/dang-nhap"), 1500);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Đã xảy ra lỗi khi đăng ký.");
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
        <AppCard style={styles.card}>
          <Text style={styles.title}>Tạo tài khoản</Text>
          <Text style={styles.subtitle}>Dùng tài khoản này để lưu hồ sơ sức khỏe và kết quả phân tích.</Text>

          {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
          {success ? <StatusMessage type="success">{success}</StatusMessage> : null}

          {FIELDS.map(({ key, label, placeholder, secure, keyboardType, textContentType }) => (
            <TouchableOpacity activeOpacity={1} key={key}>
              <Text style={styles.label}>{label}</Text>
              <TextInput
                autoCapitalize="none"
                keyboardType={(keyboardType as any) || "default"}
                onChangeText={(value) => setForm({ ...form, [key]: value })}
                onFocus={() => {
                  if (secure || key === "confirmPassword") {
                    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
                  }
                }}
                placeholder={placeholder}
                placeholderTextColor={COLORS.textLight}
                secureTextEntry={!!secure}
                style={styles.input}
                textContentType={textContentType}
                value={form[key]}
              />
            </TouchableOpacity>
          ))}

          <PrimaryButton loading={loading} onPress={handleRegister} style={styles.button}>
            Đăng ký
          </PrimaryButton>

          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.switchText}>
              Đã có tài khoản? <Text style={styles.switchLink}>Đăng nhập</Text>
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
    paddingBottom: 140,
    paddingTop: 40,
  },
  flex: {
    backgroundColor: COLORS.background,
    flex: 1,
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
  subtitle: {
    color: COLORS.textSub,
    fontSize: FONTS.sm,
    lineHeight: 20,
    marginBottom: SPACING.md,
    marginTop: -8,
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
