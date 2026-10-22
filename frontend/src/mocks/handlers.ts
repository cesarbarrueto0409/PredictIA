import { clamp } from "@/lib/utils";
import { addDays, weekStart } from "@/lib/format";
import type {
  BusinessKpisResponse,
  DatasetSummary,
  DatasetUploadResponse,
  ForecastResponse,
  HeatmapResponse,
  HorizonResponse,
  Meta,
  MetricsResponse,
  OrderSuggestionItem,
  OrderSuggestionResponse,
  PromoLiftResponse,
  RankingResponse,
  SeasonalityResponse,
  TimeseriesResponse,
  TopResponse,
  TrainJob,
  VolatilityResponse,
} from "@/types/api";
import {
  HISTORY_END,
  MOCK_DATE_MAX,
  MOCK_DATE_MIN,
  allSeries,
  bucketDate,
  dailyTotals,
  familyMeta,
  getMeta,
  inverseNormal,
  mean,
  riskFor,
  selectPoints,
  selectSeries,
  stdDev,
  type MockPointRow,
} from "./generate";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function parseStore(value: string | null): number | null {
  if (!value || value === "all" || value === "0") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseFamily(value: string | null): string | null {
  if (!value || value === "all") return null;
  return value;
}

function resolveRange(url: URL): { from: string; to: string } {
  const from = url.searchParams.get("date_from") ?? MOCK_DATE_MIN;
  const to = url.searchParams.get("date_to") ?? MOCK_DATE_MAX;
  return { from, to };
}

function rowsFor(url: URL, options: Parameters<typeof selectPoints>[4] = {}) {
  const store = parseStore(url.searchParams.get("store_nbr"));
  const family = parseFamily(url.searchParams.get("family"));
  const { from, to } = resolveRange(url);
  return { rows: selectPoints(store, family, from, to, options), store, family, from, to };
}

function wape(rows: MockPointRow[], column: "pred" | "baseline"): number {
  let absolute = 0;
  let total = 0;
  for (const row of rows) {
    if (row.actual === null) continue;
    absolute += Math.abs(row.actual - row[column]);
    total += row.actual;
  }
  return total > 0 ? absolute / total : 0;
}

function rmsle(rows: MockPointRow[], column: "pred" | "baseline"): number {
  const values = rows
    .filter((row) => row.actual !== null)
    .map((row) => Math.log1p(row[column]) - Math.log1p(row.actual ?? 0));
  if (values.length === 0) return 0;
  return Math.sqrt(values.reduce((sum, value) => sum + value * value, 0) / values.length);
}

function bias(rows: MockPointRow[], column: "pred" | "baseline"): number {
  let predicted = 0;
  let actual = 0;
  for (const row of rows) {
    if (row.actual === null) continue;
    predicted += row[column];
    actual += row.actual;
  }
  return actual > 0 ? ((predicted - actual) / actual) * 100 : 0;
}

function coverage(rows: MockPointRow[]): number {
  const valid = rows.filter((row) => row.actual !== null);
  if (valid.length === 0) return 0;
  const inside = valid.filter(
    (row) => (row.actual ?? 0) >= row.p10 && (row.actual ?? 0) <= row.p90,
  ).length;
  return inside / valid.length;
}

function metricsResponse(url: URL): MetricsResponse {
  const filtered = rowsFor(url, { validationOnly: true }).rows;
  const fallback = selectPoints(null, null, MOCK_DATE_MIN, MOCK_DATE_MAX, { validationOnly: true });
  const store = parseStore(url.searchParams.get("store_nbr"));
  const family = parseFamily(url.searchParams.get("family"));
  const rows =
    filtered.length > 0
      ? filtered
      : fallback.filter(
          (row) =>
            (store === null || row.store_nbr === store) &&
            (family === null || row.family === family),
        );

  const model = {
    wape: wape(rows, "pred"),
    rmsle: rmsle(rows, "pred"),
    bias: bias(rows, "pred"),
    interval_coverage: coverage(rows),
  };
  const baseline = {
    name: "same_weekday_last_week",
    wape: wape(rows, "baseline"),
    rmsle: rmsle(rows, "baseline"),
    bias: bias(rows, "baseline"),
  };

  return {
    model,
    baseline,
    improvement: {
      wape_pct: baseline.wape > 0 ? (baseline.wape - model.wape) / baseline.wape : 0,
      rmsle_pct: baseline.rmsle > 0 ? (baseline.rmsle - model.rmsle) / baseline.rmsle : 0,
    },
  };
}

function horizonResponse(url: URL): HorizonResponse {
  const result = rowsFor(url, { validationOnly: true });
  const rows =
    result.rows.length > 0
      ? result.rows
      : selectPoints(null, null, MOCK_DATE_MIN, MOCK_DATE_MAX, { validationOnly: true });
  const validationStart = addDays(HISTORY_END, -27);

  const by_week = [1, 2, 3, 4].map((week) => {
    const start = addDays(validationStart, (week - 1) * 7);
    const end = addDays(start, 6);
    const weekRows = rows.filter((row) => row.date >= start && row.date <= end);
    return {
      week,
      wape: wape(weekRows, "pred"),
      baseline_wape: wape(weekRows, "baseline"),
    };
  });

  return { by_week };
}

function rankingResponse(url: URL): RankingResponse {
  const order = url.searchParams.get("order") === "worst" ? "worst" : "best";
  const limit = clamp(Number(url.searchParams.get("limit") ?? 20), 1, 100);
  const store = parseStore(url.searchParams.get("store_nbr"));
  const family = parseFamily(url.searchParams.get("family"));
  const rows =
    rowsFor(url, { validationOnly: true }).rows.length > 0
      ? rowsFor(url, { validationOnly: true }).rows
      : selectPoints(null, null, MOCK_DATE_MIN, MOCK_DATE_MAX, { validationOnly: true });

  const groups = new Map<string, MockPointRow[]>();
  for (const row of rows) {
    if (store !== null && row.store_nbr !== store) continue;
    if (family !== null && row.family !== family) continue;
    const key = `${row.store_nbr}|${row.family}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }

  const items = [...groups.entries()].map(([, group]) => {
    const first = group[0];
    return {
      store_nbr: first.store_nbr,
      family: first.family,
      wape: wape(group, "pred"),
      sales_total: group.reduce((sum, row) => sum + (row.actual ?? 0), 0),
    };
  });

  items.sort((a, b) => (order === "best" ? a.wape - b.wape : b.wape - a.wape));
  return { items: items.slice(0, limit) };
}

function forecastResponse(url: URL): ForecastResponse {
  const store = parseStore(url.searchParams.get("store_nbr")) ?? 1;
  const family = parseFamily(url.searchParams.get("family")) ?? "PRODUCE";
  const { from, to } = resolveRange(url);
  const series = selectSeries(store, family)[0];

  if (!series) {
    return { store_nbr: store, family, points: [] };
  }

  const points = series.points
    .filter((point) => point.date >= from && point.date <= to)
    .map((point) => ({
      date: point.date,
      y_real: point.actual,
      y_pred: point.is_future ? point.pred : point.pred,
      y_p10: point.p10,
      y_p90: point.p90,
      is_future: point.is_future,
    }));

  return { store_nbr: store, family, points };
}

function edaTimeseries(url: URL): TimeseriesResponse {
  const granularity = url.searchParams.get("granularity") === "week" ? "week" : "day";
  const { rows } = rowsFor(url, { historyOnly: true });
  const totals = dailyTotals(rows);
  const buckets = new Map<string, number>();
  for (const point of totals) {
    const key = bucketDate(point.date, granularity);
    buckets.set(key, (buckets.get(key) ?? 0) + point.sales);
  }
  return {
    points: [...buckets.entries()]
      .map(([date, sales]) => ({ date, sales: Math.round(sales) }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  };
}

function edaTop(url: URL): TopResponse {
  const by = url.searchParams.get("by") === "store" ? "store" : "family";
  const limit = clamp(Number(url.searchParams.get("limit") ?? 10), 1, 50);
  const { rows } = rowsFor(url, { historyOnly: true });
  const totals = new Map<string, number>();
  for (const row of rows) {
    if (row.actual === null) continue;
    const key = by === "store" ? String(row.store_nbr) : row.family;
    totals.set(key, (totals.get(key) ?? 0) + row.actual);
  }
  return {
    items: [...totals.entries()]
      .map(([key, sales]) => ({ key, sales: Math.round(sales) }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, limit),
  };
}

function edaSeasonality(url: URL): SeasonalityResponse {
  const { rows } = rowsFor(url, { historyOnly: true });
  const totals = dailyTotals(rows);
  const byWeekday = new Map<number, number[]>();
  const byMonth = new Map<number, number[]>();

  for (const point of totals) {
    const date = new Date(`${point.date}T00:00:00`);
    const weekday = (date.getDay() + 6) % 7;
    const month = date.getMonth() + 1;
    byWeekday.set(weekday, [...(byWeekday.get(weekday) ?? []), point.sales]);
    byMonth.set(month, [...(byMonth.get(month) ?? []), point.sales]);
  }

  return {
    by_weekday: Array.from({ length: 7 }, (_, weekday) => ({
      weekday,
      avg_sales: Math.round(mean(byWeekday.get(weekday) ?? [])),
    })),
    by_month: [...byMonth.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([month, values]) => ({ month, avg_sales: Math.round(mean(values)) })),
  };
}

function edaHeatmap(url: URL): HeatmapResponse {
  const { rows } = rowsFor(url, { historyOnly: true });
  const stores = [...new Set(rows.map((row) => row.store_nbr))].sort((a, b) => a - b);
  const families = [...new Set(rows.map((row) => row.family))];
  const cells = new Map<string, number[]>();

  for (const row of rows) {
    if (row.actual === null) continue;
    const key = `${row.store_nbr}|${row.family}`;
    cells.set(key, [...(cells.get(key) ?? []), row.actual]);
  }

  return {
    stores,
    families,
    values: stores.map((store) =>
      families.map((family) => Math.round(mean(cells.get(`${store}|${family}`) ?? [0]))),
    ),
  };
}

function edaPromoLift(url: URL): PromoLiftResponse {
  const { rows } = rowsFor(url, { historyOnly: true });
  const groups = new Map<string, { promo: number[]; regular: number[] }>();

  for (const row of rows) {
    if (row.actual === null) continue;
    const group = groups.get(row.family) ?? { promo: [], regular: [] };
    if (row.onpromotion) group.promo.push(row.actual);
    else group.regular.push(row.actual);
    groups.set(row.family, group);
  }

  return {
    items: [...groups.entries()]
      .map(([family, group]) => {
        const avgPromo = mean(group.promo);
        const avgRegular = mean(group.regular);
        return {
          family,
          avg_promo: Math.round(avgPromo),
          avg_no_promo: Math.round(avgRegular),
          lift_pct: avgRegular > 0 ? (avgPromo / avgRegular - 1) * 100 : 0,
        };
      })
      .sort((a, b) => b.lift_pct - a.lift_pct),
  };
}

function edaVolatility(url: URL): VolatilityResponse {
  const { rows } = rowsFor(url, { historyOnly: true });
  const families = [...new Set(rows.map((row) => row.family))];
  return {
    items: families
      .map((family) => {
        const familyRows = rows.filter((row) => row.family === family);
        const totals = dailyTotals(familyRows).map((point) => point.sales);
        const average = mean(totals);
        return { family, cv: average > 0 ? stdDev(totals) / average : 0 };
      })
      .sort((a, b) => b.cv - a.cv),
  };
}

function businessKpis(url: URL): BusinessKpisResponse {
  const serviceLevel = clamp(Number(url.searchParams.get("service_level") ?? 0.9), 0.5, 0.99);
  const onlyPerishable = url.searchParams.get("only_perishable") === "true";
  const filtered = rowsFor(url, { validationOnly: true }).rows;
  const rows = onlyPerishable ? filtered.filter((row) => row.is_perishable) : filtered;
  // Colchón de seguridad sobre el error típico del pronóstico, no sobre toda la demanda.
  const multiplier = 1 + Math.max(0, inverseNormal(serviceLevel)) * 0.07;

  function side(column: "pred" | "baseline") {
    let actualTotal = 0;
    let stockout = 0;
    let waste = 0;
    let orderPerishable = 0;
    let actualPerishable = 0;

    for (const row of rows) {
      if (row.actual === null) continue;
      const actual = row.actual;
      const order = row[column] * multiplier;
      actualTotal += actual;
      stockout += Math.max(actual - order, 0);
      if (row.is_perishable) {
        waste += Math.max(order - actual, 0);
        orderPerishable += order;
        actualPerishable += actual;
      }
    }

    const stockoutRisk = actualTotal > 0 ? stockout / actualTotal : 0;
    return {
      stockout_risk: stockoutRisk,
      waste_risk: orderPerishable > 0 ? waste / orderPerishable : 0,
      fill_rate: clamp(1 - stockoutRisk, 0, 1),
      waste_units: Math.round(waste),
      waste_pct: actualPerishable > 0 ? waste / actualPerishable : 0,
    };
  }

  const model = side("pred");
  const baseline = side("baseline");
  return {
    model,
    baseline,
    delta: {
      stockout_risk_pct:
        baseline.stockout_risk > 0
          ? (model.stockout_risk - baseline.stockout_risk) / baseline.stockout_risk
          : 0,
      waste_units_pct:
        baseline.waste_units > 0 ? (model.waste_units - baseline.waste_units) / baseline.waste_units : 0,
    },
  };
}

function orderSuggestion(url: URL): OrderSuggestionResponse {
  const store = parseStore(url.searchParams.get("store_nbr"));
  const family = parseFamily(url.searchParams.get("family"));
  const serviceLevel = clamp(Number(url.searchParams.get("service_level") ?? 0.9), 0.5, 0.99);
  const requestedStart = url.searchParams.get("week_start");
  const start = requestedStart ?? addDays(HISTORY_END, 1);
  const end = addDays(start, 6);
  const z = inverseNormal(serviceLevel);
  const items: OrderSuggestionItem[] = [];

  for (const series of selectSeries(store, family)) {
    const future = series.points.filter(
      (point) => point.is_future && point.date >= start && point.date <= end,
    );
    if (future.length === 0) continue;
    const forecast = future.reduce((sum, point) => sum + point.pred, 0);
    const variance = future.reduce((sum, point) => {
      const sigma = (point.p90 - point.p10) / (2 * 1.2816);
      return sum + sigma * sigma;
    }, 0);
    const safety = z * Math.sqrt(variance);
    const history = series.points.filter(
      (point) => !point.is_future && point.actual !== null,
    );
    const actuals = history.map((point) => point.actual ?? 0);
    const volatility = mean(actuals) > 0 ? stdDev(actuals) / mean(actuals) : 0;
    const p10 = future.reduce((sum, point) => sum + point.p10, 0);
    const p90 = future.reduce((sum, point) => sum + point.p90, 0);

    items.push({
      store_nbr: series.store_nbr,
      family: series.family,
      forecast: Math.round(forecast),
      recommended_order: Math.ceil(forecast + safety),
      safety_stock: Math.max(0, Math.round(safety)),
      risk: riskFor(forecast, p10, p90, volatility, series.is_perishable),
      is_perishable: series.is_perishable,
    });
  }

  const riskOrder = { high: 0, medium: 1, low: 2 } as const;
  items.sort((a, b) => {
    const riskDelta = riskOrder[a.risk] - riskOrder[b.risk];
    if (riskDelta !== 0) return riskDelta;
    return b.recommended_order - a.recommended_order;
  });

  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const pageSize = clamp(Number(url.searchParams.get("page_size") ?? 10), 1, 500);
  const offset = (page - 1) * pageSize;
  return {
    week_start: start,
    items: items.slice(offset, offset + pageSize),
    page,
    total: items.length,
  };
}

interface MockJob {
  startedAt: number;
  modelId: string;
}

const jobs = new Map<string, MockJob>();

function startTraining(): TrainJob {
  const jobId = `job_${Date.now().toString(36)}`;
  jobs.set(jobId, { startedAt: Date.now(), modelId: `mdl_${Math.random().toString(36).slice(2, 8)}` });
  return { job_id: jobId, status: "queued", progress: 0, model_id: null, message: "En cola" };
}

function trainingStatus(jobId: string): TrainJob {
  const job = jobs.get(jobId);
  if (!job) {
    return {
      job_id: jobId,
      status: "failed",
      progress: 0,
      model_id: null,
      message: "Trabajo no encontrado",
    };
  }
  const elapsed = Date.now() - job.startedAt;
  if (elapsed >= 4200) {
    return {
      job_id: jobId,
      status: "done",
      progress: 1,
      model_id: job.modelId,
      message: "Modelo entrenado",
    };
  }
  const progress = clamp(elapsed / 4200, 0, 0.98);
  return {
    job_id: jobId,
    status: progress > 0 ? "running" : "queued",
    progress,
    model_id: null,
    message:
      progress < 0.35
        ? "Preparando series y features"
        : progress < 0.75
          ? "Entrenando modelo global"
          : "Calculando intervalos p10–p90",
  };
}

export function mockUploadDataset(summary: DatasetSummary): DatasetUploadResponse {
  return { dataset_id: `ds_${Date.now().toString(36)}`, summary };
}

export async function handleMockRequest<T>(
  method: "GET" | "POST",
  path: string,
  body?: unknown,
): Promise<T> {
  await sleep(140 + Math.random() * 220);
  const url = new URL(path, "http://mock.local");
  if (url.searchParams.get("_fail") === "1") {
    throw new Error("Fallo simulado por el modo demo (_fail=1).");
  }
  const route = url.pathname;

  if (method === "GET") {
    switch (route) {
      case "/meta":
        return getMeta() as T;
      case "/forecast":
        return forecastResponse(url) as T;
      case "/metrics":
        return metricsResponse(url) as T;
      case "/metrics/horizon":
        return horizonResponse(url) as T;
      case "/metrics/ranking":
        return rankingResponse(url) as T;
      case "/business-kpis":
        return businessKpis(url) as T;
      case "/order-suggestion":
        return orderSuggestion(url) as T;
      case "/eda/timeseries":
        return edaTimeseries(url) as T;
      case "/eda/top":
        return edaTop(url) as T;
      case "/eda/seasonality":
        return edaSeasonality(url) as T;
      case "/eda/heatmap":
        return edaHeatmap(url) as T;
      case "/eda/promo-lift":
        return edaPromoLift(url) as T;
      case "/eda/volatility":
        return edaVolatility(url) as T;
      default:
        if (route.startsWith("/train/")) {
          return trainingStatus(route.slice("/train/".length)) as T;
        }
        throw new Error(`Ruta mock no implementada: GET ${route}`);
    }
  }

  if (method === "POST") {
    if (route === "/train") {
      void (body as unknown);
      return startTraining() as T;
    }
    if (route === "/datasets") {
      throw new Error("La subida de datasets se maneja en api/datasets.ts");
    }
    throw new Error(`Ruta mock no implementada: POST ${route}`);
  }

  throw new Error(`Método no soportado: ${method}`);
}

export type { Meta };

export const MOCK_META = getMeta();
export const MOCK_FAMILY_LOOKUP = new Map(
  allSeries().map((series) => [series.family, familyMeta(series.family)?.is_perishable ?? false]),
);
export { HISTORY_END, MOCK_DATE_MAX, MOCK_DATE_MIN, weekStart };
