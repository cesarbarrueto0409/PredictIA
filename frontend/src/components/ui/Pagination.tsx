import { Button } from "./Button";
import { Icon } from "./Icon";
import { formatNumber } from "@/lib/format";

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-small text-muted tabular-nums">
        {formatNumber(start)}–{formatNumber(end)} de {formatNumber(total)} filas
      </p>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Página anterior"
        >
          <Icon name="chevronLeft" size={14} />
          Anterior
        </Button>
        <span className="px-1 text-small tabular-nums text-muted">
          {page} / {pages}
        </span>
        <Button
          size="sm"
          variant="secondary"
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Página siguiente"
        >
          Siguiente
          <Icon name="chevronRight" size={14} />
        </Button>
      </div>
    </div>
  );
}
