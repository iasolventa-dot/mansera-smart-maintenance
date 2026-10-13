import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Lightbulb, Package, Receipt, Wrench, CalendarCheck, FileText } from "lucide-react";
import { Badge, BarList, Card, CardTitle, EmptyState, SourceChip, StatusPill, fmt } from "@msm/ui";
import { PageHeader, fmtDate } from "@/components/page-header";
import { SOURCE_LABEL } from "@/components/labels";
import { getProvider } from "@/lib/data";
import { requireAccess } from "@/lib/session";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  return { title: `Activo ${id}` };
}

const KIND = {
  averia: { Icon: Wrench, label: "Avería", tone: "bad" },
  preventivo: { Icon: CalendarCheck, label: "Preventivo", tone: "ok" },
  repuesto: { Icon: Package, label: "Repuesto", tone: "info" },
  oferta: { Icon: FileText, label: "Oferta", tone: "info" },
  factura: { Icon: Receipt, label: "Factura", tone: "neutral" },
} as const;

export default async function AssetPage({ params }: Params) {
  await requireAccess("activos");
  const { id } = await params;
  const a = await getProvider().getAsset(decodeURIComponent(id));
  if (!a) notFound();

  return (
    <>
      <Link href="/activos" className="mb-4 inline-flex min-h-12 items-center gap-2 font-bold text-primary-text hover:underline"><ArrowLeft className="size-4" aria-hidden="true" />Activos</Link>
      <PageHeader title={a.name} subtitle={`${a.client} · ${a.site}`} actions={<StatusPill status={a.status} label={a.status === "ok" ? "Sin incidencias" : a.status === "warn" ? "Vigilar" : "Crítico"} className="!px-3.5 !py-2 !text-[15px]" />} />

      {a.insight ? (
        <Card className="mb-6 !border-warn/40 !bg-warn-soft">
          <div className="flex gap-3">
            <Lightbulb className="mt-0.5 size-6 shrink-0 text-warn-text" aria-hidden="true" />
            <div>
              <p className="text-[17px] font-bold text-warn-text">{a.insight.text}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <SourceChip app={SOURCE_LABEL[a.insight.provenance.source]} label={a.insight.provenance.period ?? a.insight.provenance.entity} />
                <Badge tone="neutral">Anomalía · no es una predicción</Badge>
              </div>
              {a.insight.provenance.calc ? <p className="mt-3 text-sm text-warn-text/90"><strong>Cálculo:</strong> {a.insight.provenance.calc}</p> : null}
            </div>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardTitle>Historial</CardTitle>
          {a.timeline.length === 0 ? <EmptyState title="Sin historial en el periodo" description="Cuando haya órdenes o repuestos asociados, aparecerán aquí en orden cronológico." /> : (
            <ol className="relative grid gap-5 border-l-2 border-border pl-6">
              {a.timeline.map((e) => {
                const { Icon, label, tone } = KIND[e.kind];
                return (
                  <li key={e.id} className="relative">
                    <span className="absolute -left-[37px] grid size-8 place-items-center rounded-full border-2 border-border bg-surface text-primary"><Icon className="size-4" aria-hidden="true" /></span>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={tone}>{label}</Badge>
                      <span className="text-sm font-semibold text-muted">{fmtDate(e.date)}</span>
                      {e.costEur ? <span className="ml-auto text-[15px] font-extrabold tabular-nums">{fmt(e.costEur)} €</span> : null}
                    </div>
                    <p className="mt-1 text-[17px] font-bold">{e.title}</p>
                    <p className="text-[15.5px] text-muted">{e.detail}</p>
                    <p className="mt-1.5 text-xs font-bold text-muted">Fuente: {SOURCE_LABEL[e.source]}</p>
                  </li>
                );
              })}
            </ol>
          )}
        </Card>

        <div className="grid content-start gap-4">
          <Card>
            <CardTitle>Datos del activo</CardTitle>
            <dl className="grid grid-cols-2 gap-y-3 text-[15.5px]">
              <dt className="text-muted">Nº de serie</dt><dd className="text-right font-bold">{a.serial}</dd>
              <dt className="text-muted">Instalación</dt><dd className="text-right font-bold">{a.installedYear}</dd>
              <dt className="text-muted">Averías 12 m</dt><dd className="text-right font-bold tabular-nums">{a.failures12m}</dd>
              <dt className="text-muted">Próx. preventivo</dt><dd className="text-right font-bold">{fmtDate(a.nextPreventive)}</dd>
            </dl>
          </Card>
          {a.costByMonth.length ? <Card><CardTitle>Coste mensual</CardTitle><BarList data={a.costByMonth} unit="eur" /></Card> : null}
          <Card>
            <CardTitle>Vinculado en</CardTitle>
            <ul className="grid gap-2">
              {a.links.map((l) => (
                <li key={l.source + l.externalId} className="flex min-h-12 items-center justify-between gap-3 rounded-xl bg-bg px-3.5">
                  <span><span className="font-bold">{SOURCE_LABEL[l.source]}</span> <span className="text-muted">· {l.label}</span></span>
                  <ExternalLink className="size-4 text-muted" aria-label="Abrir en el programa" />
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-muted">Enlazamos, no duplicamos: cada dato sigue viviendo en su programa.</p>
          </Card>
        </div>
      </div>
    </>
  );
}
