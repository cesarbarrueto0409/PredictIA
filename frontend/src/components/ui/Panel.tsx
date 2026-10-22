import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ChartSkeleton, Skeleton, TableSkeleton } from "./Skeleton";
import { EmptyState } from "./EmptyState";
import { ErrorState } from "./ErrorState";

interface PanelProps {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  skeleton?: "chart" | "table" | "text";
  flush?: boolean;
  className?: string;
  contentClassName?: string;
  id?: string;
}

export function Panel({
  title,
  description,
  actions,
  children,
  loading,
  error,
  onRetry,
  empty,
  emptyTitle = "Sin datos para esta selección",
  emptyDescription = "Prueba con otro rango de fechas, tienda o familia.",
  skeleton = "chart",
  flush,
  className,
  contentClassName,
  id,
}: PanelProps) {
  return (
    <section
      id={id}
      className={cn("flex flex-col rounded-card border border-line bg-surface", className)}
      aria-busy={loading}
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-rule px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-section font-semibold text-ink">{title}</h2>
          {description && <p className="mt-0.5 text-small text-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-none items-center gap-2">{actions}</div>}
      </header>
      <div className={cn("min-w-0 flex-1", flush ? "" : "p-5", contentClassName)}>
        {error ? (
          <ErrorState error={error} onRetry={onRetry} />
        ) : loading ? (
          skeleton === "table" ? (
            <TableSkeleton />
          ) : skeleton === "text" ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : (
            <ChartSkeleton />
          )
        ) : empty ? (
          <EmptyState title={emptyTitle} description={emptyDescription} />
        ) : (
          children
        )}
      </div>
    </section>
  );
}
