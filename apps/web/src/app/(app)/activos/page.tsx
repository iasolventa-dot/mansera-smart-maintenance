import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Item, Stagger, StatusPill } from "@msm/ui";
import { PageHeader, fmtDate } from "@/components/page-header";
import { getProvider } from "@/lib/data";
import { requireAccess } from "@/lib/session";

export const metadata: Metadata = { title: "Activos" };
const LABEL = { ok: "Sin incidencias", warn: "Vigilar", bad: "Crítico" } as const;

export default async function ActivosPage() {
  await requireAccess("activos");
  const assets = await getProvider().listAssets();
  return (
    <>
      <PageHeader title="Activos" subtitle="Ficha 360 de cada máquina: historial, costes y documentos" />
      <Stagger className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {assets.map((a) => (
          <Item key={a.id}>
            <Link href={`/activos/${a.id}`} className="group flex h-full items-center gap-4 rounded-2xl border border-border bg-surface p-5 transition-shadow hover:shadow-lg">
              <div className="min-w-0 flex-1">
                <StatusPill status={a.status} label={LABEL[a.status]} className="mb-2.5" />
                <h3 className="text-[19px] font-extrabold leading-snug">{a.name}</h3>
                <p className="text-[15.5px] text-muted">{a.client} · {a.category}</p>
                <p className="mt-2 text-sm text-muted"><span className="font-bold tabular-nums text-text">{a.failures12m}</span> averías en 12 meses · próximo preventivo {fmtDate(a.nextPreventive)}</p>
              </div>
              <ChevronRight className="size-6 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          </Item>
        ))}
      </Stagger>
    </>
  );
}
