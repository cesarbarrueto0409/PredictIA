import { useQuery } from "@tanstack/react-query";
import {
  getHeatmap,
  getPromoLift,
  getSeasonality,
  getTimeseries,
  getTop,
  getVolatility,
} from "@/api/eda";
import { useFilterKey, useFilterParams } from "./useFilters";

export function useTimeseries(granularity: "day" | "week") {
  const params = useFilterParams();
  const key = useFilterKey();
  return useQuery({
    queryKey: ["eda-timeseries", granularity, ...key],
    queryFn: () => getTimeseries(granularity, params),
    placeholderData: (previous) => previous,
  });
}

export function useTop(by: "family" | "store", limit = 8) {
  const params = useFilterParams();
  const key = useFilterKey();
  return useQuery({
    queryKey: ["eda-top", by, limit, ...key],
    queryFn: () => getTop(by, limit, params),
    placeholderData: (previous) => previous,
  });
}

export function useSeasonality() {
  const params = useFilterParams();
  const key = useFilterKey();
  return useQuery({
    queryKey: ["eda-seasonality", ...key],
    queryFn: () => getSeasonality(params),
    placeholderData: (previous) => previous,
  });
}

export function useHeatmap() {
  const params = useFilterParams();
  const key = useFilterKey();
  return useQuery({
    queryKey: ["eda-heatmap", ...key],
    queryFn: () => getHeatmap(params),
    placeholderData: (previous) => previous,
  });
}

export function usePromoLift() {
  const params = useFilterParams();
  const key = useFilterKey();
  return useQuery({
    queryKey: ["eda-promo-lift", ...key],
    queryFn: () => getPromoLift(params),
    placeholderData: (previous) => previous,
  });
}

export function useVolatility() {
  const params = useFilterParams();
  const key = useFilterKey();
  return useQuery({
    queryKey: ["eda-volatility", ...key],
    queryFn: () => getVolatility(params),
    placeholderData: (previous) => previous,
  });
}
