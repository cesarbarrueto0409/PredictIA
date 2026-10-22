import { create } from "zustand";
import type { QueryParams } from "@/api/client";

export interface Filters {
  store: number | null;
  family: string | null;
  from: string;
  to: string;
}

interface FiltersState extends Filters {
  setStore: (store: number | null) => void;
  setFamily: (family: string | null) => void;
  setRange: (from: string, to: string) => void;
  setFilters: (filters: Partial<Filters>) => void;
  reset: () => void;
}

export const EMPTY_FILTERS: Filters = { store: null, family: null, from: "", to: "" };

export const useFilters = create<FiltersState>((set) => ({
  ...EMPTY_FILTERS,
  setStore: (store) => set({ store }),
  setFamily: (family) => set({ family }),
  setRange: (from, to) => set({ from, to }),
  setFilters: (filters) => set(filters),
  reset: () => set(EMPTY_FILTERS),
}));

export function filterParams(filters: Filters): QueryParams {
  return {
    store_nbr: filters.store,
    family: filters.family,
    date_from: filters.from,
    date_to: filters.to,
  };
}
