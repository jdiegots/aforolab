// Utility helpers for consistent number formatting (es-ES)
const nf = new Intl.NumberFormat("es-ES", { useGrouping: true });

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "N/A";
  return nf.format(Math.round(value));
}

export function formatNumberRaw(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "N/A";
  return nf.format(value);
}

export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "N/A";
  return `${value.toFixed(digits)}%`;
}

export default formatNumber;
