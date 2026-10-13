"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ChevronRight, MapPin } from "lucide-react";
import type { WorkOrder } from "@msm/core";
import { Badge, EmptyState, spring } from "@msm/ui";
import { FilterTabs } from "./filter-tabs";
import { PRIORITY_TONE, SOURCE_LABEL, STATUS_LABEL, STATUS_TONE } from "./labels";

const FILTERS = [
  { id: "todas", label: "Todas", hint: "Todas las órdenes de trabajo." },
  { id: "urgentes", label: "Urgentes", hint: "Órdenes de prioridad alta o urgente que siguen abiertas." },
  { id: "preventivas", label: "Preventivas", hint: "Mantenimiento programado, no averías." },
  { id: "material", label: "Esperando material", hint: "Paradas hasta que llegue un repuesto. Mira Compras para ver el pedido." },
] as const;

export function OrdersList({ orders }: { orders: WorkOrder[] }) {
  const [f, setF] = useState<(typeof FILTERS)[number]["id"]>("todas");
  const list = useMemo(() => orders.filter((o) =>
    f === "todas" ? true : f === "urgentes" ? o.priority !== "normal" && o.status !== "cerrada"
    : f === "preventivas" ? o.type === "preventivo" : o.status === "esperando_material"), [orders, f]);

  return (
    <div>
      <FilterTabs id="orders" label="Filtrar órdenes" value={f} onChange={setF} options={FILTERS.map((x) => ({ id: x.id, label: x.label, hint: x.hint }))} />

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
