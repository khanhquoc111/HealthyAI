// src/constants/theme.js
export const COLORS = {
  primary: "#2563eb",
  primaryDark: "#1d4ed8",
  secondary: "#0f172a",
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#ef4444",
  background: "#f1f5f9",
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

export const RADIUS = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
};

export const riskColor = (score: number) => {
  if (score > 60) return COLORS.danger;
  if (score > 30) return COLORS.warning;
  return COLORS.success;
};

export const riskColorByLevel = (level: string) => {
  if (!level) return COLORS.textSub;
  const l = level.toLowerCase();
  if (l.includes("high") || l.includes("cao")) return COLORS.danger;
  if (l.includes("medium") || l.includes("trung bình")) return COLORS.warning;
  return COLORS.success;
};
