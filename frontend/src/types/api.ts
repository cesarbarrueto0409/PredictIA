/**
 * Tipos que replican el contrato de la API (CONTRACTS.md §8).
 * Si el contrato cambia, se actualiza aquí primero.
 * Fechas: ISO (YYYY-MM-DD). Porcentajes fraccionarios: 0.21 = 21 %.
 */

export type ISODate = string;

export interface StoreRef {
  store_nbr: number;
}

export interface FamilyRef {
  family: string;
  is_perishable: boolean;
}

export interface Meta {
  stores: StoreRef[];
  families: FamilyRef[];
  date_min: ISODate;
  date_max: ISODate;
}

export interface DatasetSummary {
  date_min: ISODate;
  date_max: ISODate;
  n_stores: number;
  n_families: number;
  n_rows: number;
  pct_zero_sales: number;
}

export interface DatasetUploadResponse {
  dataset_id: string;
  summary: DatasetSummary;
}

export interface TrainRequest {
  dataset_id: string;
  horizon_days: number;
  validation_days: number;
  quantiles: number[];
}

export type TrainStatus = "queued" | "running" | "done" | "failed";

export interface TrainJob {
  job_id: string;
  status: TrainStatus;
  progress: number;
  model_id: string | null;
  message: string;
}

export interface ForecastPoint {
  date: ISODate;
  y_real: number | null;
  y_pred: number | null;
  y_p10: number | null;
  y_p90: number | null;
  is_future: boolean;
}

export interface ForecastResponse {
  store_nbr: number;
  family: string;
  points: ForecastPoint[];
}

export interface MetricSet {
  wape: number;
  rmsle: number;
  bias: number;
  interval_coverage?: number;
}

export interface MetricsResponse {
  model: MetricSet;
  baseline: MetricSet & { name: string };
  improvement: {
    wape_pct: number;
    rmsle_pct: number;
  };
}

export interface HorizonPoint {
  week: number;
  wape: number;
  baseline_wape: number;
}

export interface HorizonResponse {
  by_week: HorizonPoint[];
}

export interface RankingItem {
  store_nbr: number;
  family: string;
  wape: number;
  sales_total: number;
}

export interface RankingResponse {
  items: RankingItem[];
}

export interface BusinessSide {
  stockout_risk: number;
  waste_risk: number;
  fill_rate: number;
  waste_units: number;
  waste_pct: number;
}

export interface BusinessKpisResponse {
  model: BusinessSide;
  baseline: BusinessSide;
  delta: {
    stockout_risk_pct: number;
    waste_units_pct: number;
  };
}

export type Risk = "low" | "medium" | "high";

export interface OrderSuggestionItem {
  store_nbr: number;
  family: string;
  forecast: number;
  recommended_order: number;
  safety_stock: number;
  risk: Risk;
  is_perishable: boolean;
}

export interface OrderSuggestionResponse {
  week_start: ISODate;
  items: OrderSuggestionItem[];
  page: number;
  total: number;
}

export interface TimeseriesPoint {
  date: ISODate;
  sales: number;
}

export interface TimeseriesResponse {
  points: TimeseriesPoint[];
}

export interface TopResponse {
  items: { key: string; sales: number }[];
}

export interface SeasonalityResponse {
  by_weekday: { weekday: number; avg_sales: number }[];
  by_month: { month: number; avg_sales: number }[];
}

export interface HeatmapResponse {
  stores: number[];
  families: string[];
  values: number[][];
}

export interface PromoLiftResponse {
  items: {
    family: string;
    avg_promo: number;
    avg_no_promo: number;
    lift_pct: number;
  }[];
}

export interface VolatilityResponse {
  items: { family: string; cv: number }[];
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
