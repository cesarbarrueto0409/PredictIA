import type { BusinessKpisResponse } from "@/types/api";
import { get, type QueryParams } from "./client";

export function getBusinessKpis(params: QueryParams): Promise<BusinessKpisResponse> {
  return get<BusinessKpisResponse>("/business-kpis", params);
}
