import { Link } from "react-router-dom";
import { useFilters } from "@/store/filters";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { buttonClasses } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

export function NotFound() {
  const store = useFilters((state) => state.store);
  const family = useFilters((state) => state.family);
  const from = useFilters((state) => state.from);
  const to = useFilters((state) => state.to);
  const search = new URLSearchParams({
    store: store === null ? "all" : String(store),
    family: family ?? "all",
    from,
    to,
  }).toString();

  return (
    <div className="space-y-6">
      <PageHeader title="Página no encontrada" subtitle="La ruta que buscabas no existe en Abasto." />
      <EmptyState
        title="Vuelve al resumen ejecutivo"
        description="Desde ahí puedes recorrer carga de datos, exploración, modelo, impacto y pedidos."
        action={
          <Link to={{ pathname: "/", search }} className={buttonClasses("primary", "sm")}>
            Ir al resumen
            <Icon name="arrowRight" size={12} />
          </Link>
        }
      />
    </div>
  );
}
