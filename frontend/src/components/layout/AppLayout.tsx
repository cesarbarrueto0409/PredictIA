import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useSearchParams } from "react-router-dom";
import { useMeta } from "@/hooks/useMeta";
import { useAppStore } from "@/store/app";
import { useFilters } from "@/store/filters";
import { PRESENTATION_HINT } from "@/lib/constants";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { GlobalFilters, MobileFilters } from "@/components/filters/GlobalFilters";
import { BrandMark, Sidebar } from "./Sidebar";

function FilterUrlSync() {
  const meta = useMeta();
  const [params, setParams] = useSearchParams();
  const setFilters = useFilters((state) => state.setFilters);
  const done = useRef(false);

  useEffect(() => {
    if (!meta.data || done.current) return;
    done.current = true;
    const dateMin = meta.data.date_min;
    const dateMax = meta.data.date_max;
    const rawStore = params.get("store");
    const rawFamily = params.get("family");
    const parsedStore = rawStore && rawStore !== "all" ? Number(rawStore) : null;
    const store =
      parsedStore !== null && Number.isFinite(parsedStore)
        ? parsedStore
        : rawStore === "all"
          ? null
          : (meta.data.stores[0]?.store_nbr ?? null);
    const family =
      rawFamily === "all"
        ? null
        : (rawFamily ??
          meta.data.families.find((item) => item.family === "PRODUCE")?.family ??
          meta.data.families[0]?.family ??
          null);
    const from = params.get("from") || dateMin;
    const to = params.get("to") || dateMax;

    setFilters({ store, family, from, to });

    if (!params.get("store") || !params.get("family") || !params.get("from") || !params.get("to")) {
      const next = new URLSearchParams(params);
      next.set("store", store === null ? "all" : String(store));
      next.set("family", family ?? "all");
      next.set("from", from);
      next.set("to", to);
      setParams(next, { replace: true });
    }
  }, [meta.data, params, setParams, setFilters]);

  return null;
}

function BootSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Cargando catálogo">
      <div className="space-y-2">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-4 w-[420px] max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="space-y-3 bg-surface p-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_384px]">
        <div className="rounded-card border border-line bg-surface p-5">
          <Skeleton className="mb-4 h-5 w-40" />
          <Skeleton className="h-[320px] w-full" />
        </div>
        <div className="rounded-card border border-line bg-surface p-5">
          <Skeleton className="mb-3 h-5 w-32" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="mt-3 h-4 w-2/3" />
        </div>
      </div>
    </div>
  );
}

export function AppLayout() {
  const meta = useMeta();
  const theme = useAppStore((state) => state.theme);
  const toggleTheme = useAppStore((state) => state.toggleTheme);
  const presentation = useAppStore((state) => state.presentation);
  const setPresentation = useAppStore((state) => state.setPresentation);
  const from = useFilters((state) => state.from);
  const to = useFilters((state) => state.to);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const ready = Boolean(meta.data && from && to);

  return (
    <div className="min-h-screen bg-ground" data-presentation={presentation ? "true" : "false"}>
      <FilterUrlSync />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:pl-[228px]">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 bg-ground px-3 lg:px-5">
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menú"
          >
            <Icon name="menu" size={18} />
          </Button>

          <div className="flex items-center gap-2 lg:hidden">
            <BrandMark />
            <span className="text-[16px] font-semibold tracking-[-0.01em] text-ink">Abasto</span>
          </div>

          <div className="mr-2 hidden min-w-0 lg:block">
            <p className="text-small text-muted">Cadena Ecuador</p>
            <p className="truncate text-body font-medium text-ink">
              {meta.data
                ? `${meta.data.stores.length} tiendas · ${meta.data.families.length} familias`
                : "Cargando catálogo"}
            </p>
          </div>

          <GlobalFilters className="hidden min-w-0 flex-1 lg:block" />

          <div className="ml-auto flex flex-none items-center gap-1.5">
            <MobileFilters />
            <span className="hidden h-6 w-px bg-line sm:block" aria-hidden="true" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPresentation(!presentation)}
              aria-pressed={presentation}
              title={PRESENTATION_HINT}
              aria-label="Alternar modo presentación"
              className={presentation ? "text-ink" : ""}
            >
              <Icon name="presentation" size={16} />
              <span className="hidden xl:inline">{presentation ? "Salir" : "Presentar"}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              aria-label={theme === "light" ? "Activar modo oscuro" : "Activar modo claro"}
              title={theme === "light" ? "Modo oscuro" : "Modo claro"}
            >
              <Icon name={theme === "light" ? "moon" : "sun"} size={16} />
            </Button>
          </div>
        </header>

        <div className="px-0 pb-0 lg:pr-2 lg:pb-2">
          <main className="min-h-[calc(100vh-64px)] border-y border-line bg-surface lg:min-h-[calc(100vh-72px)] lg:rounded-sheet lg:border">
            <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 lg:px-7 lg:py-6">
              {meta.isError ? (
                <ErrorState error={meta.error} onRetry={() => meta.refetch()} />
              ) : !ready ? (
                <BootSkeleton />
              ) : (
                <Outlet />
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
