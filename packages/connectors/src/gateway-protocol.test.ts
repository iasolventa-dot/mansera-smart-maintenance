import { describe, expect, it } from "vitest";
import { MAX_TTL_MS, NonceStore, canonical, createJob, signResult, verifyJob, verifyResult, type SignedJob } from "./gateway-protocol";

const KEY = "k".repeat(48); // relleno generado, no es una clave real
const OTHER = "z".repeat(48);
const ORG = "00000000-0000-4000-8000-000000000001";
const ORG2 = "00000000-0000-4000-8000-000000000002";
const T = 1_800_000_000_000;
const fresh = () => ({ orgId: ORG, nonces: new NonceStore(), now: T + 1000 });
const job = (extra: Partial<Parameters<typeof createJob>[0]> = {}) => createJob({ orgId: ORG, op: "a3erp.health", ...extra }, KEY, T);
const tamper = (s: SignedJob, patch: Record<string, unknown>) => ({ ...s, job: { ...s.job, ...patch } });

describe("protocolo del gateway", () => {
  it("acepta un trabajo válido", () => {
    expect(verifyJob(job(), KEY, fresh())).toMatchObject({ ok: true, op: "a3erp.health" });
  });
  it("la firma no depende del orden de las claves", () => {
    expect(canonical({ b: 1, a: { d: 2, c: 3 } })).toBe(canonical({ a: { c: 3, d: 2 }, b: 1 }));
  });
  it("rechaza firma de otra clave y trabajos manipulados", () => {
    expect(verifyJob(createJob({ orgId: ORG, op: "a3erp.health" }, OTHER, T), KEY, fresh())).toEqual({ ok: false, reason: "firma" });
    expect(verifyJob(tamper(job(), { op: "a3erp.login_check" }), KEY, fresh())).toEqual({ ok: false, reason: "firma" });
  });
  it("rechaza trabajos de otra organización", () => {
    expect(verifyJob(createJob({ orgId: ORG2, op: "a3erp.health" }, KEY, T), KEY, fresh())).toEqual({ ok: false, reason: "organizacion" });
  });
  it("rechaza caducados, del futuro y con TTL excesivo", () => {
    expect(verifyJob(job(), KEY, { ...fresh(), now: T + 31_000 })).toEqual({ ok: false, reason: "caducado" });
    expect(verifyJob(job(), KEY, { ...fresh(), now: T - 10_000 })).toEqual({ ok: false, reason: "caducado" });
    const longJob = job();
    const forged = createJob({ orgId: ORG, op: "a3erp.health", ttlMs: MAX_TTL_MS }, KEY, T);
    expect(forged.job.exp - forged.job.iat).toBe(MAX_TTL_MS); // se recorta al máximo
    expect(longJob.job.exp).toBeGreaterThan(T);
  });
  it("rechaza la repetición del mismo trabajo", () => {
    const ctx = fresh(), s = job();
    expect(verifyJob(s, KEY, ctx).ok).toBe(true);
    expect(verifyJob(s, KEY, ctx)).toEqual({ ok: false, reason: "repetido" });
  });
  it("solo ejecuta operaciones de la lista blanca, aunque estén bien firmadas", () => {
    for (const op of ["sql.query", "shell.exec", "a3erp.write_invoice", "__proto__", "constructor"]) {
      const s = createJob({ orgId: ORG, op: op as never }, KEY, T);
      expect(verifyJob(s, KEY, fresh()), op).toEqual({ ok: false, reason: "operacion" });
    }
  });
  it("valida los parámetros de cada operación (estrictos)", () => {
    expect(verifyJob(job({ params: { sql: "drop table x" } }), KEY, fresh())).toEqual({ ok: false, reason: "parametros" });
  });
  it("rechaza basura sin lanzar excepciones", () => {
    for (const x of [null, 1, "x", {}, { job: {}, sig: "a" }]) expect(verifyJob(x, KEY, fresh())).toEqual({ ok: false, reason: "formato" });
  });
  it("los resultados también se firman y se detecta la manipulación", () => {
    const r = signResult({ jobId: "j", ok: true, status: "ok", message: "bien", at: T }, KEY);
    expect(verifyResult(r, KEY)).toBe(true);
    expect(verifyResult({ ...r, result: { ...r.result, ok: false } }, KEY)).toBe(false);
    expect(verifyResult(r, OTHER)).toBe(false);
  });
});
