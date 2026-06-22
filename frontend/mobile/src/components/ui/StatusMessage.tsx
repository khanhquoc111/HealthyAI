import { StyleSheet, Text } from "react-native";
import { COLORS, FONTS, RADIUS, SPACING } from "../../../constants/appTheme";

type StatusMessageProps = {
  children: string;
  type: "error" | "success" | "warning";
};

export function StatusMessage({ children, type }: StatusMessageProps) {
  return <Text style={[styles.message, styles[type]]}>{children}</Text>;
}

const styles = StyleSheet.create({
  error: {
    backgroundColor: COLORS.dangerSoft,
    color: "#b91c1c",
  },
  message: {
    borderRadius: RADIUS.sm,
    fontSize: FONTS.sm,
    lineHeight: 20,
    marginBottom: SPACING.md,
    padding: SPACING.md,
    textAlign: "center",
  },
  success: {
    backgroundColor: COLORS.successSoft,
    color: "#15803d",
  },
  warning: {
    backgroundColor: COLORS.warningSoft,
    color: "#92400e",
  },
});
