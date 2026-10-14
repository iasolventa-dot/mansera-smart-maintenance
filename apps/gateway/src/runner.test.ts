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
  it("ejecuta health y devuelve un resultado firmado (401 = servicio instalado, documentado)", async () => {
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
  const FAKE_JWT = "j".repeat(30); // relleno generado, no es un token real
  /** A3ERP simulado con semántica real de Page/PageSize: devuelve las filas (Page-1)*PageSize … */
  function fakeA3(total: number, opts: { expireOnce?: boolean } = {}) {
    const calls: { url: string; init?: RequestInit }[] = [];
    let expired = Boolean(opts.expireOnce), logins = 0;
    const f = vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      if (url.endsWith("/api/login")) { logins++; return new Response(JSON.stringify({ token: FAKE_JWT + logins }), { status: 200, headers: { "content-type": "application/json" } }); }
      if (expired && logins === 1) { expired = false; return new Response("{}", { status: 401 }); }
      const h = init?.headers as Record<string, string>;
      const page = Number(h.Page), size = Number(h.PageSize);
      const rows = Array.from({ length: Math.max(0, Math.min(size, total - (page - 1) * size)) }, (_, i) => ({ numdoc: (page - 1) * size + i, fecha: "2026-01-02", totdoc: "10.5", nifcli: "FICTICIO" }));
      return new Response(JSON.stringify({ Documentos: rows }), { status: 200, headers: { "content-type": "application/json" } });
    });
    return { f, calls, logins: () => logins };
  }
  const job = (params: Record<string, unknown>) => createJob({ orgId: ORG, op: "a3erp.documentos.list", params }, KEY, T);
  const docsOf = (out: unknown) => (out as { result: { data: { documentos: { numero: string }[]; truncado: boolean } } }).result.data;

  it("lee facturas con tamaño de página fijo: ni duplica ni pierde registros, y avisa si hay más", async () => {
    const a3 = fakeA3(250);
    const out = await createRunner(cfg, a3.f)(job({ tipo: "FVS", desde: "2026-01-01", limite: 150 }), T + 100);
    const d = docsOf(out);
    expect(d.documentos.map((x) => Number(x.numero))).toEqual(Array.from({ length: 150 }, (_, i) => i)); // 0…149 sin huecos ni repetidos
    expect(d.truncado).toBe(true);
    const get = a3.calls.filter((c) => !c.url.endsWith("/api/login"));
    expect(get.map((c) => (c.init!.headers as Record<string, string>).PageSize)).toEqual(["100", "100"]);
    expect(decodeURIComponent(get[0]!.url)).toBe("http://a3.local:5000/api/documento/FVS/filtro/fecha>='20260101'/order/fecha desc");
    expect((get[0]!.init!.headers as Record<string, string>).Authorization).toBe(`Bearer ${FAKE_JWT}1`);
    expect(JSON.stringify(out)).not.toContain(FAKE_JWT);
    expect(JSON.stringify(out)).not.toContain("FICTICIO"); // NIF descartado
  });
  it("con menos registros que el límite no marca truncado", async () => {
    const d = docsOf(await createRunner(cfg, fakeA3(42).f)(job({ tipo: "AV", limite: 500 }), T + 100));
    expect(d.documentos).toHaveLength(42);
    expect(d.truncado).toBe(false);
  });
  it("si el token caduca a mitad (401), repite el login una vez y sigue", async () => {
    const a3 = fakeA3(10, { expireOnce: true });
    const d = docsOf(await createRunner(cfg, a3.f)(job({ tipo: "FVS", limite: 100 }), T + 100));
    expect(d.documentos).toHaveLength(10);
    expect(a3.logins()).toBe(2);
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
