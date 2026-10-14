import type { Metadata } from "next";
import { CircleCheck, CircleHelp, OctagonAlert, TriangleAlert, type LucideIcon } from "lucide-react";
import type { ConnectionHealth } from "@msm/core";
import { Badge, Card, Item, Stagger, cn } from "@msm/ui";
import { connectorList, type ConnectorApp } from "@msm/core";
import { deleteConnection, loadTrelloStructure, saveConnection, saveTrelloMapping } from "@/app/actions";
import { TrelloMappingForm, type TrelloMappingValue } from "@/components/trello-mapping-form";
import { ConnectionCard, type StoredConnection } from "@/components/connection-card";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, ago } from "@/components/page-header";
import { getProvider } from "@/lib/data";
import { realAuthEnabled, requireAccess } from "@/lib/session";
import { liveHealth } from "@/lib/live";

export const metadata: Metadata = { title: "Conexiones" };

const HEALTH: Record<ConnectionHealth, { label: string; cls: string; Icon: LucideIcon }> = {
  conectado: { label: "Conectado", cls: "bg-ok-soft text-ok-text", Icon: CircleCheck },
  degradado: { label: "Lento", cls: "bg-warn-soft text-warn-text", Icon: TriangleAlert },
  caido: { label: "Sin conexión", cls: "bg-bad-soft text-bad-text", Icon: OctagonAlert },
  pendiente: { label: "Pendiente de configurar", cls: "bg-bg text-muted border border-border", Icon: CircleHelp },
};
const CAP = { verified: { l: "Verificado", t: "ok" }, assumed: { l: "Por verificar", t: "warn" }, "no-go": { l: "No disponible", t: "bad" } } as const;

const OAUTH_MSG: Record<string, { ok: boolean; text: string }> = {
  ok: { ok: true, text: "Conectado con Wolters Kluwer: la autorización se ha guardado cifrada." },
  denegado: { ok: false, text: "Se canceló o denegó la autorización en Wolters Kluwer. No se ha guardado nada." },
  caducado: { ok: false, text: "La autorización caducó o no coincide (más de 10 minutos, otro navegador o código ya usado). Vuelve a pulsar «Conectar»." },
  sin_clave_servicio: { ok: false, text: "Falta la clave de servicio de Supabase en el servidor (variable SUPABASE_SERVICE_ROLE_KEY en Vercel)." },
  sin_credenciales: { ok: false, text: "Faltan las credenciales de a3innuva Nómina: guárdalas antes de conectar." },
  sin_permiso: { ok: false, text: "Solo el perfil de TI puede autorizar conexiones." },
  credenciales_cambiadas: { ok: false, text: "Las credenciales de a3innuva Nómina cambiaron durante la autorización. Vuelve a pulsar «Conectar»." },
  error: { ok: false, text: "No se pudo completar la conexión con Wolters Kluwer. Inténtalo de nuevo o avisa a soporte." },
};

export default async function ConexionesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const oauthMsg = typeof sp.oauth === "string" && Object.hasOwn(OAUTH_MSG, sp.oauth) ? OAUTH_MSG[sp.oauth] : undefined;
  const session = await requireAccess("conexiones");
  const demoConns = await getProvider().getConnections();
  const realConns = await liveHealth(session, demoConns);
  const conns = realConns ?? demoConns;
  const real = realAuthEnabled();
  // Sin Supabase (demostración local) el formulario se puede probar, pero el servidor no guarda nada.
  const canEdit = session.realRole === "ti" && session.role === "ti" && (!real || !!session.orgId);
  const readOnlyReason = session.realRole !== "ti" ? "Solo el perfil de TI puede gestionar las credenciales." : session.role !== "ti" ? "Estás viendo una vista previa: vuelve al perfil de TI para gestionar credenciales." : undefined;
  const stored: Partial<Record<ConnectorApp, StoredConnection>> = {};
  let loadError = false;
  let trelloMapping: TrelloMappingValue | null = null;
  if (real && session.orgId) {
    const { data: ts } = await (await createClient()).from("connector_settings").select("settings").eq("org_id", session.orgId).eq("app", "trello").maybeSingle();
    trelloMapping = (ts?.settings as TrelloMappingValue | undefined) ?? null;
    const { data, error } = await (await createClient()).from("connections").select("app, config, status, last_check_at, last_check_message, updated_at").eq("org_id", session.orgId);
    if (error) loadError = true;
    for (const r of data ?? []) {
      stored[r.app as ConnectorApp] = { config: (r.config ?? {}) as Record<string, string>, status: r.status, lastCheckAt: r.last_check_at, lastCheckMessage: r.last_check_message, updatedAt: r.updated_at };
    }
  }
  return (
    <>
      <PageHeader title="Conexiones" subtitle="Estado de cada aplicación. Si una cae, el resto sigue funcionando y se avisa del dato antiguo" />
      <section aria-labelledby="cred-h" className="mb-8">
        <h2 id="cred-h" className="mb-1 text-[19px] font-extrabold">Credenciales de acceso</h2>
        <p className="mb-4 max-w-3xl text-[15px] text-muted">Datos que MANSERA proporciona para que la plataforma lea de cada aplicación. Las claves se guardan cifradas, no se pueden volver a ver y cada cambio queda en la auditoría. Los sistemas siguen siendo la fuente de verdad: aquí solo se conectan.</p>
        {oauthMsg ? <p role="status" className={cn("mb-4 rounded-xl p-3 text-[15px] font-semibold", oauthMsg.ok ? "bg-ok-soft text-ok-text" : "bg-bad-soft text-bad-text")}>{oauthMsg.text}</p> : null}
        {!real ? <p className="mb-4 rounded-xl bg-warn-soft p-3 text-[15px] font-semibold text-warn-text">Modo demostración: puedes probar el formulario, pero no se guarda ninguna credencial.</p> : null}
        {loadError ? <p role="alert" className="mb-4 rounded-xl bg-bad-soft p-3 text-[15px] font-semibold text-bad-text">No se pudo leer el estado guardado de las conexiones. Las tarjetas pueden mostrar «Sin configurar» aunque haya credenciales; recarga la página o avisa a soporte.</p> : null}
        <div className="grid gap-4 xl:grid-cols-2">
          {connectorList().map((spec) => (
            <ConnectionCard key={spec.app} spec={spec} stored={stored[spec.app] ?? null} canEdit={canEdit} readOnlyReason={readOnlyReason} oauthEnabled={real} save={saveConnection} remove={deleteConnection}>
              {spec.app === "trello" && canEdit && real && stored.trello && ["verificada", "autorizada"].includes(stored.trello.status) ? (
                <TrelloMappingForm initial={trelloMapping} load={loadTrelloStructure} save={saveTrelloMapping} />
              ) : null}
            </ConnectionCard>
          ))}
        </div>
      </section>
      <h2 className="mb-3 text-[19px] font-extrabold">Estado de la sincronización {realConns ? null : <span className="text-[14px] font-normal text-muted">(datos de ejemplo)</span>}</h2>
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
