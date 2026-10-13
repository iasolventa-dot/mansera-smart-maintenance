import type { Metadata } from "next";
import { Stagger, StatCard } from "@msm/ui";
import { PageHeader } from "@/components/page-header";
import { PipelineView } from "@/components/pipeline-view";
import { getProvider } from "@/lib/data";
import { requireAccess } from "@/lib/session";

export const metadata: Metadata = { title: "Comercial" };

export default async function ComercialPage() {
  await requireAccess("comercial");
  const offers = await getProvider().listOffers();
  const open = offers.filter((o) => ["borrador", "enviada", "negociacion"].includes(o.stage));
  const weighted = Math.round(open.reduce((s, o) => s + o.amountEur * (o.probability / 100), 0));
  const won = offers.filter((o) => o.stage === "ganada");
  const lost = offers.filter((o) => o.stage === "perdida");
  const winRate = won.length + lost.length ? Math.round((won.length / (won.length + lost.length)) * 100) : 0;

  return (
    <>
      <PageHeader title="Comercial" subtitle="Ofertas y proyectos de Trello. Una oferta ganada genera la orden de trabajo como propuesta" />
      <Stagger className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(min(100%,205px),1fr))] gap-4">
        <StatCard label="Pipeline abierto" value={open.reduce((s, o) => s + o.amountEur, 0)} unit="€" note={`${open.length} ofertas`} />
        <StatCard label="Previsión ponderada" value={weighted} unit="€" note="importe × probabilidad" />
        <StatCard label="Ganadas (30 días)" value={won.reduce((s, o) => s + o.amountEur, 0)} unit="€" status="ok" />
        <StatCard label="Tasa de éxito" value={winRate} unit="%" note={`${won.length} ganadas · ${lost.length} perdida`} />
      </Stagger>
      <PipelineView offers={offers} />
    </>
  );
}
