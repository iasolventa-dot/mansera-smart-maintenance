import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Lightbulb, MapPin, UserRound } from "lucide-react";
import { HINT } from "@msm/core";
import { Badge, BarList, Card, CardTitle, ProgressBar, SourceChip, StatusPill, fmt } from "@msm/ui";
import { PageHeader, fmtDate } from "@/components/page-header";
import { SOURCE_LABEL } from "@/components/labels";
import { getProvider } from "@/lib/data";
import { requireAccess } from "@/lib/session";

type Params = { params: Promise<{ id: string }> };
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  return { title: `Cliente ${id}` };
}
const LABEL = { ok: "Sin incidencias", warn: "Vigilar", bad: "Crítico" } as const;

export default async function ClientPage({ params }: Params) {
  await requireAccess("clientes");
  const { id } = await params;
  const c = await getProvider().getClient(decodeURIComponent(id));
  if (!c) notFound();
  const pct = c.contractHoursUsedPct;

  return (
    <>
      <Link href="/clientes" className="mb-4 inline-flex min-h-12 items-center gap-2 font-bold text-primary-text hover:underline"><ArrowLeft className="size-4" aria-hidden="true" />Clientes</Link>
      <PageHeader title={c.name} subtitle={`${c.sector} · ${c.sites.join(" · ")}`} actions={<StatusPill status={c.status} label={LABEL[c.status]} className="!px-3.5 !py-2 !text-[15px]" />} />

      {c.insight ? (
        <Card className="mb-6 !border-warn/40 !bg-warn-soft">
          <div className="flex gap-3">
            <Lightbulb className="mt-0.5 size-6 shrink-0 text-warn-text" aria-hidden="true" />
            <div>
              <p className="text-[17px] font-bold text-warn-text">{c.insight.text}</p>
              <div className="mt-3 flex flex-wrap gap-2"><SourceChip app={SOURCE_LABEL[c.insight.provenance.source]} label={c.insight.provenance.period ?? c.insight.provenance.entity} /></div>
              {c.insight.provenance.calc ? <p className="mt-3 text-sm text-warn-text/90"><strong>Cálculo:</strong> {c.insight.provenance.calc}</p> : null}
            </div>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="grid content-start gap-4">
          <Card>
            <CardTitle>Coste mensual de mantenimiento</CardTitle>
            <BarList data={c.costByMonth} unit="eur" />
            <p className="mt-4 text-[15px] text-muted">Total anual estimado: <strong className="text-text tabular-nums">{fmt(c.annualCostEur)} €</strong> · {c.openOrders} OT abiertas</p>
          </Card>
          <Card>
            <CardTitle>Últimas órdenes de trabajo</CardTitle>
            <ul className="grid gap-2">
              {c.recentOrders.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-bg px-4 py-3">
                  <span><span className="font-bold tabular-nums">{o.id}</span> <span className="text-muted">· {o.title}</span></span>
                  <span className="flex items-center gap-2"><Badge tone={o.status === "Cerrada" ? "ok" : "info"}>{o.status}</Badge><span className="text-sm text-muted">{fmtDate(o.date)}</span></span>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <CardTitle>Ofertas abiertas</CardTitle>
            <ul className="grid gap-2">
              {c.offers.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-bg px-4 py-3">
                  <span><span className="font-bold">{o.title}</span> <span className="text-muted">· {o.id}</span></span>
                  <span className="flex items-center gap-2"><Badge tone="info">{o.stage}</Badge><strong className="tabular-nums">{fmt(o.amountEur)} €</strong></span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="grid content-start gap-4">
          {c.contract && pct !== null ? (
            <Card>
              <CardTitle>Contrato</CardTitle>
              <p className="text-[16px] font-bold">{c.contract.type}</p>
              <div className="mb-1.5 mt-4 flex justify-between text-[14.5px] font-semibold"><span className="text-muted">Horas consumidas</span><span className="tabular-nums">{fmt(c.contract.hoursUsed)} / {fmt(c.contract.hoursBudget)} h</span></div>
              <ProgressBar value={pct} tone={pct >= 90 ? "bad" : pct >= 75 ? "warn" : "primary"} label="Horas consumidas del contrato" hint={HINT.contractBar} />
              <p className="mt-3 text-[14.5px] text-muted">Renovación: <strong className="text-text">{fmtDate(c.contract.renewal)}</strong></p>
            </Card>
          ) : null}
          <Card>
            <CardTitle>Contacto y centros</CardTitle>
            <p className="flex items-center gap-2 text-[16px]"><UserRound className="size-4 text-muted" aria-hidden="true" /><strong>{c.contact.name}</strong><span className="text-muted">· {c.contact.role}</span></p>
            <ul className="mt-3 grid gap-1.5">{c.sites.map((s) => <li key={s} className="flex items-center gap-2 text-[15px] text-muted"><MapPin className="size-4" aria-hidden="true" />{s}</li>)}</ul>
          </Card>
          {c.assets.length ? (
            <Card>
              <CardTitle>Activos</CardTitle>
              <ul className="grid gap-2">{c.assets.map((a) => (
                <li key={a.id}><Link href={`/activos/${a.id}`} className="flex min-h-12 items-center justify-between gap-2 rounded-xl bg-bg px-4 hover:bg-primary-soft"><span className="font-bold">{a.name}</span><StatusPill status={a.status} label={LABEL[a.status]} className="!text-xs" /></Link></li>
              ))}</ul>
            </Card>
          ) : null}
          <Card>
            <CardTitle>Vinculado en</CardTitle>
            <ul className="grid gap-2">{c.links.map((l) => (
              <li key={l.source + l.externalId} className="flex min-h-12 items-center justify-between gap-3 rounded-xl bg-bg px-3.5">
                <span><span className="font-bold">{SOURCE_LABEL[l.source]}</span> <span className="text-muted">· {l.label} · {l.externalId}</span></span>
                <ExternalLink className="size-4 text-muted" aria-label="Abrir en el programa" />
              </li>
            ))}</ul>
            <p className="mt-3 text-sm text-muted">El mismo cliente en tres programas, enlazado sin copiar datos.</p>
          </Card>
        </div>
      </div>
    </>
  );
}
