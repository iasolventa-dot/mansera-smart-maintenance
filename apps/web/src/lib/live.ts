import "server-only";
import { z } from "zod";
import { Employee, Offer, Series, canSeeSickLeave, canUseRealData, type Connection, type PeopleOverview } from "@msm/core";
import {
  ConnectorError, TrelloOfferMapping, createSesameClient, createTrelloClient, limiterFor, mapOffers, mapPeople,
  type IncompleteCard,
} from "@msm/connectors";
import type { Session } from "./session";
import { realAuthEnabled } from "./session";
import { adminConfigured, createAdminClient } from "./supabase/admin";

/**
 * Datos REALES de los sistemas de MANSERA para las pantallas, con caché por organización (`connector_snapshots`).
 * - Solo con base de datos real, clave de servicio, organización y permiso de la sección (se comprueba aquí también).
 * - Si la conexión no existe o falla sin caché previa → `null` y la pantalla usa los datos de ejemplo (y lo dice).
 * - Si falla pero hay caché → se sirven los últimos datos con `stale: true` (se avisa de su antigüedad).
 * - Lecturas con cupo por sistema y reintentos de errores transitorios (policy.ts).
 * - Nunca devuelve credenciales; los errores se registran solo por tipo.
 */
export type LiveSource = { app: "sesame" | "trello"; fetchedAt: string; stale: boolean; note?: string };
export type Live<T> = { data: T; source: LiveSource };

const TTL_MS = { people: 5 * 60_000, offers: 10 * 60_000 } as const;
/** Más allá de esto no se sirven datos antiguos (y la purga diaria los borra): docs/14, retención. */
const MAX_STALE_MS = 24 * 60 * 60_000;

type ConnRow = { status: string; config: Record<string, string> };

async function connection(orgId: string, app: string): Promise<ConnRow | null> {
  const { data } = await createAdminClient().from("connections").select("status, config").eq("org_id", orgId).eq("app", app).maybeSingle();
  return data ? { status: String(data.status), config: (data.config ?? {}) as Record<string, string> } : null;
}

async function secrets(orgId: string, app: string): Promise<Record<string, string> | null> {
  const { data, error } = await createAdminClient().rpc("connection_read_secret", { p_org: orgId, p_app: app });
  if (error || typeof data !== "string") return null;
  try {
    return z.record(z.string(), z.string()).parse(JSON.parse(data));
  } catch {
    return null;
  }
}

async function markConnection(orgId: string, app: string, ok: boolean, message: string) {
  await createAdminClient().from("connections")
    .update({ status: ok ? "verificada" : "error", last_check_at: new Date().toISOString(), last_check_message: message.slice(0, 400) })
    .eq("org_id", orgId).eq("app", app);
}

/** Lee de la caché si está fresca; si no, carga, guarda y devuelve. Si la carga falla, sirve la caché antigua avisando. */
async function cached<T>(orgId: string, app: LiveSource["app"], kind: keyof typeof TTL_MS, schema: z.ZodType<T>, load: () => Promise<T>): Promise<Live<T> | null> {
  const admin = createAdminClient();
  const { data: snap } = await admin.from("connector_snapshots").select("payload, fetched_at").eq("org_id", orgId).eq("app", app).eq("kind", kind).maybeSingle();
  const prev = snap ? schema.safeParse(snap.payload) : null;
  const age = snap ? Date.now() - Date.parse(String(snap.fetched_at)) : Infinity;
  if (prev?.success && age < TTL_MS[kind]) return { data: prev.data, source: { app, fetchedAt: String(snap!.fetched_at), stale: false } };
  try {
    const data = await load();
    const fetchedAt = new Date().toISOString();
    await admin.from("connector_snapshots").upsert({ org_id: orgId, app, kind, payload: data as object, fetched_at: fetchedAt });
    await markConnection(orgId, app, true, "Lectura correcta.");
    return { data, source: { app, fetchedAt, stale: false } };
  } catch (e) {
    const kindErr = e instanceof ConnectorError ? e.kind : "inesperado";
    console.error(`[live ${app}/${kind}] fallo:`, kindErr);
    const message = e instanceof ConnectorError ? e.message : "Fallo inesperado al leer.";
    await markConnection(orgId, app, false, message).catch(() => undefined);
    if (prev?.success && age < MAX_STALE_MS) return { data: prev.data, source: { app, fetchedAt: String(snap!.fetched_at), stale: true, note: message } };
    return null;
  }
}

const usable = (s: Session) => realAuthEnabled() && adminConfigured() && Boolean(s.orgId);

/* ───────── Personal ← Sésame ───────── */
const PeopleCache = z.object({ employees: z.array(Employee), hoursByDept: z.array(Series), missingHours: z.array(z.string()) });

export async function livePeople(session: Session): Promise<(Live<PeopleOverview> & { missingHours: number }) | null> {
  if (!usable(session) || !canUseRealData(session.role, session.realRole, "personal")) return null;
  const orgId = session.orgId!;
  const conn = await connection(orgId, "sesame");
  if (!conn || conn.status === "sin_probar") return null;
  const r = await cached(orgId, "sesame", "people", PeopleCache, async () => {
    const s = await secrets(orgId, "sesame");
    if (!s?.token || !conn.config.region) throw new ConnectorError("auth", "Faltan las credenciales de Sésame HR.");
    const client = createSesameClient({ region: conn.config.region, token: s.token }, fetch, { limiter: limiterFor("sesame", orgId), retry: { retries: 2 } });
    const p = mapPeople(await client.snapshot());
    return { employees: p.employees, hoursByDept: p.hoursByDept, missingHours: p.missingHours };
  });
  if (!r) return null;
  // El histórico mensual de absentismo no se calcula aún (necesita un año de ausencias): se muestra como «sin dato».
  // La baja individual es dato de salud: fuera de RR. HH. se muestra como «ausente» (se filtra al servir, no en la caché).
  const employees = canSeeSickLeave(session.realRole) ? r.data.employees : r.data.employees.map((e) => (e.today === "baja" ? { ...e, today: "ausente" as const } : e));
  return { data: { employees, hoursByDept: r.data.hoursByDept, absenceByMonth: [] }, source: r.source, missingHours: r.data.missingHours.length };
}

/* ───────── Comercial ← Trello ───────── */
const OffersCache = z.object({
  offers: z.array(Offer),
  incomplete: z.array(z.object({ cardId: z.string(), title: z.string(), url: z.string(), missing: z.array(z.string()) })),
  unmappedLists: z.array(z.string()),
});

export async function liveOffers(session: Session): Promise<(Live<Offer[]> & { incomplete: IncompleteCard[]; unmappedLists: string[] }) | null> {
  if (!usable(session) || !canUseRealData(session.role, session.realRole, "comercial")) return null;
  const orgId = session.orgId!;
  const conn = await connection(orgId, "trello");
  if (!conn || conn.status === "sin_probar") return null;
  const { data: settings } = await createAdminClient().from("connector_settings").select("settings").eq("org_id", orgId).eq("app", "trello").maybeSingle();
  const mapping = TrelloOfferMapping.safeParse(settings?.settings);
  if (!mapping.success) return null; // falta configurar el tablero de ofertas (Conexiones)
  const r = await cached(orgId, "trello", "offers", OffersCache, async () => {
    const s = await secrets(orgId, "trello");
    if (!s?.token || !conn.config.apiKey) throw new ConnectorError("auth", "Faltan las credenciales de Trello.");
    const client = createTrelloClient({ apiKey: conn.config.apiKey, token: s.token }, fetch, { limiter: limiterFor("trello", `${orgId}:${conn.config.apiKey}`), retry: { retries: 2 } });
    const m = mapOffers(await client.board(mapping.data.boardId), mapping.data);
    return { offers: m.offers, incomplete: m.incomplete, unmappedLists: m.unmappedLists };
  });
  return r ? { data: r.data.offers, source: r.source, incomplete: r.data.incomplete, unmappedLists: r.data.unmappedLists } : null;
}

/* ───────── Estado real de las conexiones (Conexiones) ───────── */

const HEALTH: Record<string, Connection["health"]> = { verificada: "conectado", error: "caido" };

/**
 * Estado de cada conexión a partir de lo REAL: estado guardado, último mensaje y última lectura en caché.
 * Las capacidades se muestran todas «por verificar» hasta los spikes (nada se marca verificado sin evidencia).
 */
export async function liveHealth(session: Session, demo: Connection[]): Promise<Connection[] | null> {
  if (!usable(session) || !canUseRealData(session.role, session.realRole, "conexiones")) return null;
  const admin = createAdminClient();
  const [{ data: rows }, { data: snaps }] = await Promise.all([
    admin.from("connections").select("app, status, last_check_message").eq("org_id", session.orgId!),
    admin.from("connector_snapshots").select("app, fetched_at").eq("org_id", session.orgId!),
  ]);
  const last = new Map<string, string>();
  for (const s of snaps ?? []) if (!last.has(s.app) || String(s.fetched_at) > last.get(s.app)!) last.set(s.app, String(s.fetched_at));
  return demo.map((c) => {
    const row = rows?.find((r) => r.app === c.source);
    return {
      ...c,
      health: (row && HEALTH[row.status]) || "pendiente",
      lastSyncAt: last.get(c.source),
      latencyMs: undefined,
      note: row?.last_check_message ?? (c.transport === "gateway" ? "Pendiente del gateway en la red de MANSERA." : "Sin credenciales guardadas."),
      capabilities: c.capabilities.map((k) => ({ ...k, state: k.state === "no-go" ? "no-go" : "assumed" })),
    };
  });
}
