import { describe, expect, it } from "vitest";
import { loadConfig } from "./config";

// Valores de relleno generados: no son credenciales reales.
const base = { MSM_ORG_ID: "00000000-0000-4000-8000-000000000001", MSM_GATEWAY_KEY: "k".repeat(48) };
const a3 = { A3_URL: "https://servidor-a3:8443/", A3_USER: "u".repeat(8), A3_PASS: "p".repeat(12) };

describe("configuración del gateway", () => {
  it("sin A3ERP arranca con a3 = null", () => {
    expect(loadConfig(base)).toMatchObject({ ok: true, config: { a3: null } });
  });
  it("valida A3ERP con las reglas del catálogo y normaliza la dirección", () => {
    const r = loadConfig({ ...base, ...a3 });
    expect(r.ok && r.config.a3?.baseUrl).toBe("https://servidor-a3:8443");
  });
  it("rechaza direcciones con ruta o credenciales y no repite valores en los errores", () => {
    const r = loadConfig({ ...base, ...a3, A3_URL: "https://usuario:clave@srv/api" });
    expect(r.ok).toBe(false);
    expect(JSON.stringify(r)).not.toContain(a3.A3_PASS);
    expect(JSON.stringify(r)).not.toContain("clave@");
  });
  it("exige organización y clave de firma suficientes", () => {
    const r = loadConfig({ MSM_ORG_ID: "x", MSM_GATEWAY_KEY: "corta" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors).toHaveLength(2);
  });
  it("datos de A3ERP a medias = error, no arranque silencioso sin A3ERP", () => {
    expect(loadConfig({ ...base, A3_URL: a3.A3_URL }).ok).toBe(false);
  });
});
