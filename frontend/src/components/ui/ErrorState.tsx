import { getErrorMessage } from "@/api/client";
import { Button } from "./Button";
import { Icon } from "./Icon";

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  compact?: boolean;
}

export function ErrorState({ error, onRetry, compact }: ErrorStateProps) {
  return (
    <div
      className={
        compact
          ? "flex flex-wrap items-center gap-3 rounded-card border border-line bg-raised p-3 text-body text-muted"
          : "flex min-h-[180px] flex-col items-start justify-center gap-3 rounded-card border border-line bg-raised p-6"
      }
      role="alert"
    >
      <div className="flex items-center gap-2 text-negative">
        <Icon name="alert" size={18} />
        <p className="font-medium text-ink">No se pudieron cargar los datos</p>
      </div>
      <p className="max-w-prose text-body text-muted">{getErrorMessage(error)}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          <Icon name="refresh" size={14} />
          Reintentar
        </Button>
      )}
    </div>
  );
}
