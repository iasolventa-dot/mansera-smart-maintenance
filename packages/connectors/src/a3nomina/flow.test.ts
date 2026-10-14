import { describe, expect, it } from "vitest";
import { checkCallback } from "./flow";
import { validateIdToken } from "./oauth";

const UID = "10000000-0000-4000-8000-000000000001";
const ORG = "00000000-0000-4000-8000-000000000001";
const pending = { state: "s".repeat(43), nonce: "n".repeat(43), org: ORG, uid: UID, clientId: "mansera-client", redirectUri: "https://mansera.example/api/oauth/a3nomina/callback" };
const raw = JSON.stringify(pending);
const q = (o: Record<string, string>) => new URLSearchParams(o);
const ctx = { uid: UID, org: ORG };

describe("retorno de Wolters Kluwer (comprobación pura)", () => {
  it("acepta el caso correcto", () => {
    expect(checkCallback(raw, q({ state: pending.state, code: "C" }), ctx)).toMatchObject({ ok: true, code: "C" });
  });
  it("cookie ausente, manipulada o con formato inválido = caducado", () => {
    for (const r of [undefined, "", "{}", "no-json", JSON.stringify({ ...pending, state: "corto" })]) {
      expect(checkCallback(r, q({ state: pending.state, code: "C" }), ctx), String(r)).toEqual({ ok: false, outcome: "caducado" });
    }
  });
  it("state distinto (login CSRF / inyección de código) = caducado", () => {
    expect(checkCallback(raw, q({ state: "x".repeat(43), code: "C" }), ctx)).toEqual({ ok: false, outcome: "caducado" });
    expect(checkCallback(raw, q({ code: "C" }), ctx)).toEqual({ ok: false, outcome: "caducado" });
  });
  it("error= del proveedor solo cuenta con un state válido (un tercero no puede abortar un flujo ajeno)", () => {
    expect(checkCallback(raw, q({ state: pending.state, error: "access_denied" }), ctx)).toEqual({ ok: false, outcome: "denegado" });
    expect(checkCallback(raw, q({ state: "x".repeat(43), error: "access_denied" }), ctx)).toEqual({ ok: false, outcome: "caducado" });
  });
  it("otro usuario u otra organización que la que inició el flujo = caducado", () => {
    expect(checkCallback(raw, q({ state: pending.state, code: "C" }), { ...ctx, uid: "10000000-0000-4000-8000-000000000009" })).toEqual({ ok: false, outcome: "caducado" });
    expect(checkCallback(raw, q({ state: pending.state, code: "C" }), { ...ctx, org: "00000000-0000-4000-8000-000000000009" })).toEqual({ ok: false, outcome: "caducado" });
  });
  it("un state con caracteres multibyte de la misma longitud no rompe (caducado, no excepción)", () => {
    expect(checkCallback(raw, q({ state: "é".repeat(43), code: "C" }), ctx)).toEqual({ ok: false, outcome: "caducado" });
  });
  it("sin código = caducado", () => {
    expect(checkCallback(raw, q({ state: pending.state }), ctx)).toEqual({ ok: false, outcome: "caducado" });
  });
});

describe("id_token (OIDC Core §3.1.3.7)", () => {
  const T = 1_800_000_000_000;
  const jwt = (p: Record<string, unknown>) => `x.${Buffer.from(JSON.stringify(p)).toString("base64url")}.y`;
  const good = { iss: "https://login.wolterskluwer.eu/auth/core", aud: "mansera-client", exp: T / 1000 + 300, nonce: pending.nonce };
  const v = (p: Record<string, unknown>) => validateIdToken(jwt(p), { nonce: pending.nonce, clientId: "mansera-client", now: T });
  it("válido con emisor, audiencia, caducidad y nonce correctos", () => expect(v(good)).toBe(true));
  it("rechaza emisor ajeno, audiencia ajena, caducado o nonce distinto", () => {
    expect(v({ ...good, iss: "https://evil.example/" })).toBe(false);
    expect(v({ ...good, aud: "otro-cliente" })).toBe(false);
    expect(v({ ...good, aud: ["mansera-client", "otro"] })).toBe(false); // varias audiencias sin azp
    expect(v({ ...good, aud: ["mansera-client", "otro"], azp: "mansera-client" })).toBe(true);
    expect(v({ ...good, exp: T / 1000 - 3600 })).toBe(false);
    expect(v({ ...good, nonce: "m".repeat(43) })).toBe(false);
    expect(validateIdToken(undefined, { nonce: pending.nonce, clientId: "mansera-client" })).toBe(false);
  });
});
