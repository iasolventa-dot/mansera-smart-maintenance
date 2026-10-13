import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import type { Alert } from "@msm/core";
import { Badge, BarList, Card, CardTitle, Donut, LineChart, SourceChip, Stagger, StatCard, StatusPill, cn } from "@msm/ui";
import { PageHeader, ago } from "@/components/page-header";
import { getProvider } from "@/lib/data";
import { requireAccess } from "@/lib/session";

export const metadata: Metadata = { title: "Panel general" };

const sevTone = { alta: "bad", media: "warn", baja: "neutral" } as const;
const sevLabel = { alta: "Alta", media: "Media", baja: "Baja" } as const;
const SRC: Record<string, string> = { pgmwin: "PGMWin", a3erp: "A3ERP", trello: "Trello", sesame: "Sésame", msm: "MSM" };

export default async function PanelPage() {
  const session = await requireAccess("panel");
  const d = await getProvider().getDashboard(session.role);
  const showCharts = d.role !== "ti";

  return (
    <>
      <PageHeader
        title={d.title}
        subtitle={`${d.periodLabel} · ${d.role === "direccion" ? "todos los clientes" : "tu departamento"}`}
        actions={d.quickActions.map((a, i) => (
          <Link key={a.id} href={a.href}
            className={cn("inline-flex min-h-12 items-center gap-2 rounded-[10px] px-4 text-[15px] font-bold transition-transform active:scale-[0.97]",
              i === 0 ? "bg-primary text-white shadow-[0_6px_16px_-6px_var(--primary)] hover:bg-primary-hover" : "border border-primary/40 bg-surface text-primary-text hover:bg-primary-soft")}>
            {a.kind === "propuesta" ? <Plus className="size-4" aria-hidden="true" /> : null}{a.label}
          </Link>
        ))}
      />

      <Card className="mb-6 flex flex-wrap items-center gap-4 !p-4 sm:!p-5">
        <StatusPill status={d.overall} className="!px-3 !py-1.5 !text-[15px]" label={d.overall === "ok" ? "Todo en orden" : d.overall === "warn" ? "Requiere atención" : "Acción urgente"} />
        <p className="text-[17px] font-semibold">{d.overallText}</p>
        <p className="ml-auto text-sm text-muted">Actualizado {ago(d.kpis[0]?.provenance.fetchedAt ?? new Date().toISOString())}</p>
      </Card>

      <Stagger className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(min(100%,205px),1fr))] gap-4">
        {d.kpis.map((k) => (
          <StatCard key={k.id} label={k.label} value={k.value} unit={k.unit} decimals={k.decimals} status={k.status === "ok" ? undefined : k.status} note={k.note} trend={k.trend}
            footer={<SourceChip app={SRC[k.provenance.source] ?? ""} label={k.provenance.entity} />} />
        ))}
      </Stagger>

      {showCharts ? (
        <div className="mb-6 grid gap-4 xl:grid-cols-[1.5fr_1fr_1fr]">
          <Card><CardTitle>Averías por mes</CardTitle><LineChart data={d.failuresByMonth} title="Averías por mes, últimos 12 meses" /></Card>
          <Card><CardTitle>Coste por cliente</CardTitle><BarList data={d.costByClient} unit="keur" /></Card>
          <Card><CardTitle>Órdenes por estado</CardTitle><Donut data={d.ordersByState} centerLabel="órdenes" /></Card>
        </div>
      ) : null}

      <Card>
        <CardTitle aside={d.alerts.length ? <Badge tone="info">{d.alerts.length}</Badge> : null}>Requiere tu atención</CardTitle>
        {d.alerts.length === 0 ? (
          <p className="rounded-xl bg-ok-soft px-4 py-5 font-semibold text-ok-text">No hay alertas pendientes.</p>
        ) : (
          <ul className="grid gap-3">{d.alerts.map((a) => <AlertRow key={a.id} a={a} />)}</ul>
        )}
      </Card>
    </>
  );
}

function AlertRow({ a }: { a: Alert }) {
  return (
    <li className="flex flex-col gap-3 rounded-xl bg-bg p-4 sm:flex-row sm:items-center">
      <Badge tone={sevTone[a.severity]} className="w-fit shrink-0">{sevLabel[a.severity]}</Badge>
      <div className="min-w-0 flex-1">
        <p className="text-[16.5px] font-semibold leading-snug">{a.text}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <SourceChip app={SRC[a.provenance.source] ?? ""} label={a.provenance.period ?? a.provenance.entity} />
          {a.kind === "anomalia" ? <Badge tone="neutral">Anomalía · no es una predicción</Badge> : null}
        </div>
      </div>
      <Link href={a.href} className="inline-flex min-h-12 items-center gap-1.5 self-start rounded-[10px] px-2 font-bold text-primary-text hover:underline sm:self-center">
        {a.actionLabel}<ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </li>
  );
}
