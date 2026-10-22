import { useQuery } from "@tanstack/react-query";
import { getHorizon, getMetrics, getRanking } from "@/api/model";
import { useAppStore } from "@/store/app";
import { useFilterKey, useFilterParams } from "./useFilters";

export function useMetrics() {
  const params = useFilterParams();
  const [store, family, from, to] = useFilterKey();
  const modelId = useAppStore((state) => state.modelId);

  return useQuery({
    queryKey: ["metrics", store, family, from, to, modelId],
    queryFn: () => getMetrics({ ...params, model_id: modelId }),
    placeholderData: (previous) => previous,
  });
}

export function useHorizon() {
  const params = useFilterParams();
  const [store, family, from, to] = useFilterKey();
  const modelId = useAppStore((state) => state.modelId);

  return useQuery({
    queryKey: ["horizon", store, family, from, to, modelId],
    queryFn: () => getHorizon({ ...params, model_id: modelId }),
    placeholderData: (previous) => previous,
  });
}

export function useRanking(order: "best" | "worst") {
  const params = useFilterParams();
  const [store, family, from, to] = useFilterKey();
  const modelId = useAppStore((state) => state.modelId);

  return useQuery({
    queryKey: ["ranking", order, store, family, from, to, modelId],
    queryFn: () => getRanking({ ...params, model_id: modelId, order, limit: 20 }),
    placeholderData: (previous) => previous,
  });
}
