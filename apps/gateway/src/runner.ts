import { NonceStore, signResult, verifyJob, type JobResult, type OpName, type SignedResult } from "@msm/connectors";

/**
 * Núcleo del gateway on-prem (ADR-0011, borrador): verifica el trabajo firmado, ejecuta SOLO su manejador de la
 * lista blanca y devuelve un resultado firmado. Sin red propia: el transporte (long-poll saliente) se añade en M2.
 * Los manejadores son de solo lectura; una caída de A3ERP nunca tumba el gateway (se devuelve un error controlado).
 */
export type GatewayConfig = {
  orgId: string;
  /** Clave compartida de la organización (se carga de config local cifrada con DPAPI; nunca del repo). */
  signingKey: string;
  a3: { baseUrl: string; username: string; password: string } | null;
};
type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;
type Handler = (cfg: GatewayConfig, fetchImpl: FetchLike) => Promise<Omit<JobResult, "jobId" | "at">>;

const TIMEOUT_MS = 8_000;
const call = async (fetchImpl: FetchLike, url: string, init: RequestInit) => {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try { return await fetchImpl(url, { ...init, signal: ctrl.signal, redirect: "error" }); } finally { clearTimeout(t); }
};

export const HANDLERS: Record<OpName, Handler> = {
  // GET /api debe responder 401 si el servicio está bien instalado (documentación oficial).
  "a3erp.health": async (cfg, f) => {
    if (!cfg.a3) return { ok: false, status: "error", message: "A3ERP no está configurado en este gateway." };
    try {
      const r = await call(f, `${cfg.a3.baseUrl}/api`, { method: "GET" });
      return r.status === 401 || r.status === 200
        ? { ok: true, status: "ok", message: "El servicio de la API de A3ERP responde.", data: { http: r.status } }
        : { ok: false, status: "error", message: `El servicio respondió con HTTP ${r.status}.` };
    } catch { return { ok: false, status: "error", message: "No se pudo contactar con el servicio de A3ERP." }; }
  },
  "a3erp.login_check": async (cfg, f) => {
    if (!cfg.a3) return { ok: false, status: "error", message: "A3ERP no está configurado en este gateway." };
    try {
      const basic = Buffer.from(`${cfg.a3.username}:${cfg.a3.password}`).toString("base64");
      const r = await call(f, `${cfg.a3.baseUrl}/api/login`, { method: "POST", headers: { Authorization: `Basic ${basic}` } });
      // Nunca se devuelve el token: solo si el login funciona.
      return r.ok ? { ok: true, status: "ok", message: "Credenciales aceptadas por A3ERP." } : { ok: false, status: "error", message: `A3ERP rechazó el acceso (HTTP ${r.status}).` };
    } catch { return { ok: false, status: "error", message: "No se pudo contactar con el servicio de A3ERP." }; }
  },
};

export function createRunner(cfg: GatewayConfig, fetchImpl: FetchLike = fetch, nonces = new NonceStore()) {
  return async function run(signed: unknown, now = Date.now()): Promise<SignedResult | { rejected: string }> {
    const v = verifyJob(signed, cfg.signingKey, { orgId: cfg.orgId, nonces, now });
    if (!v.ok) return { rejected: v.reason }; // los rechazos no se responden como resultado: se registran y se descartan
    const out = await HANDLERS[v.op](cfg, fetchImpl);
    return signResult({ jobId: v.job.id, at: now, ...out }, cfg.signingKey);
  };
}
