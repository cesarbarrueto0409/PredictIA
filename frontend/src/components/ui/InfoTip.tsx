import { useId } from "react";
import { Icon } from "./Icon";

export function InfoTip({ text, label = "Más información" }: { text: string; label?: string }) {
  const id = useId();
  return (
    <span className="group relative inline-flex align-middle">
      <button
        type="button"
        aria-label={label}
        aria-describedby={id}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-faint transition-colors hover:text-ink focus-visible:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <Icon name="info" size={14} />
      </button>
      <span
        id={id}
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-2 w-60 -translate-x-1/2 rounded-card bg-ink px-3 py-2 text-small leading-4 text-surface opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}
