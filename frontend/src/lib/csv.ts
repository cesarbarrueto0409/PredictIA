import Papa from "papaparse";
import type { DatasetSummary } from "@/types/api";
import { parseDate } from "./format";

export const REQUIRED_COLUMNS = ["id", "date", "store_nbr", "family", "sales", "onpromotion"];
const REQUIRED_LABELS: Record<string, string> = {
  id: "id",
  date: "date",
  store_nbr: "store_nbr",
  family: "family",
  sales: "sales",
  onpromotion: "onpromotion",
};

export interface CsvValidation {
  ok: boolean;
  errors: string[];
  warnings: string[];
  rowCount: number;
  scannedRows: number;
  summary: DatasetSummary | null;
  sampled: boolean;
}

interface RawRow {
  [key: string]: unknown;
}

const MAX_SCAN_ROWS = 100_000;

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = parseDate(value);
  return date !== null && Number.isNaN(date.getTime()) === false;
}

export async function validateSalesCsv(file: File): Promise<CsvValidation> {
  return new Promise((resolve) => {
    Papa.parse<RawRow>(file, {
      header: true,
      skipEmptyLines: "greedy",
      preview: MAX_SCAN_ROWS,
      complete: (result) => {
        const errors: string[] = [];
        const warnings: string[] = [];
        const fields = result.meta.fields ?? [];
        const missing = REQUIRED_COLUMNS.filter((column) => !fields.includes(column));
        if (missing.length > 0) {
          for (const column of missing) {
            errors.push(`Falta la columna \`${REQUIRED_LABELS[column] ?? column}\`.`);
          }
          resolve({
            ok: false,
            errors,
            warnings,
            rowCount: result.data.length,
            scannedRows: 0,
            summary: null,
            sampled: false,
          });
          return;
        }

        const validationRows = result.data.slice(0, 1000);
        const stores = new Set<number>();
        const families = new Set<string>();
        let zeroRows = 0;
        let minDate = "";
        let maxDate = "";

        validationRows.forEach((row, index) => {
          const rowNumber = index + 2;
          const date = String(row.date ?? "").trim();
          const family = String(row.family ?? "").trim();
          const salesRaw = String(row.sales ?? "").trim();
          const storeRaw = String(row.store_nbr ?? "").trim();
          const sales = Number(salesRaw);
          const store = Number(storeRaw);

          if (!isIsoDate(date)) {
            errors.push(`Fila ${rowNumber}: fecha inválida (${date || "vacía"}). Usa AAAA-MM-DD.`);
          }
          if (!family) {
            errors.push(`Fila ${rowNumber}: la familia está vacía.`);
          }
          if (salesRaw === "" || Number.isNaN(sales)) {
            errors.push(`Fila ${rowNumber}: \`sales\` no es numérico (${salesRaw || "vacío"}).`);
          } else if (sales < 0) {
            errors.push(`Fila ${rowNumber}: \`sales\` no puede ser negativo (${salesRaw}).`);
          }
          if (!Number.isInteger(store) || store <= 0) {
            errors.push(`Fila ${rowNumber}: \`store_nbr\` debe ser un entero positivo.`);
          }
          if (errors.length > 12) {
            errors.push("Se detuvo la validación tras 12 errores. Corrige el CSV y vuelve a intentar.");
            return;
          }
        });

        if (errors.length === 0) {
          for (const row of result.data) {
            const date = String(row.date ?? "").trim().slice(0, 10);
            if (!isIsoDate(date)) continue;
            if (!minDate || date < minDate) minDate = date;
            if (!maxDate || date > maxDate) maxDate = date;
            const store = Number(row.store_nbr);
            const family = String(row.family ?? "").trim();
            if (Number.isInteger(store)) stores.add(store);
            if (family) families.add(family);
            const sales = Number(row.sales);
            if (sales === 0) zeroRows += 1;
          }
        }

        if (result.data.length >= 1000) {
          warnings.push("La validación revisó las primeras 1.000 filas del archivo.");
        }
        const sampled = result.data.length >= MAX_SCAN_ROWS;
        if (sampled) {
          warnings.push(
            "El resumen se calculó sobre las primeras 100.000 filas; el servidor calcula el total al subir.",
          );
        }

        const rowCount = result.data.length;
        const summary: DatasetSummary | null =
          errors.length === 0 && rowCount > 0
            ? {
                date_min: minDate,
                date_max: maxDate,
                n_stores: stores.size,
                n_families: families.size,
                n_rows: rowCount,
                pct_zero_sales: rowCount > 0 ? zeroRows / rowCount : 0,
              }
            : null;

        if (rowCount === 0) {
          errors.push("El archivo no contiene filas de datos.");
        }

        resolve({
          ok: errors.length === 0,
          errors,
          warnings,
          rowCount,
          scannedRows: validationRows.length,
          summary,
          sampled,
        });
      },
      error: (error) => {
        resolve({
          ok: false,
          errors: [`No se pudo leer el archivo: ${error.message}`],
          warnings: [],
          rowCount: 0,
          scannedRows: 0,
          summary: null,
          sampled: false,
        });
      },
    });
  });
}
