import {
  ConnectorError, LoginResponse, NonceStore, OPS, clientesPath, documentosPath, getJson, mapClientes, mapDocumentos, pageHeaders, signResult, verifyJob,
  type JobResult, type OpName, type SignedResult,
} from "@msm/connectors";

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
type Handler = (cfg: GatewayConfig, fetchImpl: FetchLike, params: Record<string, unknown>) => Promise<Omit<JobResult, "jobId" | "at">>;

const TIMEOUT_MS = 8_000;
const call = async (fetchImpl: FetchLike, url: string, init: RequestInit) => {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try { return await fetchImpl(url, { ...init, signal: ctrl.signal, redirect: "error" }); } finally { clearTimeout(t); }
};

/** Login en A3ERP (documentado) → token JWT. El token nunca sale del gateway. */
async function a3Token(cfg: NonNullable<GatewayConfig["a3"]>, f: FetchLike): Promise<string> {
  const basic = Buffer.from(`${cfg.username}:${cfg.password}`).toString("base64");
  let r: Response;
  try {
    r = await call(f, `${cfg.baseUrl}/api/login`, { method: "POST", headers: { Authorization: `Basic ${basic}` } });
  } catch {
    throw new ConnectorError("transient", "No se pudo contactar con el servicio de A3ERP.");
  }
  if (!r.ok) throw new ConnectorError("auth", `A3ERP rechazó el acceso (HTTP ${r.status}).`);
  const parsed = LoginResponse.safeParse(await r.json().catch(() => null));
  if (!parsed.success) throw new ConnectorError("validation", "A3ERP devolvió un login con formato inesperado.");
  return parsed.data.token;
}

const PAGE = 100;
/** Lee páginas (cabeceras Page/PageSize documentadas) hasta `limite` o hasta una página incompleta. */
async function a3Pages<T>(cfg: NonNullable<GatewayConfig["a3"]>, f: FetchLike, path: string, limite: number, map: (raw: unknown) => T[]): Promise<T[]> {
  const token = await a3Token(cfg, f);
  const out: T[] = [];
  for (let page = 1; out.length < limite && page <= 50; page++) {
    const size = Math.min(PAGE, limite - out.length);
    const raw = await getJson(f, `${cfg.baseUrl}${path}`, { app: "A3ERP", headers: { Authorization: `Bearer ${token}`, Accept: "application/json", ...pageHeaders(page, size) }, timeoutMs: TIMEOUT_MS * 2 });
    const items = map(raw);
    out.push(...items);
    if (items.length < size) break;
  }
  return out.slice(0, limite);
}

const fail = (e: unknown) => ({ ok: false, status: "error" as const, message: e instanceof ConnectorError ? e.message : "Fallo inesperado al leer A3ERP." });

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
  // Lecturas: los parámetros ya pasaron la lista blanca; se vuelven a validar aquí y el filtro SQL lo construye read.ts.
  "a3erp.documentos.list": async (cfg, f, params) => {
    if (!cfg.a3) return { ok: false, status: "error", message: "A3ERP no está configurado en este gateway." };
    try {
      const p = OPS["a3erp.documentos.list"].parse(params);
      const docs = await a3Pages(cfg.a3, f, documentosPath(p.tipo, { desde: p.desde, hasta: p.hasta }), p.limite, (raw) => mapDocumentos(p.tipo, raw));
      return { ok: true, status: "ok", message: `${docs.length} documentos leídos.`, data: { documentos: docs } };
    } catch (e) { return fail(e); }
  },
  "a3erp.clientes.list": async (cfg, f, params) => {
    if (!cfg.a3) return { ok: false, status: "error", message: "A3ERP no está configurado en este gateway." };
    try {
      const p = OPS["a3erp.clientes.list"].parse(params);
      const clientes = await a3Pages(cfg.a3, f, clientesPath(), p.limite, mapClientes);
      return { ok: true, status: "ok", message: `${clientes.length} clientes leídos.`, data: { clientes } };
    } catch (e) { return fail(e); }
  },
};

export function createRunner(cfg: GatewayConfig, fetchImpl: FetchLike = fetch, nonces = new NonceStore()) {
  return async function run(signed: unknown, now = Date.now()): Promise<SignedResult | { rejected: string }> {
    const v = verifyJob(signed, cfg.signingKey, { orgId: cfg.orgId, nonces, now });
    if (!v.ok) return { rejected: v.reason }; // los rechazos no se responden como resultado: se registran y se descartan
    const out = await HANDLERS[v.op](cfg, fetchImpl, v.job.params);
    return signResult({ jobId: v.job.id, at: now, ...out }, cfg.signingKey);
  };
}
