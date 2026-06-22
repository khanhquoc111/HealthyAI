import { ReactNode } from "react";
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  ViewStyle,
} from "react-native";
import { COLORS, FONTS, RADIUS, SPACING } from "../../../constants/appTheme";

type PrimaryButtonProps = {
  children: ReactNode;
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  variant?: "primary" | "outline" | "danger";
};

export function PrimaryButton({
  children,
  disabled,
  loading,
  onPress,
  style,
  variant = "primary",
}: PrimaryButtonProps) {
  const isOutline = variant === "outline";
  const isDanger = variant === "danger";

  return (
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={0.85}
      disabled={disabled || loading}
      onPress={onPress}
      style={[
        styles.button,
        isOutline && styles.outline,
        isDanger && styles.danger,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isOutline ? COLORS.primary : "#fff"} />
      ) : (
        <Text
          style={[
            styles.text,
            isOutline && styles.outlineText,
            isDanger && styles.dangerText,
          ]}
        >
          {children}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 13,
  },
  danger: {
    backgroundColor: COLORS.dangerSoft,
    borderColor: COLORS.danger,
    borderWidth: 1,
  },
  dangerText: {
    color: COLORS.danger,
  },
  disabled: {
    opacity: 0.65,
  },
  outline: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.primary,
    borderWidth: 1,
  },
  outlineText: {
    color: COLORS.primary,
  },
  text: {
    color: "#fff",
    fontSize: FONTS.md,
    fontWeight: "700",
  },
});
