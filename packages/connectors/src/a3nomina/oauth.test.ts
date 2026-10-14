import { describe, expect, it, vi } from "vitest";
import { ConnectorError } from "../errors";
import { WKA_SCOPE, apiHeaders, buildAuthorizeUrl, exchangeCode, needsRefresh, refreshTokens } from "./oauth";

// Valores de relleno generados: no son credenciales reales.
const client = { clientId: "mansera-client", clientSecret: "s".repeat(24) };
const STATE = "a".repeat(40), NONCE = "b".repeat(40);
const REDIRECT = "https://mansera.example/api/oauth/a3nomina/callback";
const T = 1_800_000_000_000;
const tokenReply = (status = 200, body: unknown = { access_token: "AT", refresh_token: "RT2", expires_in: 3600, token_type: "Bearer", id_token: "ID" }) =>
  vi.fn(async (_u: string, _i?: RequestInit) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }));

describe("a3innuva Nómina · OAuth (WKA)", () => {
  it("construye la URL de autorización documentada (Authorization Code, scope, state y nonce)", () => {
    const u = new URL(buildAuthorizeUrl({ clientId: client.clientId, redirectUri: REDIRECT, state: STATE, nonce: NONCE }));
    expect(`${u.origin}${u.pathname}`).toBe("https://login.wolterskluwer.eu/auth/core/connect/authorize");
    expect(Object.fromEntries(u.searchParams)).toEqual({ client_id: "mansera-client", response_type: "code", redirect_uri: REDIRECT, scope: WKA_SCOPE, state: STATE, nonce: NONCE });
    expect(u.toString()).not.toContain(client.clientSecret);
  });
  it("exige https en la dirección de retorno (salvo localhost) y state/nonce largos", () => {
    for (const redirectUri of ["http://mansera.example/cb", "http://127.0.0.1:3000/cb", "https://user:pass@x.example/cb", "nota-una-url"]) {
      expect(() => buildAuthorizeUrl({ clientId: client.clientId, redirectUri, state: STATE, nonce: NONCE }), redirectUri).toThrow(ConnectorError);
    }
    expect(() => buildAuthorizeUrl({ clientId: client.clientId, redirectUri: "http://localhost:53971/Login/CallbackFromWKA", state: STATE, nonce: NONCE })).not.toThrow();
    expect(() => buildAuthorizeUrl({ clientId: client.clientId, redirectUri: REDIRECT, state: "corto", nonce: NONCE })).toThrow(ConnectorError);
  });
  it("canjea el código por POST form-urlencoded al endpoint de token y calcula la caducidad", async () => {
    const f = tokenReply();
    const t = await exchangeCode(client, "CODIGO", REDIRECT, f, T);
    expect(t).toEqual({ accessToken: "AT", refreshToken: "RT2", expiresAt: T + 3_600_000, idToken: "ID" });
    const [url, init] = f.mock.calls[0]!;
    expect(url).toBe("https://login.wolterskluwer.eu/auth/core/connect/token");
    expect(init!.method).toBe("POST");
    expect(Object.fromEntries(new URLSearchParams(String(init!.body)))).toEqual({ client_id: "mansera-client", client_secret: client.clientSecret, code: "CODIGO", grant_type: "authorization_code", redirect_uri: REDIRECT });
    expect(init!.redirect).toBe("error");
  });
  it("renueva con refresh_token y devuelve el refresh token NUEVO", async () => {
    const f = tokenReply();
    const t = await refreshTokens(client, "RT1", f, T);
    expect(t.refreshToken).toBe("RT2");
    expect(new URLSearchParams(String(f.mock.calls[0]![1]!.body)).get("grant_type")).toBe("refresh_token");
  });
  it("código caducado o refresh token inválido (400) = volver a conectar; errores sin secretos", async () => {
    const err = await refreshTokens(client, "RT1", tokenReply(400, { error: "invalid_grant" }), T).catch((e: unknown) => e);
    expect(err).toMatchObject({ kind: "auth" });
    expect(JSON.stringify({ m: (err as Error).message })).not.toContain(client.clientSecret);
    await expect(exchangeCode(client, "C", REDIRECT, tokenReply(200, { nada: 1 }), T)).rejects.toMatchObject({ kind: "validation" });
    await expect(exchangeCode(client, "C", REDIRECT, tokenReply(503), T)).rejects.toMatchObject({ kind: "transient" });
  });
  it("cabeceras de la API: Bearer + Ocp-Apim-Subscription-Key; renovación 5 min antes", () => {
    expect(apiHeaders("AT", "SUBKEY")).toMatchObject({ Authorization: "Bearer AT", "Ocp-Apim-Subscription-Key": "SUBKEY" });
    expect(() => apiHeaders("A T", "K")).toThrow(ConnectorError);
    expect(needsRefresh({ expiresAt: T + 4 * 60_000 }, T)).toBe(true);
    expect(needsRefresh({ expiresAt: T + 30 * 60_000 }, T)).toBe(false);
  });
});
