import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const CHART = {
  real: "var(--chart-real)",
  forecast: "var(--chart-forecast)",
  accent: "var(--accent)",
  third: "var(--chart-3)",
  grid: "var(--grid)",
  muted: "var(--muted)",
  surface: "var(--surface)",
};

export const axisProps = {
  tick: { fontSize: 12, fill: "var(--muted)" },
  axisLine: false as const,
  tickLine: false as const,
};

export interface TooltipRow {
  label: string;
  value: ReactNode;
  color?: string;
}

export function ChartTooltipBox({
  title,
  rows,
  footer,
}: {
  title: string;
  rows: TooltipRow[];
  footer?: ReactNode;
}) {
  return (
    <div className="min-w-[180px] rounded-card border border-line bg-surface px-3 py-2.5 text-small shadow-lg">
      <p className="mb-1.5 font-medium text-ink">{title}</p>
      <div className="space-y-1">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted">
              {row.color && (
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: row.color }}
                />
              )}
              {row.label}
            </span>
            <span className="tabular-nums text-ink">{row.value}</span>
          </div>
        ))}
      </div>
      {footer && <div className="mt-1.5 border-t border-rule pt-1.5 text-faint">{footer}</div>}
    </div>
  );
}

export function ChartLegend({
  items,
  className,
}: {
  items: { label: string; color: string; dashed?: boolean }[];
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-1 text-small text-muted", className)}>
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          <span
            className={cn("inline-block w-4 border-t-2", item.dashed && "border-dashed")}
            style={{ borderColor: item.color }}
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}

export interface ChartTooltipPayload {
  active?: boolean;
  payload?: Array<{
    dataKey?: string | number;
    value?: number | string;
    payload?: Record<string, unknown>;
  }>;
  label?: string | number;
}
