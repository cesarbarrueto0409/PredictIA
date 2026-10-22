import { mockUploadDataset } from "@/mocks/handlers";
import type { DatasetSummary, DatasetUploadResponse } from "@/types/api";
import { API_URL, ApiError, USE_MOCKS } from "./client";

/**
 * Sube el CSV al backend. En modo demo usa el resumen calculado en el cliente.
 * `onProgress` recibe 0..1 solo cuando el navegador expone progreso de subida.
 */
export async function uploadDataset(
  file: File,
  summary: DatasetSummary,
  onProgress?: (progress: number) => void,
): Promise<DatasetUploadResponse> {
  if (USE_MOCKS) {
    await new Promise((resolve) => setTimeout(resolve, 900));
    onProgress?.(1);
    return mockUploadDataset(summary);
  }

  const form = new FormData();
  form.append("file", file);

  return new Promise<DatasetUploadResponse>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_URL}/datasets`);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total);
    };
    xhr.onerror = () =>
      reject(new ApiError("No se pudo subir el archivo. Revisa la conexión.", "network_error"));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as DatasetUploadResponse);
        } catch {
          reject(new ApiError("El servidor devolvió una respuesta inválida.", "invalid_response"));
        }
        return;
      }
      try {
        const body = JSON.parse(xhr.responseText) as {
          error?: { code: string; message: string; details?: unknown };
        };
        reject(
          new ApiError(
            body.error?.message ?? `La subida falló (${xhr.status}).`,
            body.error?.code ?? "upload_error",
            body.error?.details,
            xhr.status,
          ),
        );
      } catch {
        reject(new ApiError(`La subida falló (${xhr.status}).`, "upload_error", undefined, xhr.status));
      }
    };
    xhr.send(form);
  });
}
