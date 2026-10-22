import { useMemo } from "react";
import { formatNumber } from "@/lib/format";
import { familyLabel, shortFamilyLabel } from "@/lib/constants";
import type { HeatmapResponse } from "@/types/api";

export function HeatmapChart({ data }: { data: HeatmapResponse }) {
  const max = useMemo(
    () => Math.max(...data.values.flat().map((value) => value || 0), 1),
    [data.values],
  );

  if (data.stores.length === 0 || data.families.length === 0) {
    return <p className="text-body text-muted">No hay combinaciones tienda–familia para el rango.</p>;
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <div
          className="grid min-w-[720px] items-center gap-1"
          style={{ gridTemplateColumns: `92px repeat(${data.families.length}, minmax(64px, 1fr))` }}
          role="table"
          aria-label="Mapa de calor de venta promedio diaria por tienda y familia"
        >
          <div role="columnheader" className="text-small text-muted">
            Tienda
          </div>
          {data.families.map((family) => (
            <div
              key={family}
              role="columnheader"
              className="truncate px-1 pb-1 text-center text-small text-muted"
              title={familyLabel(family)}
            >
              {shortFamilyLabel(family)}
            </div>
          ))}
          {data.stores.map((store, storeIndex) => (
            <div key={store} className="contents" role="row">
              <div role="rowheader" className="text-body font-medium text-ink">
                Tienda {store}
              </div>
              {data.families.map((family, familyIndex) => {
                const value = data.values[storeIndex]?.[familyIndex] ?? 0;
                const ratio = value / max;
                const alpha = Math.round(ratio * 88);
                return (
                  <div
                    key={`${store}-${family}`}
                    role="cell"
                    tabIndex={0}
                    title={`Tienda ${store} · ${familyLabel(family)}: ${formatNumber(value)} unidades/día`}
                    aria-label={`Tienda ${store}, ${familyLabel(family)}: ${formatNumber(value)} unidades por día`}
                    className="flex h-10 items-center justify-center rounded-[4px] text-small font-medium tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
                    style={{
                      backgroundColor: `color-mix(in srgb, var(--accent) ${alpha}%, var(--surface))`,
                      color: alpha > 52 ? "#ffffff" : "var(--text)",
                    }}
                  >
                    {formatNumber(value)}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-small text-muted">
        <p>Venta promedio diaria (unidades) en el rango seleccionado. Pasa el cursor o enfoca una celda para ver el detalle.</p>
        <span className="inline-flex items-center gap-2">
          Menos
          <span className="inline-flex overflow-hidden rounded-[3px]">
            {[12, 28, 44, 60, 76, 92].map((alpha) => (
              <span
                key={alpha}
                className="h-3 w-5"
                style={{
                  backgroundColor: `color-mix(in srgb, var(--accent) ${alpha}%, var(--surface))`,
                }}
              />
            ))}
          </span>
          Más
        </span>
      </div>
    </div>
  );
}
