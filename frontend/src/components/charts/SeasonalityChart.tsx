import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatNumber } from "@/lib/format";
import { MONTHS, WEEKDAYS } from "@/lib/constants";
import type { SeasonalityResponse } from "@/types/api";
import { CHART, ChartTooltipBox, axisProps, type ChartTooltipPayload } from "./common";
import { Segmented } from "@/components/ui/Segmented";

function SeasonTooltip({ active, payload, label }: ChartTooltipPayload) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]?.payload as { avg_sales: number } | undefined;
  return (
    <ChartTooltipBox
      title={String(label)}
      rows={[
        {
          label: "Venta diaria promedio",
          value: formatNumber(row?.avg_sales ?? 0),
          color: CHART.accent,
        },
      ]}
    />
  );
}

export function SeasonalityChart({ data }: { data: SeasonalityResponse }) {
  const [mode, setMode] = useState<"weekday" | "month">("weekday");

  const rows =
    mode === "weekday"
      ? data.by_weekday.map((item) => ({
          label: WEEKDAYS[item.weekday] ?? String(item.weekday),
          avg_sales: item.avg_sales,
        }))
      : data.by_month.map((item) => ({
          label: MONTHS[item.month - 1] ?? String(item.month),
          avg_sales: item.avg_sales,
        }));

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Segmented
          ariaLabel="Agrupación de la estacionalidad"
          value={mode}
          onChange={setMode}
          options={[
            { value: "weekday", label: "Semana" },
            { value: "month", label: "Mes" },
          ]}
        />
      </div>
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={CHART.grid} />
            <XAxis dataKey="label" {...axisProps} interval={0} tickMargin={8} />
            <YAxis
              {...axisProps}
              width={54}
              tickFormatter={(value: number) => formatNumber(value)}
            />
            <Tooltip
              content={(props) => <SeasonTooltip {...(props as unknown as ChartTooltipPayload)} />}
              cursor={{ fill: "var(--raised)" }}
            />
            <Bar
              dataKey="avg_sales"
              fill={CHART.accent}
              radius={[3, 3, 0, 0]}
              isAnimationActive={false}
              maxBarSize={56}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-small text-muted">
        Promedio de venta diaria por {mode === "weekday" ? "día de la semana" : "mes"} en el rango seleccionado.
      </p>
    </div>
  );
}
