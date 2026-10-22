import { useState } from "react";
import { useBusinessKpis } from "@/hooks/useBusiness";
import { useFilters } from "@/store/filters";
import { useAppStore } from "@/store/app";
import { formatDate, formatNumber, formatPercent, formatSignedNumber } from "@/lib/format";
import { fillRateTone, lowerIsBetter } from "@/lib/kpi";
import { PageHeader } from "@/components/ui/PageHeader";
import { KpiGrid } from "@/components/kpi/KpiGrid";
import { KpiCard } from "@/components/kpi/KpiCard";
import { Panel } from "@/components/ui/Panel";
import { Slider } from "@/components/ui/Slider";
import { Toggle } from "@/components/ui/Toggle";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { ImpactSentence } from "@/components/business/ImpactSentence";

interface ComparisonRow {
  key: string;
  metric: string;
  model: string;
  baseline: string;
  delta: string;
  tone: "positive" | "negative" | "neutral";
}

function toneClass(tone: ComparisonRow["tone"]): string {
  if (tone === "positive") return "text-positive";
  if (tone === "negative") return "text-negative";
  return "text-muted";
}

export function Business() {
  const [onlyPerishable, setOnlyPerishable] = useState(false);
  const from = useFilters((state) => state.from);
  const to = useFilters((state) => state.to);
  const serviceLevel = useAppStore((state) => state.serviceLevel);
  const setServiceLevel = useAppStore((state) => state.setServiceLevel);
  const business = useBusinessKpis(onlyPerishable);
  const kpis = business.data;

  const stockoutDelta = kpis ? kpis.delta.stockout_risk_pct : 0;
  const wasteUnitsDelta = kpis ? kpis.delta.waste_units_pct : 0;
  const wasteRiskDelta = kpis ? kpis.model.waste_risk - kpis.baseline.waste_risk : 0;
  const fillDelta = kpis ? kpis.model.fill_rate - kpis.baseline.fill_rate : 0;

  const rows: ComparisonRow[] = kpis
    ? [
        {
          key: "stockout",
          metric: "Riesgo de quiebre",
          model: formatPercent(kpis.model.stockout_risk),
          baseline: formatPercent(kpis.baseline.stockout_risk),
          delta: `${formatSignedNumber((kpis.model.stockout_risk - kpis.baseline.stockout_risk) * 100, 1)} pp`,
          tone: lowerIsBetter(stockoutDelta),
        },
        {
          key: "waste-risk",
          metric: "Riesgo de merma",
          model: formatPercent(kpis.model.waste_risk),
          baseline: formatPercent(kpis.baseline.waste_risk),
          delta: `${formatSignedNumber(wasteRiskDelta * 100, 1)} pp`,
          tone: lowerIsBetter(wasteRiskDelta),
        },
        {
          key: "fill",
          metric: "Fill rate",
          model: formatPercent(kpis.model.fill_rate),
          baseline: formatPercent(kpis.baseline.fill_rate),
          delta: `${formatSignedNumber(fillDelta * 100, 1)} pp`,
          tone: fillDelta >= 0 ? "positive" : "negative",
        },
        {
          key: "waste-units",
          metric: "Merma estimada",
          model: `${formatNumber(kpis.model.waste_units)} u`,
          baseline: `${formatNumber(kpis.baseline.waste_units)} u`,
          delta: `${formatPercent(Math.abs(wasteUnitsDelta))} ${wasteUnitsDelta <= 0 ? "menos" : "más"}`,
          tone: lowerIsBetter(wasteUnitsDelta),
        },
        {
          key: "waste-pct",
          metric: "Merma sobre venta perecedera",
          model: formatPercent(kpis.model.waste_pct),
          baseline: formatPercent(kpis.baseline.waste_pct),
          delta: `${formatSignedNumber((kpis.model.waste_pct - kpis.baseline.waste_pct) * 100, 1)} pp`,
          tone: lowerIsBetter(kpis.model.waste_pct - kpis.baseline.waste_pct),
        },
      ]
    : [];

  const columns: Column<ComparisonRow>[] = [
    {
      key: "metric",
      header: "Indicador",
      render: (row) => <span className="font-medium text-ink">{row.metric}</span>,
    },
    {
      key: "model",
      header: "Modelo",
      align: "right",
      render: (row) => <span className="font-medium">{row.model}</span>,
    },
    {
      key: "baseline",
      header: "Baseline",
      align: "right",
      render: (row) => <span className="text-muted">{row.baseline}</span>,
    },
    {
      key: "delta",
      header: "Diferencia",
      align: "right",
      render: (row) => <span className={toneClass(row.tone)}>{row.delta}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Impacto de negocio"
        subtitle={
          <>
            Quiebres y merma sobre la validación · {formatDate(from)} — {formatDate(to)} · nivel de
            servicio p{Math.round(serviceLevel * 100)}
          </>
        }
        actions={
          <Badge tone={onlyPerishable ? "warning" : "neutral"}>
            {onlyPerishable ? "Solo perecibles" : "Toda la cadena"}
          </Badge>
        }
      />

      <KpiGrid>
        <KpiCard
          label="Riesgo de quiebre"
          value={kpis ? formatPercent(kpis.model.stockout_risk) : "—"}
          loading={business.isLoading}
          tip="Unidades de venta que se perderían por pedir de menos, como porcentaje de la demanda."
          delta={
            kpis
              ? {
                  text: `${formatPercent(Math.abs(stockoutDelta))} ${stockoutDelta <= 0 ? "menos" : "más"}`,
                  tone: lowerIsBetter(stockoutDelta),
                  direction: stockoutDelta <= 0 ? "down" : "up",
                  label: "vs baseline",
                }
              : undefined
          }
          support={kpis ? `Baseline: ${formatPercent(kpis.baseline.stockout_risk)}` : undefined}
        />
        <KpiCard
          label="Riesgo de merma"
          value={kpis ? formatPercent(kpis.model.waste_risk) : "—"}
          loading={business.isLoading}
          tip="Unidades pedidas de más sobre el total pedido en perecibles. Es el costo de pedir con colchón."
          delta={
            kpis
              ? {
                  text: `${formatSignedNumber(wasteRiskDelta * 100, 1)} pp`,
                  tone: lowerIsBetter(wasteRiskDelta),
                  direction: wasteRiskDelta <= 0 ? "down" : "up",
                  label: "vs baseline",
                }
              : undefined
          }
          support={kpis ? `Baseline: ${formatPercent(kpis.baseline.waste_risk)}` : undefined}
        />
        <KpiCard
          label="Fill rate estimado"
          value={kpis ? formatPercent(kpis.model.fill_rate) : "—"}
          loading={business.isLoading}
          tip="Parte de la demanda que se cubre con el pedido. Más alto = menos venta perdida."
          delta={
            kpis
              ? {
                  text: `${formatSignedNumber(fillDelta * 100, 1)} pp`,
                  tone: fillRateTone(kpis.model.fill_rate),
                  direction: fillDelta >= 0 ? "up" : "down",
                  label: "vs baseline",
                }
              : undefined
          }
          support={kpis ? `Baseline: ${formatPercent(kpis.baseline.fill_rate)}` : undefined}
        />
        <KpiCard
          label="Merma estimada"
          value={kpis ? formatNumber(kpis.model.waste_units) : "—"}
          unit={kpis ? "unidades" : undefined}
          loading={business.isLoading}
          tip="Unidades de perecibles que se pedirían de más. Se compara con la venta real del periodo."
          delta={
            kpis
              ? {
                  text: `${formatPercent(Math.abs(wasteUnitsDelta))} ${wasteUnitsDelta <= 0 ? "menos" : "más"}`,
                  tone: lowerIsBetter(wasteUnitsDelta),
                  direction: wasteUnitsDelta <= 0 ? "down" : "up",
                  label: "vs baseline",
                }
              : undefined
          }
          support={kpis ? `${formatPercent(kpis.model.waste_pct)} de la venta perecedera` : undefined}
        />
      </KpiGrid>

      <div className="rounded-card border border-line bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h2 className="text-section font-semibold text-ink">El impacto en una frase</h2>
          <Badge tone="neutral">Copiable para la presentación</Badge>
        </div>
        {business.isError ? (
          <p className="mt-2 text-body text-negative">No se pudo calcular la frase de impacto.</p>
        ) : business.isLoading || !kpis ? (
          <div className="mt-4 space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : (
          <div className="mt-3">
            <ImpactSentence kpis={kpis} onlyPerishable={onlyPerishable} />
          </div>
        )}
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel
          title="Modelo vs baseline"
          description="Mismas filas y mismo periodo. Baseline = repetir la venta del mismo día de la semana anterior."
          loading={business.isLoading}
          error={business.error}
          onRetry={() => business.refetch()}
          empty={rows.length === 0}
          skeleton="table"
          flush
        >
          <div className="px-5 pb-4 pt-2">
            <DataTable
              rows={rows}
              columns={columns}
              getRowKey={(row) => row.key}
              caption="Comparación de indicadores de negocio entre modelo y baseline"
            />
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel
            title="Nivel de servicio"
            description="Más nivel de servicio reduce quiebres y aumenta la merma. El punto de equilibrio depende del margen."
            skeleton="text"
          >
            <Slider
              value={serviceLevel}
              onChange={setServiceLevel}
              label="Cuantil del pedido"
              valueLabel={`p${Math.round(serviceLevel * 100)}`}
              minLabel="p50 · pedido central"
              maxLabel="p95 · colchón alto"
            />
            <div className="mt-5">
              <Toggle
                checked={onlyPerishable}
                onChange={setOnlyPerishable}
                label="Solo perecibles"
                description="Recalcula todos los indicadores con las familias perecederas."
              />
            </div>
            <p className="mt-4 border-t border-rule pt-3 text-small text-muted">
              El simulador recalcula quiebre y merma con el cuantil elegido. Si el backend no implementa{" "}
              <span className="font-mono text-[12px] text-ink">service_level</span>, el valor se mantiene
              y queda anotado en PENDIENTES.md.
            </p>
          </Panel>

          <div className="rounded-card border border-line bg-raised p-5">
            <h2 className="text-section font-semibold text-ink">Cómo se calcula</h2>
            <dl className="mt-3 space-y-3 text-small">
              <div>
                <dt className="font-medium text-ink">Quiebre</dt>
                <dd className="text-muted">Suma de (venta real − pedido) cuando el pedido se queda corto.</dd>
              </div>
              <div>
                <dt className="font-medium text-ink">Merma</dt>
                <dd className="text-muted">Suma de (pedido − venta real) en perecederos.</dd>
              </div>
              <div>
                <dt className="font-medium text-ink">Fill rate</dt>
                <dd className="text-muted">1 − quiebre / demanda total del periodo.</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
