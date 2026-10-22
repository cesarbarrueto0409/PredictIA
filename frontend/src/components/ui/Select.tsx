import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Icon } from "./Icon";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  compact?: boolean;
}

export function Select({ className, compact, children, ...props }: SelectProps) {
  return (
    <div className={cn("relative", className)}>
      <select
        className={cn(
          "w-full appearance-none rounded-control border border-control bg-surface pl-3 pr-8 text-body text-ink transition-colors hover:border-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20",
          compact ? "h-8 text-small" : "h-9",
        )}
        {...props}
      >
        {children}
      </select>
      <Icon
        name="chevronDown"
        size={14}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted"
      />
    </div>
  );
}
