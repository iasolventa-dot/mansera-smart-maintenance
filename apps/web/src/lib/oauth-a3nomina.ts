import "server-only";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";
import { canPerform } from "@msm/core";
import { ConnectorError, buildAuthorizeUrl, checkCallback, exchangeCode, validateIdToken } from "@msm/connectors";
import { getSession, realAuthEnabled, type Session } from "./session";
import { adminConfigured, createAdminClient } from "./supabase/admin";
import { createClient } from "./supabase/server";

/**
 * Flujo «Conectar con Wolters Kluwer» de a3innuva Nómina (ADR-0013). Todo en el servidor:
 *  start    (POST desde la propia aplicación) → TI real; state + nonce + client_id en una cookie httpOnly de 10 min → login WKA.
 *  callback → comprueba state, usuario y organización (checkCallback); canjea el código con el client_secret leído del Vault
 *             con la clave de servicio; valida el id_token (emisor, audiencia, caducidad, nonce); guarda el refresh token
 *             atado al client_id usado (si TI cambió las credenciales entre medias, se rechaza). Fallos auditados.
 * El navegador solo ve un código de resultado (`?oauth=...`); nunca secretos.
 */
const APP = "a3nomina" as const;
const SECURE = process.env.NODE_ENV === "production";
/** `__Host-` impide que un subdominio hermano fije la cookie (exige Secure y path=/). En local no hay https. */
const COOKIE = SECURE ? "__Host-msm_oauth_a3nomina" : "msm_oauth_a3nomina";

export type OAuthOutcome = "ok" | "denegado" | "caducado" | "sin_clave_servicio" | "sin_credenciales" | "sin_permiso" | "credenciales_cambiadas" | "error";

const random = () => randomBytes(32).toString("base64url");

/** Origen público fijo si existe (`APP_URL`); si no, el de la petición. Wolters Kluwer solo acepta direcciones registradas. */
export const appOrigin = (requestOrigin: string) => {
  const fixed = process.env.APP_URL;
  try {
    return fixed ? new URL(fixed).origin : requestOrigin;
  } catch {
    return requestOrigin;
  }
};

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

async function audit(orgId: string, uid: string, outcome: OAuthOutcome | "id_token_invalido") {
  try {
    await createAdminClient().rpc("connection_audit_oauth", { p_org: orgId, p_app: APP, p_actor: uid, p_outcome: outcome });
  } catch {
    // La auditoría de un intento fallido no debe ocultar el resultado al usuario.
  }
}

/** Inicio: devuelve la URL a la que redirigir (WKA) o el resultado si no se puede empezar. */
export async function startA3NominaOAuth(origin: string): Promise<{ redirect: string } | { outcome: OAuthOutcome }> {
  const ctx = await tiContext();
  if (!ctx.ok) return { outcome: ctx.outcome };
  const clientId = await storedClientId(ctx.orgId);
  if (!clientId) return { outcome: "sin_credenciales" };
  const pending = { state: random(), nonce: random(), org: ctx.orgId, uid: ctx.session.userId, clientId, redirectUri: `${origin}/api/oauth/a3nomina/callback` };
  try {
    const url = buildAuthorizeUrl({ clientId, redirectUri: pending.redirectUri, state: pending.state, nonce: pending.nonce });
    (await cookies()).set(COOKIE, JSON.stringify(pending), { httpOnly: true, secure: SECURE, sameSite: "lax", path: "/", maxAge: 600 });
    return { redirect: url };
  } catch {
    return { outcome: "error" };
  }
}

/** Retorno desde WKA. */
export async function finishA3NominaOAuth(params: URLSearchParams): Promise<OAuthOutcome> {
  const store = await cookies();
  const raw = store.get(COOKIE)?.value;
  store.delete({ name: COOKIE, path: "/" });

  const ctx = await tiContext();
  if (!ctx.ok) return ctx.outcome;
  const check = checkCallback(raw, params, { uid: ctx.session.userId, org: ctx.orgId });
  if (!check.ok) {
    await audit(ctx.orgId, ctx.session.userId, check.outcome);
    return check.outcome;
  }
  const { pending, code } = check;

  try {
    if ((await storedClientId(ctx.orgId)) !== pending.clientId) {
      await audit(ctx.orgId, ctx.session.userId, "credenciales_cambiadas");
      return "credenciales_cambiadas";
    }
    const admin = createAdminClient();
    const { data: secretText, error: readErr } = await admin.rpc("connection_read_secret", { p_org: ctx.orgId, p_app: APP });
    if (readErr || typeof secretText !== "string") return "sin_credenciales";
    const secrets = z.object({ clientSecret: z.string().min(1) }).safeParse(JSON.parse(secretText));
    if (!secrets.success) return "sin_credenciales";

    const tokens = await exchangeCode({ clientId: pending.clientId, clientSecret: secrets.data.clientSecret }, code, pending.redirectUri);
    if (!validateIdToken(tokens.idToken, { nonce: pending.nonce, clientId: pending.clientId })) {
      await audit(ctx.orgId, ctx.session.userId, "id_token_invalido");
      return "error";
    }
    const { error: storeErr } = await admin.rpc("connection_store_oauth", {
      p_org: ctx.orgId, p_app: APP, p_client_id: pending.clientId, p_refresh: tokens.refreshToken, p_actor: ctx.session.userId,
    });
    if (storeErr) {
      const changed = storeErr.message?.includes("han cambiado");
      await audit(ctx.orgId, ctx.session.userId, changed ? "credenciales_cambiadas" : "error");
      return changed ? "credenciales_cambiadas" : "error";
    }
    return "ok";
  } catch (e) {
    // Solo el tipo de error, nunca el contenido (podría incluir datos del proveedor).
    console.error("[oauth a3nomina] fallo:", e instanceof ConnectorError ? e.kind : "inesperado");
    const outcome: OAuthOutcome = e instanceof ConnectorError && e.kind === "auth" ? "caducado" : "error";
    await audit(ctx.orgId, ctx.session.userId, outcome);
    return outcome;
  }
}
