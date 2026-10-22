// Design tokens from PredictIA/DESIGN.md — "editorial data observatory on warm paper,
// a single orange ember punctuating monochrome precision".
import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/IBMPlexMono";

const inter = loadInter("normal", { weights: ["400", "500", "600"], subsets: ["latin"] });
const mono = loadMono("normal", { weights: ["400", "500"], subsets: ["latin"] });

export const C = {
  graphite: "#202020",
  canvas: "#ffffff",
  ash: "#efefef",
  fog: "#f5f5f5",
  ivory: "#ebe6dd",
  steel: "#4d4d4d",
  slate: "#828282",
  mist: "#e8e8e8",
  ember: "#ff682c",
  brass: "#816729",
};

export const FONT = inter.fontFamily;
export const MONO = mono.fontFamily;

/** 0 → 1 ease-in over `dur` frames starting at `start`. */
export const useIn = (start = 0, dur = 18) => {
  const f = useCurrentFrame();
  return interpolate(f, [start, start + dur], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });
};

export const useSpring = (start = 0) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: f - start, fps, config: { damping: 200 } });
};

/** Fade + rise wrapper. */
export const Rise: React.FC<{ at?: number; dy?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({
  at = 0, dy = 24, children, style,
}) => {
  const p = useIn(at);
  return <div style={{ opacity: p, transform: `translateY(${(1 - p) * dy}px)`, ...style }}>{children}</div>;
};

/** Paper canvas shared by every scene, with fade-out at the end of the scene. */
export const Paper: React.FC<{ children: React.ReactNode; dur: number; bg?: string }> = ({ children, dur, bg = C.canvas }) => {
  const f = useCurrentFrame();
  const out = interpolate(f, [dur - 12, dur], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const inn = interpolate(f, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", inset: 0, background: bg, fontFamily: FONT, color: C.graphite, opacity: Math.min(out, inn) }}>
      {children}
    </div>
  );
};

/** Small uppercase step label: "PASO 2 · ENTRENAMIENTO". */
export const Kicker: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = C.ember }) => (
  <div style={{ fontFamily: MONO, fontSize: 22, letterSpacing: "0.14em", textTransform: "uppercase", color, fontWeight: 500, marginBottom: 18 }}>
    {children}
  </div>
);

export const Title: React.FC<{ children: React.ReactNode; size?: number }> = ({ children, size = 64 }) => (
  <div style={{ fontSize: size, fontWeight: 500, letterSpacing: "-0.02em", lineHeight: 1.1 }}>{children}</div>
);

export const Sub: React.FC<{ children: React.ReactNode; size?: number }> = ({ children, size = 28 }) => (
  <div style={{ fontSize: size, color: C.steel, lineHeight: 1.4 }}>{children}</div>
);

/** Asymmetric ivory card with an ember rule (DESIGN.md §3). */
export const EmberCard: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ background: C.ivory, borderRadius: "6px 0 0 0", borderLeft: `4px solid ${C.ember}`, padding: "32px 40px", ...style }}>
    {children}
  </div>
);

/** HTTP request/response card in mono. */
export const CodeCard: React.FC<{ method?: string; path?: string; status?: string; lines: string[]; at?: number; width?: number }> = ({
  method, path, status, lines, at = 0, width = 720,
}) => {
  const f = useCurrentFrame();
  const shown = Math.max(0, Math.floor((f - at - 8) / 2.2));
  return (
    <Rise at={at} style={{ width }}>
      <div style={{ border: `1px solid ${C.mist}`, background: C.canvas, borderRadius: 6 }}>
        <div style={{ display: "flex", gap: 14, alignItems: "center", padding: "16px 22px", borderBottom: `1px solid ${C.mist}`, background: C.fog, fontFamily: MONO, fontSize: 21 }}>
          {method && <span style={{ color: C.canvas, background: C.graphite, padding: "3px 10px", borderRadius: 3, fontWeight: 500 }}>{method}</span>}
          {status && <span style={{ color: C.canvas, background: C.ember, padding: "3px 10px", borderRadius: 3, fontWeight: 500 }}>{status}</span>}
          <span style={{ color: C.steel }}>{path}</span>
        </div>
        {lines.length > 0 && <pre style={{ margin: 0, padding: "18px 22px", fontFamily: MONO, fontSize: 20, lineHeight: 1.55, color: C.graphite, whiteSpace: "pre" }}>
          {lines.map((l, i) => (
            <div key={i} style={{ opacity: i < shown ? 1 : 0 }}>
              {colorize(l)}
            </div>
          ))}
        </pre>}
      </div>
    </Rise>
  );
};

const colorize = (l: string) => {
  const m = l.match(/^(\s*)("[^"]+")(:\s*)(.*)$/);
  if (!m) return <span>{l || " "}</span>;
  const val = m[4];
  const isNum = /^-?[\d.]+,?$/.test(val.trim());
  return (
    <span>
      {m[1]}
      <span style={{ color: C.steel }}>{m[2]}</span>
      {m[3]}
      <span style={{ color: isNum ? C.ember : C.brass }}>{val}</span>
    </span>
  );
};

/** Browser frame holding a real screenshot of the app. */
export const Browser: React.FC<{ src: string; url: string; width: number; zoom?: number; focus?: [number, number] }> = ({
  src, url, width, zoom = 1, focus = [0, 0],
}) => (
  <div style={{ width, borderRadius: 8, overflow: "hidden", border: `1px solid ${C.mist}`, boxShadow: "0 30px 60px -30px rgba(32,32,32,0.35)", background: C.canvas }}>
    <div style={{ height: 40, background: C.ash, display: "flex", alignItems: "center", gap: 8, padding: "0 16px" }}>
      {[0, 1, 2].map((i) => <div key={i} style={{ width: 11, height: 11, borderRadius: 6, background: "#cfcfcf" }} />)}
      <div style={{ marginLeft: 16, flex: 1, height: 24, background: C.canvas, borderRadius: 4, fontFamily: MONO, fontSize: 14, color: C.slate, display: "flex", alignItems: "center", padding: "0 12px" }}>
        {url}
      </div>
    </div>
    <div style={{ width, height: (width * 1080) / 1920, overflow: "hidden" }}>
      <img src={src} style={{ width: "100%", transformOrigin: "0 0",
        transform: `scale(${zoom}) translate(${(-focus[0] * width) / 1920}px, ${(-focus[1] * width) / 1920}px)` }} />
    </div>
  </div>
);

export const fmt = (n: number, d = 0) =>
  n.toLocaleString("es-CL", { minimumFractionDigits: d, maximumFractionDigits: d });
