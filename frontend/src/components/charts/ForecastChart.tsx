import {
  Area,
  Brush,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatDate, formatDateShort, formatNumber } from "@/lib/format";
import type { ForecastPoint } from "@/types/api";
import {
  CHART,
  ChartLegend,
  ChartTooltipBox,
  axisProps,
  type ChartTooltipPayload,
} from "./common";

interface ForecastChartProps {
  points: ForecastPoint[];
  height?: number;
  showBrush?: boolean;
}

interface Row {
  date: string;
  real: number | null;
  pred: number | null;
  p10: number | null;
  band: number | null;
  upper: number | null;
  isFuture: boolean;
}

function ForecastTooltip({ active, payload, label }: ChartTooltipPayload) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]?.payload as Row | undefined;
  if (!row) return null;
  return (
    <ChartTooltipBox
      title={formatDate(String(label))}
      rows={[
        { label: "Venta real", value: row.real === null ? "—" : formatNumber(row.real), color: CHART.real },
        { label: "Pronóstico", value: row.pred === null ? "—" : formatNumber(row.pred), color: CHART.forecast },
        {
          label: "Rango p10–p90",
          value:
            row.p10 === null || row.upper === null
              ? "—"
              : `${formatNumber(row.p10)} – ${formatNumber(row.upper)}`,
        },
      ]}
      footer={row.isFuture ? "Periodo futuro · pronóstico" : "Historial · venta observada"}
    />
  );
}

export function ForecastChart({ points, height = 320, showBrush = true }: ForecastChartProps) {
  const data: Row[] = points.map((point) => ({
    date: point.date,
    real: point.y_real,
    pred: point.y_pred,
    p10: point.y_p10,
    band:
      point.y_p10 !== null && point.y_p90 !== null ? Math.max(0, point.y_p90 - point.y_p10) : null,
    upper: point.y_p90,
    isFuture: point.is_future,
  }));

  const boundary = points.find((point) => point.is_future)?.date;
  const hasHistory = points.some((point) => !point.is_future);
  const hasFuture = points.some((point) => point.is_future);

  return (
    <div>
      <ChartLegend
        className="mb-4"
        items={[
          ...(hasHistory ? [{ label: "Venta real", color: CHART.real }] : []),
          ...(hasFuture ? [{ label: "Pronóstico", color: CHART.forecast, dashed: true }] : []),
          { label: "Banda p10–p90", color: "color-mix(in srgb, var(--chart-forecast) 32%, transparent)" },
        ]}
      />
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
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
              width={56}
              tickFormatter={(value: number) => formatNumber(value)}
              domain={[0, "auto"]}
            />
            <Tooltip
              content={(props) => <ForecastTooltip {...(props as unknown as ChartTooltipPayload)} />}
              cursor={{ stroke: "var(--control)", strokeWidth: 1 }}
            />
            <Area
              type="monotone"
              dataKey="p10"
              stackId="band"
              stroke="none"
              fill="transparent"
              isAnimationActive={false}
              connectNulls={false}
            />
            <Area
              type="monotone"
              dataKey="band"
              stackId="band"
              stroke="none"
              fill={CHART.forecast}
              fillOpacity={0.18}
              isAnimationActive={false}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="pred"
              name="Pronóstico"
              stroke={CHART.forecast}
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              isAnimationActive={false}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="real"
              name="Venta real"
              stroke={CHART.real}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              isAnimationActive={false}
              connectNulls={false}
            />
            {boundary && (
              <ReferenceLine
                x={boundary}
                stroke="var(--control)"
                strokeDasharray="3 3"
                label={{
                  value: "Inicio del pronóstico",
                  position: "insideTopRight",
                  fill: "var(--muted)",
                  fontSize: 11,
                }}
              />
            )}
            {showBrush && data.length > 45 && (
              <Brush
                dataKey="date"
                height={24}
                travellerWidth={8}
                stroke="var(--control)"
                fill="var(--raised)"
                tickFormatter={(value: string) => formatDateShort(value)}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
