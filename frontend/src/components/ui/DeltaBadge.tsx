import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { MetricTone } from "@/lib/kpi";
import { Icon } from "./Icon";

const toneClass: Record<MetricTone, string> = {
  positive: "text-positive",
  negative: "text-negative",
  neutral: "text-muted",
};

export function DeltaBadge({
  tone,
  children,
  direction,
  label,
}: {
  tone: MetricTone;
  children: ReactNode;
  direction?: "up" | "down" | "flat";
  label?: string;
}) {
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-x-1 gap-y-0 text-small", toneClass[tone])}>
      <span className="inline-flex items-center gap-1 whitespace-nowrap">
        {direction === "down" && <Icon name="chevronDown" size={12} />}
        {direction === "up" && <Icon name="chevronDown" size={12} className="rotate-180" />}
        <span className="font-medium">{children}</span>
      </span>
      {label && <span className="whitespace-nowrap text-faint">{label}</span>}
    </span>
  );
}
