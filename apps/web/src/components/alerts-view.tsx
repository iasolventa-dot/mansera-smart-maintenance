"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { AlertItem } from "@msm/core";
import { Badge, Card, EmptyState, LineChart, SourceChip } from "@msm/ui";
import { FilterTabs } from "./filter-tabs";
import { SOURCE_LABEL } from "./labels";

const SEV = { alta: "bad", media: "warn", baja: "neutral" } as const;
const SEV_LABEL = { alta: "Alta", media: "Media", baja: "Baja" } as const;
const KIND: Record<AlertItem["kind"], string> = {
  anomalia: "Anomalía", contrato: "Contrato", prl: "PRL", preventivo: "Preventivo", sistema: "Sistema", facturacion: "Facturación", stock: "Stock",
};
const STATE = { nueva: "Nueva", en_revision: "En revisión", resuelta: "Resuelta" } as const;

const ago = (iso: string) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  return m < 60 ? `hace ${m} min` : m < 1440 ? `hace ${Math.round(m / 60)} h` : `hace ${Math.round(m / 1440)} d`;
};

export function AlertsView({ alerts }: { alerts: AlertItem[] }) {
  const [f, setF] = useState<"activas" | "alta" | "anomalias" | "resueltas">("activas");
  const [open, setOpen] = useState<string | null>(alerts[0]?.id ?? null);
  const list = useMemo(() => alerts.filter((a) =>
    f === "activas" ? a.status !== "resuelta" : f === "alta" ? a.severity === "alta" && a.status !== "resuelta" : f === "anomalias" ? a.kind === "anomalia" : a.status === "resuelta"), [alerts, f]);

  return (
    <div>
      <FilterTabs id="alerts" label="Filtrar alertas" value={f} onChange={setF} options={[
        { id: "activas", label: "Activas", count: alerts.filter((a) => a.status !== "resuelta").length },
        { id: "alta", label: "Prioridad alta", count: alerts.filter((a) => a.severity === "alta" && a.status !== "resuelta").length },
        { id: "anomalias", label: "Anomalías" },
        { id: "resueltas", label: "Resueltas" },
      ]} />
      {list.length === 0 ? <EmptyState title="Sin alertas en este filtro" description="Cuando el sistema detecte algo, aparecerá aquí con su evidencia." /> : (
        <ul className="grid gap-3">
          {list.map((a) => {
            const expanded = open === a.id;
            return (
              <li key={a.id}>
                <Card className="!p-0">
                  <button onClick={() => setOpen(expanded ? null : a.id)} aria-expanded={expanded} className="flex w-full flex-col gap-2 p-5 text-left">
                    <span className="flex flex-wrap items-center gap-2">
                      <Badge tone={SEV[a.severity]}>{SEV_LABEL[a.severity]}</Badge><Badge>{KIND[a.kind]}</Badge>
                      <Badge tone={a.status === "resuelta" ? "ok" : a.status === "nueva" ? "info" : "warn"}>{STATE[a.status]}</Badge>
                      <span className="ml-auto text-sm text-muted">{ago(a.raisedAt)}</span>
                    </span>
                    <span className="text-[18px] font-extrabold leading-snug">{a.title}</span>
                    <span className="text-[15px] text-muted">{a.entity}</span>
                  </button>
                  {expanded ? (
                    <div className="border-t border-border p-5">
                      <p className="text-[16.5px] leading-relaxed">{a.explanation}</p>
                      {a.evidence.length > 1 ? (
                        <div className="mt-4 rounded-xl bg-bg p-4">
                          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Evidencia</p>
                          <LineChart data={a.evidence} title={`Evidencia de la alerta: ${a.title}`} height={150} />
                        </div>
                      ) : null}
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <SourceChip app={SOURCE_LABEL[a.provenance.source]} label={a.provenance.entity} />
                        {a.kind === "anomalia" ? <Badge>Anomalía · no es una predicción</Badge> : null}
                      </div>
                      {a.provenance.calc ? <p className="mt-3 text-sm text-muted"><strong>Cálculo:</strong> {a.provenance.calc}</p> : null}
                      <Link href={a.href} className="mt-3 inline-flex min-h-12 items-center gap-1.5 font-bold text-primary-text hover:underline">Ir al detalle<ArrowRight className="size-4" aria-hidden="true" /></Link>
                    </div>
                  ) : null}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
