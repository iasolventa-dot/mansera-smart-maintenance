"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarClock, ChevronRight } from "lucide-react";
import type { PreventiveTask } from "@msm/core";
import { Badge, EmptyState } from "@msm/ui";
import { FilterTabs } from "./filter-tabs";

const TONE = { vencido: "bad", proximo: "warn", al_dia: "ok" } as const;
const LABEL = { vencido: "Vencido", proximo: "Próximo", al_dia: "Al día" } as const;

const rel = (iso: string) => {
  const d = Math.round((new Date(iso).getTime() - new Date(new Date().toISOString().slice(0, 10)).getTime()) / 86_400_000);
  if (d === 0) return "hoy";
  if (d === 1) return "mañana";
  if (d === -1) return "ayer";
  return d < 0 ? `hace ${-d} días` : `en ${d} días`;
};

export function MaintenanceView({ tasks }: { tasks: PreventiveTask[] }) {
  const [f, setF] = useState<"todas" | "vencido" | "proximo" | "al_dia">("todas");
  const list = useMemo(() => tasks.filter((t) => f === "todas" || t.status === f).sort((a, b) => a.dueDate.localeCompare(b.dueDate)), [tasks, f]);
  const count = (s: PreventiveTask["status"]) => tasks.filter((t) => t.status === s).length;

  return (
    <div>
      <FilterTabs id="prev" label="Filtrar preventivos" value={f} onChange={setF} options={[
        { id: "todas", label: "Todos", count: tasks.length, hint: "Todos los preventivos, ordenados por fecha." }, { id: "vencido", label: "Vencidos", count: count("vencido"), hint: "Pasó su fecha y no se hicieron. Son los que pueden acabar en avería." },
        { id: "proximo", label: "Próximos", count: count("proximo"), hint: "Tocan en los próximos días: conviene planificar técnico y material." }, { id: "al_dia", label: "Al día", count: count("al_dia"), hint: "Sin urgencia: su fecha está lejos." },
      ]} />
      {list.length === 0 ? <EmptyState title="Nada en este filtro" description="Los preventivos aparecerán aquí según su plan." /> : (
        <ul className="grid gap-3">
          {list.map((t) => (
            <li key={t.id}>
              <Link href={`/activos/${t.assetId}`} className="group flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 transition-shadow hover:shadow-lg sm:p-5">
                <div className="grid size-14 shrink-0 place-items-center rounded-xl bg-bg text-center leading-tight">
                  <span className="text-[11px] font-bold uppercase text-muted">{new Date(t.dueDate).toLocaleDateString("es-ES", { month: "short" })}</span>
                  <span className="text-[22px] font-extrabold tabular-nums">{new Date(t.dueDate).getDate()}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2"><Badge tone={TONE[t.status]}>{LABEL[t.status]}</Badge><Badge>{t.frequency}</Badge></div>
                  <h3 className="text-[17.5px] font-extrabold leading-snug">{t.task}</h3>
                  <p className="text-[15px] text-muted">{t.assetName} · {t.client}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-muted"><CalendarClock className="size-4" aria-hidden="true" />{rel(t.dueDate)} · {t.assignee}</p>
                </div>
                <ChevronRight className="size-6 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
