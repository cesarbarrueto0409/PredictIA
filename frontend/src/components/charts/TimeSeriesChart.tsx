import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatDate, formatDateShort, formatNumber } from "@/lib/format";
import type { TimeseriesPoint } from "@/types/api";
import {
  CHART,
  ChartTooltipBox,
  axisProps,
  type ChartTooltipPayload,
} from "./common";

function SalesTooltip({ active, payload, label }: ChartTooltipPayload) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]?.payload as TimeseriesPoint | undefined;
  if (!row) return null;
  return (
    <ChartTooltipBox
      title={formatDate(String(label))}
      rows={[{ label: "Ventas", value: formatNumber(row.sales), color: CHART.real }]}
    />
  );
}

export function TimeSeriesChart({
  points,
  height = 260,
}: {
  points: TimeseriesPoint[];
  height?: number;
}) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={CHART.grid} />
          <XAxis
            dataKey="date"
            {...axisProps}
            minTickGap={42}
            tickFormatter={(value: string) => formatDateShort(value)}
            padding={{ left: 8, right: 8 }}
          />
          <YAxis
            {...axisProps}
            width={62}
            tickFormatter={(value: number) => formatNumber(value)}
            domain={[0, "auto"]}
          />
          <Tooltip
            content={(props) => <SalesTooltip {...(props as unknown as ChartTooltipPayload)} />}
            cursor={{ stroke: "var(--control)", strokeWidth: 1 }}
          />
          <Area
            type="monotone"
            dataKey="sales"
            stroke={CHART.real}
            strokeWidth={2}
            fill={CHART.real}
            fillOpacity={0.12}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
