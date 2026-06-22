import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { COLORS, FONTS, RADIUS, SPACING } from "../../../constants/appTheme";

export type PillOption = {
  label: string;
  value: string;
};

type PillGroupProps = {
  options: PillOption[];
  value: string;
  onChange: (value: string) => void;
};

export function PillGroup({ options, value, onChange }: PillGroupProps) {
  return (
    <View style={styles.row}>
      {options.map((option) => {
        const active = value === option.value;

        return (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            activeOpacity={0.85}
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.pill, active && styles.pillActive]}
          >
            <Text style={[styles.text, active && styles.textActive]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    minHeight: 40,
    justifyContent: "center",
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  pillActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  text: {
    color: COLORS.textSub,
    fontSize: FONTS.sm,
    fontWeight: "600",
  },
  textActive: {
    color: "#fff",
  },
});
