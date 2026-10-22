import type { OrderSuggestionResponse } from "@/types/api";
import { get, type QueryParams } from "./client";

export function getOrderSuggestions(params: QueryParams): Promise<OrderSuggestionResponse> {
  return get<OrderSuggestionResponse>("/order-suggestion", params);
}
