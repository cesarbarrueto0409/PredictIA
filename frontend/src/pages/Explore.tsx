import { useState } from "react";
import {
  useHeatmap,
  usePromoLift,
  useSeasonality,
  useTimeseries,
  useTop,
  useVolatility,
} from "@/hooks/useEda";
import { useFilters } from "@/store/filters";
import { familyLabel } from "@/lib/constants";
import {
  formatDate,
  formatNumber,
  formatPercent,
  formatPercentPoints,
} from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { Segmented } from "@/components/ui/Segmented";
import { Badge } from "@/components/ui/Badge";
import { TimeSeriesChart } from "@/components/charts/TimeSeriesChart";
import { BarRank, type BarRankItem } from "@/components/charts/BarRank";
import { SeasonalityChart } from "@/components/charts/SeasonalityChart";
import { HeatmapChart } from "@/components/charts/HeatmapChart";
import { EmptyState } from "@/components/ui/EmptyState";

export function Explore() {
  const [granularity, setGranularity] = useState<"day" | "week">("week");
  const store = useFilters((state) => state.store);
  const family = useFilters((state) => state.family);
  const from = useFilters((state) => state.from);
  const to = useFilters((state) => state.to);

  const timeseries = useTimeseries(granularity);
  const topFamilies = useTop("family", 8);
  const topStores = useTop("store", 6);
  const seasonality = useSeasonality();
  const promo = usePromoLift();
  const volatility = useVolatility();
  const heatmap = useHeatmap();

  const familyItems: BarRankItem[] =
    topFamilies.data?.items.map((item) => ({
      key: item.key,
      label: familyLabel(item.key),
      value: item.sales,
      display: formatNumber(item.sales),
    })) ?? [];

  const storeItems: BarRankItem[] =
    topStores.data?.items.map((item) => ({
      key: item.key,
      label: `Tienda ${item.key}`,
      value: item.sales,
      display: formatNumber(item.sales),
    })) ?? [];

  const promoItems: BarRankItem[] =
    promo.data?.items.map((item) => ({
      key: item.family,
      label: familyLabel(item.family),
      value: item.lift_pct,
      display: `${item.lift_pct > 0 ? "+" : ""}${formatPercentPoints(item.lift_pct)}`,
    })) ?? [];

  const volatilityItems: BarRankItem[] =
    volatility.data?.items.map((item) => ({
      key: item.family,
      label: familyLabel(item.family),
      value: item.cv,
      display: formatPercent(item.cv),
      flag: item.cv > 0.28 ? "Difícil de pronosticar" : undefined,
      flagTone: "warning",
    })) ?? [];

  const difficult = volatility.data?.items.filter((item) => item.cv > 0.28) ?? [];
  const steadiest = volatility.data?.items.slice(-1)[0];
  const selected =
    store !== null && family
      ? `Tienda ${store} · ${familyLabel(family)}`
      : store !== null
        ? `Tienda ${store} · todas las familias`
        : family
          ? `Todas las tiendas · ${familyLabel(family)}`
          : "Toda la cadena";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exploración"
        subtitle={
          <>
            Qué se vende, cuándo y dónde · {selected} · {formatDate(from)} — {formatDate(to)}
          </>
        }
      />

      <Panel
        title="Ventas totales en el tiempo"
        description={`Agregación ${granularity === "week" ? "semanal" : "diaria"} del historial observado`}
        loading={timeseries.isLoading}
        error={timeseries.error}
        onRetry={() => timeseries.refetch()}
        empty={timeseries.data?.points.length === 0}
        actions={
          <Segmented
            ariaLabel="Granularidad de la serie"
            value={granularity}
            onChange={setGranularity}
            options={[
              { value: "week", label: "Semanal" },
              { value: "day", label: "Diaria" },
            ]}
          />
        }
      >
        {timeseries.data && <TimeSeriesChart points={timeseries.data.points} height={280} />}
      </Panel>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel
          title="Familias con más ventas"
          description="Unidades vendidas en el rango seleccionado"
          loading={topFamilies.isLoading}
          error={topFamilies.error}
          onRetry={() => topFamilies.refetch()}
          empty={familyItems.length === 0}
          skeleton="text"
        >
          <BarRank items={familyItems} highlightTop />
        </Panel>
        <Panel
          title="Tiendas con más ventas"
          description="Unidades vendidas en el rango seleccionado"
          loading={topStores.isLoading}
          error={topStores.error}
          onRetry={() => topStores.refetch()}
          empty={storeItems.length === 0}
          skeleton="text"
        >
          <BarRank items={storeItems} highlightTop />
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel
          title="Estacionalidad"
          description="Venta diaria promedio por día de la semana o por mes"
          loading={seasonality.isLoading}
          error={seasonality.error}
          onRetry={() => seasonality.refetch()}
          empty={
            (seasonality.data?.by_weekday.every((item) => item.avg_sales === 0) ?? true) &&
            (seasonality.data?.by_month.length ?? 0) === 0
          }
        >
          {seasonality.data && <SeasonalityChart data={seasonality.data} />}
        </Panel>

        <Panel
          title="Lift de promoción por familia"
          description="Aumento porcentual de la venta diaria cuando hay promoción"
          loading={promo.isLoading}
          error={promo.error}
          onRetry={() => promo.refetch()}
          empty={promoItems.length === 0}
          skeleton="text"
        >
          {promoItems.length > 0 ? (
            <>
              <BarRank items={promoItems} color="var(--chart-forecast)" highlightTop />
              <p className="mt-3 border-t border-rule pt-3 text-small text-muted">
                Un lift alto justifica más stock durante la promoción, sobre todo si el producto es perecedero.
              </p>
            </>
          ) : (
            <EmptyState title="Sin promociones en el rango" compact />
          )}
        </Panel>
      </div>

      <Panel
        title="Mapa de calor tienda × familia"
        description="Venta promedio diaria (unidades). Cada fila es una tienda y cada columna una familia."
        loading={heatmap.isLoading}
        error={heatmap.error}
        onRetry={() => heatmap.refetch()}
        empty={
          !heatmap.data ||
          heatmap.data.stores.length === 0 ||
          heatmap.data.families.length === 0
        }
      >
        {heatmap.data && <HeatmapChart data={heatmap.data} />}
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel
          title="Volatilidad por familia"
          description="Coeficiente de variación de la venta diaria: más alto = más difícil de pronosticar."
          loading={volatility.isLoading}
          error={volatility.error}
          onRetry={() => volatility.refetch()}
          empty={volatilityItems.length === 0}
          skeleton="text"
        >
          <BarRank items={volatilityItems} color="var(--accent)" />
        </Panel>

        <div className="rounded-card border border-line bg-surface p-5">
          <h2 className="text-section font-semibold text-ink">Lectura rápida</h2>
          {volatility.isLoading ? (
            <div className="mt-3 space-y-2">
              <div className="skeleton h-4 w-full rounded-control" />
              <div className="skeleton h-4 w-5/6 rounded-control" />
              <div className="skeleton h-4 w-2/3 rounded-control" />
            </div>
          ) : volatilityItems.length > 0 ? (
            <>
              <p className="mt-2 text-body text-muted">
                {difficult.length > 0
                  ? `${difficult.length} ${difficult.length === 1 ? "familia supera" : "familias superan"} el umbral de 28 % de variación.`
                  : "Ninguna familia supera el umbral de 28 % de variación."}
              </p>
              <ul className="mt-4 space-y-3 text-small">
                <li className="flex items-start gap-2">
                  <Badge tone="warning">Prioridad</Badge>
                  <span className="text-muted">
                    {difficult.length > 0
                      ? difficult
                          .slice(0, 3)
                          .map((item) => familyLabel(item.family))
                          .join(", ")
                      : "Ninguna familia requiere stock de seguridad extra por volatilidad."}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge tone="positive">Estable</Badge>
                  <span className="text-muted">
                    {steadiest
                      ? `${familyLabel(steadiest.family)} es la más predecible, con ${formatPercent(steadiest.cv)} de variación.`
                      : "Sin datos suficientes."}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge tone="neutral">Uso</Badge>
                  <span className="text-muted">
                    Las familias marcadas conviene pedirlas con más colchón y revisar su merma con frecuencia.
                  </span>
                </li>
              </ul>
              <p className="mt-4 border-t border-rule pt-3 text-small text-muted">
                Un CV de 28 % significa que la desviación típica es aproximadamente una cuarta parte de la venta media.
              </p>
            </>
          ) : (
            <EmptyState title="Sin datos de volatilidad" compact />
          )}
        </div>
      </div>

      <p className="text-small text-muted">
        Los seis bloques responden a los filtros globales de la barra superior. Cambia tienda, familia o periodo para actualizar todo.
      </p>
    </div>
  );
}
