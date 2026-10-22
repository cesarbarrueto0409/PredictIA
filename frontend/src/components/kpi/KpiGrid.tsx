import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function KpiGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line xl:grid-cols-4", className)}>
      {children}
    </div>
  );
}
