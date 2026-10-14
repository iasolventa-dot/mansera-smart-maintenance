import { describe, expect, it, vi } from "vitest";
import { createJob, verifyResult } from "@msm/connectors";
import { createRunner, type GatewayConfig } from "./runner";

// Valores generados: no son credenciales reales.
const KEY = "k".repeat(48);
const ORG = "00000000-0000-4000-8000-000000000001";
const cfg: GatewayConfig = { orgId: ORG, signingKey: KEY, a3: { baseUrl: "http://a3.local:5000", username: "u".repeat(8), password: "p".repeat(12) } };
const T = 1_800_000_000_000;
const reply = (status: number) => vi.fn(async (_u: string, _i?: RequestInit) => new Response("{\"token\":\"NO-DEBE-SALIR\"}", { status }));

describe("runner del gateway", () => {
  it("ejecuta health y devuelve un resultado firmado", async () => {
    const f = reply(401);
    const out = await createRunner(cfg, f)(createJob({ orgId: ORG, op: "a3erp.health" }, KEY, T), T + 100);
    expect("result" in out && verifyResult(out, KEY)).toBe(true);
    expect("result" in out && out.result.ok).toBe(true);
    expect(f.mock.calls[0]![0]).toBe("http://a3.local:5000/api");
  });
  it("login_check usa Basic y NUNCA devuelve el token ni la contraseña", async () => {
    const f = reply(200);
    const out = await createRunner(cfg, f)(createJob({ orgId: ORG, op: "a3erp.login_check" }, KEY, T), T + 100);
    expect(JSON.stringify(out)).not.toContain("NO-DEBE-SALIR");
    expect(JSON.stringify(out)).not.toContain(cfg.a3!.password);
    expect(String((f.mock.calls[0]![1] as RequestInit).headers && ((f.mock.calls[0]![1] as RequestInit).headers as Record<string, string>).Authorization)).toMatch(/^Basic /);
  });
  it("si A3ERP está caído devuelve error controlado, no excepción", async () => {
    const down = vi.fn(async (_u: string, _i?: RequestInit): Promise<Response> => { throw new TypeError("ECONNREFUSED"); });
    const out = await createRunner(cfg, down)(createJob({ orgId: ORG, op: "a3erp.health" }, KEY, T), T + 100);
    expect("result" in out && out.result).toMatchObject({ ok: false, status: "error" });
  });
  it("descarta trabajos falsificados, repetidos, caducados o de otra operación sin llamar a A3ERP", async () => {
    const f = reply(200);
    const run = createRunner(cfg, f);
    const good = createJob({ orgId: ORG, op: "a3erp.health" }, KEY, T);
    expect(await run(createJob({ orgId: ORG, op: "a3erp.health" }, "z".repeat(48), T), T + 100)).toEqual({ rejected: "firma" });
    expect("result" in (await run(good, T + 100))).toBe(true);
    expect(await run(good, T + 200)).toEqual({ rejected: "repetido" });
    expect(await run(createJob({ orgId: ORG, op: "a3erp.health" }, KEY, T), T + 90_000)).toEqual({ rejected: "caducado" });
    expect(await run(createJob({ orgId: ORG, op: "sql.query" as never }, KEY, T), T + 100)).toEqual({ rejected: "operacion" });
    expect(f).toHaveBeenCalledTimes(1);
  });
  it("lee facturas: login, Bearer, paginación por cabeceras y filtro construido por el gateway; nunca devuelve el token", async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    const f = vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      if (url.endsWith("/api/login")) return new Response(JSON.stringify({ token: "JWT-SECRETO-1234567890" }), { status: 200 });
      const page = Number((init?.headers as Record<string, string>).Page);
      const docs = page === 1 ? Array.from({ length: 100 }, (_, i) => ({ numdoc: i, fecha: "2026-01-02", totdoc: "10.5", nifcli: "FICTICIO" })) : [{ numdoc: 999, fecha: "2026-01-03", totdoc: 1 }];
      return new Response(JSON.stringify({ Documentos: docs }), { status: 200, headers: { "content-type": "application/json" } });
    });
    const out = await createRunner(cfg, f)(createJob({ orgId: ORG, op: "a3erp.documentos.list", params: { tipo: "FVS", desde: "2026-01-01", limite: 150 } }, KEY, T), T + 100);
    expect("result" in out && out.result.ok).toBe(true);
    const docs = ("result" in out ? out.result.data?.documentos : []) as unknown[];
    expect(docs).toHaveLength(101);
    const get = calls.filter((c) => !c.url.endsWith("/api/login"));
    expect(decodeURIComponent(get[0]!.url)).toBe("http://a3.local:5000/api/documento/FVS/filtro/fecha>='20260101'/order/fecha desc");
    expect((get[0]!.init!.headers as Record<string, string>).Authorization).toBe("Bearer JWT-SECRETO-1234567890");
    expect((get[1]!.init!.headers as Record<string, string>)).toMatchObject({ Page: "2", PageSize: "50" });
    expect(JSON.stringify(out)).not.toContain("JWT-SECRETO");
    expect(JSON.stringify(out)).not.toContain("FICTICIO"); // NIF descartado
  });
  it("un trabajo con un filtro SQL inyectado se descarta antes de tocar A3ERP", async () => {
    const f = vi.fn(async (_u: string, _i?: RequestInit) => new Response("{}", { status: 200 }));
    const out = await createRunner(cfg, f)(createJob({ orgId: ORG, op: "a3erp.documentos.list", params: { tipo: "FVS", limite: 10, desde: "2026-01-01' or '1'='1" } }, KEY, T), T + 100);
    expect(out).toEqual({ rejected: "parametros" });
    expect(f).not.toHaveBeenCalled();
  });
  it("sin configuración de A3ERP responde error claro", async () => {
    const out = await createRunner({ ...cfg, a3: null }, reply(200))(createJob({ orgId: ORG, op: "a3erp.health" }, KEY, T), T + 100);
    expect("result" in out && out.result.message).toContain("no está configurado");
  });
});
