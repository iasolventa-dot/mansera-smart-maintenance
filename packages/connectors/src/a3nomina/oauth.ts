import { z } from "zod";
import { ConnectorError, errorFromStatus } from "../errors";
import type { FetchLike } from "../http";

/**
 * OAuth 2.0 de a3innuva Nómina (Wolters Kluwer Account, WKA), según la documentación oficial
 * https://a3developers.wolterskluwer.es/doc/a3innuva-n%C3%B3mina/OAuth/ (consultada el 2026-10-14):
 * - Flujo Authorization Code (el híbrido está deprecado desde mayo de 2025). El usuario inicia sesión con su WKA.
 * - Autorización: GET https://login.wolterskluwer.eu/auth/core/connect/authorize
 * - Token y refresco: POST https://login.wolterskluwer.eu/auth/core/connect/token (x-www-form-urlencoded)
 * - Scope documentado: `offline_access openid IDInfo WK.ES.A3EquipoContex`
 * - Access token: 60 min · refresh token: 30 días · código: un solo uso, 5 min.
 * - Llamadas a la API: `Authorization: Bearer` + `Ocp-Apim-Subscription-Key` (clave de la suscripción Conectia).
 * - `state` y `nonce` obligatorios en la práctica: se validan al volver.
 *
 * ESTADO: piezas puras probadas con respuestas simuladas. Falta la ruta de retorno en la web, que necesita la clave de
 * servicio del servidor para leer el client_secret del Vault (ADR-0013). Sin verificar contra Wolters Kluwer.
 */
export const WKA_AUTHORIZE_URL = "https://login.wolterskluwer.eu/auth/core/connect/authorize";
export const WKA_TOKEN_URL = "https://login.wolterskluwer.eu/auth/core/connect/token";
export const WKA_SCOPE = "offline_access openid IDInfo WK.ES.A3EquipoContex";

const CLIENT_ID = /^[A-Za-z0-9._-]{3,200}$/;
const TIMEOUT_MS = 15_000;

export type AuthorizeParams = { clientId: string; redirectUri: string; state: string; nonce: string };

/** La dirección de retorno debe ser https (documentado); localhost solo se admite en pruebas locales. */
function checkRedirect(uri: string): URL {
  let u: URL;
  try { u = new URL(uri); } catch { throw new ConnectorError("validation", "La dirección de retorno no es válida."); }
  const local = u.protocol === "http:" && u.hostname === "localhost";
  if ((u.protocol !== "https:" && !local) || u.username || u.password || u.hash) {
    throw new ConnectorError("validation", "La dirección de retorno debe ser https (Wolters Kluwer no admite http salvo localhost en pruebas).");
  }
  return u;
}

export function buildAuthorizeUrl(p: AuthorizeParams): string {
  if (!CLIENT_ID.test(p.clientId)) throw new ConnectorError("validation", "El client_id no tiene un formato válido.");
  if (p.state.length < 32 || p.nonce.length < 32) throw new ConnectorError("validation", "state y nonce deben ser aleatorios y largos (≥ 32 caracteres).");
  const u = new URL(WKA_AUTHORIZE_URL);
  u.search = new URLSearchParams({
    client_id: p.clientId,
    response_type: "code",
    redirect_uri: checkRedirect(p.redirectUri).toString(),
    scope: WKA_SCOPE,
    state: p.state,
    nonce: p.nonce,
  }).toString();
  return u.toString();
}

export const TokenResponse = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1).optional(),
  expires_in: z.number().int().positive(),
  token_type: z.string().regex(/^bearer$/i),
  id_token: z.string().optional(),
});
export type Tokens = { accessToken: string; refreshToken: string; expiresAt: number; idToken?: string };

async function tokenRequest(fetchImpl: FetchLike, form: Record<string, string>, now: number, previousRefresh?: string): Promise<Tokens> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    let res: Response;
    try {
      res = await fetchImpl(WKA_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
        body: new URLSearchParams(form).toString(),
        redirect: "error",
        cache: "no-store",
        signal: ctrl.signal,
      });
    } catch {
      throw new ConnectorError("transient", ctrl.signal.aborted ? "Wolters Kluwer tardó demasiado en responder." : "No se pudo contactar con Wolters Kluwer.");
    }
    // 400 en el endpoint de token = código caducado/usado o refresh token inválido: hay que volver a autorizar.
    if (res.status === 400) throw new ConnectorError("auth", "Wolters Kluwer rechazó la autorización (caducada o ya usada). Hay que volver a conectar con la cuenta WKA.");
    if (!res.ok) throw errorFromStatus("Wolters Kluwer", res.status, res.headers.get("retry-after"));
    const parsed = TokenResponse.safeParse(await res.json().catch(() => undefined));
    if (!parsed.success) throw new ConnectorError("validation", "Wolters Kluwer devolvió una respuesta de token inesperada.");
    const t = parsed.data;
    // Al renovar, Wolters Kluwer puede no devolver un refresh token nuevo: se conserva el anterior.
    const refreshToken = t.refresh_token ?? previousRefresh;
    if (!refreshToken) throw new ConnectorError("validation", "Wolters Kluwer no devolvió un refresh token (¿falta offline_access?).");
    return { accessToken: t.access_token, refreshToken, expiresAt: now + t.expires_in * 1000, idToken: t.id_token };
  } finally {
    clearTimeout(timer);
  }
}

export type ClientCredentials = { clientId: string; clientSecret: string };

/** Canjea el código de un solo uso (5 min) por tokens. `redirectUri` debe ser idéntica a la de la autorización. */
export function exchangeCode(c: ClientCredentials, code: string, redirectUri: string, fetchImpl: FetchLike = fetch, now = Date.now()): Promise<Tokens> {
  if (!code || code.length > 2000) throw new ConnectorError("validation", "Código de autorización no válido.");
  return tokenRequest(fetchImpl, { client_id: c.clientId, client_secret: c.clientSecret, code, grant_type: "authorization_code", redirect_uri: checkRedirect(redirectUri).toString() }, now);
}

/** Renueva el access token. Wolters Kluwer puede devolver un refresh token nuevo: hay que guardar SIEMPRE el devuelto. */
export function refreshTokens(c: ClientCredentials, refreshToken: string, fetchImpl: FetchLike = fetch, now = Date.now()): Promise<Tokens> {
  return tokenRequest(fetchImpl, { client_id: c.clientId, client_secret: c.clientSecret, refresh_token: refreshToken, grant_type: "refresh_token" }, now, refreshToken);
}

/** Cabeceras de cada llamada a la API de nómina (documentado). */
export function apiHeaders(accessToken: string, subscriptionKey: string): Record<string, string> {
  if (/[\s"]/.test(accessToken) || /[\s"]/.test(subscriptionKey)) throw new ConnectorError("validation", "Credenciales con formato no válido para una cabecera.");
  return { Authorization: `Bearer ${accessToken}`, "Ocp-Apim-Subscription-Key": subscriptionKey, Accept: "application/json" };
}

/**
 * Valida el id_token según OpenID Connect Core §3.1.3.7. La FIRMA no se verifica aquí: el token llega directamente
 * del endpoint de token por TLS y autenticado con el client_secret, caso en el que el punto 6 permite confiar en la
 * validación TLS del emisor. Sí se comprueban los puntos obligatorios: emisor (2), audiencia (3), caducidad (9) y nonce (11).
 * El emisor exacto no está documentado (se verificará en el spike con /.well-known): se exige el dominio de WKA.
 */
export function validateIdToken(idToken: string | undefined, o: { nonce: string; clientId: string; now?: number }): boolean {
  if (!idToken) return false;
  const part = idToken.split(".")[1];
  if (!part) return false;
  let p: { nonce?: unknown; aud?: unknown; exp?: unknown; iss?: unknown; azp?: unknown };
  try {
    p = JSON.parse(Buffer.from(part.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8")) as typeof p;
  } catch {
    return false;
  }
  const nowSec = Math.floor((o.now ?? Date.now()) / 1000);
  const aud = Array.isArray(p.aud) ? p.aud : [p.aud];
  return (
    typeof p.iss === "string" && p.iss.startsWith("https://login.wolterskluwer.eu/") &&
    aud.includes(o.clientId) &&
    (aud.length === 1 || p.azp === o.clientId) &&
    typeof p.exp === "number" && p.exp > nowSec - 60 &&
    typeof p.nonce === "string" && p.nonce === o.nonce
  );
}

/** Margen de renovación: se renueva 5 min antes de caducar. */
export const needsRefresh = (t: Pick<Tokens, "expiresAt">, now = Date.now()) => now >= t.expiresAt - 5 * 60_000;
