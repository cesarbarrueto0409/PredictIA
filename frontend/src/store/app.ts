import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DatasetSummary } from "@/types/api";

export type Theme = "light" | "dark";

interface AppState {
  theme: Theme;
  presentation: boolean;
  datasetId: string | null;
  datasetSummary: DatasetSummary | null;
  modelId: string | null;
  serviceLevel: number;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setPresentation: (presentation: boolean) => void;
  setDataset: (datasetId: string | null, summary: DatasetSummary | null) => void;
  setModelId: (modelId: string | null) => void;
  setServiceLevel: (level: number) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      theme: "light",
      presentation: false,
      datasetId: null,
      datasetSummary: null,
      modelId: null,
      serviceLevel: 0.9,
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set({ theme: get().theme === "light" ? "dark" : "light" }),
      setPresentation: (presentation) => set({ presentation }),
      setDataset: (datasetId, summary) => set({ datasetId, datasetSummary: summary }),
      setModelId: (modelId) => set({ modelId }),
      setServiceLevel: (serviceLevel) => set({ serviceLevel }),
    }),
    {
      name: "abasto-preferences",
      partialize: (state) => ({ theme: state.theme }),
    },
  ),
);
