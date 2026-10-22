import { useMemo, useState } from "react";
import Papa from "papaparse";
import { useOrderSuggestions } from "@/hooks/useOrders";
import { useFilters } from "@/store/filters";
import { useAppStore } from "@/store/app";
import { familyLabel } from "@/lib/constants";
import { formatDate, formatNumber } from "@/lib/format";
import { downloadText } from "@/lib/utils";
import type { OrderSuggestionItem, Risk } from "@/types/api";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";
import { Segmented } from "@/components/ui/Segmented";
import { Select } from "@/components/ui/Select";
import { Toggle } from "@/components/ui/Toggle";
import { Pagination } from "@/components/ui/Pagination";
import { DataTable, type Column } from "@/components/ui/DataTable";

const RISK_LABEL: Record<Risk, string> = { high: "Alto", medium: "Medio", low: "Bajo" };
const RISK_TONE: Record<Risk, "negative" | "warning" | "positive"> = {
  high: "negative",
  medium: "warning",
  low: "positive",
};
const RISK_ICON: Record<Risk, "alert" | "info" | "check"> = {
  high: "alert",
  medium: "info",
  low: "check",
};
const RISK_ORDER: Record<Risk, number> = { high: 0, medium: 1, low: 2 };
const PAGE_SIZE = 12;

function riskBadge(risk: Risk) {
  return (
    <Badge tone={RISK_TONE[risk]}>
      <Icon name={RISK_ICON[risk]} size={11} />
      {RISK_LABEL[risk]}
    </Badge>
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
        aria-label="Buscar pedidos"
        className="h-8 w-full rounded-control border border-control bg-surface pl-8 pr-3 text-small text-ink placeholder:text-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 sm:w-[220px]"
      />
    </div>
  );
}

export function Orders() {
  const orders = useOrderSuggestions();
  const store = useFilters((state) => state.store);
  const family = useFilters((state) => state.family);
  const serviceLevel = useAppStore((state) => state.serviceLevel);
  const setServiceLevel = useAppStore((state) => state.setServiceLevel);

  const [search, setSearch] = useState("");
  const [risk, setRisk] = useState<Risk | "all">("all");
  const [onlyPerishable, setOnlyPerishable] = useState(false);
  const [page, setPage] = useState(1);

  const allItems = useMemo(() => orders.data?.items ?? [], [orders.data]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return allItems.filter((item) => {
      if (risk !== "all" && item.risk !== risk) return false;
      if (onlyPerishable && !item.is_perishable) return false;
      if (!term) return true;
      return (
        String(item.store_nbr).includes(term) ||
        item.family.toLowerCase().includes(term) ||
        familyLabel(item.family).toLowerCase().includes(term)
      );
    });
  }, [allItems, risk, onlyPerishable, search]);

  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const highRisk = filtered.filter((item) => item.risk === "high").length;
  const perishableHigh = filtered.filter((item) => item.risk === "high" && item.is_perishable).length;

  const resetPage = () => setPage(1);

  const columns: Column<OrderSuggestionItem>[] = [
    {
      key: "store",
      header: "Tienda",
      render: (row) => <span className="text-ink">Tienda {row.store_nbr}</span>,
      sortValue: (row) => row.store_nbr,
    },
    {
      key: "family",
      header: "Familia",
      render: (row) => (
        <span className="flex flex-wrap items-center gap-2">
          {familyLabel(row.family)}
          {row.is_perishable && <Badge tone="neutral">Perecedero</Badge>}
        </span>
      ),
      sortValue: (row) => familyLabel(row.family),
    },
    {
      key: "forecast",
      header: "Pronóstico",
      align: "right",
      render: (row) => formatNumber(row.forecast),
      sortValue: (row) => row.forecast,
      hideBelow: "sm",
    },
    {
      key: "order",
      header: "Pedido recomendado",
      align: "right",
      render: (row) => <span className="font-semibold text-ink">{formatNumber(row.recommended_order)}</span>,
      sortValue: (row) => row.recommended_order,
    },
    {
      key: "safety",
      header: "Stock de seguridad",
      align: "right",
      render: (row) => <span className="text-muted">{formatNumber(row.safety_stock)}</span>,
      sortValue: (row) => row.safety_stock,
      hideBelow: "md",
    },
    {
      key: "risk",
      header: "Riesgo",
      align: "right",
      render: (row) => riskBadge(row.risk),
      sortValue: (row) => RISK_ORDER[row.risk],
    },
  ];

  const exportCsv = () => {
    if (filtered.length === 0) return;
    const csv = Papa.unparse(
      filtered.map((item) => ({
        Tienda: item.store_nbr,
        Familia: familyLabel(item.family),
        Familia_codigo: item.family,
        Pronostico: item.forecast,
        Pedido_recomendado: item.recommended_order,
        Stock_seguridad: item.safety_stock,
        Riesgo: RISK_LABEL[item.risk],
        Perecedero: item.is_perishable ? "Sí" : "No",
      })),
      {
        columns: [
          "Tienda",
          "Familia",
          "Familia_codigo",
          "Pronostico",
          "Pedido_recomendado",
          "Stock_seguridad",
          "Riesgo",
          "Perecedero",
        ],
      },
    );
    const week = orders.data?.week_start ?? "semana";
    downloadText(`pedido_sugerido_${week}.csv`, csv);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pedido sugerido"
        subtitle={
          orders.data ? (
            <>
              Semana del {formatDate(orders.data.week_start)} · nivel de servicio p
              {Math.round(serviceLevel * 100)} · {filtered.length} de {allItems.length} combinaciones
              {store !== null ? ` · Tienda ${store}` : ""}
              {family ? ` · ${familyLabel(family)}` : ""}
            </>
          ) : (
            "Calculando el pedido de la próxima semana…"
          )
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-small text-muted">
              Nivel
              <Select
                compact
                value={String(serviceLevel)}
                onChange={(event) => {
                  setServiceLevel(Number(event.target.value));
                  resetPage();
                }}
                aria-label="Nivel de servicio del pedido"
                className="w-[86px]"
              >
                {[0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95].map((level) => (
                  <option key={level} value={level}>
                    p{Math.round(level * 100)}
                  </option>
                ))}
              </Select>
            </label>
            <Button onClick={exportCsv} disabled={filtered.length === 0}>
              <Icon name="download" size={14} />
              Exportar CSV
            </Button>
          </div>
        }
      />

      <Panel
        title="Compras de la próxima semana"
        description={`Pedido = pronóstico central + stock de seguridad. ${highRisk} en riesgo alto${perishableHigh > 0 ? `, ${perishableHigh} perecederos` : ""}.`}
        loading={orders.isLoading}
        error={orders.error}
        onRetry={() => orders.refetch()}
        empty={allItems.length === 0}
        skeleton="table"
        flush
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput
              value={search}
              onChange={(value) => {
                setSearch(value);
                resetPage();
              }}
            />
            <Segmented
              ariaLabel="Filtrar por riesgo"
              value={risk}
              onChange={(value) => {
                setRisk(value);
                resetPage();
              }}
              options={[
                { value: "all", label: "Todos" },
                { value: "high", label: "Alto" },
                { value: "medium", label: "Medio" },
                { value: "low", label: "Bajo" },
              ]}
            />
            <Toggle
              checked={onlyPerishable}
              onChange={(value) => {
                setOnlyPerishable(value);
                resetPage();
              }}
              label="Solo perecederos"
            />
          </div>
        }
      >
        <div className="px-5 pt-2">
          <DataTable
            rows={pageRows}
            columns={columns}
            getRowKey={(row) => `${row.store_nbr}-${row.family}`}
            initialSort={{ key: "risk", direction: "asc" }}
            caption="Pedido sugerido por tienda y familia para la próxima semana"
            rowClassName={(row) =>
              row.risk === "high" && row.is_perishable
                ? "[&>td]:bg-[color-mix(in_srgb,var(--negative)_5%,var(--surface))] [&>td:first-child]:border-l-2 [&>td:first-child]:border-negative"
                : undefined
            }
            emptyTitle="No hay pedidos con estos filtros"
            emptyDescription="Prueba con otro riesgo, otra búsqueda o desactiva el filtro de perecederos."
          />
        </div>
        <div className="border-t border-rule px-5 py-4">
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={filtered.length}
            onPageChange={setPage}
          />
        </div>
      </Panel>

      <p className="text-small text-muted">
        Las filas resaltadas son perecederos en riesgo alto: revísalas primero. El CSV incluye las
        columnas visibles y respeta los filtros aplicados.
      </p>
    </div>
  );
}
