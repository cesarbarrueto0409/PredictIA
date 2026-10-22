import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

export interface BarRankItem {
  key: string;
  label: ReactNode;
  value: number;
  display: string;
  flag?: string;
  flagTone?: "negative" | "warning" | "neutral";
}

export function BarRank({
  items,
  color = "var(--chart-real)",
  highlightTop = false,
  className,
}: {
  items: BarRankItem[];
  color?: string;
  highlightTop?: boolean;
  className?: string;
}) {
  const max = Math.max(...items.map((item) => Math.abs(item.value)), 1);

  return (
    <ol className={cn("space-y-1", className)}>
      {items.map((item, index) => {
        const width = Math.max(2, (Math.abs(item.value) / max) * 88);
        const isTop = highlightTop && index === 0;
        return (
          <li key={item.key} className="py-2">
            <div className="flex items-baseline justify-between gap-4">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="truncate text-body text-ink">{item.label}</span>
                {item.flag && (
                  <Badge tone={item.flagTone ?? "warning"}>{item.flag}</Badge>
                )}
              </div>
              <span className="flex-none text-body font-medium tabular-nums text-ink">
                {item.display}
              </span>
            </div>
            <div className="mt-1.5 h-2">
              <div
                className="h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none"
                style={{
                  width: `${width}%`,
                  backgroundColor: isTop ? "var(--accent)" : color,
                  opacity: isTop ? 1 : 0.72,
                }}
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
