import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: IconName;
  action?: ReactNode;
  compact?: boolean;
}

export function EmptyState({ title, description, icon = "info", action, compact }: EmptyStateProps) {
  return (
    <div
      className={
        compact
          ? "flex flex-wrap items-center gap-3 text-body text-muted"
          : "flex min-h-[180px] flex-col items-start justify-center gap-2 rounded-card border border-dashed border-control bg-raised/40 p-6"
      }
    >
      {!compact && <Icon name={icon} size={20} className="mb-1 text-faint" />}
      <p className={compact ? "font-medium text-ink" : "text-section font-medium text-ink"}>{title}</p>
      {description && <p className="max-w-prose text-body text-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
