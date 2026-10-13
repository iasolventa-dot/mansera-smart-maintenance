import type { Metadata } from "next";
import { CircleCheck, CircleHelp, OctagonAlert, TriangleAlert, type LucideIcon } from "lucide-react";
import type { ConnectionHealth } from "@msm/core";
import { Badge, Card, Item, Stagger, cn } from "@msm/ui";
import { PageHeader, ago } from "@/components/page-header";
import { getProvider } from "@/lib/data";
import { requireAccess } from "@/lib/session";

export const metadata: Metadata = { title: "Conexiones" };

const HEALTH: Record<ConnectionHealth, { label: string; cls: string; Icon: LucideIcon }> = {
  conectado: { label: "Conectado", cls: "bg-ok-soft text-ok-text", Icon: CircleCheck },
  degradado: { label: "Lento", cls: "bg-warn-soft text-warn-text", Icon: TriangleAlert },
  caido: { label: "Sin conexión", cls: "bg-bad-soft text-bad-text", Icon: OctagonAlert },
  pendiente: { label: "Pendiente de configurar", cls: "bg-bg text-muted border border-border", Icon: CircleHelp },
};
const CAP = { verified: { l: "Verificado", t: "ok" }, assumed: { l: "Por verificar", t: "warn" }, "no-go": { l: "No disponible", t: "bad" } } as const;

export default async function ConexionesPage() {
  await requireAccess("conexiones");
  const conns = await getProvider().getConnections();
  return (
    <>
      <PageHeader title="Conexiones" subtitle="Estado de cada aplicación. Si una cae, el resto sigue funcionando y se avisa del dato antiguo" />
      <Stagger className="grid gap-4 xl:grid-cols-2">
        {conns.map((c) => {
          const h = HEALTH[c.health];
          return (
            <Item key={c.source}>
              <Card className="h-full">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-[21px] font-extrabold">{c.name}</h2>
                    <p className="text-sm text-muted">{c.transport === "gateway" ? "Vía gateway en la red de MANSERA" : "Conexión directa a la nube"}</p>
                  </div>
                  <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[14px] font-bold", h.cls)}><h.Icon className="size-4" aria-hidden="true" />{h.label}</span>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-[15px]">
                  <div className="rounded-xl bg-bg p-3"><dt className="text-[13px] text-muted">Última sincronización</dt><dd className="font-extrabold">{ago(c.lastSyncAt)}</dd></div>
                  <div className="rounded-xl bg-bg p-3"><dt className="text-[13px] text-muted">Latencia</dt><dd className="font-extrabold tabular-nums">{c.latencyMs ? `${c.latencyMs} ms` : "—"}</dd></div>
                </dl>
                {c.note ? <p className="mt-3 text-[15px] font-semibold text-muted">{c.note}</p> : null}
                <h3 className="mb-2 mt-4 text-xs font-bold uppercase tracking-wider text-muted">Capacidades</h3>
                <ul className="flex flex-wrap gap-2">{c.capabilities.map((k) => <li key={k.name}><Badge tone={CAP[k.state].t}>{k.name} · {CAP[k.state].l}</Badge></li>)}</ul>
              </Card>
            </Item>
          );
        })}
      </Stagger>
    </>
  );
}
