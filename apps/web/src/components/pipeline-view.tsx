"use client";

import { useState } from "react";
import { motion } from "motion/react";
import type { Offer, OfferStage } from "@msm/core";
import { Badge, cn, fmt } from "@msm/ui";
import { FilterTabs } from "./filter-tabs";

const STAGES: { id: OfferStage; label: string; tone: "neutral" | "info" | "warn" | "ok" | "bad" }[] = [
  { id: "borrador", label: "Borrador", tone: "neutral" },
  { id: "enviada", label: "Enviada", tone: "info" },
  { id: "negociacion", label: "Negociación", tone: "warn" },
  { id: "ganada", label: "Ganada", tone: "ok" },
  { id: "perdida", label: "Perdida", tone: "bad" },
];

const STAGE_HINT: Record<OfferStage, string> = {
  borrador: "Ofertas que aún se están preparando.",
  enviada: "Ofertas ya enviadas al cliente, a la espera de respuesta.",
  negociacion: "Ofertas en conversación con el cliente: las más cercanas a cerrarse.",
  ganada: "Ofertas aceptadas. Cada una genera una propuesta de orden de trabajo.",
  perdida: "Ofertas rechazadas o caducadas.",
};

function OfferCard({ o }: { o: Offer }) {
  const due = new Date(o.dueDate).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  return (
    <motion.article layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-surface p-4">
      <p className="text-xs font-bold tabular-nums text-muted">{o.id} · Trello</p>
      <h4 className="mt-1 text-[16px] font-extrabold leading-snug">{o.title}</h4>
      <p className="text-[14px] text-muted">{o.client}</p>
      <div className="mt-3 flex items-end justify-between gap-2">
        <strong className="text-[19px] tabular-nums">{fmt(o.amountEur)} €</strong>
        {o.stage !== "ganada" && o.stage !== "perdida" ? <Badge tone="info">{o.probability} %</Badge> : null}
      </div>
      <p className="mt-2 text-[13px] text-muted">{o.owner} · {o.stage === "ganada" ? "cerrada" : "vence"} {due}</p>
    </motion.article>
  );
}

/** Tablero por etapas en escritorio; filtro por etapa en móvil (sin scroll horizontal). */
export function PipelineView({ offers }: { offers: Offer[] }) {
  const [stage, setStage] = useState<OfferStage>("negociacion");
  const by = (s: OfferStage) => offers.filter((o) => o.stage === s);
  const sum = (s: OfferStage) => by(s).reduce((t, o) => t + o.amountEur, 0);

  return (
    <>
      <div className="lg:hidden">
        <FilterTabs id="stages" label="Etapa de la oferta" value={stage} onChange={setStage} options={STAGES.map((s) => ({ id: s.id, label: s.label, count: by(s.id).length, hint: STAGE_HINT[s.id] }))} />
        <div className="grid gap-3">{by(stage).length === 0 ? <p className="rounded-xl border border-dashed border-border p-8 text-center text-muted">Sin ofertas en esta etapa.</p> : by(stage).map((o) => <OfferCard key={o.id} o={o} />)}</div>
      </div>
      <div className="hidden gap-4 lg:grid lg:grid-cols-5">
        {STAGES.map((s) => (
          <section key={s.id} aria-label={s.label} className="rounded-2xl bg-bg/70 p-3">
            <header className="mb-3 flex items-center justify-between px-1.5">
              <Badge tone={s.tone}>{s.label}</Badge>
              <span className="text-sm font-bold tabular-nums text-muted">{by(s.id).length}</span>
            </header>
            <p className={cn("mb-3 px-1.5 text-[15px] font-extrabold tabular-nums")}>{fmt(sum(s.id))} €</p>
            <div className="grid gap-3">{by(s.id).map((o) => <OfferCard key={o.id} o={o} />)}</div>
          </section>
        ))}
      </div>
    </>
  );
}
