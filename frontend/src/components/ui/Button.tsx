import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-ink text-surface hover:opacity-90 active:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed",
  secondary:
    "border border-control bg-surface text-ink hover:bg-raised active:bg-active disabled:opacity-40 disabled:cursor-not-allowed",
  ghost:
    "text-muted hover:bg-raised hover:text-ink active:bg-active disabled:opacity-40 disabled:cursor-not-allowed",
  danger:
    "border border-negative/40 bg-surface text-negative hover:bg-[color-mix(in_srgb,var(--negative)_8%,var(--surface))]",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-small",
  md: "h-9 px-4 text-body",
};

export function buttonClasses(
  variant: Variant = "secondary",
  size: Size = "md",
  className?: string,
): string {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-control font-medium transition-colors duration-150",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
    variants[variant],
    sizes[size],
    className,
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", className, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClasses(variant, size, className)}
      {...props}
    />
  );
});
