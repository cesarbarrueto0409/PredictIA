import type { Meta } from "@/types/api";
import { get } from "./client";

export function getMeta(): Promise<Meta> {
  return get<Meta>("/meta");
}
