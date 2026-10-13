"use client";

import { motion } from "motion/react";
import { Tooltip, cn, spring, type Hint } from "@msm/ui";

/** Pestañas-filtro con indicador animado. Cada opción puede llevar un texto de ayuda («hint») al pasar el ratón. */
export function FilterTabs<T extends string>({
  id, label, value, onChange, options,
}: { id: string; label: string; value: T; onChange: (v: T) => void; options: { id: T; label: string; count?: number; hint?: Hint | string }[] }) {
  return (
    <div role="tablist" aria-label={label} className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
      {options.map((x) => (
        <Tooltip key={x.id} hint={x.hint ?? null} side="bottom">
          <button role="tab" aria-selected={value === x.id} onClick={() => onChange(x.id)}
            className={cn("relative min-h-12 shrink-0 rounded-full border px-5 text-[15px] font-bold transition-colors", value === x.id ? "border-transparent text-white" : "border-border bg-surface text-muted hover:text-text")}>
            {value === x.id ? <motion.span layoutId={`filter-${id}`} transition={spring} className="absolute inset-0 rounded-full bg-primary" /> : null}
            <span className="relative">{x.label}{x.count !== undefined ? <span className={cn("ml-2 tabular-nums", value === x.id ? "text-white/80" : "text-muted")}>{x.count}</span> : null}</span>
          </button>
        </Tooltip>
      ))}
    </div>
  );
}
