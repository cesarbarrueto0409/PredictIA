import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatPercent } from "@/lib/format";
import type { HorizonPoint } from "@/types/api";
import { CHART, ChartLegend, ChartTooltipBox, axisProps, type ChartTooltipPayload } from "./common";

function HorizonTooltip({ active, payload, label }: ChartTooltipPayload) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]?.payload as HorizonPoint | undefined;
  if (!row) return null;
  return (
    <ChartTooltipBox
      title={`Semana ${label}`}
      rows={[
        { label: "Modelo (WAPE)", value: formatPercent(row.wape), color: CHART.real },
        { label: "Baseline (WAPE)", value: formatPercent(row.baseline_wape), color: "var(--control)" },
      ]}
    />
  );
}

export function HorizonChart({ data }: { data: HorizonPoint[] }) {
  const rows = data.map((item) => ({ ...item, name: `Semana ${item.week}` }));
  return (
    <div>
      <ChartLegend
        className="mb-4"
        items={[
          { label: "Modelo", color: CHART.real },
          { label: "Baseline", color: "var(--control)" },
        ]}
      />
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={4}>
            <CartesianGrid vertical={false} stroke={CHART.grid} />
            <XAxis dataKey="name" {...axisProps} tickMargin={8} />
            <YAxis
              {...axisProps}
              width={54}
              tickFormatter={(value: number) => `${Math.round(value * 100)} %`}
            />
            <Tooltip
              content={(props) => <HorizonTooltip {...(props as unknown as ChartTooltipPayload)} />}
              cursor={{ fill: "var(--raised)" }}
            />
            <Bar
              dataKey="wape"
              fill={CHART.real}
              radius={[3, 3, 0, 0]}
              isAnimationActive={false}
              maxBarSize={28}
            />
            <Bar
              dataKey="baseline_wape"
              fill="var(--control)"
              radius={[3, 3, 0, 0]}
              isAnimationActive={false}
              maxBarSize={28}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-small text-muted">
        El error crece con el horizonte. Cada semana del periodo de validación se compara con el mismo baseline.
      </p>
    </div>
  );
}
