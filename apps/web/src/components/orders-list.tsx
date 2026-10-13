"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ChevronRight, MapPin } from "lucide-react";
import type { WorkOrder } from "@msm/core";
import { Badge, EmptyState, cn, spring } from "@msm/ui";
import { PRIORITY_TONE, SOURCE_LABEL, STATUS_LABEL, STATUS_TONE } from "./labels";

const FILTERS = [
  { id: "todas", label: "Todas" },
  { id: "urgentes", label: "Urgentes" },
  { id: "preventivas", label: "Preventivas" },
  { id: "material", label: "Esperando material" },
] as const;

export function OrdersList({ orders }: { orders: WorkOrder[] }) {
  const [f, setF] = useState<(typeof FILTERS)[number]["id"]>("todas");
  const list = useMemo(() => orders.filter((o) =>
    f === "todas" ? true : f === "urgentes" ? o.priority !== "normal" && o.status !== "cerrada"
    : f === "preventivas" ? o.type === "preventivo" : o.status === "esperando_material"), [orders, f]);

  return (
    <div>
      <div role="tablist" aria-label="Filtrar órdenes" className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {FILTERS.map((x) => (
          <button key={x.id} role="tab" aria-selected={f === x.id} onClick={() => setF(x.id)}
            className={cn("relative min-h-12 shrink-0 rounded-full border px-5 text-[15px] font-bold transition-colors", f === x.id ? "border-transparent text-white" : "border-border bg-surface text-muted hover:text-text")}>
            {f === x.id ? <motion.span layoutId="orders-filter" transition={spring} className="absolute inset-0 rounded-full bg-primary" /> : null}
            <span className="relative">{x.label}</span>
          </button>
        ))}
      </div>

      {list.length === 0 ? <EmptyState title="Sin órdenes en este filtro" description="Prueba con otro filtro o revisa más tarde." /> : (
        <ul className="grid gap-3">
          <AnimatePresence initial={false} mode="popLayout">
            {list.map((o) => (
              <motion.li key={o.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }} transition={spring}>
                <Link href={`/activos/${o.assetId}`} className="group flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 transition-shadow hover:shadow-lg sm:p-5">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold tabular-nums text-muted">{o.externalId}</span>
                      <Badge tone={STATUS_TONE[o.status]}>{STATUS_LABEL[o.status]}</Badge>
                      {o.priority !== "normal" ? <Badge tone={PRIORITY_TONE[o.priority]}>{o.priority === "urgente" ? "Urgente" : "Prioridad alta"}</Badge> : null}
                      <Badge>{o.type === "preventivo" ? "Preventivo" : "Correctivo"}</Badge>
                    </div>
                    <h3 className="text-[18px] font-extrabold leading-snug">{o.title}</h3>
                    <p className="mt-1 text-[15.5px] text-muted">{o.assetName} · {o.client}</p>
                    <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted"><MapPin className="size-4" aria-hidden="true" />{o.site} · {o.assignee ?? "Sin asignar"} · vence {new Date(o.dueDate).toLocaleDateString("es-ES", { day: "numeric", month: "short" })} · {SOURCE_LABEL[o.source]}</p>
                  </div>
                  <ChevronRight className="size-6 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </Link>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}
