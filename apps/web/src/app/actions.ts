"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { canPerform, ConnectorAppSchema, homeFor, NewWorkOrderInput, Role, validateCredentials, type CopilotAnswer, type SearchHit } from "@msm/core";
import { ConnectorError, TrelloOfferMapping, createTrelloClient, limiterFor, probeConnection } from "@msm/connectors";
import { getProvider } from "@/lib/data";
import { askAssistantServer, type AssistantResult } from "@/lib/assistant";
import { applyOverlay, recordCreated, recordDecision } from "@/lib/demo-state";
import { createClient } from "@/lib/supabase/server";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";
import { endSession, realAuthEnabled, requireSession, setPreviewRole, startDemoSession } from "@/lib/session";

const Credentials = z.object({ email: z.email().max(200), password: z.string().min(1).max(200) });

/** Login real con Supabase Auth. Mensaje de error genérico (no revela si el correo existe). */
export async function signInWithPassword(formData: FormData): Promise<void> {
  if (!realAuthEnabled()) redirect("/login");
  const parsed = Credentials.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) redirect("/login?error=credenciales");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) redirect("/login?error=credenciales");
  redirect("/");
}

/** Acceso de demostración local (deshabilitado con Supabase y en producción). */
export async function signInDemo(formData: FormData): Promise<void> {
  const role = Role.safeParse(formData.get("role") ?? "direccion");
  if (!role.success) redirect("/login");
  await startDemoSession(role.data);
  redirect(homeFor(role.data));
}

/** Previsualizar el panel de otro rol (solo TI/Dirección y datos de ejemplo). */
export async function switchRole(formData: FormData): Promise<void> {
  const role = Role.safeParse(formData.get("role"));
  if (!role.success) return;
  await setPreviewRole(role.data);
  redirect(homeFor(role.data));
}

export async function signOut(): Promise<void> {
  await endSession();
  redirect("/login");
}

export async function decideProposal(formData: FormData): Promise<void> {
  const session = await requireSession();
  if (!canPerform(session.role, "decidirPropuesta")) return; // permiso en servidor, no solo botón oculto
  const id = String(formData.get("id") ?? "");
  const decision = formData.get("decision") === "aprobada" ? "aprobada" : "rechazada";
  const current = (await applyOverlay(await getProvider().listProposals())).find((p) => p.id === id);
  if (!current || current.status !== "pendiente") return;
  await recordDecision(id, decision, session.name);
  revalidatePath("/propuestas");
}

export type CreateOrderResult = { ok: true; id: string } | { ok: false; error: string };

/** Acción rápida: crea una PROPUESTA de OT (nunca escribe en PGMWin sin aprobación). */
export async function createWorkOrder(input: NewWorkOrderInput): Promise<CreateOrderResult> {
  const session = await requireSession();
  if (!canPerform(session.role, "crearOrden")) return { ok: false, error: "Tu perfil no puede crear órdenes de trabajo." };
  const parsed = NewWorkOrderInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revisa los datos: falta cliente, activo o descripción." };
  const proposal = await getProvider().createWorkOrderProposal(parsed.data, session.name);
  await recordCreated(proposal);
  revalidatePath("/propuestas");
  return { ok: true, id: proposal.id };
}

export async function askCopilot(question: string): Promise<CopilotAnswer> {
  const session = await requireSession();
  if (!canPerform(session.role, "usarCopiloto")) {
    return { answer: "Tu perfil no tiene acceso al Copiloto de IA.", confidence: "baja", sources: [], noData: true };
  }
  const q = question.trim().slice(0, 500);
  return getProvider().askCopilot(q, session.role);
}

export async function searchAll(query: string): Promise<SearchHit[]> {
  const session = await requireSession();
  return getProvider().search(query.slice(0, 80), session.role);
}

/** Asistente de ayuda: la IA (si está activada) responde desde el servidor; si no, el navegador usa el modo guía. */
export async function askAssistant(input: { messages: unknown; panel: string | null }): Promise<AssistantResult> {
  const session = await requireSession();
  return askAssistantServer({ id: session.userId, role: session.role }, input);
}

export type ConnectionResult = { ok: true; message: string; status: "verificada" | "error" | "no_probable" } | { ok: false; error: string };

/** Solo TI de verdad (no una vista previa) y con Supabase real: es donde viven el Vault y la auditoría. */
async function connectionContext(): Promise<{ ok: true; orgId: string } | { ok: false; error: string }> {
  const session = await requireSession();
  if (!realAuthEnabled()) return { ok: false, error: "Modo demostración: no se ha guardado nada. Las credenciales solo se guardan con la base de datos real." };
  const orgId = session.orgId;
  if (!canPerform(session.role, "configurarConexiones") || session.realRole !== "ti" || session.role !== "ti" || !orgId) {
    return { ok: false, error: "Solo el perfil de TI puede gestionar las conexiones." };
  }
  return { ok: true, orgId };
}

/**
 * Guarda las credenciales de una aplicación: valida en servidor (Zod, por sistema), cifra los campos
 * sensibles en Vault, comprueba la conexión (solo lectura) y anota el resultado. NUNCA devuelve ni registra secretos.
 */
export async function saveConnection(appId: string, values: Record<string, unknown>): Promise<ConnectionResult> {
  const session = await requireSession();
  if (!canPerform(session.role, "configurarConexiones")) return { ok: false, error: "Tu perfil no puede gestionar conexiones." };
  const ctx = await connectionContext();
  if (!ctx.ok) return { ok: false, error: ctx.error };
  const app = ConnectorAppSchema.safeParse(appId);
  if (!app.success) return { ok: false, error: "Aplicación desconocida." };
  const checked = validateCredentials(app.data, values && typeof values === "object" ? values : {});
  if (!checked.ok) return { ok: false, error: checked.errors.join(" · ") };

  const supabase = await createClient();
  const { error } = await supabase.rpc("connection_save", { p_org: ctx.orgId, p_app: app.data, p_config: checked.config, p_secrets: JSON.stringify(checked.secrets) });
  if (error) return { ok: false, error: "No se pudo guardar. Inténtalo de nuevo o avisa a soporte." }; // sin detalle: podría contener datos

  const probe = await probeConnection(app.data, checked.config, checked.secrets);
  await supabase.rpc("connection_record_test", { p_org: ctx.orgId, p_app: app.data, p_status: probe.status, p_message: probe.message });
  revalidatePath("/conexiones");
  return { ok: true, message: probe.message, status: probe.status };
}

export async function deleteConnection(appId: string): Promise<ConnectionResult> {
  const session = await requireSession();
  if (!canPerform(session.role, "configurarConexiones")) return { ok: false, error: "Tu perfil no puede gestionar conexiones." };
  const ctx = await connectionContext();
  if (!ctx.ok) return { ok: false, error: ctx.error };
  const app = ConnectorAppSchema.safeParse(appId);
  if (!app.success) return { ok: false, error: "Aplicación desconocida." };
  const { error } = await (await createClient()).rpc("connection_delete", { p_org: ctx.orgId, p_app: app.data });
  if (error) return { ok: false, error: "No se pudo eliminar la conexión." };
  revalidatePath("/conexiones");
  return { ok: true, message: "Credenciales eliminadas.", status: "no_probable" };
}

/* ───────── Configuración del tablero de ofertas de Trello (solo TI; lectura de estructura, sin tarjetas) ───────── */
export type TrelloStructure =
  | { ok: true; boards: { id: string; name: string }[]; lists?: { id: string; name: string }[]; fields?: { id: string; name: string; type: string }[] }
  | { ok: false; error: string };

async function trelloAdminClient(orgId: string) {
  const admin = createAdminClient();
  const { data: conn } = await admin.from("connections").select("config").eq("org_id", orgId).eq("app", "trello").maybeSingle();
  const { data: secret } = await admin.rpc("connection_read_secret", { p_org: orgId, p_app: "trello" });
  const apiKey = (conn?.config as { apiKey?: string } | null)?.apiKey;
  const token = typeof secret === "string" ? (JSON.parse(secret) as { token?: string }).token : undefined;
  if (!apiKey || !token) return null;
  return createTrelloClient({ apiKey, token }, fetch, { limiter: limiterFor("trello", apiKey), retry: { retries: 1 } });
}

/** Lee tableros y, si se indica uno, sus listas y campos personalizados (para elegir el mapeo). */
export async function loadTrelloStructure(boardId?: string): Promise<TrelloStructure> {
  const session = await requireSession();
  if (!canPerform(session.role, "configurarConexiones")) return { ok: false, error: "Tu perfil no puede configurar conexiones." };
  const ctx = await connectionContext();
  if (!ctx.ok) return { ok: false, error: ctx.error };
  if (!adminConfigured()) return { ok: false, error: "Falta la clave de servicio de Supabase en el servidor." };
  try {
    const client = await trelloAdminClient(ctx.orgId);
    if (!client) return { ok: false, error: "Primero guarda las credenciales de Trello." };
    const boards = (await client.boards()).map((b) => ({ id: b.id, name: b.name }));
    if (!boardId) return { ok: true, boards };
    const s = await client.board(boardId);
    return { ok: true, boards, lists: s.lists.map((l) => ({ id: l.id, name: l.name })), fields: s.customFields.map((f) => ({ id: f.id, name: f.name, type: f.type })) };
  } catch (e) {
    return { ok: false, error: e instanceof ConnectorError ? e.message : "No se pudo leer Trello." };
  }
}

/** Guarda el mapeo (validado con Zod y contra la estructura real del tablero). */
export async function saveTrelloMapping(input: unknown): Promise<ConnectionResult> {
  const session = await requireSession();
  if (!canPerform(session.role, "configurarConexiones")) return { ok: false, error: "Tu perfil no puede configurar conexiones." };
  const ctx = await connectionContext();
  if (!ctx.ok) return { ok: false, error: ctx.error };
  const m = TrelloOfferMapping.safeParse(input);
  if (!m.success) return { ok: false, error: "La configuración no es válida." };
  const s = await loadTrelloStructure(m.data.boardId);
  if (!s.ok) return { ok: false, error: s.error };
  const lists = new Set(s.lists?.map((l) => l.id)), fields = new Map(s.fields?.map((f) => [f.id, f.type]));
  if (Object.keys(m.data.stageByList).some((id) => !lists.has(id))) return { ok: false, error: "Hay listas que no pertenecen al tablero." };
  const { amount, probability, client } = m.data.fields;
  if ((amount && fields.get(amount) !== "number") || (probability && fields.get(probability) !== "number")) return { ok: false, error: "Importe y probabilidad deben ser campos de tipo número en Trello." };
  if (client && !fields.has(client)) return { ok: false, error: "El campo de cliente no pertenece al tablero." };
  const { error } = await (await createClient()).rpc("connector_settings_save", { p_org: ctx.orgId, p_app: "trello", p_settings: m.data });
  if (error) return { ok: false, error: "No se pudo guardar la configuración." };
  revalidatePath("/conexiones");
  revalidatePath("/comercial");
  return { ok: true, message: "Tablero de ofertas configurado. Comercial mostrará los datos reales en la próxima visita.", status: "verificada" };
}
