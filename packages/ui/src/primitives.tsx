"use client";

import type { ComponentProps, ReactNode } from "react";
import { motion, MotionConfig } from "motion/react";
import { CircleCheck, OctagonAlert, TriangleAlert, Database, Loader2 } from "lucide-react";
import { cn } from "./cn";
import { spring } from "./motion";
import { Tooltip, type Hint } from "./tooltip";

/** Respeta `prefers-reduced-motion` en todos los componentes hijos. */
export function MotionRoot({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

/* ───────── Logo ───────── */
export function Logo({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)} aria-label="MANSERA">
      <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
        <path d="M2 4 L18 4 L2 30 Z" fill={inverted ? "#61BDE4" : "#3E97D0"} />
        <path d="M18 4 L32 4 L32 30 L10 30 Z" fill={inverted ? "#FFFFFF" : "#4673AF"} opacity={inverted ? 0.92 : 1} />
      </svg>
      <div className="leading-none">
        <div className={cn("text-[17px] font-extrabold tracking-wide", inverted ? "text-white" : "text-brand")}>MANSERA</div>
        <div className={cn("mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em]", inverted ? "text-cyan" : "text-muted")}>
          Smart Maintenance
        </div>
      </div>
    </div>
  );
}

/* ───────── Button ───────── */
type ButtonProps = Omit<ComponentProps<"button">, "ref" | "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart"> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "md" | "lg";
  loading?: boolean;
  /** Texto de ayuda al pasar el ratón: qué hace el botón. */
  hint?: Hint | string;
};

const buttonStyles = {
  primary: "bg-primary text-white hover:bg-primary-hover shadow-[0_6px_16px_-6px_var(--primary)]",
  secondary: "bg-surface text-primary border border-primary/40 hover:bg-primary-soft",
  ghost: "text-muted hover:bg-primary-soft hover:text-text",
  danger: "bg-bad-soft text-bad-text border border-bad/30 hover:bg-bad/15",
} as const;

export function Button({ variant = "primary", size = "md", loading, hint, className, children, disabled, ...props }: ButtonProps) {
  const button = (
    <motion.button
      whileTap={{ scale: 0.97 }}
      transition={spring}
      disabled={disabled || loading}
      className={cn(
        "inline-flex select-none items-center justify-center gap-2 rounded-[10px] font-bold outline-offset-2 transition-colors disabled:cursor-not-allowed disabled:opacity-55",
        size === "lg" ? "min-h-14 px-6 text-[17px]" : "min-h-12 px-4 text-[15px]",
        buttonStyles[variant],
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : null}
      {children}
    </motion.button>
  );
  return hint ? <Tooltip hint={hint}>{button}</Tooltip> : button;
}

/* ───────── Card ───────── */
export function Card({ className, children, ...props }: ComponentProps<"section">) {
  return (
    <section
      className={cn("rounded-2xl border border-border bg-surface p-5 shadow-[0_1px_2px_rgba(16,36,70,0.04),0_8px_24px_-12px_rgba(16,36,70,0.10)]", className)}
      {...props}
    >
      {children}
    </section>
  );
}

export function CardTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-[17px] font-bold text-text">{children}</h2>
      {aside}
    </div>
  );
}

/* ───────── StatusPill (semáforo: color + icono + texto) ───────── */
const tone = {
  ok: { cls: "bg-ok-soft text-ok-text", Icon: CircleCheck, label: "Correcto" },
  warn: { cls: "bg-warn-soft text-warn-text", Icon: TriangleAlert, label: "Atención" },
  bad: { cls: "bg-bad-soft text-bad-text", Icon: OctagonAlert, label: "Crítico" },
} as const;

const STATUS_HINT = {
  ok: { title: "Correcto", text: "Dentro de lo normal: no requiere acción." },
  warn: { title: "Atención", text: "Conviene revisarlo pronto antes de que empeore." },
  bad: { title: "Crítico", text: "Requiere actuar ya o puede causar un problema." },
} as const;

/** «hint» personaliza el texto de ayuda; «false» lo desactiva (cuando ya está dentro de otro elemento con ayuda). */
export function StatusPill({ status, label, className, hint }: { status: keyof typeof tone; label?: string; className?: string; hint?: Hint | string | false }) {
  const { cls, Icon, label: def } = tone[status];
  const pill = (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-bold", cls, className)}>
      <Icon className="size-4" aria-hidden="true" />
      {label ?? def}
    </span>
  );
  return hint === false ? pill : <Tooltip hint={hint ?? STATUS_HINT[status]}>{pill}</Tooltip>;
}

export function Badge({ children, tone: t = "neutral", className, hint }: { children: ReactNode; tone?: "neutral" | "info" | "ok" | "warn" | "bad"; className?: string; hint?: Hint | string }) {
  const map = {
    neutral: "bg-bg text-muted border border-border",
    info: "bg-primary-soft text-primary-text",
    ok: "bg-ok-soft text-ok-text",
    warn: "bg-warn-soft text-warn-text",
    bad: "bg-bad-soft text-bad-text",
  } as const;
  const badge = <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[12.5px] font-bold", map[t], className)}>{children}</span>;
  return hint ? <Tooltip hint={hint}>{badge}</Tooltip> : badge;
}

/* ───────── Avatar ───────── */
export function Avatar({ name, className }: { name: string; className?: string }) {
  const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return (
    <span aria-hidden="true" className={cn("inline-grid size-10 shrink-0 place-items-center rounded-full bg-primary text-sm font-extrabold text-white", className)}>
      {initials}
    </span>
  );
}

/* ───────── Skeleton / Empty / Error ───────── */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-xl bg-border/70", className)} />;
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="grid place-items-center gap-3 rounded-2xl border border-dashed border-border px-6 py-12 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary"><Database className="size-7" aria-hidden="true" /></span>
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="max-w-sm text-muted">{description}</p>
      {action}
    </div>
  );
}

/* ───────── SourceChip: cita de IA a un toque ───────── */
export function SourceChip({ app, label, className, hint }: { app: string; label: string; className?: string; hint?: Hint | string | false }) {
  const chip = (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border border-border bg-bg px-2.5 py-1 text-[12.5px] font-semibold text-muted", className)}>
      <span className="size-2 rounded-full bg-accent" aria-hidden="true" />
      <span className="font-bold text-text">{app}</span>
      <span>{label}</span>
    </span>
  );
  return hint === false ? chip : <Tooltip hint={hint ?? { title: "Fuente del dato", text: `Sale de ${app}: ${label}. El programa de origen siempre tiene la razón.` }}>{chip}</Tooltip>;
}

/* ───────── ProgressBar ───────── */
export function ProgressBar({ value, max = 100, tone: t = "primary", label, hint }: { value: number; max?: number; tone?: "primary" | "ok" | "warn" | "bad"; label: string; hint?: Hint | string }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const color = { primary: "bg-primary", ok: "bg-ok", warn: "bg-warn", bad: "bg-bad" }[t];
  const bar = (
    <div role="progressbar" aria-label={label} aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} className="h-2.5 w-full overflow-hidden rounded-full bg-border/70">
      <motion.div className={cn("h-full origin-left rounded-full", color)} initial={{ scaleX: 0 }} animate={{ scaleX: pct / 100 }} style={{ width: "100%" }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} />
    </div>
  );
  return hint ? <Tooltip hint={hint}>{bar}</Tooltip> : bar;
}
