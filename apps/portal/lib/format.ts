export function currency(value?: number | null) {
  if (value == null) return "-";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);
}

export function currencyCompact(value?: number | null) {
  if (value == null) return "-";
  if (Math.abs(value) >= 1_000_000) return `£${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `£${Math.round(value / 1_000)}K`;
  return currency(value);
}

export function percent(value?: number | null, digits = 1) {
  if (value == null) return "-";
  return `${value.toFixed(digits)}%`;
}

export function percentFromRatio(value?: number | null, digits = 1) {
  if (value == null) return "-";
  return `${(value * 100).toFixed(digits)}%`;
}

export function percentPoint(value?: number | null, digits = 1) {
  if (value == null) return "-";
  return `${value.toFixed(digits)}pp`;
}

export function integer(value?: number | null) {
  if (value == null) return "-";
  return new Intl.NumberFormat("en-GB").format(value);
}

export function decimal(value?: number | null, digits = 1) {
  if (value == null) return "-";
  return value.toFixed(digits);
}

export function shortDate(value?: string | null) {
  if (!value) return "No due date";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" }).format(parsed);
}

export function timestamp(value?: string | null) {
  if (!value) return "Unavailable";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

export function hours(value?: number | null) {
  if (value == null) return "-";
  return `${value.toFixed(1)}h`;
}
