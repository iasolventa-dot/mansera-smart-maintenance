import { describe, expect, it, vi } from "vitest";
import { createJob, verifyResult } from "@msm/connectors";
import { createRunner, type GatewayConfig } from "./runner";

// Valores generados: no son credenciales reales.
const KEY = "k".repeat(48);
const APIKEY = "a".repeat(24);
const ORG = "00000000-0000-4000-8000-000000000001";
const cfg: GatewayConfig = { orgId: ORG, signingKey: KEY, a3: { baseUrl: "http://a3.local:5000", apiKey: APIKEY } };
const T = 1_800_000_000_000;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

/** API de Link Soluciones simulada con semántica real de $skip/$top y { PageData, TotalCount }. */
function fakeLink(total: number) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const f = vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    const u = new URL(url);
    const skip = Number(u.searchParams.get("$skip")), top = Number(u.searchParams.get("$top"));
    const n = Math.max(0, Math.min(top, total - skip));
    if (u.pathname === "/api/cliente/") return json({ PageData: Array.from({ length: n }, (_, i) => ({ Codigo: String(skip + i), Nombre: "C", NIF: "FICTICIO" })), TotalCount: total });
    const rows = Array.from({ length: n }, (_, i) => ({ IdFacturaVenta: skip + i, Numero: skip + i, Fecha: "2026-01-02T00:00:00", TotalDoc: 10.5, NifCliente: "FICTICIO" }));
    return json({ PageData: rows, TotalCount: total });
  });
  return { f, calls };
}
const job = (op: string, params: Record<string, unknown> = {}) => createJob({ orgId: ORG, op: op as never, params }, KEY, T);
const dataOf = (out: unknown) => (out as { result: { ok: boolean; data: { registros: { numero: string }[]; total: number; truncado: boolean } } }).result;

describe("runner del gateway (A3ERP vía Link Soluciones)", () => {
  it("health con la ApiKey en cabecera y resultado firmado", async () => {
    const { f, calls } = fakeLink(3);
    const out = await createRunner(cfg, f)(job("a3erp.health"), T + 100);
    expect("result" in out && verifyResult(out, KEY) && out.result.ok).toBe(true);
    expect((calls[0]!.init!.headers as Record<string, string>).ApiKey).toBe(APIKEY);
    expect(calls[0]!.url).not.toContain(APIKEY);
  });
  it("lee facturas con $skip/$top fijos: ni duplica ni pierde registros, y avisa si hay más", async () => {
    const { f, calls } = fakeLink(250);
    const r = dataOf(await createRunner(cfg, f)(job("a3erp.documentos.list", { entidad: "facturaVenta", desde: "2026-01-01", limite: 150 }), T + 100));
    expect(r.ok).toBe(true);
    expect(r.data.registros.map((x) => Number(x.numero))).toEqual(Array.from({ length: 150 }, (_, i) => i));
    expect(r.data).toMatchObject({ total: 250, truncado: true });
    const qs = calls.map((c) => Object.fromEntries(new URL(c.url).searchParams));
    expect(qs.map((q) => [q.$skip, q.$top])).toEqual([["0", "100"], ["100", "100"]]);
    expect(qs[0]!.$filter).toBe("Fecha ge datetime'2026-01-01'");
    expect(JSON.stringify(r)).not.toContain("FICTICIO"); // NIF descartado
    expect(JSON.stringify(r)).not.toContain(APIKEY);
  });
  it("con menos registros que el límite no marca truncado", async () => {
    const r = dataOf(await createRunner(cfg, fakeLink(42).f)(job("a3erp.documentos.list", { entidad: "facturaVenta", limite: 500 }), T + 100));
    expect(r.data).toMatchObject({ total: 42, truncado: false });
    expect(r.data.registros).toHaveLength(42);
  });
  it("una ApiKey rechazada (401) es un error claro, sin exponer la clave", async () => {
    const f = vi.fn(async (_u: string, _i?: RequestInit) => new Response("{}", { status: 401 }));
    const out = await createRunner(cfg, f)(job("a3erp.login_check"), T + 100);
    expect("result" in out && out.result).toMatchObject({ ok: false, status: "error" });
    expect(JSON.stringify(out)).not.toContain(APIKEY);
  });
  it("un trabajo con un filtro inyectado se descarta antes de tocar A3ERP", async () => {
    const { f } = fakeLink(10);
    const out = await createRunner(cfg, f)(job("a3erp.documentos.list", { entidad: "facturaVenta", limite: 10, desde: "2026-01-01' or 1 eq 1 or Fecha ge datetime'2000-01-01" }), T + 100);
    expect(out).toEqual({ rejected: "parametros" });
    expect(f).not.toHaveBeenCalled();
  });
  it("si A3ERP está caído devuelve error controlado, no excepción", async () => {
    const down = vi.fn(async (_u: string, _i?: RequestInit): Promise<Response> => { throw new TypeError("ECONNREFUSED"); });
    const out = await createRunner(cfg, down)(job("a3erp.health"), T + 100);
    expect("result" in out && out.result).toMatchObject({ ok: false, status: "error" });
  });
  it("descarta trabajos falsificados, repetidos, caducados o de operaciones fuera de la lista blanca", async () => {
    const { f } = fakeLink(1);
    const run = createRunner(cfg, f);
    const good = job("a3erp.health");
    expect(await run(createJob({ orgId: ORG, op: "a3erp.health" }, "z".repeat(48), T), T + 100)).toEqual({ rejected: "firma" });
    expect("result" in (await run(good, T + 100))).toBe(true);
    expect(await run(good, T + 200)).toEqual({ rejected: "repetido" });
    expect(await run(job("a3erp.health"), T + 90_000)).toEqual({ rejected: "caducado" });
    expect(await run(job("sql.query"), T + 100)).toEqual({ rejected: "operacion" });
    expect(f).toHaveBeenCalledTimes(1);
  });
  it("sin configuración de A3ERP responde error claro", async () => {
    const out = await createRunner({ ...cfg, a3: null }, fakeLink(1).f)(job("a3erp.health"), T + 100);
    expect("result" in out && out.result.message).toContain("no está configurado");
  });
});
