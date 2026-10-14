import type { Metadata } from "next";
import { Stagger, StatCard } from "@msm/ui";
import { PageHeader } from "@/components/page-header";
import { PipelineView } from "@/components/pipeline-view";
import { getProvider } from "@/lib/data";
import { requireAccess } from "@/lib/session";
import { liveOffers } from "@/lib/live";
import { DataSource } from "@/components/data-source";

export const metadata: Metadata = { title: "Comercial" };

export default async function ComercialPage() {
  const session = await requireAccess("comercial");
  const live = await liveOffers(session);
  const offers = live?.data ?? (await getProvider().listOffers());
  const open = offers.filter((o) => ["borrador", "enviada", "negociacion"].includes(o.stage));
  const weighted = Math.round(open.reduce((s, o) => s + o.amountEur * (o.probability / 100), 0));
  const won = offers.filter((o) => o.stage === "ganada");
  const lost = offers.filter((o) => o.stage === "perdida");
  const winRate = won.length + lost.length ? Math.round((won.length / (won.length + lost.length)) * 100) : 0;

  return (
    <>
      <PageHeader title="Comercial" subtitle="Ofertas y proyectos de Trello. Una oferta ganada genera la orden de trabajo como propuesta" />
      <DataSource source={live?.source ?? null} demoReason="Se mostrarán las ofertas reales cuando Trello esté conectado y el tablero de ofertas configurado en Conexiones." />
      {live && (live.incomplete.length || live.unmappedLists.length) ? (
        <p className="mb-4 rounded-xl bg-warn-soft p-3 text-[14px] text-warn-text">
          {live.incomplete.length ? `${live.incomplete.length} tarjetas no se muestran porque les faltan datos (importe, cliente, probabilidad, responsable o fecha). ` : ""}
          {live.unmappedLists.length ? `Listas sin etapa asignada: ${live.unmappedLists.join(", ")}.` : ""}
        </p>
      ) : null}
      <Stagger className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(min(100%,205px),1fr))] gap-4">
        <StatCard label="Pipeline abierto" value={open.reduce((s, o) => s + o.amountEur, 0)} unit="€" note={`${open.length} ofertas`} />
        <StatCard label="Previsión ponderada" value={weighted} unit="€" note="importe × probabilidad" />
        <StatCard label="Ganadas" value={won.reduce((s, o) => s + o.amountEur, 0)} unit="€" status="ok" />
        <StatCard label="Tasa de éxito" value={winRate} unit="%" note={`${won.length} ganadas · ${lost.length} perdida`} />
      </Stagger>
      <PipelineView offers={offers} />
    </>
  );
}
