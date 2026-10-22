import { addDays, parseDate, weekStart, weekdayIndex } from "@/lib/format";
import type { Meta, Risk } from "@/types/api";

export const MOCK_STORES = [1, 2, 3, 4, 5, 6];
export const HISTORY_END = "2017-08-15";
export const HISTORY_DAYS = 120;
export const FUTURE_DAYS = 28;
export const MOCK_DATE_MIN = addDays(HISTORY_END, -(HISTORY_DAYS - 1));
export const MOCK_DATE_MAX = addDays(HISTORY_END, FUTURE_DAYS);

interface FamilyConfig {
  family: string;
  is_perishable: boolean;
  base: number;
  cv: number;
  promo: number;
}

export const MOCK_FAMILIES: FamilyConfig[] = [
  { family: "PRODUCE", is_perishable: true, base: 420, cv: 0.27, promo: 0.13 },
  { family: "DAIRY", is_perishable: true, base: 370, cv: 0.21, promo: 0.11 },
  { family: "MEATS", is_perishable: true, base: 300, cv: 0.32, promo: 0.18 },
  { family: "BREAD/BAKERY", is_perishable: true, base: 255, cv: 0.25, promo: 0.08 },
  { family: "BEVERAGES", is_perishable: false, base: 505, cv: 0.18, promo: 0.17 },
  { family: "GROCERY I", is_perishable: false, base: 605, cv: 0.22, promo: 0.19 },
  { family: "CLEANING", is_perishable: false, base: 185, cv: 0.2, promo: 0.23 },
  { family: "FROZEN FOODS", is_perishable: false, base: 168, cv: 0.24, promo: 0.12 },
];

const STORE_FACTORS = [1, 1.34, 0.79, 1.12, 0.92, 1.26];
const WEEKDAY_FACTORS = [0.9, 0.86, 0.89, 0.96, 1.1, 1.29, 1.17];

export interface MockSeriesPoint {
  date: string;
  actual: number | null;
  pred: number;
  p10: number;
  p90: number;
  baseline: number;
  is_future: boolean;
  onpromotion: boolean;
}

export interface MockSeries {
  store_nbr: number;
  family: string;
  is_perishable: boolean;
  points: MockSeriesPoint[];
  weekStart: string;
}

function rand(store: number, familyIndex: number, day: number): number {
  const value = Math.sin(store * 12.9898 + familyIndex * 78.233 + day * 37.719) * 43758.5453;
  return value - Math.floor(value);
}

function monthFactor(iso: string): number {
  const date = parseDate(iso);
  if (!date) return 1;
  return 1 + 0.055 * Math.sin(((date.getMonth() + 1) / 12) * Math.PI * 2);
}

function isPayday(iso: string): boolean {
  const date = parseDate(iso);
  if (!date) return false;
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return date.getDate() === 15 || date.getDate() === lastDay;
}

function promoFor(store: number, familyIndex: number, day: number, strength: number) {
  const block = Math.floor(day / 4);
  const active = rand(store, familyIndex, block + 41) < strength * 1.35;
  const multiplier = 1 + strength * (0.8 + 0.4 * rand(store, familyIndex, day + 97));
  return { active, multiplier: active ? multiplier : 1 };
}

function buildSeries(store: number, familyIndex: number): MockSeries {
  const config = MOCK_FAMILIES[familyIndex];
  const storeFactor = STORE_FACTORS[store - 1];
  const localVariation = 0.84 + 0.32 * rand(store, familyIndex, 9);
  const points: MockSeriesPoint[] = [];
  const actuals: (number | null)[] = [];

  for (let i = 0; i < HISTORY_DAYS; i += 1) {
    const date = addDays(MOCK_DATE_MIN, i);
    const weekday = WEEKDAY_FACTORS[weekdayIndex(date)];
    const trend = 1 + (i / HISTORY_DAYS) * 0.035;
    const promo = promoFor(store, familyIndex, i, config.promo);
    const noise = 1 + (rand(store, familyIndex, i + 211) - 0.5) * config.cv;
    const base =
      config.base *
      storeFactor *
      localVariation *
      weekday *
      monthFactor(date) *
      trend *
      promo.multiplier *
      (isPayday(date) ? 1.06 : 1);

    const actual = Math.max(0, Math.round(base * Math.max(0.55, noise)));
    const modelNoise = 1 + (rand(store, familyIndex, i + 401) - 0.5) * 0.18;
    const pred = Math.max(0, actual * modelNoise * 0.995);
    const sigma = Math.max(2, actual * 0.075);

    points.push({
      date,
      actual,
      pred,
      p10: Math.max(0, pred - 1.2816 * sigma),
      p90: pred + 1.2816 * sigma,
      baseline: 0,
      is_future: false,
      onpromotion: promo.active,
    });
    actuals.push(actual);
  }

  for (let i = 0; i < HISTORY_DAYS; i += 1) {
    const previous = actuals[i - 14];
    points[i].baseline = previous ?? actuals[i] ?? 0;
  }

  for (let i = 0; i < FUTURE_DAYS; i += 1) {
    const day = HISTORY_DAYS + i;
    const date = addDays(MOCK_DATE_MIN, day);
    const weekday = WEEKDAY_FACTORS[weekdayIndex(date)];
    const trend = 1 + (day / HISTORY_DAYS) * 0.035;
    const promo = promoFor(store, familyIndex, day, config.promo);
    const week = Math.floor(i / 7) + 1;
    const base =
      config.base *
      storeFactor *
      localVariation *
      weekday *
      monthFactor(date) *
      trend *
      promo.multiplier *
      (isPayday(date) ? 1.06 : 1);
    const pred = Math.max(0, base * (1 + (rand(store, familyIndex, day + 601) - 0.5) * 0.05));
    const sigma = pred * (0.075 + 0.02 * (week - 1));
    const previous = points[day - 14]?.pred ?? pred;

    points.push({
      date,
      actual: null,
      pred,
      p10: Math.max(0, pred - 1.2816 * sigma),
      p90: pred + 1.2816 * sigma,
      baseline: previous,
      is_future: true,
      onpromotion: promo.active,
    });
  }

  return {
    store_nbr: store,
    family: config.family,
    is_perishable: config.is_perishable,
    points,
    weekStart: addDays(HISTORY_END, 1),
  };
}

let cache: MockSeries[] | null = null;

export function allSeries(): MockSeries[] {
  if (!cache) {
    cache = [];
    for (const store of MOCK_STORES) {
      MOCK_FAMILIES.forEach((_, familyIndex) => {
        cache?.push(buildSeries(store, familyIndex));
      });
    }
  }
  return cache;
}

export function getMeta(): Meta {
  return {
    stores: MOCK_STORES.map((store_nbr) => ({ store_nbr })),
    families: MOCK_FAMILIES.map(({ family, is_perishable }) => ({ family, is_perishable })),
    date_min: MOCK_DATE_MIN,
    date_max: MOCK_DATE_MAX,
  };
}

export function familyMeta(family: string) {
  return MOCK_FAMILIES.find((item) => item.family === family);
}

export function selectSeries(store: number | null, family: string | null): MockSeries[] {
  return allSeries().filter(
    (series) =>
      (store === null || series.store_nbr === store) &&
      (family === null || series.family === family),
  );
}

export interface MockPointRow {
  store_nbr: number;
  family: string;
  is_perishable: boolean;
  date: string;
  actual: number | null;
  pred: number;
  p10: number;
  p90: number;
  baseline: number;
  is_future: boolean;
  onpromotion: boolean;
}

export function selectPoints(
  store: number | null,
  family: string | null,
  from: string,
  to: string,
  options: { historyOnly?: boolean; futureOnly?: boolean; validationOnly?: boolean } = {},
): MockPointRow[] {
  const rows: MockPointRow[] = [];
  const validationStart = addDays(HISTORY_END, -27);
  for (const series of selectSeries(store, family)) {
    for (const point of series.points) {
      if (point.date < from || point.date > to) continue;
      if (options.historyOnly && point.is_future) continue;
      if (options.futureOnly && !point.is_future) continue;
      if (options.validationOnly) {
        if (point.is_future || point.date < validationStart) continue;
      }
      rows.push({
        store_nbr: series.store_nbr,
        family: series.family,
        is_perishable: series.is_perishable,
        ...point,
      });
    }
  }
  return rows;
}

export function riskFor(
  forecast: number,
  p10: number,
  p90: number,
  volatility: number,
  isPerishable: boolean,
): Risk {
  const relativeWidth = forecast > 0 ? (p90 - p10) / forecast : 0;
  const score = relativeWidth + volatility * 0.7 + (isPerishable ? 0.1 : 0);
  if (score > 0.5) return "high";
  if (score > 0.41) return "medium";
  return "low";
}

/** Aproximación de Acklam para la inversa normal estándar. */
export function inverseNormal(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const low = 0.02425;
  const high = 1 - low;

  if (p < low) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p > high) {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  const q = p - 0.5;
  const r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
    (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

export function bucketDate(iso: string, granularity: "day" | "week"): string {
  return granularity === "week" ? weekStart(iso) : iso;
}

export interface DailyTotal {
  date: string;
  sales: number;
}

export function dailyTotals(rows: MockPointRow[]): DailyTotal[] {
  const map = new Map<string, number>();
  for (const row of rows) {
    if (row.actual === null) continue;
    map.set(row.date, (map.get(row.date) ?? 0) + row.actual);
  }
  return [...map.entries()].map(([date, sales]) => ({ date, sales })).sort((a, b) => a.date.localeCompare(b.date));
}

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const average = mean(values);
  const variance = values.reduce((sum, value) => sum + (value - average) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}
