import { useQuery } from "@tanstack/react-query";
import { getBusinessKpis } from "@/api/business";
import { useAppStore } from "@/store/app";
import { useFilterKey, useFilterParams } from "./useFilters";

export function useBusinessKpis(onlyPerishable: boolean) {
  const params = useFilterParams();
  const key = useFilterKey();
  const serviceLevel = useAppStore((state) => state.serviceLevel);
  const modelId = useAppStore((state) => state.modelId);

  return useQuery({
    queryKey: ["business-kpis", onlyPerishable, serviceLevel, modelId, ...key],
    queryFn: () =>
      getBusinessKpis({
        ...params,
        model_id: modelId,
        service_level: serviceLevel,
        only_perishable: onlyPerishable,
      }),
    placeholderData: (previous) => previous,
  });
}
