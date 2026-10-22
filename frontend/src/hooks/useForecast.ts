import { useQuery } from "@tanstack/react-query";
import { getForecast } from "@/api/forecast";
import { useAppStore } from "@/store/app";
import { useFilterKey } from "./useFilters";

export function useForecast() {
  const [store, family, from, to] = useFilterKey();
  const modelId = useAppStore((state) => state.modelId);

  return useQuery({
    queryKey: ["forecast", store, family, from, to, modelId],
    queryFn: () =>
      getForecast({
        store_nbr: store as number,
        family: family as string,
        date_from: from,
        date_to: to,
        model_id: modelId,
      }),
    enabled: store !== null && family !== null,
    placeholderData: (previous) => previous,
    retry: 1,
  });
}
