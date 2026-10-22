import React from "react";
import { interpolate, staticFile, useCurrentFrame } from "remotion";
import api from "./apiData.json";
import { Browser, C, CodeCard, EmberCard, fmt, Kicker, MONO, Paper, Rise, Sub, Title, useIn, useSpring } from "./theme";

const PAD = { position: "absolute" as const, left: 120, right: 120, top: 96, bottom: 96 };

// ------------------------------------------------------------------ 1. Intro
export const Intro: React.FC<{ dur: number }> = ({ dur }) => {
  const line = useIn(14, 30);
  return (
    <Paper dur={dur}>
      <div style={{ ...PAD, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <Rise at={0}><Kicker>Hackathon · Forecast de ventas</Kicker></Rise>
        <Rise at={6}><div style={{ fontSize: 148, fontWeight: 600, letterSpacing: "-0.04em", marginTop: 24 }}>
          Predict<span style={{ color: C.ember }}>IA</span>
        </div></Rise>
        <div style={{ height: 3, width: 520 * line, background: C.ember, margin: "28px 0 36px" }} />
        <Rise at={22}><Sub size={40}>Cuánto pedir, de cada familia, en cada tienda.</Sub></Rise>
        <Rise at={34}><div style={{ marginTop: 56, fontFamily: MONO, fontSize: 22, color: C.slate }}>
          Frontend → API → Modelo predictivo → Decisión de compra
        </div></Rise>
      </div>
    </Paper>
  );
};

// ------------------------------------------------------------------ 2. User case
export const UserCase: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const decisions = Math.round(interpolate(f, [150, 210], [0, 1782], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  return (
    <Paper dur={dur}>
      <div style={PAD}>
        <Rise at={0}><Kicker>El caso de usuario</Kicker></Rise>
        <Rise at={6}><Title>Cada mañana, cada tienda decide cuánto pedir.</Title></Rise>
        <div style={{ display: "flex", gap: 48, marginTop: 64 }}>
          <Rise at={24} style={{ flex: 1.1 }}>
            <EmberCard style={{ height: 420 }}>
              <div style={{ fontFamily: MONO, fontSize: 20, color: C.brass, letterSpacing: "0.1em" }}>PERSONA</div>
              <div style={{ fontSize: 46, fontWeight: 500, marginTop: 18 }}>Andrea</div>
              <div style={{ fontSize: 28, color: C.steel, marginTop: 6 }}>Jefa de la Tienda 44 · Quito</div>
              <div style={{ fontSize: 28, lineHeight: 1.5, marginTop: 34 }}>
                “Necesito saber <b>cuántas unidades de lácteos</b> pedir para la próxima semana,
                sin quedarme corta ni botar producto.”
              </div>
            </EmberCard>
          </Rise>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 28 }}>
            <Rise at={60}><Risk color={C.graphite} title="Pedir de menos" body="Quiebre de stock: el cliente no encuentra el producto y la venta se pierde." /></Rise>
            <Rise at={90}><Risk color={C.brass} title="Pedir de más" body="Merma: los perecibles (lácteos, carnes, panadería) se vencen y se botan." /></Rise>
            <Rise at={140}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 20, marginTop: 8 }}>
                <span style={{ fontSize: 88, fontWeight: 600, color: C.ember, letterSpacing: "-0.03em" }}>{fmt(decisions)}</span>
                <span style={{ fontSize: 28, color: C.steel }}>decisiones al día<br />54 tiendas × 33 familias</span>
              </div>
            </Rise>
          </div>
        </div>
      </div>
    </Paper>
  );
};

const Risk: React.FC<{ color: string; title: string; body: string }> = ({ color, title, body }) => (
  <div style={{ borderTop: `2px solid ${color}`, paddingTop: 18 }}>
    <div style={{ fontSize: 34, fontWeight: 500, color }}>{title}</div>
    <div style={{ fontSize: 26, color: C.steel, marginTop: 8, lineHeight: 1.4 }}>{body}</div>
  </div>
);

// ------------------------------------------------------------------ 3. Architecture / request flow
const NODES = [
  { x: 120, label: "Frontend", tech: "React · Vite", sub: "lo que ve Andrea", step: "Andrea elige Tienda 44 y Lácteos; la app llama a la API." },
  { x: 560, label: "API REST", tech: "FastAPI · /api/v1", sub: "api/main.py", step: "Valida parámetros y toma el último modelo entrenado." },
  { x: 1000, label: "Servicio", tech: "service.py", sub: "arma la respuesta", step: "Filtra la serie, une validación + futuro y arma el JSON." },
  { x: 1440, label: "Modelo", tech: "LightGBM", sub: "p10 · p50 · p90", step: "Predicciones ya calculadas al entrenar, con 35 variables de data.py." },
];

export const Architecture: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const go = interpolate(f, [90, 210], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const back = interpolate(f, [240, 340], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const y = 500;
  const startX = NODES[0].x + 180, endX = NODES[3].x + 180;
  const reqX = startX + (endX - startX) * go;
  const resX = endX - (endX - startX) * back;
  return (
    <Paper dur={dur}>
      <div style={PAD}>
        <Rise at={0}><Kicker>Cómo fluye una consulta</Kicker></Rise>
        <Rise at={6}><Title>Del clic a la predicción, en una sola llamada.</Title></Rise>
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <line x1={startX} y1={y} x2={endX} y2={y} stroke={C.mist} strokeWidth={3} />
        <line x1={startX} y1={y} x2={reqX} y2={y} stroke={C.graphite} strokeWidth={3} opacity={go > 0 && back === 0 ? 1 : 0.25} />
        {back > 0 && <line x1={endX} y1={y + 2} x2={resX} y2={y + 2} stroke={C.ember} strokeWidth={4} />}
      </svg>
      {NODES.map((n, i) => (
        <Node key={n.label} {...n} y={y} at={24 + i * 12} lit={go * 3 >= i - 0.01 || back > 0} />
      ))}
      {NODES.map((n, i) => (
        <Rise key={n.label + "s"} at={100 + i * 30} style={{ position: "absolute", left: n.x, top: y + 125, width: 340 }}>
          <div style={{ fontFamily: MONO, fontSize: 18, color: C.ember }}>{i + 1}</div>
          <div style={{ fontSize: 23, color: C.steel, lineHeight: 1.4, marginTop: 6 }}>{n.step}</div>
        </Rise>
      ))}
      {go > 0 && back === 0 && (
        <Packet x={reqX} y={y} color={C.graphite} text="GET /forecast?store_nbr=44&family=DAIRY" />
      )}
      {back > 0 && back < 1 && <Packet x={resX} y={y} color={C.ember} text='200 · { "points": [...] }' />}
      <Rise at={330} style={{ position: "absolute", left: 120, bottom: 110 }}>
        <Sub size={28}>El frontend nunca toca el modelo: pide JSON a la API, y la API responde con el contrato acordado (<span style={{ fontFamily: MONO }}>CONTRACTS.md §8</span>).</Sub>
      </Rise>
    </Paper>
  );
};

const Node: React.FC<{ x: number; y: number; label: string; tech: string; sub: string; at: number; lit: boolean }> = ({ x, y, label, tech, sub, at, lit }) => {
  const s = useSpring(at);
  return (
    <div style={{
      position: "absolute", left: x, top: y - 90, width: 360, height: 180, background: C.canvas,
      border: `1px solid ${lit ? C.graphite : C.mist}`, borderRadius: "6px 0 0 0", padding: "26px 30px",
      opacity: s, transform: `translateY(${(1 - s) * 20}px)`, boxSizing: "border-box",
    }}>
      <div style={{ fontSize: 36, fontWeight: 500 }}>{label}</div>
      <div style={{ fontFamily: MONO, fontSize: 20, color: lit ? C.ember : C.slate, marginTop: 8 }}>{tech}</div>
      <div style={{ fontSize: 20, color: C.slate, marginTop: 10 }}>{sub}</div>
    </div>
  );
};

const Packet: React.FC<{ x: number; y: number; color: string; text: string }> = ({ x, y, color, text }) => (
  <>
    <div style={{ position: "absolute", left: x - 9, top: y - 9, width: 18, height: 18, borderRadius: 9, background: color }} />
    <div style={{ position: "absolute", left: x - 260, top: y - 160, width: 520, textAlign: "center", fontFamily: MONO, fontSize: 21, color }}>
      {text}
    </div>
  </>
);

// ------------------------------------------------------------------ 4. Upload
export const Upload: React.FC<{ dur: number }> = ({ dur }) => {
  const s = api.meta;
  return (
    <Paper dur={dur} bg={C.fog}>
      <div style={PAD}>
        <Rise at={0}><Kicker>Paso 1 · Carga de datos</Kicker></Rise>
        <Rise at={6}><Title size={56}>Andrea sube el historial de ventas.</Title></Rise>
      </div>
      <Rise at={16} style={{ position: "absolute", left: 120, top: 300 }}>
        <Browser src={staticFile("screens/carga.png")} url="localhost:5173/carga" width={980} zoom={1.3} focus={[330, 70]} />
      </Rise>
      <div style={{ position: "absolute", left: 1160, top: 300 }}>
        <CodeCard at={50} method="POST" path="/api/v1/datasets" width={640} lines={[
          "multipart/form-data  file=train.csv", "",
        ]} />
        <div style={{ height: 24 }} />
        <CodeCard at={90} status="200" path="respuesta" width={640} lines={[
          "{",
          '  "dataset_id": "ds_001",',
          '  "summary": {',
          `    "date_min": "${s.date_min}",`,
          `    "date_max": "${s.date_max}",`,
          '    "n_stores": 54,',
          '    "n_families": 33,',
          '    "n_rows": 3000888',
          "  }",
          "}",
        ]} />
      </div>
    </Paper>
  );
};

// ------------------------------------------------------------------ 5. Training
const STEPS = [
  { p: 0.05, m: "Building features" },
  { p: 0.3, m: "Training point model" },
  { p: 0.55, m: "Training quantile model p10" },
  { p: 0.75, m: "Training quantile model p90" },
  { p: 0.9, m: "Forecasting validation window and future" },
  { p: 1.0, m: "Done" },
];
const FEATURES = ["Rezagos 14–35 días", "Medias móviles", "Mismo día de la semana", "Feriados nacionales y locales", "Promociones", "Petróleo (WTI)", "Transacciones", "Día de pago", "Navidad", "Terremoto 2016"];

export const Training: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const prog = interpolate(f, [60, 330], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const step = [...STEPS].reverse().find((st) => prog >= st.p - 0.001) ?? STEPS[0];
  return (
    <Paper dur={dur}>
      <div style={PAD}>
        <Rise at={0}><Kicker>Paso 2 · Entrenamiento del modelo</Kicker></Rise>
        <Rise at={6}><Title size={56}>La API entrena en segundo plano y reporta su avance.</Title></Rise>
      </div>
      <div style={{ position: "absolute", left: 120, top: 300, width: 800 }}>
        <CodeCard at={18} method="POST" path="/api/v1/train" width={800} lines={[
          '{ "dataset_id": "ds_default", "horizon_days": 14,',
          '  "validation_days": 14, "quantiles": [0.1, 0.5, 0.9] }',
        ]} />
        <Rise at={50} style={{ marginTop: 28 }}>
          <div style={{ fontFamily: MONO, fontSize: 21, color: C.steel }}>GET /api/v1/train/job_3f9a2c</div>
          <div style={{ height: 14, background: C.ash, marginTop: 18, borderRadius: 2 }}>
            <div style={{ height: 14, width: `${prog * 100}%`, background: C.ember, borderRadius: 2 }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, fontFamily: MONO, fontSize: 22 }}>
            <span>"{prog >= 1 ? "done" : "running"}" · {step.m}</span>
            <span style={{ color: C.ember }}>{Math.round(prog * 100)}%</span>
          </div>
        </Rise>
        <Rise at={120} style={{ marginTop: 56 }}>
          <EmberCard style={{ padding: "24px 32px" }}>
            <div style={{ fontSize: 26, fontWeight: 500 }}>Sin mirar el futuro</div>
            <div style={{ fontSize: 23, color: C.steel, marginTop: 8, lineHeight: 1.45 }}>
              Toda variable de ventas usa datos de hace ≥ 14 días: el modelo puede predecir las próximas
              dos semanas completas sin conocer sus ventas.
            </div>
          </EmberCard>
        </Rise>
      </div>
      <div style={{ position: "absolute", left: 1020, top: 300, width: 780 }}>
        <Rise at={30}><div style={{ fontFamily: MONO, fontSize: 20, color: C.brass, letterSpacing: "0.1em" }}>DATA.PY · 1,05 M FILAS · 35 COLUMNAS</div></Rise>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 22 }}>
          {FEATURES.map((t, i) => (
            <Rise key={t} at={40 + i * 7} dy={12}>
              <div style={{ border: `1px solid ${C.mist}`, padding: "10px 18px", fontSize: 23, borderRadius: 4, background: C.canvas }}>{t}</div>
            </Rise>
          ))}
        </div>
        <Rise at={150} style={{ marginTop: 52 }}>
          <div style={{ fontFamily: MONO, fontSize: 20, color: C.brass, letterSpacing: "0.1em" }}>FORECAST.PY · 3 MODELOS LIGHTGBM</div>
          {[["Puntual (p50)", "cuánto se venderá", C.ember], ["Cuantil p10", "escenario bajo", C.graphite], ["Cuantil p90", "escenario alto", C.graphite]].map(([a, b, col], i) => (
            <Rise key={a} at={165 + i * 14} dy={10}>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${C.mist}`, padding: "16px 0", fontSize: 26 }}>
                <span style={{ color: col as string, fontWeight: 500 }}>{a}</span>
                <span style={{ color: C.steel }}>{b}</span>
              </div>
            </Rise>
          ))}
        </Rise>
      </div>
    </Paper>
  );
};

// ------------------------------------------------------------------ 6. Forecast
export const Forecast: React.FC<{ dur: number }> = ({ dur }) => {
  const pts = api.forecast.points as { date: string; y_real: number | null; y_pred: number; y_p10: number; y_p90: number; is_future: boolean }[];
  const reveal = useIn(60, 150);
  const W = 1040, H = 470, L = 80, B = 50;
  const max = Math.max(...pts.map((p) => p.y_p90)) * 1.08;
  const x = (i: number) => L + (i / (pts.length - 1)) * (W - L - 20);
  const yv = (v: number) => H - B - (v / max) * (H - B - 20);
  const path = (k: "y_pred" | "y_real", only?: (p: (typeof pts)[0]) => boolean) =>
    pts.map((p, i) => ((only && !only(p)) || p[k] == null ? null : `${x(i)},${yv(p[k] as number)}`)).filter(Boolean).join(" L ");
  const band = `M ${pts.map((p, i) => `${x(i)},${yv(p.y_p90)}`).join(" L ")} L ${[...pts].reverse().map((p, j) => `${x(pts.length - 1 - j)},${yv(p.y_p10)}`).join(" L ")} Z`;
  const split = pts.findIndex((p) => p.is_future);
  const sample = pts[split];
  return (
    <Paper dur={dur}>
      <div style={PAD}>
        <Rise at={0}><Kicker>Paso 3 · Pronóstico</Kicker></Rise>
        <Rise at={6}><Title size={56}>Andrea elige Tienda 44 · Lácteos.</Title></Rise>
      </div>
      <div style={{ position: "absolute", left: 120, top: 290 }}>
        <CodeCard at={16} method="GET" path="/api/v1/forecast?store_nbr=44&family=DAIRY" width={1040} lines={[]} />
      </div>
      <Rise at={40} style={{ position: "absolute", left: 120, top: 390 }}>
        <svg width={W} height={H}>
          <defs><clipPath id="rv"><rect x={0} y={0} width={L + (W - L) * reveal} height={H} /></clipPath></defs>
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <g key={t}>
              <line x1={L} x2={W - 20} y1={yv(max * t)} y2={yv(max * t)} stroke={C.mist} />
              <text x={L - 12} y={yv(max * t) + 6} textAnchor="end" fontSize={16} fill={C.slate} fontFamily={MONO}>{fmt(max * t)}</text>
            </g>
          ))}
          <rect x={x(split) - 10} y={10} width={W - 20 - x(split) + 10} height={H - B - 10} fill={C.fog} />
          <text x={x(split) + 4} y={34} fontSize={18} fill={C.slate} fontFamily={MONO}>FUTURO · is_future=true</text>
          <text x={L + 6} y={34} fontSize={18} fill={C.slate} fontFamily={MONO}>VALIDACIÓN · real vs predicho</text>
          <g clipPath="url(#rv)">
            <path d={band} fill={C.ember} opacity={0.14} />
            <path d={`M ${path("y_real")}`} stroke={C.graphite} strokeWidth={3} fill="none" />
            <path d={`M ${path("y_pred")}`} stroke={C.ember} strokeWidth={3.5} fill="none" />
          </g>
          {pts.map((p, i) => i % 4 === 0 && (
            <text key={p.date} x={x(i)} y={H - 16} fontSize={16} fill={C.slate} textAnchor="middle" fontFamily={MONO}>{p.date.slice(5)}</text>
          ))}
        </svg>
        <div style={{ display: "flex", gap: 36, marginTop: 8, fontSize: 22, color: C.steel }}>
          <Legend color={C.graphite} label="Venta real" />
          <Legend color={C.ember} label="Pronóstico del modelo" />
          <Legend color={C.ember} label="Banda p10–p90" faint />
        </div>
      </Rise>
      <div style={{ position: "absolute", left: 1220, top: 390 }}>
        <CodeCard at={150} status="200" path="un punto futuro" width={580} lines={[
          "{",
          `  "date": "${sample.date}",`,
          '  "y_real": null,',
          `  "y_pred": ${sample.y_pred},`,
          `  "y_p10": ${sample.y_p10},`,
          `  "y_p90": ${sample.y_p90},`,
          '  "is_future": true',
          "}",
        ]} />
        <Rise at={230} style={{ marginTop: 28, width: 580 }}>
          <Sub size={24}>28 puntos: 14 días de validación con su venta real y 14 días hacia adelante.</Sub>
        </Rise>
      </div>
    </Paper>
  );
};

const Legend: React.FC<{ color: string; label: string; faint?: boolean }> = ({ color, label, faint }) => (
  <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
    <span style={{ width: 28, height: faint ? 14 : 4, background: color, opacity: faint ? 0.2 : 1 }} />{label}
  </span>
);

// ------------------------------------------------------------------ 7. Accuracy
export const Accuracy: React.FC<{ dur: number }> = ({ dur }) => {
  const m = api.metrics;
  return (
    <Paper dur={dur}>
      <div style={PAD}>
        <Rise at={0}><Kicker>Paso 4 · ¿Se puede confiar?</Kicker></Rise>
        <Rise at={6}><Title size={56}>Siempre comparado contra “repetir lo de hace dos semanas”.</Title></Rise>
        <Rise at={14}><div style={{ fontFamily: MONO, fontSize: 21, color: C.slate, marginTop: 18 }}>GET /api/v1/metrics · validación 02–15 ago 2017 · 54 tiendas × 33 familias</div></Rise>
        <div style={{ display: "flex", gap: 80, marginTop: 70 }}>
          <MetricBars at={30} name="WAPE" hint="% de unidades mal estimadas" model={m.model.wape * 100} base={m.baseline.wape * 100} unit="%" gain={m.improvement.wape_pct} />
          <MetricBars at={60} name="RMSLE" hint="error relativo, menor es mejor" model={m.model.rmsle} base={m.baseline.rmsle} unit="" gain={m.improvement.rmsle_pct} d={3} />
          <Rise at={100} style={{ width: 420 }}>
            <div style={{ fontSize: 30, fontWeight: 500 }}>Cobertura del intervalo</div>
            <div style={{ fontSize: 22, color: C.steel, marginTop: 6 }}>días con la venta real dentro de p10–p90</div>
            <div style={{ fontSize: 96, fontWeight: 600, color: C.ember, marginTop: 30, letterSpacing: "-0.03em" }}>{fmt(m.model.interval_coverage * 100)}%</div>
            <div style={{ fontSize: 22, color: C.slate }}>objetivo: 80%</div>
          </Rise>
        </div>
        <Rise at={150} style={{ marginTop: 70, borderTop: `1px solid ${C.mist}`, paddingTop: 30, display: "flex", gap: 80, alignItems: "baseline" }}>
          <div style={{ fontFamily: MONO, fontSize: 20, color: C.brass, letterSpacing: "0.1em", width: 520, whiteSpace: "nowrap" }}>WAPE POR SEMANA · /HORIZON</div>
          {api.horizon.by_week.map((w) => (
            <div key={w.week} style={{ fontSize: 28 }}>
              Semana {w.week}: <b style={{ color: C.ember }}>{fmt(w.wape * 100, 1)}%</b>
              <span style={{ color: C.slate }}> vs {fmt(w.baseline_wape * 100, 1)}%</span>
            </div>
          ))}
        </Rise>
      </div>
    </Paper>
  );
};

const MetricBars: React.FC<{ at: number; name: string; hint: string; model: number; base: number; unit: string; gain: number; d?: number }> = ({
  at, name, hint, model, base, unit, gain, d = 1,
}) => {
  const p = useIn(at + 10, 40);
  const max = Math.max(model, base);
  const Bar = ({ v, color, label }: { v: number; color: string; label: string }) => (
    <div style={{ marginTop: 26 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, color: C.steel }}>
        <span>{label}</span><span style={{ fontFamily: MONO, color }}>{fmt(v * p, d)}{unit}</span>
      </div>
      <div style={{ height: 22, width: `${(v / max) * 100 * p}%`, background: color, marginTop: 8 }} />
    </div>
  );
  return (
    <Rise at={at} style={{ width: 520 }}>
      <div style={{ fontSize: 30, fontWeight: 500 }}>{name}</div>
      <div style={{ fontSize: 22, color: C.steel, marginTop: 6 }}>{hint}</div>
      <Bar v={model} color={C.ember} label="Modelo PredictIA" />
      <Bar v={base} color={C.brass} label="Baseline" />
      <div style={{ fontSize: 40, fontWeight: 600, marginTop: 30 }}>−{fmt(gain * 100)}% de error</div>
    </Rise>
  );
};

// ------------------------------------------------------------------ 8. Order
export const Order: React.FC<{ dur: number }> = ({ dur }) => {
  const o = api.order.items[0];
  const f = useCurrentFrame();
  const n = Math.round(interpolate(f, [80, 130], [0, o.recommended_order], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  return (
    <Paper dur={dur}>
      <div style={PAD}>
        <Rise at={0}><Kicker>Paso 5 · La decisión</Kicker></Rise>
        <Rise at={6}><Title size={56}>Un número para pedir, no una distribución.</Title></Rise>
      </div>
      <div style={{ position: "absolute", left: 120, top: 300 }}>
        <CodeCard at={16} method="GET" path="/api/v1/order-suggestion?store_nbr=44&family=DAIRY&service_level=0.9" width={1680} lines={[]} />
      </div>
      <Rise at={60} style={{ position: "absolute", left: 120, top: 410, width: 1000 }}>
        <EmberCard style={{ padding: "44px 52px" }}>
          <div style={{ fontFamily: MONO, fontSize: 20, color: C.brass, letterSpacing: "0.1em" }}>SEMANA DEL 16/08/2017 · TIENDA 44 · LÁCTEOS</div>
          <div style={{ fontSize: 40, marginTop: 22, lineHeight: 1.3 }}>
            Pedir <span style={{ fontSize: 96, fontWeight: 600, color: C.ember, letterSpacing: "-0.03em" }}>{fmt(n)}</span> unidades
          </div>
          <div style={{ display: "flex", gap: 56, marginTop: 30 }}>
            <Stat label="Pronóstico" value={fmt(o.forecast)} />
            <Stat label="+ Stock de seguridad" value={fmt(o.safety_stock)} />
            <Stat label="Riesgo" value="Medio" color={C.brass} />
            <Stat label="Tipo" value="Perecedero" color={C.brass} />
          </div>
        </EmberCard>
        <Rise at={170} style={{ marginTop: 30 }}>
          <Sub size={24}>Stock de seguridad = z(90%) × incertidumbre de la banda p10–p90. Los perecibles suben un nivel de riesgo.</Sub>
        </Rise>
      </Rise>
      <Rise at={120} style={{ position: "absolute", left: 1180, top: 410 }}>
        <Browser src={staticFile("screens/pedidos.png")} url="localhost:5173/pedidos" width={620} zoom={1.9} focus={[380, 170]} />
      </Rise>
    </Paper>
  );
};

const Stat: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color = C.graphite }) => (
  <div>
    <div style={{ fontSize: 20, color: C.steel }}>{label}</div>
    <div style={{ fontSize: 34, fontWeight: 500, color, marginTop: 4 }}>{value}</div>
  </div>
);

// ------------------------------------------------------------------ 9. Impact + close
export const Impact: React.FC<{ dur: number }> = ({ dur }) => {
  const k = api.kpis_perishable;
  return (
    <Paper dur={dur}>
      <div style={{ ...PAD, top: 190 }}>
        <Rise at={0}><Kicker>El impacto</Kicker></Rise>
        <Rise at={6}><Title size={56}>En perecibles, al mismo nivel de servicio (90%):</Title></Rise>
        <div style={{ display: "flex", gap: 90, marginTop: 80 }}>
          <Big at={24} value={`−${fmt(-k.delta.stockout_risk_pct * 100)}%`} label="riesgo de quiebre de stock" />
          <Big at={44} value={`−${fmt(-k.delta.waste_units_pct * 100)}%`} label="unidades de merma" />
          <Big at={64} value={`−${fmt(api.metrics.improvement.wape_pct * 100)}%`} label="error de pronóstico (WAPE)" />
        </div>
        <Rise at={120} style={{ marginTop: 110, borderTop: `1px solid ${C.mist}`, paddingTop: 40, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div style={{ fontSize: 56, fontWeight: 600, letterSpacing: "-0.03em" }}>Predict<span style={{ color: C.ember }}>IA</span></div>
          <div style={{ fontFamily: MONO, fontSize: 22, color: C.slate }}>Frontend → API → Modelo → Decisión de compra</div>
        </Rise>
        <Rise at={140}><div style={{ fontSize: 20, color: C.slate, marginTop: 24 }}>
          Fuente: GET /api/v1/business-kpis y /metrics · validación 02–15 ago 2017 · comparado contra repetir la venta de hace dos semanas.
        </div></Rise>
      </div>
    </Paper>
  );
};

const Big: React.FC<{ at: number; value: string; label: string }> = ({ at, value, label }) => (
  <Rise at={at} style={{ width: 460 }}>
    <div style={{ fontSize: 120, fontWeight: 600, color: C.ember, letterSpacing: "-0.04em" }}>{value}</div>
    <div style={{ fontSize: 28, color: C.steel, marginTop: 4 }}>{label}</div>
  </Rise>
);
