import { useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Icon } from "./Icon";
import { EmptyState } from "./EmptyState";

export interface Column<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  sortValue?: (row: T) => number | string;
  align?: "left" | "right";
  className?: string;
  headerClassName?: string;
  hideBelow?: "sm" | "md" | "lg" | "xl";
}

interface DataTableProps<T> {
  rows: T[];
  columns: Column<T>[];
  getRowKey: (row: T) => string;
  initialSort?: { key: string; direction: "asc" | "desc" };
  rowClassName?: (row: T) => string | undefined;
  emptyTitle?: string;
  emptyDescription?: string;
  caption?: string;
}

export function DataTable<T>({
  rows,
  columns,
  getRowKey,
  initialSort,
  rowClassName,
  emptyTitle = "No hay filas para estos filtros",
  emptyDescription,
  caption,
}: DataTableProps<T>) {
  const [sort, setSort] = useState(initialSort ?? null);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((item) => item.key === sort.key);
    if (!column?.sortValue) return rows;
    return [...rows].sort((a, b) => {
      const left = column.sortValue?.(a) ?? "";
      const right = column.sortValue?.(b) ?? "";
      const result =
        typeof left === "number" && typeof right === "number"
          ? left - right
          : String(left).localeCompare(String(right), "es");
      return sort.direction === "asc" ? result : -result;
    });
  }, [rows, sort, columns]);

  const toggleSort = (column: Column<T>) => {
    if (!column.sortValue) return;
    setSort((current) => {
      if (current?.key !== column.key) return { key: column.key, direction: "asc" };
      return { key: column.key, direction: current.direction === "asc" ? "desc" : "asc" };
    });
  };

  const hidden: Record<string, string> = {
    sm: "hidden sm:table-cell",
    md: "hidden md:table-cell",
    lg: "hidden lg:table-cell",
    xl: "hidden xl:table-cell",
  };

  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-body">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="border-b border-line text-small text-muted">
            {columns.map((column) => {
              const active = sort?.key === column.key;
              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={
                    active ? (sort.direction === "asc" ? "ascending" : "descending") : undefined
                  }
                  className={cn(
                    "whitespace-nowrap px-4 py-2.5 font-normal first:pl-5 last:pr-5",
                    column.align === "right" ? "text-right" : "text-left",
                    column.sortValue && "cursor-pointer select-none hover:text-ink",
                    column.hideBelow && hidden[column.hideBelow],
                    column.headerClassName,
                  )}
                  onClick={() => toggleSort(column)}
                >
                  <span className={cn("inline-flex items-center gap-1", column.align === "right" && "flex-row-reverse")}>
                    {column.header}
                    {column.sortValue && (
                      <Icon
                        name="chevronDown"
                        size={12}
                        className={cn(
                          "transition-transform",
                          !active && "opacity-0",
                          active && sort.direction === "asc" && "rotate-180",
                        )}
                      />
                    )}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr
              key={getRowKey(row)}
              className={cn(
                "h-12 border-b border-rule transition-colors last:border-0 hover:bg-raised/60",
                rowClassName?.(row),
              )}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn(
                    "px-4 py-2.5 text-ink first:pl-5 last:pr-5",
                    column.align === "right" ? "text-right tabular-nums" : "text-left",
                    column.hideBelow && hidden[column.hideBelow],
                    column.className,
                  )}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
