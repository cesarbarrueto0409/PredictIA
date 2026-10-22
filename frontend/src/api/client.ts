import { handleMockRequest } from "@/mocks/handlers";
import type { ApiErrorBody } from "@/types/api";

export const API_URL = (import.meta.env.VITE_API_URL ?? "/api/v1").replace(/\/+$/, "");
export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== "false";

export class ApiError extends Error {
  code: string;
  details?: unknown;
  status?: number;

  constructor(message: string, code = "unknown_error", details?: unknown, status?: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

export type QueryParams = Record<string, string | number | boolean | null | undefined>;

export function buildQuery(params?: QueryParams): string {
  if (!params) return "";
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "" || value === "all") continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

async function parseError(response: Response): Promise<ApiError> {
  try {
    const body = (await response.json()) as ApiErrorBody;
    if (body?.error) {
      return new ApiError(body.error.message, body.error.code, body.error.details, response.status);
    }
  } catch {
    // El backend puede devolver texto plano o un cuerpo vacío.
  }
  return new ApiError(
    `La API respondió ${response.status} ${response.statusText}.`,
    "http_error",
    undefined,
    response.status,
  );
}

async function request<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  if (USE_MOCKS) {
    try {
      return await handleMockRequest<T>(method, path, body);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        error instanceof Error ? error.message : "Error desconocido en el modo demo.",
        "mock_error",
      );
    }
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(
      "No se pudo conectar con el servidor. Revisa VITE_API_URL y que el backend esté levantado.",
      "network_error",
    );
  }

  if (!response.ok) throw await parseError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function get<T>(path: string, params?: QueryParams): Promise<T> {
  return request<T>("GET", `${path}${buildQuery(params)}`);
}

export function post<T>(path: string, body?: unknown): Promise<T> {
  return request<T>("POST", path, body);
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Error inesperado.";
}
