import { useMemo, useState } from "react";
import { useHorizon, useMetrics, useRanking } from "@/hooks/useMetrics";
import { useForecast } from "@/hooks/useForecast";
import { useMeta } from "@/hooks/useMeta";
import { useFilters } from "@/store/filters";
import { useFilterWriter } from "@/components/filters/GlobalFilters";
import { familyLabel } from "@/lib/constants";
import {
  formatDate,
  formatNumber,
  formatPercent,
  formatSignedNumber,
} from "@/lib/format";
import { lowerIsBetter, wapeSentence } from "@/lib/kpi";
import { PageHeader } from "@/components/ui/PageHeader";
import { KpiGrid } from "@/components/kpi/KpiGrid";
import { KpiCard } from "@/components/kpi/KpiCard";
import { Panel } from "@/components/ui/Panel";
import { Segmented } from "@/components/ui/Segmented";
import { Select } from "@/components/ui/Select";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { ForecastChart } from "@/components/charts/ForecastChart";
import { HorizonChart } from "@/components/charts/HorizonChart";
import type { RankingItem } from "@/types/api";

function ChartSelectors() {
  const meta = useMeta();
  const store = useFilters((state) => state.store);
  const family = useFilters((state) => state.family);
  const write = useFilterWriter();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        compact
        aria-label="Tienda del gráfico"
        value={store === null ? "all" : String(store)}
        onChange={(event) =>
          write({ store: event.target.value === "all" ? null : Number(event.target.value) })
        }
        className="w-[132px]"
      >
        <option value="all">Todas las tiendas</option>
        {meta.data?.stores.map((item) => (
          <option key={item.store_nbr} value={item.store_nbr}>
            Tienda {item.store_nbr}
          </option>
        ))}
      </Select>
      <Select
        compact
        aria-label="Familia del gráfico"
        value={family ?? "all"}
        onChange={(event) =>
          write({ family: event.target.value === "all" ? null : event.target.value })
        }
        className="w-[170px]"
      >
        <option value="all">Todas las familias</option>
        {meta.data?.families.map((item) => (
          <option key={item.family} value={item.family}>
            {familyLabel(item.family)}
          </option>
        ))}
      </Select>
    </div>
  );
}

function SearchInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="relative">
      <Icon
        name="search"
        size={14}
        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted"
      />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Buscar tienda o familia"
        aria-label="Buscar en el ranking"
        className="h-8 w-full rounded-control border border-control bg-surface pl-8 pr-3 text-small text-ink placeholder:text-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 sm:w-[220px]"
      />
    </div>
  );
}

export function Model() {
  const meta = useMeta();
  const store = useFilters((state) => state.store);
  const family = useFilters((state) => state.family);
  const from = useFilters((state) => state.from);
  const to = useFilters((state) => state.to);

  const metrics = useMetrics();
  const horizon = useHorizon();
  const forecast = useForecast();
  const [order, setOrder] = useState<"best" | "worst">("best");
  const [search, setSearch] = useState("");
  const ranking = useRanking(order);

  const metric = metrics.data;
  const coverage = metric?.model.interval_coverage ?? 0;
  const coverageStatus =
    coverage >= 0.75 && coverage <= 0.9 ? "En objetivo" : coverage < 0.75 ? "Bajo" : "Alto";
  const coverageTone =
    coverage >= 0.75 && coverage <= 0.9 ? "positive" : coverage < 0.75 ? "negative" : "neutral";
  const biasDelta = metric
    ? Math.abs(metric.model.bias) - Math.abs(metric.baseline.bias)
    : 0;

  const rankingRows = useMemo(() => {
    const items = ranking.data?.items ?? [];
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter(
      (item) =>
        item.family.toLowerCase().includes(term) ||
        familyLabel(item.family).toLowerCase().includes(term) ||
        String(item.store_nbr).includes(term),
    );
  }, [ranking.data, search]);

  const columns: Column<RankingItem>[] = [
    {
      key: "store",
      header: "Tienda",
      render: (row) => <span className="text-ink">Tienda {row.store_nbr}</span>,
      sortValue: (row) => row.store_nbr,
    },
    {
      key: "family",
      header: "Familia",
      render: (row) => familyLabel(row.family),
      sortValue: (row) => familyLabel(row.family),
    },
    {
      key: "wape",
      header: "WAPE",
      align: "right",
      render: (row) => formatPercent(row.wape),
      sortValue: (row) => row.wape,
    },
    {
      key: "sales",
      header: "Ventas",
      align: "right",
      render: (row) => formatNumber(row.sales_total),
      sortValue: (row) => row.sales_total,
      hideBelow: "sm",
    },
  ];

  const weeks = horizon.data?.by_week ?? [];
  const bestWeek = weeks.length > 0 ? weeks.reduce((a, b) => (a.wape <= b.wape ? a : b)) : null;
  const worstWeek = weeks.length > 0 ? weeks.reduce((a, b) => (a.wape >= b.wape ? a : b)) : null;
  const baselineGrowth =
    weeks.length > 1 ? weeks[weeks.length - 1].baseline_wape - weeks[0].baseline_wape : 0;

  const combination =
    store !== null && family
      ? `Tienda ${store} · ${familyLabel(family)}`
      : "Selecciona una tienda y una familia";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Precisión del modelo"
        subtitle={
          <>
            Validación de las últimas 4 semanas · {formatDate(from)} — {formatDate(to)} · baseline =
            misma venta de hace dos semanas
          </>
        }
      />

      <KpiGrid>
        <KpiCard
          label="WAPE"
          value={metric ? formatPercent(metric.model.wape) : "—"}
          loading={metrics.isLoading}
          tip={
            metric
              ? wapeSentence(metric.model.wape)
              : "Error absoluto ponderado: cuánto se equivoca el modelo sobre las unidades vendidas."
          }
          delta={
            metric
              ? {
                  text: `${formatPercent(metric.improvement.wape_pct)} menos`,
                  tone: "positive",
                  direction: "down",
                  label: "vs baseline",
                }
              : undefined
          }
          support={metric ? `Baseline: ${formatPercent(metric.baseline.wape)}` : undefined}
        />
        <KpiCard
          label="RMSLE"
          value={metric ? formatNumber(metric.model.rmsle, 3) : "—"}
          loading={metrics.isLoading}
          tip="Error en escala logarítmica. Penaliza más equivocarse en ventas pequeñas y suaviza los picos."
          delta={
            metric
              ? {
                  text: `${formatPercent(metric.improvement.rmsle_pct)} menos`,
                  tone: "positive",
                  direction: "down",
                  label: "vs baseline",
                }
              : undefined
          }
          support={metric ? `Baseline: ${formatNumber(metric.baseline.rmsle, 3)}` : undefined}
        />
        <KpiCard
          label="Sesgo"
          value={metric ? `${formatSignedNumber(metric.model.bias, 1)} %` : "—"}
          loading={metrics.isLoading}
          tip="Positivo = el modelo pide de más (riesgo de merma). Negativo = pide de menos (riesgo de quiebre)."
          delta={
            metric
              ? {
                  text: `${formatNumber(Math.abs(biasDelta), 1)} pp ${biasDelta <= 0 ? "menos" : "más"}`,
                  tone: lowerIsBetter(biasDelta),
                  direction: biasDelta <= 0 ? "down" : "up",
                  label: "vs baseline",
                }
              : undefined
          }
          support={metric ? `Baseline: ${formatSignedNumber(metric.baseline.bias, 1)} %` : undefined}
        />
        <KpiCard
          label="Cobertura del intervalo"
          value={metric ? formatPercent(coverage) : "—"}
          loading={metrics.isLoading}
          tip="Porcentaje de días en que la venta real cayó dentro de la banda p10–p90. El objetivo es 80 %."
          delta={
            metric
              ? {
                  text: coverageStatus,
                  tone: coverageTone === "positive" ? "positive" : coverageTone === "negative" ? "negative" : "neutral",
                  direction: "flat",
                  label: "objetivo 80 %",
                }
              : undefined
          }
          support="El contrato no entrega cobertura del baseline; se compara contra el objetivo."
        />
      </KpiGrid>

      <Panel
        title="Real vs pronóstico"
        description={`${combination} · línea real, pronóstico y banda p10–p90. Usa el brush para hacer zoom.`}
        loading={forecast.isLoading}
        error={forecast.error}
        onRetry={() => forecast.refetch()}
        empty={!store || !family || forecast.data?.points.length === 0}
        emptyTitle="Selecciona una tienda y una familia"
        emptyDescription="El gráfico estrella necesita una combinación concreta para mostrar el historial y el futuro."
        actions={<ChartSelectors />}
      >
        {forecast.data && forecast.data.points.length > 0 ? (
          <ForecastChart points={forecast.data.points} height={400} />
        ) : (
          <EmptyState title="Sin puntos en el rango" compact />
        )}
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel
          title="Error por horizonte"
          description="WAPE del modelo y del baseline en cada semana de validación"
          loading={horizon.isLoading}
          error={horizon.error}
          onRetry={() => horizon.refetch()}
          empty={weeks.length === 0}
        >
          {weeks.length > 0 && <HorizonChart data={weeks} />}
        </Panel>

        <div className="rounded-card border border-line bg-surface p-5">
          <h2 className="text-section font-semibold text-ink">Lectura del horizonte</h2>
          {horizon.isLoading ? (
            <div className="mt-3 space-y-2">
              <div className="skeleton h-4 w-full rounded-control" />
              <div className="skeleton h-4 w-4/5 rounded-control" />
              <div className="skeleton h-4 w-3/5 rounded-control" />
            </div>
          ) : bestWeek && worstWeek ? (
            <>
              <p className="mt-2 text-body text-muted">
                El error más bajo aparece en la semana {bestWeek.week} con{" "}
                {formatPercent(bestWeek.wape)}. El más alto, en la semana {worstWeek.week} con{" "}
                {formatPercent(worstWeek.wape)}.
              </p>
              <ul className="mt-4 space-y-3 text-small">
                <li className="flex items-start gap-2">
                  <Badge tone="neutral">Modelo</Badge>
                  <span className="text-muted">
                    El pronóstico pierde precisión a medida que se aleja del historial. Planifica el pedido
                    de la semana 1 con más confianza que el de la semana 4.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge tone={baselineGrowth > 0 ? "warning" : "positive"}>Baseline</Badge>
                  <span className="text-muted">
                    {baselineGrowth > 0
                      ? `El baseline empeora ${formatNumber(Math.abs(baselineGrowth) * 100, 1)} pp entre la primera y la última semana.`
                      : "El baseline no empeora de forma clara en este periodo."}
                  </span>
                </li>
              </ul>
            </>
          ) : (
            <EmptyState title="Sin semanas de validación" compact />
          )}
          <p className="mt-4 border-t border-rule pt-3 text-small text-muted">
            Solo se puede medir error donde hay venta real. Las semanas futuras no tienen ground truth.
          </p>
        </div>
      </div>

      <Panel
        title="Mejores y peores combinaciones"
        description={
          meta.data
            ? "Ranking por WAPE dentro de la selección de tienda y familia · ordena con los encabezados"
            : undefined
        }
        loading={ranking.isLoading}
        error={ranking.error}
        onRetry={() => ranking.refetch()}
        empty={(ranking.data?.items.length ?? 0) === 0}
        skeleton="table"
        flush
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput value={search} onChange={setSearch} />
            <Segmented
              ariaLabel="Orden del ranking"
              value={order}
              onChange={setOrder}
              options={[
                { value: "best", label: "Mejores" },
                { value: "worst", label: "Peores" },
              ]}
            />
          </div>
        }
      >
        <div className="px-5 pb-2 pt-3">
          <DataTable
            rows={rankingRows}
            columns={columns}
            getRowKey={(row) => `${row.store_nbr}-${row.family}`}
            caption="Ranking de combinaciones tienda y familia por WAPE"
            emptyTitle="No hay coincidencias"
            emptyDescription="Prueba con otra búsqueda o cambia los filtros globales."
          />
        </div>
      </Panel>
    </div>
  );
}
