import type { Metadata } from "next";
import { pipelineKpis, plural } from "@msm/core";
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
  const k = pipelineKpis(offers);

  return (
    <>
      <PageHeader title="Comercial" subtitle="Ofertas y proyectos de Trello. Previsto: que una oferta ganada proponga la orden de trabajo (aún no disponible)" />
      <DataSource source={live?.source ?? null} demoReason="Se mostrarán las ofertas reales cuando Trello esté conectado y el tablero de ofertas configurado en Conexiones." />
      {live && (live.incomplete.length || live.unmappedLists.length) ? (
        <p className="mb-4 rounded-xl bg-warn-soft p-3 text-[14px] text-warn-text">
          {live.incomplete.length ? `${live.incomplete.length} tarjetas no se muestran porque les faltan datos (importe, cliente, probabilidad, responsable o fecha). ` : ""}
          {live.unmappedLists.length ? `Listas sin etapa asignada: ${live.unmappedLists.join(", ")}.` : ""}
        </p>
      ) : null}
      <Stagger className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(min(100%,205px),1fr))] gap-4">
        <StatCard label="Pipeline abierto" value={k.openAmount} unit="€" note={plural(k.openCount, "oferta", "ofertas")} />
        <StatCard label="Previsión ponderada" value={k.weighted} unit="€" note="importe × probabilidad" />
        <StatCard label="Ganadas" value={k.wonAmount} unit="€" status="ok" />
        <StatCard label="Tasa de éxito" value={k.winRate} unit="%" note={k.winRate === null ? "sin ofertas cerradas" : `${plural(k.won, "ganada", "ganadas")} · ${plural(k.lost, "perdida", "perdidas")}`} />
      </Stagger>
      <PipelineView offers={offers} />
    </>
  );
}
