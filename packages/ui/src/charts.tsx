"use client";

import { useEffect, useId, useRef, useState } from "react";
import { motion } from "motion/react";
import { cn, fmt } from "./cn";

type Point = { label: string; value: number };

/** Máximo "redondo" del eje: valores pequeños (0-1) y grandes (miles) quedan legibles. */
function niceMax(v: number): number {
  if (v <= 1) return 1;
  if (v <= 2) return 2;
  if (v <= 5) return 5;
  if (v <= 10) return 10;
  if (v <= 20) return 20;
  const unit = v < 100 ? 20 : v < 1000 ? 100 : v < 10000 ? 1000 : 10000;
  return Math.ceil(v / unit) * unit;
}

/** Gráfico de líneas SVG (sin dependencias). Incluye tabla accesible equivalente. */
export function LineChart({ data, title, height = 220 }: { data: Point[]; title: string; height?: number }) {
  const id = useId();
  // Se dibuja al ancho real del contenedor: el texto de los ejes mantiene 12 px también en móvil.
  const box = useRef<HTMLElement>(null);
  const [W, setW] = useState(640);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => { const w = Math.round(e?.contentRect.width ?? 0); if (w > 120) setW(w); });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = height, padL = 34, padR = 12, padT = 12, padB = 28;
  const max = niceMax(Math.max(...data.map((d) => d.value), 0));
  const x = (i: number) => padL + (i * (W - padL - padR)) / Math.max(data.length - 1, 1);
  const y = (v: number) => padT + (1 - v / max) * (H - padT - padB);
  const line = data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(" ");
  const area = `${line} L${x(data.length - 1)},${H - padB} L${x(0)},${H - padB} Z`;
  const ticks = [0, max / 2, max];
  return (
    <figure ref={box}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={`${id}-t`} className="block h-auto w-full overflow-visible">
        <title id={`${id}-t`}>{title}</title>
        <defs>
          <linearGradient id={`${id}-g`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--primary)" stopOpacity="0.28" />
            <stop offset="1" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="var(--border)" />
            <text x={padL - 8} y={y(t) + 4} textAnchor="end" fontSize="12" fill="var(--muted)">{fmt(t, max < 5 ? 1 : 0)}</text>
          </g>
        ))}
        <motion.path d={area} fill={`url(#${id}-g)`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.3 }} />
        <motion.path d={line} fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }} />
        {data.map((d, i) => (
          <g key={d.label}>
            <circle cx={x(i)} cy={y(d.value)} r="4" fill="var(--surface)" stroke="var(--primary)" strokeWidth="2.5" />
            <text x={x(i)} y={H - 8} textAnchor="middle" fontSize="12" fill="var(--muted)">{d.label}</text>
          </g>
        ))}
      </svg>
      <figcaption className="sr-only">
        {data.map((d) => `${d.label}: ${d.value}`).join(". ")}
      </figcaption>
    </figure>
  );
}

/** Barras horizontales con valor visible (sustituye tablas densas en móvil). */
export function BarList({ data, unit }: { data: Point[]; unit: "eur" | "keur" | "num" }) {
  const format = (v: number) => (unit === "keur" ? `${fmt(v / 1000, 1)} k€` : unit === "eur" ? `${fmt(v)} €` : fmt(v, v % 1 ? 1 : 0));
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <ul className="grid gap-4">
      {data.map((d, i) => (
        <li key={d.label}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[15px]">
            <span className="font-semibold text-text">{d.label}</span>
            <span className="font-bold tabular-nums text-text">{format(d.value)}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-border/70" aria-hidden="true">
            <motion.div className="h-full origin-left rounded-full bg-primary" style={{ width: `${(d.value / max) * 100}%` }} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.8, delay: 0.08 * i, ease: [0.22, 1, 0.36, 1] }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

const toneVar = { primary: "var(--primary)", cyan: "var(--cyan)", warn: "var(--warn)", ok: "var(--ok)" } as const;

export function Donut({ data, centerLabel }: { data: { label: string; value: number; tone: keyof typeof toneVar }[]; centerLabel: string }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const R = 52, C = 2 * Math.PI * R;
  // Desplazamiento acumulado de cada segmento, calculado antes de renderizar (sin mutar durante el render).
  const offsets = data.map((_, i) => data.slice(0, i).reduce((s, x) => s + (x.value / total) * C, 0));
  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
      <div className="relative size-[148px] shrink-0">
        <svg viewBox="0 0 140 140" className="size-full -rotate-90" role="img" aria-label={`${total} ${centerLabel}`}>
          <circle cx="70" cy="70" r={R} fill="none" stroke="var(--border)" strokeWidth="16" />
          {data.map((d, i) => {
            const len = (d.value / total) * C;
            return (
              <motion.circle key={d.label} cx="70" cy="70" r={R} fill="none" stroke={toneVar[d.tone]} strokeWidth="16"
                strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-(offsets[i] ?? 0)}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12 * i, duration: 0.5 }} />
            );
          })}
        </svg>
        <div className="absolute inset-0 grid place-content-center text-center">
          <span className="text-[28px] font-extrabold leading-none tabular-nums">{fmt(total)}</span>
          <span className="mt-1 text-xs font-semibold text-muted">{centerLabel}</span>
        </div>
      </div>
      <ul className="grid w-full gap-2.5 text-[15px]">
        {data.map((d) => (
          <li key={d.label} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 font-semibold"><span className="size-3 rounded-[4px]" style={{ background: toneVar[d.tone] }} aria-hidden="true" />{d.label}</span>
            <span className={cn("font-bold tabular-nums")}>{fmt(d.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
