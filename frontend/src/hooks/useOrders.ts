import { useQuery } from "@tanstack/react-query";
import { getOrderSuggestions } from "@/api/orders";
import { useAppStore } from "@/store/app";
import { useFilterKey, useFilterParams } from "./useFilters";

export function useOrderSuggestions() {
  const params = useFilterParams();
  const key = useFilterKey();
  const serviceLevel = useAppStore((state) => state.serviceLevel);
  const modelId = useAppStore((state) => state.modelId);

  return useQuery({
    queryKey: ["orders", serviceLevel, modelId, ...key],
    queryFn: () =>
      getOrderSuggestions({
        ...params,
        model_id: modelId,
        service_level: serviceLevel,
        page: 1,
        page_size: 500,
      }),
    placeholderData: (previous) => previous,
  });
}
