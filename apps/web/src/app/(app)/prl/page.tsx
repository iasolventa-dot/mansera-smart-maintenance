import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { Badge, BarList, Card, CardTitle, Item, ProgressBar, Stagger, StatCard, StatusPill } from "@msm/ui";
import { PageHeader } from "@/components/page-header";
import { getProvider } from "@/lib/data";
import { requireAccess } from "@/lib/session";

export const metadata: Metadata = { title: "PRL y CAE" };
const LABEL = { ok: "Vigente", warn: "Próxima", bad: "Urgente" } as const;
const CENTER = { ok: "Documentación completa", warn: "Faltan documentos", bad: "Riesgo de bloqueo" } as const;

const days = (iso: string) => Math.round((new Date(iso).getTime() - new Date(new Date().toISOString().slice(0, 10)).getTime()) / 86_400_000);
const dueText = (iso: string) => { const d = days(iso); return d <= 0 ? "caducada" : d === 1 ? "mañana" : `en ${d} días`; };

export default async function PrlPage() {
  await requireAccess("prl");
  const p = await getProvider().getPrl();
  const accs = [...p.accreditations].sort((a, b) => a.expires.localeCompare(b.expires));
  const urgent = accs.filter((a) => a.status === "bad").length;
  const soon = accs.filter((a) => a.status !== "ok").length;
  const docsOk = p.centers.reduce((t, c) => t + c.docsOk, 0);
  const docsTotal = p.centers.reduce((t, c) => t + c.docsTotal, 0);

  return (
    <>
      <PageHeader title="PRL y CAE" subtitle="Acreditaciones del personal y documentación de acceso a los centros de cliente" />
      <Stagger className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(min(100%,205px),1fr))] gap-4">
        <StatCard label="Caducan en 15 días" value={urgent} status={urgent ? "bad" : undefined} note="riesgo de perder acceso" />
        <StatCard label="Por vencer (45 días)" value={soon} status={soon ? "warn" : undefined} />
        <StatCard label="Centros con acceso" value={p.centers.length} note={`${p.centers.filter((c) => c.status === "bad").length} en riesgo`} />
        <StatCard label="Documentación al día" value={Math.round((docsOk / docsTotal) * 100)} unit="%" note={`${docsOk} de ${docsTotal} documentos`} />
      </Stagger>

      <Card className="mb-6 !border-primary/30 !bg-primary-soft">
        <div className="flex flex-wrap items-center gap-4">
          <span className="grid size-12 place-items-center rounded-xl bg-primary text-white"><Sparkles className="size-6" aria-hidden="true" /></span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[17.5px] font-extrabold text-primary-text">Pack Mi PRL · subida automática a plataformas CAE</h2>
            <p className="text-[15px] text-primary-text/90">Detecta qué documento exige cada plataforma, lo prepara con los datos de la plantilla y avisa antes del día 1 de cada mes. Una persona lo revisa antes de enviarlo.</p>
          </div>
          <Badge tone="info">Próximo módulo</Badge>
        </div>
      </Card>

      <div className="mb-6 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardTitle>Acreditaciones por caducidad</CardTitle>
          <ul className="grid gap-2.5">
            {accs.map((a) => (
              <li key={a.id} className="flex flex-col gap-2 rounded-xl bg-bg p-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="text-[16.5px] font-extrabold leading-snug">{a.employee} <span className="font-semibold text-muted">· {a.course}</span></p>
                  <p className="text-[14px] text-muted">Acceso a: {a.centers.join(", ")}</p>
                </div>
                <div className="flex items-center gap-3"><span className="text-[14px] font-bold tabular-nums">{dueText(a.expires)}</span><StatusPill status={a.status} label={LABEL[a.status]} className="!text-xs" /></div>
              </li>
            ))}
          </ul>
        </Card>
        <Card><CardTitle>Vencimientos previstos por mes</CardTitle><BarList data={p.expiringByMonth} unit="num" /></Card>
      </div>

      <h2 className="mb-3 text-lg font-extrabold">Centros de trabajo y plataformas CAE</h2>
      <Stagger className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {p.centers.map((c) => (
          <Item key={c.id}>
            <article className="flex h-full flex-col gap-3 rounded-2xl border border-border bg-surface p-5">
              <StatusPill status={c.status} label={CENTER[c.status]} className="w-fit !text-xs" />
              <div><h3 className="text-[17.5px] font-extrabold leading-snug">{c.center}</h3><p className="text-[14.5px] text-muted">{c.platform}</p></div>
              <div className="mt-auto">
                <div className="mb-1.5 flex justify-between text-[14px] font-semibold"><span className="text-muted">Documentos</span><span className="tabular-nums">{c.docsOk} / {c.docsTotal}</span></div>
                <ProgressBar value={c.docsOk} max={c.docsTotal} tone={c.status === "ok" ? "ok" : c.status} label={`Documentación de ${c.center}`} />
                <p className="mt-2 text-[13.5px] text-muted">Próximo plazo: {dueText(c.nextDeadline)}</p>
              </div>
            </article>
          </Item>
        ))}
      </Stagger>
    </>
  );
}
