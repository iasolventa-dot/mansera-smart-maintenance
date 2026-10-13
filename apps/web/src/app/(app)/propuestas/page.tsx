import type { Metadata } from "next";
import { ArrowRight, Check, ShieldCheck, X } from "lucide-react";
import type { Proposal } from "@msm/core";
import { Badge, Button, Card, EmptyState, Item, Stagger } from "@msm/ui";
import { PageHeader, ago } from "@/components/page-header";
import { SOURCE_LABEL } from "@/components/labels";
import { getProvider } from "@/lib/data";
import { applyOverlay } from "@/lib/demo-state";
import { requireAccess } from "@/lib/session";
import { decideProposal } from "../../actions";

export const metadata: Metadata = { title: "Propuestas" };

export default async function PropuestasPage() {
  await requireAccess("propuestas");
  const all = await applyOverlay(await getProvider().listProposals());
  const pending = all.filter((p) => p.status === "pendiente");
  const done = all.filter((p) => p.status !== "pendiente");

  return (
    <>
      <PageHeader title="Propuestas" subtitle="Nada se escribe en tus programas sin que una persona lo apruebe" />
      <p className="mb-6 flex items-start gap-3 rounded-2xl bg-primary-soft p-4 text-[15.5px] font-semibold text-primary-text">
        <ShieldCheck className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        Cada propuesta muestra exactamente qué cambiará en el sistema de destino. Al aprobar queda registrada en la auditoría.
      </p>

      <h2 className="mb-3 text-lg font-extrabold">Pendientes de aprobar ({pending.length})</h2>
      {pending.length === 0 ? <EmptyState title="Todo al día" description="No hay propuestas esperando tu decisión." /> : (
        <Stagger className="mb-8 grid gap-4 xl:grid-cols-2">{pending.map((p) => <Item key={p.id}><ProposalCard p={p} /></Item>)}</Stagger>
      )}

      {done.length ? (
        <>
          <h2 className="mb-3 mt-2 text-lg font-extrabold">Resueltas</h2>
          <div className="grid gap-4 xl:grid-cols-2">{done.map((p) => <ProposalCard key={p.id} p={p} />)}</div>
        </>
      ) : null}
    </>
  );
}

function ProposalCard({ p }: { p: Proposal }) {
  return (
    <Card className="h-full">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge tone="info">{SOURCE_LABEL[p.from]}</Badge><ArrowRight className="size-4 text-muted" aria-hidden="true" /><Badge tone="info">{SOURCE_LABEL[p.to]}</Badge>
        <Badge tone={p.environment === "pruebas" ? "warn" : "bad"}>Entorno de {p.environment}</Badge>
        {p.status !== "pendiente" ? <Badge tone={p.status === "aprobada" ? "ok" : "bad"}>{p.status === "aprobada" ? "Aprobada" : "Rechazada"}</Badge> : null}
      </div>
      <h3 className="text-[18px] font-extrabold leading-snug">{p.title}</h3>
      <p className="mt-1 text-[15.5px] text-muted">{p.summary}</p>
      <p className="mt-1 text-sm text-muted">Creada por {p.createdBy} · {ago(p.createdAt)}</p>

      <div className="mt-4 overflow-hidden rounded-xl border border-border">
        <table className="w-full text-left text-[15px]">
          <caption className="sr-only">Cambios que se aplicarán</caption>
          <thead className="bg-bg text-xs uppercase tracking-wider text-muted">
            <tr><th scope="col" className="px-3 py-2">Campo</th><th scope="col" className="px-3 py-2">Antes</th><th scope="col" className="px-3 py-2">Después</th></tr>
          </thead>
          <tbody>
            {p.diff.map((d) => (
              <tr key={d.field} className="border-t border-border align-top">
                <th scope="row" className="px-3 py-2.5 font-bold">{d.field}</th>
                <td className="px-3 py-2.5 text-muted">{d.before ?? "—"}</td>
                <td className="bg-ok-soft px-3 py-2.5 font-semibold text-ok-text">{d.after}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {p.status === "pendiente" ? (
        <form action={decideProposal} className="mt-4 grid grid-cols-2 gap-3">
          <input type="hidden" name="id" value={p.id} />
          <Button type="submit" name="decision" value="rechazada" variant="secondary" size="lg"><X className="size-5" aria-hidden="true" />Rechazar</Button>
          <Button type="submit" name="decision" value="aprobada" size="lg"><Check className="size-5" aria-hidden="true" />Aprobar</Button>
        </form>
      ) : null}
    </Card>
  );
}
