import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("skeleton rounded-control", className)} aria-hidden="true" {...props} />;
}

export function ChartSkeleton({ height = 240 }: { height?: number }) {
  return (
    <div className="space-y-4" aria-hidden="true">
      <div className="flex items-end gap-3" style={{ height }}>
        {[48, 72, 60, 88, 66, 94, 78, 56, 84, 70].map((value, index) => (
          <Skeleton key={index} className="flex-1" style={{ height: `${value}%` }} />
        ))}
      </div>
      <Skeleton className="h-3 w-1/3" />
    </div>
  );
}

export function KpiSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-7 w-32" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="grid grid-cols-12 items-center gap-4">
          <Skeleton className="col-span-4 h-4" />
          <Skeleton className="col-span-3 h-4" />
          <Skeleton className="col-span-2 h-4" />
          <Skeleton className="col-span-2 h-4" />
          <Skeleton className="col-span-1 h-4" />
        </div>
      ))}
    </div>
  );
}
