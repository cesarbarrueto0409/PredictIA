import { Link } from "react-router-dom";
import { useBusinessKpis } from "@/hooks/useBusiness";
import { useForecast } from "@/hooks/useForecast";
import { useMetrics } from "@/hooks/useMetrics";
import { useOrderSuggestions } from "@/hooks/useOrders";
import { useMeta } from "@/hooks/useMeta";
import { useFilters } from "@/store/filters";
import { familyLabel } from "@/lib/constants";
import {
  formatDate,
  formatNumber,
  formatPercent,
  formatSignedNumber,
} from "@/lib/format";
import {
  biasSentence,
  coverageSentence,
  fillRateTone,
  lowerIsBetter,
  wapeSentence,
} from "@/lib/kpi";
import { PageHeader } from "@/components/ui/PageHeader";
import { KpiGrid } from "@/components/kpi/KpiGrid";
import { KpiCard } from "@/components/kpi/KpiCard";
import { Panel } from "@/components/ui/Panel";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { buttonClasses } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";
import { ForecastChart } from "@/components/charts/ForecastChart";
import { ImpactSentence } from "@/components/business/ImpactSentence";

export function Overview() {
  const meta = useMeta();
  const store = useFilters((state) => state.store);
  const family = useFilters((state) => state.family);
  const from = useFilters((state) => state.from);
  const to = useFilters((state) => state.to);

  const metrics = useMetrics();
  const business = useBusinessKpis(false);
  const forecast = useForecast();
  const orders = useOrderSuggestions();

  const metric = metrics.data;
  const kpis = business.data;
  const highRisk = orders.data?.items.filter((item) => item.risk === "high").length ?? 0;
  const combination =
    store !== null && family
      ? `Tienda ${store} · ${familyLabel(family)}`
      : "Selecciona una tienda y una familia";

  const retry = () => {
    void metrics.refetch();
    void business.refetch();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resumen ejecutivo"
        subtitle={
          <>
            Validación sobre las últimas 4 semanas de historial · {formatDate(from)} —{" "}
            {formatDate(to)}
            {meta.data ? ` · ${meta.data.stores.length} tiendas y ${meta.data.families.length} familias` : ""}
          </>
        }
        actions={
          <Link to="/pedidos" className={buttonClasses("primary", "md")}>
            Ir a pedidos
            <Icon name="arrowRight" size={14} />
          </Link>
        }
      />

      {metrics.isError || business.isError ? (
        <ErrorState error={metrics.error ?? business.error} onRetry={retry} />
      ) : (
        <KpiGrid>
          <KpiCard
            label="Error del modelo (WAPE)"
            value={metric ? formatPercent(metric.model.wape) : "—"}
            loading={metrics.isLoading}
            tip={
              metric
                ? wapeSentence(metric.model.wape)
                : "WAPE mide el error absoluto como porcentaje de las unidades vendidas."
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
            support={
              metric
                ? `Baseline: ${formatPercent(metric.baseline.wape)} · error medio`
                : undefined
            }
          />
          <KpiCard
            label="Fill rate estimado"
            value={kpis ? formatPercent(kpis.model.fill_rate) : "—"}
            loading={business.isLoading}
            tip="Parte de la demanda que se cubre con el pedido recomendado. Un fill rate más alto significa menos venta perdida."
            delta={
              kpis
                ? {
                    text: `${formatSignedNumber((kpis.model.fill_rate - kpis.baseline.fill_rate) * 100, 1)} pp`,
                    tone: fillRateTone(kpis.model.fill_rate),
                    direction:
                      kpis.model.fill_rate >= kpis.baseline.fill_rate ? "up" : "down",
                    label: "vs baseline",
                  }
                : undefined
            }
            support={kpis ? `Quiebre: ${formatPercent(kpis.model.stockout_risk)}` : undefined}
          />
          <KpiCard
            label="Merma estimada"
            value={kpis ? formatNumber(kpis.model.waste_units) : "—"}
            unit={kpis ? "unidades" : undefined}
            loading={business.isLoading}
            tip="Unidades de perecibles que se pedirían de más en la validación. Se calcula contra la venta real."
            delta={
              kpis
                ? {
                    text: `${formatPercent(Math.abs(kpis.delta.waste_units_pct))} ${kpis.delta.waste_units_pct <= 0 ? "menos" : "más"}`,
                    tone: lowerIsBetter(kpis.delta.waste_units_pct),
                    direction: kpis.delta.waste_units_pct <= 0 ? "down" : "up",
                    label: "vs baseline",
                  }
                : undefined
            }
            support={kpis ? `${formatPercent(kpis.model.waste_pct)} de la venta perecedera` : undefined}
          />
          <KpiCard
            label="Riesgo de quiebre"
            value={kpis ? formatPercent(kpis.model.stockout_risk) : "—"}
            loading={business.isLoading}
            tip="Unidades de venta que se perderían por pedir de menos. Más bajo es mejor."
            delta={
              kpis
                ? {
                    text: `${formatPercent(Math.abs(kpis.delta.stockout_risk_pct))} ${kpis.delta.stockout_risk_pct <= 0 ? "menos" : "más"}`,
                    tone: lowerIsBetter(kpis.delta.stockout_risk_pct),
                    direction: kpis.delta.stockout_risk_pct <= 0 ? "down" : "up",
                    label: "vs baseline",
                  }
                : undefined
            }
            support={orders.data ? `${highRisk} combinaciones en riesgo alto` : undefined}
          />
        </KpiGrid>
      )}

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_384px]">
        <Panel
          title="Venta real y pronóstico"
          description={`${combination} · banda de incertidumbre p10–p90`}
          error={forecast.error}
          onRetry={() => forecast.refetch()}
          loading={forecast.isLoading}
          empty={!store || !family || forecast.data?.points.length === 0}
          emptyTitle="Selecciona una tienda y una familia"
          emptyDescription="El gráfico estrella muestra el historial y el pronóstico de una combinación a la vez."
          skeleton="chart"
          actions={
            <Link to="/modelo" className={buttonClasses("ghost", "sm")}>
              Ver precisión
              <Icon name="arrowRight" size={12} />
            </Link>
          }
        >
          {forecast.data && forecast.data.points.length > 0 ? (
            <ForecastChart points={forecast.data.points} height={360} showBrush={false} />
          ) : (
            <EmptyState title="Sin puntos para el rango" compact />
          )}
        </Panel>

        <div className="space-y-4">
          <div className="rounded-card border border-line bg-surface p-5">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-section font-semibold text-ink">El impacto en una frase</h2>
              <Badge tone="neutral">Negocio</Badge>
            </div>
            {business.isError ? (
              <ErrorState error={business.error} onRetry={() => business.refetch()} compact />
            ) : business.isLoading || !kpis ? (
              <div className="mt-4 space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-11/12" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : (
              <div className="mt-4">
                <ImpactSentence kpis={kpis} onlyPerishable={false} />
              </div>
            )}
          </div>

          <div className="rounded-card border border-line bg-surface p-5">
            <h2 className="text-section font-semibold text-ink">Siguiente acción</h2>
            <p className="mt-1 text-body text-muted">
              {orders.isLoading
                ? "Calculando pedidos de la próxima semana…"
                : highRisk > 0
                  ? `${highRisk} combinaciones tienda–familia están en riesgo alto. Revisa el pedido sugerido antes de comprar.`
                  : "No hay combinaciones en riesgo alto con el nivel de servicio actual."}
            </p>
            <Link to="/pedidos" className={buttonClasses("secondary", "sm", "mt-4")}>
              Revisar pedido sugerido
              <Icon name="arrowRight" size={12} />
            </Link>
            {orders.data && (
              <p className="mt-3 text-small text-muted">
                Semana del {formatDate(orders.data.week_start)} · {formatNumber(orders.data.total)}{" "}
                combinaciones
              </p>
            )}
          </div>

          <div className="rounded-card border border-line bg-surface p-5">
            <h2 className="text-section font-semibold text-ink">Cómo leer las cifras</h2>
            <dl className="mt-3 space-y-3 text-small">
              <div>
                <dt className="font-medium text-ink">WAPE</dt>
                <dd className="text-muted">
                  {metric ? wapeSentence(metric.model.wape) : "Error medio frente a las unidades vendidas."}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-ink">Sesgo</dt>
                <dd className="text-muted">
                  {metric ? biasSentence(metric.model.bias) : "Si el modelo tiende a pedir de más o de menos."}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-ink">Cobertura del intervalo</dt>
                <dd className="text-muted">
                  {metric?.model.interval_coverage !== undefined
                    ? coverageSentence(metric.model.interval_coverage)
                    : "Qué tan seguido la venta real cae en la banda p10–p90."}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-raised px-5 py-4">
        <p className="text-body text-muted">
          Baseline = repetir la venta del mismo día de la semana anterior. Validación = últimas 4 semanas del historial.
        </p>
        <div className="flex items-center gap-2">
          <Link to="/exploracion" className={buttonClasses("ghost", "sm")}>
            Explorar datos
          </Link>
          <Link to="/impacto" className={buttonClasses("ghost", "sm")}>
            Ver impacto
          </Link>
        </div>
      </div>
    </div>
  );
}
