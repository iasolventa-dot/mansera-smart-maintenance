import "server-only";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";
import { canPerform } from "@msm/core";
import { ConnectorError, buildAuthorizeUrl, exchangeCode, idTokenNonceMatches } from "@msm/connectors";
import { getSession, realAuthEnabled, type Session } from "./session";
import { adminConfigured, createAdminClient } from "./supabase/admin";
import { createClient } from "./supabase/server";

/**
 * Flujo «Conectar con Wolters Kluwer» de a3innuva Nómina (ADR-0013). Todo en el servidor:
 *  start    → comprueba TI real, genera state + nonce (cookie httpOnly 10 min) y redirige al login de WKA.
 *  callback → comprueba sesión, usuario y state; canjea el código con el client_secret (leído del Vault con la
 *             clave de servicio); comprueba el nonce; guarda el refresh token en el Vault y lo audita.
 * Nunca devuelve ni registra secretos: el navegador solo ve un código de resultado (`?oauth=...`).
 */
const APP = "a3nomina" as const;
const COOKIE = "msm_oauth_a3nomina";
const COOKIE_PATH = "/api/oauth/a3nomina";

export type OAuthOutcome = "ok" | "denegado" | "caducado" | "sin_clave_servicio" | "sin_credenciales" | "sin_permiso" | "error";

const Pending = z.object({ state: z.string().min(32), nonce: z.string().min(32), org: z.uuid(), uid: z.uuid(), redirectUri: z.string().url() });

const random = () => randomBytes(32).toString("base64url");
const sameText = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

async function tiContext(): Promise<{ ok: true; session: Session; orgId: string } | { ok: false; outcome: OAuthOutcome }> {
  const session = await getSession();
  if (!session || !realAuthEnabled()) return { ok: false, outcome: "sin_permiso" };
  if (!canPerform(session.role, "configurarConexiones") || session.realRole !== "ti" || session.role !== "ti" || !session.orgId) {
    return { ok: false, outcome: "sin_permiso" };
  }
  if (!adminConfigured()) return { ok: false, outcome: "sin_clave_servicio" };
  return { ok: true, session, orgId: session.orgId };
}

/** client_id guardado por TI (columna visible de `connections`, leída con la sesión del usuario: pasa por RLS). */
async function storedClientId(orgId: string): Promise<string | null> {
  const { data } = await (await createClient()).from("connections").select("config").eq("org_id", orgId).eq("app", APP).maybeSingle();
  const id = (data?.config as { clientId?: unknown } | null)?.clientId;
  return typeof id === "string" ? id : null;
}

/** Inicio: devuelve la URL a la que redirigir (WKA) o el resultado si no se puede empezar. */
export async function startA3NominaOAuth(origin: string): Promise<{ redirect: string } | { outcome: OAuthOutcome }> {
  const ctx = await tiContext();
  if (!ctx.ok) return { outcome: ctx.outcome };
  const clientId = await storedClientId(ctx.orgId);
  if (!clientId) return { outcome: "sin_credenciales" };
  const pending = { state: random(), nonce: random(), org: ctx.orgId, uid: ctx.session.userId, redirectUri: `${origin}${COOKIE_PATH}/callback` };
  try {
    const url = buildAuthorizeUrl({ clientId, redirectUri: pending.redirectUri, state: pending.state, nonce: pending.nonce });
    (await cookies()).set(COOKIE, JSON.stringify(pending), {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: COOKIE_PATH, maxAge: 600,
    });
    return { redirect: url };
  } catch {
    return { outcome: "error" };
  }
}

/** Retorno desde WKA. */
export async function finishA3NominaOAuth(params: URLSearchParams): Promise<OAuthOutcome> {
  const store = await cookies();
  const raw = store.get(COOKIE)?.value;
  store.delete({ name: COOKIE, path: COOKIE_PATH });

  const ctx = await tiContext();
  if (!ctx.ok) return ctx.outcome;
  if (params.get("error")) return "denegado";

  let pending: z.infer<typeof Pending>;
  try {
    pending = Pending.parse(JSON.parse(raw ?? ""));
  } catch {
    return "caducado"; // sin cookie (más de 10 min, otro navegador) o manipulada
  }
  const state = params.get("state") ?? "";
  const code = params.get("code") ?? "";
  if (!code || !sameText(state, pending.state) || pending.uid !== ctx.session.userId || pending.org !== ctx.orgId) return "caducado";

  try {
    const clientId = await storedClientId(ctx.orgId);
    if (!clientId) return "sin_credenciales";
    const admin = createAdminClient();
    const { data: secretText, error: readErr } = await admin.rpc("connection_read_secret", { p_org: ctx.orgId, p_app: APP });
    if (readErr || typeof secretText !== "string") return "sin_credenciales";
    const secrets = z.object({ clientSecret: z.string().min(1) }).safeParse(JSON.parse(secretText));
    if (!secrets.success) return "sin_credenciales";

    const tokens = await exchangeCode({ clientId, clientSecret: secrets.data.clientSecret }, code, pending.redirectUri);
    if (!idTokenNonceMatches(tokens.idToken, pending.nonce)) return "error";

    const { error: storeErr } = await admin.rpc("connection_store_oauth", { p_org: ctx.orgId, p_app: APP, p_refresh: tokens.refreshToken, p_actor: ctx.session.userId });
    return storeErr ? "error" : "ok";
  } catch (e) {
    // Solo el tipo de error, nunca el contenido (podría incluir datos del proveedor).
    console.error("[oauth a3nomina] fallo:", e instanceof ConnectorError ? e.kind : "inesperado");
    return e instanceof ConnectorError && e.kind === "auth" ? "caducado" : "error";
  }
}
