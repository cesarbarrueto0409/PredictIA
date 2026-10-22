import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMeta } from "@/hooks/useMeta";
import { useFilters } from "@/store/filters";
import { familyLabel } from "@/lib/constants";
import { Button } from "@/components/ui/Button";
import { DateInput } from "@/components/ui/DateInput";
import { Icon } from "@/components/ui/Icon";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils";

export function useFilterWriter() {
  const [, setSearchParams] = useSearchParams();
  const setFilters = useFilters((state) => state.setFilters);

  return (next: {
    store?: number | null;
    family?: string | null;
    from?: string;
    to?: string;
  }) => {
    setFilters(next);
    setSearchParams(
      (previous) => {
        const params = new URLSearchParams(previous);
        if (next.store !== undefined) {
          if (next.store === null) params.delete("store");
          else params.set("store", String(next.store));
        }
        if (next.family !== undefined) {
          if (next.family === null) params.delete("family");
          else params.set("family", next.family);
        }
        if (next.from !== undefined) params.set("from", next.from);
        if (next.to !== undefined) params.set("to", next.to);
        return params;
      },
      { replace: true },
    );
  };
}

function FilterFields({ vertical = false }: { vertical?: boolean }) {
  const meta = useMeta();
  const store = useFilters((state) => state.store);
  const family = useFilters((state) => state.family);
  const from = useFilters((state) => state.from);
  const to = useFilters((state) => state.to);
  const write = useFilterWriter();

  const stores = meta.data?.stores ?? [];
  const families = meta.data?.families ?? [];

  return (
    <div
      className={cn(
        vertical ? "grid gap-4" : "flex items-end gap-2",
        !vertical && "flex-wrap",
      )}
    >
      <label className={cn("block", vertical ? "" : "w-[126px]")}>
        <span className="mb-1 block text-small leading-4 text-muted">Tienda</span>
        <Select
          compact
          value={store === null ? "all" : String(store)}
          onChange={(event) =>
            write({ store: event.target.value === "all" ? null : Number(event.target.value) })
          }
          disabled={!meta.data}
          aria-label="Filtrar por tienda"
        >
          <option value="all">Todas las tiendas</option>
          {stores.map((item) => (
            <option key={item.store_nbr} value={item.store_nbr}>
              Tienda {item.store_nbr}
            </option>
          ))}
        </Select>
      </label>

      <label className={cn("block", vertical ? "" : "w-[168px]")}>
        <span className="mb-1 block text-small leading-4 text-muted">Familia</span>
        <Select
          compact
          value={family ?? "all"}
          onChange={(event) => write({ family: event.target.value === "all" ? null : event.target.value })}
          disabled={!meta.data}
          aria-label="Filtrar por familia de producto"
        >
          <option value="all">Todas las familias</option>
          {families.map((item) => (
            <option key={item.family} value={item.family}>
              {familyLabel(item.family)}
            </option>
          ))}
        </Select>
      </label>

      <div>
        <span className="mb-1 block text-small leading-4 text-muted">Periodo</span>
        <div className="flex items-center gap-1.5">
          <DateInput
            value={from}
            min={meta.data?.date_min}
            max={to || meta.data?.date_max}
            onChange={(event) => write({ from: event.target.value })}
            aria-label="Fecha inicial"
            disabled={!meta.data}
          />
          <span className="text-small text-faint" aria-hidden="true">
            →
          </span>
          <DateInput
            value={to}
            min={from || meta.data?.date_min}
            max={meta.data?.date_max}
            onChange={(event) => write({ to: event.target.value })}
            aria-label="Fecha final"
            disabled={!meta.data}
          />
        </div>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          if (!meta.data) return;
          const defaultStore = meta.data.stores[0]?.store_nbr ?? null;
          const defaultFamily =
            meta.data.families.find((item) => item.family === "PRODUCE")?.family ??
            meta.data.families[0]?.family ??
            null;
          write({
            store: defaultStore,
            family: defaultFamily,
            from: meta.data.date_min,
            to: meta.data.date_max,
          });
        }}
        disabled={!meta.data}
        aria-label="Restablecer filtros"
        title="Restablecer filtros"
        className={vertical ? "justify-start" : ""}
      >
        <Icon name="refresh" size={14} />
        Restablecer
      </Button>
    </div>
  );
}

export function GlobalFilters({ className }: { className?: string }) {
  return (
    <div className={cn("topbar-filters", className)}>
      <FilterFields />
    </div>
  );
}

export function MobileFilters() {
  const [open, setOpen] = useState(false);
  const store = useFilters((state) => state.store);
  const family = useFilters((state) => state.family);
  const write = useFilterWriter();
  const meta = useMeta();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="lg:hidden"
      >
        <Icon name="filter" size={14} />
        Filtros
      </Button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/30 lg:hidden"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Filtros globales"
            className="max-h-[90vh] w-full overflow-y-auto rounded-t-sheet border border-line bg-surface p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-section font-semibold text-ink">Filtros</h2>
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)} aria-label="Cerrar filtros">
                <Icon name="close" size={16} />
              </Button>
            </div>
            <FilterFields vertical />
            <div className="mt-5 flex items-center justify-between gap-3 border-t border-rule pt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (!meta.data) return;
                  write({
                    store: meta.data.stores[0]?.store_nbr ?? null,
                    family:
                      meta.data.families.find((item) => item.family === "PRODUCE")?.family ??
                      meta.data.families[0]?.family ??
                      null,
                    from: meta.data.date_min,
                    to: meta.data.date_max,
                  });
                }}
              >
                Restablecer
              </Button>
              <Button size="sm" onClick={() => setOpen(false)}>
                <Icon name="check" size={14} />
                Aplicar
              </Button>
            </div>
            <p className="mt-3 text-small text-muted">
              Los filtros se reflejan en la URL. {store !== null ? `Tienda ${store}` : "Todas las tiendas"}
              {family ? ` · ${familyLabel(family)}` : ""}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
