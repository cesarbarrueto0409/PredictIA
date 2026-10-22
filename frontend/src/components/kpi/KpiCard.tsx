import type { ReactNode } from "react";
import { InfoTip } from "@/components/ui/InfoTip";
import { DeltaBadge } from "@/components/ui/DeltaBadge";
import type { MetricTone } from "@/lib/kpi";

interface KpiCardProps {
  label: string;
  value: ReactNode;
  unit?: string;
  support?: ReactNode;
  delta?: {
    text: string;
    tone: MetricTone;
    direction?: "up" | "down" | "flat";
    label?: string;
  };
  tip?: string;
  loading?: boolean;
}

export function KpiCard({ label, value, unit, support, delta, tip, loading }: KpiCardProps) {
  return (
    <div className="bg-surface px-5 py-4">
      <div className="flex items-center gap-1.5">
        <span className="text-small font-medium text-muted">{label}</span>
        {tip && <InfoTip text={tip} />}
      </div>
      {loading ? (
        <div className="mt-2 space-y-2" aria-hidden="true">
          <div className="skeleton h-7 w-24 rounded-control" />
          <div className="skeleton h-3 w-28 rounded-control" />
        </div>
      ) : (
        <>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="kpi-value text-kpi font-normal tabular-nums text-ink">{value}</span>
            {unit && <span className="text-small text-muted">{unit}</span>}
          </div>
          <div className="mt-1 min-h-[20px] text-small">
            {delta ? (
              <DeltaBadge tone={delta.tone} direction={delta.direction} label={delta.label}>
                {delta.text}
              </DeltaBadge>
            ) : (
              <span className="text-faint">{support}</span>
            )}
          </div>
          {delta && support && <p className="mt-0.5 text-small text-faint">{support}</p>}
        </>
      )}
    </div>
  );
}
