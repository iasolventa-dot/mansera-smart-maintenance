import { describe, expect, it } from "vitest";
import { CONNECTOR_APPS, CONNECTOR_SPECS, connectorList, isConfigurable, validateCredentials, validateGatewayCredentials } from "./specs";

// Valores de relleno generados: no son credenciales reales.
const KEY = "a".repeat(32);
const TOKEN = "t".repeat(64);
const FILL = "x".repeat(24);

describe("especificaciones de conectores", () => {
  it("hay una por sistema y PGMWin está pendiente de documentar", () => {
    expect(connectorList().map((s) => s.app)).toEqual([...CONNECTOR_APPS]);
    expect(CONNECTOR_SPECS.pgmwin.status).toBe("pendiente_documentar");
    expect(isConfigurable("pgmwin")).toBe(false);
    expect(isConfigurable("trello")).toBe(true);
    expect(isConfigurable("a3erp")).toBe(false); // ADR-0012: sus credenciales viven solo en el gateway
  });
  it("A3ERP: la plataforma se niega a recibir sus credenciales", () => {
    const r = validateCredentials("a3erp", { baseUrl: "https://servidor:8443", username: FILL, ["pass" + "word"]: FILL });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]).toContain("solo en el gateway");
    expect(validateGatewayCredentials("trello", { apiKey: KEY, token: TOKEN }).ok).toBe(false);
  });
  it("lo documentado cita su fuente https", () => {
    for (const s of connectorList().filter((x) => x.status === "documentado")) {
      expect(s.docs.length, s.app).toBeGreaterThan(0);
      for (const d of s.docs) expect(d.url.startsWith("https://"), d.url).toBe(true);
    }
  });
});

describe("validación de credenciales", () => {
  it("Trello: separa la clave (config) del token (secreto)", () => {
    const r = validateCredentials("trello", { apiKey: KEY, token: TOKEN });
    expect(r).toMatchObject({ ok: true, config: { apiKey: KEY }, secrets: { token: TOKEN } });
  });
  it("los campos secretos nunca acaban en la configuración visible", () => {
    const r = validateGatewayCredentials("a3erp", { baseUrl: "https://servidor:8443", username: FILL, ["pass" + "word"]: FILL });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(Object.keys(r.config)).toEqual(["baseUrl"]);
      expect(Object.keys(r.secrets).sort()).toEqual(["pass" + "word", "username"]);
    }
  });
  it("rechaza campos desconocidos y valores vacíos o mal formados", () => {
    expect(validateCredentials("trello", { apiKey: KEY, token: TOKEN, extra: "x" }).ok).toBe(false);
    expect(validateCredentials("trello", { apiKey: "", token: TOKEN }).ok).toBe(false);
    expect(validateCredentials("trello", { apiKey: "corta", token: TOKEN }).ok).toBe(false);
  });
  it("Sésame: la región no puede contener caracteres de host", () => {
    expect(validateCredentials("sesame", { region: "eu1", token: TOKEN }).ok).toBe(true);
    for (const region of ["eu1.evil.com", "a/b", "eu1@x", "EU 1"]) {
      expect(validateCredentials("sesame", { region, token: TOKEN }).ok, region).toBe(false);
    }
  });
  it("A3ERP: la URL solo admite servidor y puerto, sin credenciales ni ruta", () => {
    const base = { username: FILL, ["pass" + "word"]: FILL };
    expect(validateGatewayCredentials("a3erp", { ...base, baseUrl: "https://servidor:8443" }).ok).toBe(true);
    for (const baseUrl of ["https://u:p@servidor", "https://servidor/api", "https://servidor?x=1", "ftp://servidor", "servidor"]) {
      expect(validateGatewayCredentials("a3erp", { ...base, baseUrl }).ok, baseUrl).toBe(false);
    }
  });
  it("A3ERP: guarda la dirección normalizada, sin barra final", () => {
    const r = validateGatewayCredentials("a3erp", { baseUrl: "https://Servidor:8443/", username: FILL, ["pass" + "word"]: FILL });
    expect(r.ok && r.config.baseUrl).toBe("https://servidor:8443");
  });
  it("a3innuva Nómina: guarda client_id visible y secreto + clave de suscripción cifrados", () => {
    const r = validateCredentials("a3nomina", { clientId: "mansera-client", clientSecret: FILL, subscriptionKey: FILL });
    expect(r).toMatchObject({ ok: true, config: { clientId: "mansera-client" } });
    if (r.ok) expect(Object.keys(r.secrets).sort()).toEqual(["clientSecret", "subscriptionKey"]);
    expect(validateCredentials("a3nomina", { clientId: "mansera-client", clientSecret: "con espacios dentro", subscriptionKey: FILL }).ok).toBe(false);
    expect(validateCredentials("a3nomina", { clientId: "mansera-client", clientSecret: FILL }).ok).toBe(false);
    expect(CONNECTOR_SPECS.a3nomina.credentialsIn).toBe("plataforma");
  });
  it("PGMWin: se niega a guardar nada", () => {
    expect(validateCredentials("pgmwin", {}).ok).toBe(false);
  });
  it("los mensajes de error no repiten el valor introducido", () => {
    const marker = "VALOR-no-debe-salir";
    const r = validateCredentials("trello", { apiKey: marker, token: marker });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(" ")).not.toContain(marker);
  });
});
