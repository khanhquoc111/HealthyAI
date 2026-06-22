export const COLORS = {
  primary: "#2563eb",
  primaryDark: "#1d4ed8",
  primarySoft: "#dbeafe",
  accent: "#0f766e",
  accentSoft: "#ccfbf1",
  secondary: "#0f172a",
  success: "#22c55e",
  successSoft: "#dcfce7",
  warning: "#f59e0b",
  warningSoft: "#fef3c7",
  danger: "#ef4444",
  dangerSoft: "#fee2e2",
  background: "#f1f5f9",
  surface: "#f8fafc",
  card: "#ffffff",
  border: "#e2e8f0",
  textMain: "#0f172a",
  textSub: "#64748b",
  textLight: "#94a3b8",
};

export const FONTS = {
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  xxl: 28,
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

export const RADIUS = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
};

export const SHADOW = {
  card: {
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  lift: {
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
};

export const riskColor = (score: number) => {
  if (score > 60) return COLORS.danger;
  if (score > 30) return COLORS.warning;
  return COLORS.success;
};

export const riskColorByLevel = (level: string) => {
  if (!level) return COLORS.textSub;
  const normalized = level.toLowerCase();
  if (normalized.includes("high") || normalized.includes("cao")) return COLORS.danger;
  if (normalized.includes("medium") || normalized.includes("trung bình")) return COLORS.warning;
  return COLORS.success;
};
