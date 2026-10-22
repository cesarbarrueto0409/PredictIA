import type {
  HeatmapResponse,
  PromoLiftResponse,
  SeasonalityResponse,
  TimeseriesResponse,
  TopResponse,
  VolatilityResponse,
} from "@/types/api";
import { get, type QueryParams } from "./client";

export function getTimeseries(
  granularity: "day" | "week",
  params: QueryParams,
): Promise<TimeseriesResponse> {
  return get<TimeseriesResponse>("/eda/timeseries", { ...params, granularity });
}

export function getTop(by: "family" | "store", limit: number, params: QueryParams) {
  return get<TopResponse>("/eda/top", { ...params, by, limit });
}

export function getSeasonality(params: QueryParams): Promise<SeasonalityResponse> {
  return get<SeasonalityResponse>("/eda/seasonality", params);
}

export function getHeatmap(params: QueryParams): Promise<HeatmapResponse> {
  return get<HeatmapResponse>("/eda/heatmap", params);
}

export function getPromoLift(params: QueryParams): Promise<PromoLiftResponse> {
  return get<PromoLiftResponse>("/eda/promo-lift", params);
}

export function getVolatility(params: QueryParams): Promise<VolatilityResponse> {
  return get<VolatilityResponse>("/eda/volatility", params);
}
