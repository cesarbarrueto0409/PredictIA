const integer = new Intl.NumberFormat("es-EC", { maximumFractionDigits: 0 });

/** Traduce un WAPE a unidades: "el modelo se equivoca en promedio 21 % de las unidades". */
export function wapeSentence(wape: number): string {
  return `El modelo se equivoca en promedio ${Math.round(wape * 100)} % de las unidades que vende.`;
}

export function improvementSentence(improvement: number): string {
  const pct = Math.round(improvement * 100);
  if (pct <= 0) return "El modelo no mejora al baseline en esta selección.";
  return `El modelo reduce el error ${pct} % frente al baseline.`;
}

export function biasSentence(bias: number): string {
  const pct = Math.abs(bias).toFixed(1).replace(".", ",");
  if (Math.abs(bias) < 2) return "El pronóstico está equilibrado: no sobreestima ni subestima de forma sistemática.";
  return bias > 0
    ? `El modelo sobreestima ${pct} % en promedio: pediría más de lo que se vende.`
    : `El modelo subestima ${pct} % en promedio: pediría menos de lo que se vende.`;
}

export function coverageSentence(coverage: number): string {
  return `En ${Math.round(coverage * 100)} % de los días, la venta real cayó dentro del rango p10–p90.`;
}

export function formatUnits(value: number): string {
  return `${integer.format(Math.round(value))} u`;
}

export type MetricTone = "positive" | "negative" | "neutral";

/** Para métricas donde menor es mejor (WAPE, RMSLE, sesgo absoluto). */
export function lowerIsBetter(value: number): MetricTone {
  if (value < -0.001) return "positive";
  if (value > 0.001) return "negative";
  return "neutral";
}

export function fillRateTone(value: number): MetricTone {
  if (value >= 0.95) return "positive";
  if (value < 0.9) return "negative";
  return "neutral";
}

export function riskTone(risk: string): MetricTone {
  if (risk === "high") return "negative";
  if (risk === "medium") return "neutral";
  return "positive";
}
