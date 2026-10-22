import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "positive" | "negative" | "warning" | "neutral" | "accent";

const tones: Record<Tone, string> = {
  positive: "bg-[var(--pill-positive-bg)] text-[var(--pill-positive-ink)]",
  negative: "bg-[var(--pill-negative-bg)] text-[var(--pill-negative-ink)]",
  warning: "bg-[var(--pill-warning-bg)] text-[var(--pill-warning-ink)]",
  neutral: "bg-active text-ink",
  accent: "bg-[color-mix(in_srgb,var(--accent)_12%,var(--surface))] text-accent",
};

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex flex-none items-center gap-1 whitespace-nowrap rounded-chip px-2 py-0.5 text-[12px] font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
