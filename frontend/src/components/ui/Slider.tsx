interface SliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label: string;
  valueLabel: string;
  minLabel?: string;
  maxLabel?: string;
}

export function Slider({
  value,
  onChange,
  min = 0.5,
  max = 0.95,
  step = 0.05,
  label,
  valueLabel,
  minLabel,
  maxLabel,
}: SliderProps) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <label htmlFor="service-level" className="text-body font-medium text-ink">
          {label}
        </label>
        <span className="text-body font-semibold tabular-nums text-ink">{valueLabel}</span>
      </div>
      <input
        id="service-level"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="range mt-3 w-full"
      />
      <div className="mt-1 flex justify-between text-small text-muted">
        <span>{minLabel ?? "p50"}</span>
        <span>{maxLabel ?? "p95"}</span>
      </div>
    </div>
  );
}
