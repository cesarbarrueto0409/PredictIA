import { useState } from "react";
import { copyText } from "@/lib/utils";
import { formatPercent, formatSignedPercent } from "@/lib/format";
import type { BusinessKpisResponse } from "@/types/api";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

export function buildImpactSentence(
  kpis: BusinessKpisResponse,
  onlyPerishable: boolean,
): string {
  const wasteDrop = -kpis.delta.waste_units_pct;
  const stockDrop = -kpis.delta.stockout_risk_pct;
  const scope = onlyPerishable ? " en perecibles" : "";
  if (wasteDrop > 0.005 || stockDrop > 0.005) {
    return `Con el modelo, el riesgo de merma${scope} baja ${formatPercent(Math.max(0, wasteDrop))} y los quiebres bajan ${formatPercent(Math.max(0, stockDrop))} frente a repetir la venta de hace dos semanas.`;
  }
  return `En esta selección el modelo no supera al baseline: la merma cambia ${formatSignedPercent(kpis.delta.waste_units_pct)} y los quiebres ${formatSignedPercent(kpis.delta.stockout_risk_pct)} frente a repetir la venta de hace dos semanas.`;
}

export function ImpactSentence({
  kpis,
  onlyPerishable,
}: {
  kpis: BusinessKpisResponse;
  onlyPerishable: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const sentence = buildImpactSentence(kpis, onlyPerishable);

  return (
    <div>
      <p className="statement max-w-3xl text-[24px] font-normal leading-8 tracking-[-0.01em] text-ink">
        {sentence}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={async () => {
            const ok = await copyText(sentence);
            if (ok) {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1800);
            }
          }}
        >
          <Icon name={copied ? "check" : "copy"} size={14} />
          {copied ? "Copiado" : "Copiar frase"}
        </Button>
        <span className="text-small text-muted">
          Lista para la presentación o para compartir con compras.
        </span>
      </div>
    </div>
  );
}
