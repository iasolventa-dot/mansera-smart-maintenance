import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Item, ProgressBar, Stagger, StatusPill, fmt } from "@msm/ui";
import { PageHeader } from "@/components/page-header";
import { getProvider } from "@/lib/data";
import { requireAccess } from "@/lib/session";

export const metadata: Metadata = { title: "Clientes" };
const LABEL = { ok: "Sin incidencias", warn: "Vigilar", bad: "Crítico" } as const;

export default async function ClientesPage() {
  await requireAccess("clientes");
  const clients = await getProvider().listClients();
  return (
    <>
      <PageHeader title="Clientes" subtitle="Vista 360: lo que hay en A3ERP, PGMWin y Trello, en una sola ficha" />
      <Stagger className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {clients.map((c) => {
          const pct = c.contractHoursUsedPct;
          return (
            <Item key={c.id}>
              <Link href={`/clientes/${c.id}`} className="group flex h-full flex-col gap-3 rounded-2xl border border-border bg-surface p-5 transition-shadow hover:shadow-lg">
                <div className="flex items-start justify-between gap-3">
                  <StatusPill status={c.status} label={LABEL[c.status]} />
                  <ChevronRight className="size-5 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </div>
                <div><h3 className="text-[19px] font-extrabold leading-snug">{c.name}</h3><p className="text-[15px] text-muted">{c.sector}</p></div>
                <dl className="grid grid-cols-2 gap-3 text-[15px]">
                  <div><dt className="text-[13px] text-muted">OT abiertas</dt><dd className="text-[20px] font-extrabold tabular-nums">{c.openOrders}</dd></div>
                  <div><dt className="text-[13px] text-muted">Coste anual</dt><dd className="text-[20px] font-extrabold tabular-nums">{fmt(c.annualCostEur)} €</dd></div>
                </dl>
                {pct !== null ? (
                  <div className="mt-auto">
                    <div className="mb-1.5 flex justify-between text-[13.5px] font-semibold"><span className="text-muted">Horas del contrato</span><span className="tabular-nums">{pct} %</span></div>
                    <ProgressBar value={pct} tone={pct >= 90 ? "bad" : pct >= 75 ? "warn" : "primary"} label={`Horas consumidas del contrato de ${c.name}`} />
                  </div>
                ) : <p className="mt-auto text-[13.5px] text-muted">Sin contrato marco</p>}
              </Link>
            </Item>
          );
        })}
      </Stagger>
    </>
  );
}
