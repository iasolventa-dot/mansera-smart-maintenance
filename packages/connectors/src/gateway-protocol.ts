import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { A3_LIST_ENTITIES } from "./a3erp/read";

/**
 * Protocolo nube ↔ gateway on-prem (ADR-0011, borrador). Solo definiciones y criptografía puras, sin red.
 * - El gateway SOLO hace conexiones salientes: recoge trabajos y devuelve resultados.
 * - Cada trabajo va firmado (HMAC-SHA256, clave por organización), caduca en segundos y lleva un nonce de un solo uso.
 * - Solo existen las operaciones de la LISTA BLANCA `OPS` (todas de solo lectura por ahora). Nada de SQL ni comandos libres.
 * ESTADO: diseño probado con tests; sin transporte real hasta que haya gateway instalado (M2, Q1/Q6).
 */
const DAY = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const OPS = {
  "a3erp.health": z.object({}).strict(),
  "a3erp.login_check": z.object({}).strict(),
  /** Solo parámetros tipados: el gateway construye él mismo el filtro SQL de A3ERP (read.ts). */
  "a3erp.documentos.list": z.object({ entidad: z.enum(A3_LIST_ENTITIES), desde: DAY.optional(), hasta: DAY.optional(), limite: z.number().int().min(1).max(500) }).strict(),
  "a3erp.clientes.list": z.object({ limite: z.number().int().min(1).max(2000) }).strict(),
} as const;
export type OpName = keyof typeof OPS;

export const MAX_TTL_MS = 60_000;
export const CLOCK_SKEW_MS = 5_000;

export const JobSchema = z.object({
  id: z.uuid(),
  orgId: z.uuid(),
  op: z.string().max(60),
  params: z.record(z.string(), z.unknown()),
  iat: z.number().int(),
  exp: z.number().int(),
  nonce: z.string().min(16).max(64),
});
export type Job = z.infer<typeof JobSchema>;
export type SignedJob = { job: Job; sig: string };

export type JobResult = { jobId: string; ok: boolean; status: "ok" | "error"; message: string; data?: Record<string, unknown>; at: number };
export type SignedResult = { result: JobResult; sig: string };

/** JSON con claves ordenadas: la misma firma en ambos lados, sin depender del orden de inserción. */
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    // Las claves con `undefined` se omiten, igual que hace JSON al viajar: si no, la firma cambiaría por el camino.
    return `{${Object.keys(obj).filter((k) => obj[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${canonical(obj[k])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}
/** Separación de dominio: una firma de trabajo nunca vale como firma de resultado (y al revés). */
type Domain = "job" | "res";
const mac = (secret: string, domain: Domain, payload: unknown) => createHmac("sha256", secret).update(`msm-gw-v1:${domain}:`).update(canonical(payload)).digest("hex");
const HEX64 = /^[0-9a-f]{64}$/;
/** Comparación en tiempo constante que NUNCA lanza: cualquier firma mal formada es simplemente «no coincide». */
const same = (given: unknown, expected: string) => {
  if (typeof given !== "string" || !HEX64.test(given)) return false;
  const a = Buffer.from(given, "hex"), b = Buffer.from(expected, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
};

export function createJob(input: { orgId: string; op: OpName; params?: Record<string, unknown>; ttlMs?: number }, secret: string, now = Date.now()): SignedJob {
  const ttl = Math.min(input.ttlMs ?? 30_000, MAX_TTL_MS);
  const job: Job = { id: randomUUID(), orgId: input.orgId, op: input.op, params: input.params ?? {}, iat: now, exp: now + ttl, nonce: randomUUID().replaceAll("-", "") };
  return { job, sig: mac(secret, "job", job) };
}
export const signResult = (result: JobResult, secret: string): SignedResult => ({ result, sig: mac(secret, "res", result) });
export const verifyResult = (s: SignedResult, secret: string): boolean => !!s && typeof s === "object" && same(s.sig, mac(secret, "res", s.result));

/** Memoria de nonces vistos (contra repetición). En producción se persiste; aquí basta una implementación en memoria. */
export class NonceStore {
  private seen = new Map<string, number>();
  /** Devuelve false si el nonce ya se usó. Limpia los caducados. */
  claim(nonce: string, exp: number, now: number): boolean {
    for (const [n, e] of this.seen) if (e < now) this.seen.delete(n);
    if (this.seen.has(nonce)) return false;
    this.seen.set(nonce, exp + CLOCK_SKEW_MS);
    return true;
  }
}

export type Verdict = { ok: true; job: Job; op: OpName } | { ok: false; reason: "formato" | "firma" | "organizacion" | "caducado" | "ttl" | "repetido" | "operacion" | "parametros" };

/** Orden deliberado: formato → firma → organización → vigencia → repetición → lista blanca → parámetros. */
export function verifyJob(signed: unknown, secret: string, ctx: { orgId: string; nonces: NonceStore; now?: number }): Verdict {
  const parsed = z.object({ job: JobSchema, sig: z.string().regex(HEX64) }).safeParse(signed);
  if (!parsed.success) return { ok: false, reason: "formato" };
  const { job, sig } = parsed.data;
  if (!same(sig, mac(secret, "job", job))) return { ok: false, reason: "firma" };
  if (job.orgId !== ctx.orgId) return { ok: false, reason: "organizacion" };
  const now = ctx.now ?? Date.now();
  if (job.exp - job.iat > MAX_TTL_MS) return { ok: false, reason: "ttl" };
  if (now > job.exp || job.iat > now + CLOCK_SKEW_MS) return { ok: false, reason: "caducado" };
  if (!ctx.nonces.claim(job.nonce, job.exp, now)) return { ok: false, reason: "repetido" };
  if (!Object.hasOwn(OPS, job.op)) return { ok: false, reason: "operacion" };
  const op = job.op as OpName;
  if (!OPS[op].safeParse(job.params).success) return { ok: false, reason: "parametros" };
  return { ok: true, job, op };
}
