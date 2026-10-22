const numberFormatter = new Intl.NumberFormat("es-EC");
const decimalFormatter = new Intl.NumberFormat("es-EC", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const twoDecimalFormatter = new Intl.NumberFormat("es-EC", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatNumber(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  if (digits === 0) return numberFormatter.format(value);
  if (digits === 1) return decimalFormatter.format(value);
  if (digits === 2) return twoDecimalFormatter.format(value);
  return new Intl.NumberFormat("es-EC", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

/** 0.123 -> "12,3 %" */
export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${formatNumber(value * 100, digits)} %`;
}

/** 12.3 (ya en puntos porcentuales) -> "12,3 %" */
export function formatPercentPoints(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${formatNumber(value, digits)} %`;
}

/** 0.123 -> "+12,3 %" */
export function formatSignedPercent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${formatNumber(Math.abs(value) * 100, digits)} %`;
}

export function formatSignedNumber(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${formatNumber(Math.abs(value), digits)}`;
}

/** ISO -> DD/MM/YYYY */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [year, month, day] = iso.slice(0, 10).split("-");
  if (!year || !month || !day) return iso;
  return `${day}/${month}/${year}`;
}

/** ISO -> "15 ago" */
export function formatDateShort(iso: string): string {
  const date = parseDate(iso);
  if (!date) return iso;
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`;
}

const MONTHS_SHORT = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

export function parseDate(iso: string): Date | null {
  const date = new Date(`${iso.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(iso: string, days: number): string {
  const date = parseDate(iso);
  if (!date) return iso;
  date.setDate(date.getDate() + days);
  return toISO(date);
}

export function daysBetween(from: string, to: string): number {
  const a = parseDate(from);
  const b = parseDate(to);
  if (!a || !b) return 0;
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/** Lunes = 0 */
export function weekdayIndex(iso: string): number {
  const date = parseDate(iso);
  if (!date) return 0;
  return (date.getDay() + 6) % 7;
}

export function weekStart(iso: string): string {
  return addDays(iso, -weekdayIndex(iso));
}

export function formatProgress(progress: number): string {
  return `${formatNumber(Math.round(progress * 100), 0)} %`;
}
