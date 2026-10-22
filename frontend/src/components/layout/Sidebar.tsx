import { NavLink, useLocation } from "react-router-dom";
import { USE_MOCKS } from "@/api/client";
import { useMeta } from "@/hooks/useMeta";
import { useAppStore } from "@/store/app";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Icon, type IconName } from "@/components/ui/Icon";

interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  end?: boolean;
}

const analysis: NavItem[] = [
  { to: "/", label: "Resumen", icon: "overview", end: true },
  { to: "/carga", label: "Carga de datos", icon: "upload" },
  { to: "/exploracion", label: "Exploración", icon: "explore" },
  { to: "/modelo", label: "Modelo", icon: "model" },
  { to: "/impacto", label: "Impacto", icon: "impact" },
];

const operation: NavItem[] = [{ to: "/pedidos", label: "Pedidos", icon: "orders" }];

export function BrandMark() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true" className="flex-none">
      <rect x="2" y="15" width="5" height="9" rx="1.5" fill="var(--accent)" opacity="0.55" />
      <rect x="10.5" y="9" width="5" height="15" rx="1.5" fill="var(--accent)" opacity="0.8" />
      <rect x="19" y="3" width="5" height="21" rx="1.5" fill="var(--accent)" />
    </svg>
  );
}

function NavRow({ item, search, onClick }: { item: NavItem; search: string; onClick?: () => void }) {
  return (
    <NavLink
      to={{ pathname: item.to, search }}
      end={item.end}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          "flex h-9 items-center gap-2.5 rounded-control px-3 text-body transition-colors",
          isActive
            ? "bg-active font-medium text-ink"
            : "text-muted hover:bg-surface hover:text-ink",
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon name={item.icon} size={17} className={isActive ? "text-ink" : "text-faint"} />
          <span>{item.label}</span>
        </>
      )}
    </NavLink>
  );
}

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const meta = useMeta();
  const location = useLocation();
  const modelId = useAppStore((state) => state.modelId);
  const search = location.search;
  const storeCount = meta.data?.stores.length ?? 0;
  const familyCount = meta.data?.families.length ?? 0;

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[228px] flex-col bg-ground px-3 py-4 transition-transform duration-200 motion-reduce:transition-none",
          "lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
        aria-label="Navegación principal"
      >
        <div className="flex items-center gap-2.5 px-2">
          <BrandMark />
          <div className="min-w-0">
            <p className="text-[17px] font-semibold leading-5 tracking-[-0.01em] text-ink">Abasto</p>
            <p className="truncate text-small text-muted">Planificación de demanda</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto rounded-control p-1 text-muted hover:bg-surface hover:text-ink lg:hidden"
            aria-label="Cerrar menú"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="mx-1 mt-5 rounded-card border border-line bg-surface px-3 py-2.5">
          <p className="text-small text-muted">Cadena Ecuador</p>
          <p className="mt-0.5 text-body font-medium text-ink">
            {storeCount > 0 ? `${storeCount} tiendas` : "Catálogo"}
            <span className="font-normal text-muted">
              {familyCount > 0 ? ` · ${familyCount} familias` : ""}
            </span>
          </p>
        </div>

        <nav className="mt-6 flex-1 overflow-y-auto">
          <p className="px-3 pb-2 text-small text-faint">Análisis</p>
          <div className="space-y-0.5">
            {analysis.map((item) => (
              <NavRow key={item.to} item={item} search={search} onClick={onClose} />
            ))}
          </div>
          <p className="px-3 pb-2 pt-6 text-small text-faint">Operación</p>
          <div className="space-y-0.5">
            {operation.map((item) => (
              <NavRow key={item.to} item={item} search={search} onClick={onClose} />
            ))}
          </div>
        </nav>

        <div className="mt-4 space-y-2 border-t border-line px-1 pt-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {USE_MOCKS ? (
              <Badge tone="neutral">Datos demo</Badge>
            ) : (
              <Badge tone="accent">API conectada</Badge>
            )}
            {modelId ? (
              <Badge tone="positive">Modelo listo</Badge>
            ) : (
              <Badge tone="warning">Sin entrenar</Badge>
            )}
          </div>
          <p className="text-small leading-4 text-muted">
            {modelId
              ? "Las cifras usan el último modelo entrenado."
              : "Sube un CSV y entrena para usar cifras del modelo."}
          </p>
          <NavLink
            to={{ pathname: modelId ? "/modelo" : "/carga", search }}
            onClick={onClose}
            className="inline-flex items-center gap-1 text-small font-medium text-accent hover:underline"
          >
            {modelId ? "Ver precisión" : "Entrenar modelo"}
            <Icon name="arrowRight" size={12} />
          </NavLink>
        </div>
      </aside>
    </>
  );
}
