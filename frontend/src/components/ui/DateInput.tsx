import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function DateInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="date"
      className={cn(
        "h-8 rounded-control border border-control bg-surface px-2 text-small text-ink transition-colors hover:border-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20",
        className,
      )}
      {...props}
    />
  );
}
