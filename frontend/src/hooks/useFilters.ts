import { useMemo } from "react";
import { useFilters } from "@/store/filters";
import { filterParams } from "@/store/filters";

export function useFilterParams() {
  const store = useFilters((state) => state.store);
  const family = useFilters((state) => state.family);
  const from = useFilters((state) => state.from);
  const to = useFilters((state) => state.to);

  return useMemo(
    () => filterParams({ store, family, from, to }),
    [store, family, from, to],
  );
}

export function useFilterKey(): [number | null, string | null, string, string] {
  const store = useFilters((state) => state.store);
  const family = useFilters((state) => state.family);
  const from = useFilters((state) => state.from);
  const to = useFilters((state) => state.to);
  return [store, family, from, to];
}
