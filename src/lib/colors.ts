export const CHART_COLORS = {
  primary: "#0ea5e9", // Sky-500
  secondary: "#64748b", // Slate-500
  accent: "#f43f5e", // Rose-500
  success: "#10b981", // Emerald-500
  backgroundDark: "#0f172a",
  backgroundLight: "#ffffff",
  grid: "#e2e8f0",
  gridDark: "#334155",
};

export const getHeatmapColor = (value: number) => {
  // value 0-100
  if (value < 40) return "#f1f5f9"; // Slate-100
  if (value < 60) return "#bae6fd"; // Sky-200
  if (value < 80) return "#38bdf8"; // Sky-400
  return "#0284c7"; // Sky-600
};