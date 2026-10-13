"use client";

import { useEffect, useRef } from "react";
import { animate, motion, useInView, useReducedMotion } from "motion/react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn, fmt } from "./cn";
import { riseIn } from "./motion";
import { StatusPill } from "./primitives";

/** Contador animado; con reduced-motion muestra el valor final directamente. */
export function AnimatedNumber({ value, decimals = 0, className }: { value: number; decimals?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || !inView || reduce) return;
    const controls = animate(0, value, {
      duration: 1.1,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => { el.textContent = fmt(v, decimals); },
    });
    return () => controls.stop();
  }, [inView, reduce, value, decimals]);

  return <span ref={ref} className={cn("tabular-nums", className)}>{fmt(reduce ? value : 0, decimals)}</span>;
}

type Props = {
  label: string;
  value: number;
  unit?: "" | "€" | "%" | "h";
  decimals?: number;
  status?: "ok" | "warn" | "bad";
  note?: string;
  trend?: { delta: number; unit: string; label: string; goodWhen: "up" | "down" };
  /** Acción al tocar la tarjeta: abre la fuente del dato. */
  footer?: React.ReactNode;
};

export function StatCard({ label, value, unit = "", decimals = 0, status, note, trend, footer }: Props) {
  const good = trend ? (trend.delta >= 0) === (trend.goodWhen === "up") : true;
  const Arrow = trend && trend.delta >= 0 ? ArrowUp : ArrowDown;
  return (
    <motion.article
      variants={riseIn}
      className="flex min-h-[148px] flex-col rounded-2xl border border-border bg-surface p-5 shadow-[0_1px_2px_rgba(16,36,70,0.04),0_8px_24px_-12px_rgba(16,36,70,0.10)]"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-[15px] font-semibold text-muted">{label}</h3>
        {status && status !== "ok" ? <StatusPill status={status} className="!px-2 !py-0.5 !text-xs" /> : null}
      </div>
      <p className="mt-2 text-[34px] font-extrabold leading-none tracking-tight text-text">
        <AnimatedNumber value={value} decimals={decimals} />
        {unit ? <span className={cn("font-extrabold", unit === "%" || unit === "€" ? "ml-1" : "ml-1.5 text-[26px]")}>{unit}</span> : null}
      </p>
      {trend ? (
        <p className={cn("mt-3 flex items-center gap-1 text-sm font-bold", good ? "text-ok-text" : "text-bad-text")}>
          <Arrow className="size-4" aria-hidden="true" />
          <span className="tabular-nums">{fmt(Math.abs(trend.delta), Math.abs(trend.delta) % 1 ? 1 : 0)}{trend.unit}</span>
          <span className="font-semibold">{trend.label}</span>
          <span className="sr-only">{good ? " (mejora)" : " (empeora)"}</span>
        </p>
      ) : note ? (
        <p className={cn("mt-3 text-sm font-semibold", status === "bad" ? "text-bad-text" : "text-muted")}>{note}</p>
      ) : null}
      {footer ? <div className="mt-auto pt-3">{footer}</div> : null}
    </motion.article>
  );
}
