import type { ForecastResponse } from "@/types/api";
import { get } from "./client";

export interface ForecastParams {
  store_nbr: number;
  family: string;
  date_from?: string;
  date_to?: string;
  model_id?: string | null;
}

export function getForecast(params: ForecastParams): Promise<ForecastResponse> {
  return get<ForecastResponse>("/forecast", { ...params });
}
