"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FileText, Receipt } from "lucide-react";
import type { FinanceDoc } from "@msm/core";
import { Badge, Button, EmptyState, fmt } from "@msm/ui";
import { FilterTabs } from "./filter-tabs";

const TONE = { pendiente_facturar: "warn", emitida: "info", cobrada: "ok", vencida: "bad" } as const;
const LABEL = { pendiente_facturar: "Sin facturar", emitida: "Emitida", cobrada: "Cobrada", vencida: "Vencida" } as const;
const d = (iso: string) => new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short" });

export function FinanceView({ docs }: { docs: FinanceDoc[] }) {
  const [f, setF] = useState<"todos" | FinanceDoc["status"]>("pendiente_facturar");
  const list = useMemo(() => docs.filter((x) => f === "todos" || x.status === f), [docs, f]);
  const n = (s: FinanceDoc["status"]) => docs.filter((x) => x.status === s).length;

  return (
    <div>
      <FilterTabs id="fin" label="Filtrar documentos" value={f} onChange={setF} options={[
        { id: "pendiente_facturar", label: "Sin facturar", count: n("pendiente_facturar") }, { id: "vencida", label: "Vencidas", count: n("vencida") },
        { id: "emitida", label: "Emitidas", count: n("emitida") }, { id: "cobrada", label: "Cobradas", count: n("cobrada") }, { id: "todos", label: "Todos", count: docs.length },
      ]} />
      {list.length === 0 ? <EmptyState title="Nada en este filtro" description="Los documentos aparecerán aquí desde A3ERP y PGMWin." /> : (
        <ul className="grid gap-3">
          {list.map((x) => (
            <li key={x.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 sm:flex-row sm:items-center sm:p-5">
              <span className="hidden size-12 shrink-0 place-items-center rounded-xl bg-bg text-primary sm:grid">{x.kind === "albaran" ? <FileText className="size-6" aria-hidden="true" /> : <Receipt className="size-6" aria-hidden="true" />}</span>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2"><span className="text-sm font-bold tabular-nums text-muted">{x.id}</span><Badge tone={TONE[x.status]}>{LABEL[x.status]}</Badge><Badge>{x.kind === "albaran" ? "Albarán · PGMWin" : "Factura · A3ERP"}</Badge></div>
                <p className="text-[17.5px] font-extrabold leading-snug">{x.client}</p>
                <p className="text-sm text-muted">{d(x.date)}{x.dueDate ? ` · vence ${d(x.dueDate)}` : ""}{x.workOrder ? ` · ${x.workOrder}` : ""}</p>
              </div>
              <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                <strong className="text-[21px] tabular-nums">{fmt(x.amountEur, x.amountEur % 1 ? 2 : 0)} €</strong>
                {x.status === "pendiente_facturar" ? <Link href="/propuestas" className="inline-flex min-h-12 items-center rounded-[10px] bg-primary px-4 text-[15px] font-bold text-white hover:bg-primary-hover">Proponer factura</Link> : null}
                {x.status === "vencida" ? <Button variant="secondary">Reclamar cobro</Button> : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
