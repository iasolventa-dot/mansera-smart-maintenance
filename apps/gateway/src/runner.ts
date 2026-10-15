import {
  ConnectorError, NonceStore, OPS, PAGE_SIZE, apiKeyHeaders, getJson, listPath, mapAlbaranes, mapClientes, mapEfectos, mapFacturas, signResult, verifyJob,
  type JobResult, type OpName, type SignedResult,
} from "@msm/connectors";

/**
 * Núcleo del gateway on-prem (ADR-0011): verifica el trabajo firmado, ejecuta SOLO su manejador de la lista blanca y
 * devuelve un resultado firmado. Sin red propia: el transporte (salida hacia la nube) se añade en M2.
 * A3ERP se lee con el «Integrador API ERP» de Link Soluciones (cabecera ApiKey, OData, `{ PageData, TotalCount }`).
 * Los manejadores son de solo lectura; una caída de A3ERP nunca tumba el gateway (se devuelve un error controlado).
 */
export type GatewayConfig = {
  orgId: string;
  /** Clave compartida de la organización (se carga de config local cifrada con DPAPI; nunca del repo). */
  signingKey: string;
  a3: { baseUrl: string; apiKey: string } | null;
};
type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;
type Handler = (cfg: GatewayConfig, fetchImpl: FetchLike, params: Record<string, unknown>) => Promise<Omit<JobResult, "jobId" | "at">>;

const TIMEOUT_MS = 15_000;
const MAX_PAGES = 50;

const notConfigured = { ok: false, status: "error" as const, message: "A3ERP no está configurado en este gateway." };
const fail = (e: unknown) => ({ ok: false, status: "error" as const, message: e instanceof ConnectorError ? e.message : "Fallo inesperado al leer A3ERP." });

/**
 * Lee páginas con `$skip`/`$top` de tamaño fijo hasta `limite` o hasta agotar `TotalCount`. Indica si quedaron más.
 * La ApiKey va solo en la cabecera y nunca sale del gateway.
 */
async function a3List<T>(
  cfg: NonNullable<GatewayConfig["a3"]>, f: FetchLike, path: (skip: number, top: number) => string, limite: number,
  map: (raw: unknown) => { total: number; items: T[] },
): Promise<{ items: T[]; total: number; truncado: boolean }> {
  const headers = apiKeyHeaders(cfg.apiKey);
  const out: T[] = [];
  let total = 0;
  for (let page = 0; out.length < limite && page < MAX_PAGES; page++) {
    const raw = await getJson(f, `${cfg.baseUrl}${path(page * PAGE_SIZE, PAGE_SIZE)}`, { app: "A3ERP", headers, timeoutMs: TIMEOUT_MS });
    const r = map(raw);
    total = r.total;
    out.push(...r.items);
    if (r.items.length < PAGE_SIZE || out.length >= total) break;
  }
  const items = out.slice(0, limite);
  return { items, total, truncado: total > items.length };
}

export const HANDLERS: Record<OpName, Handler> = {
  // Disponibilidad del servicio: una lectura mínima (1 cliente) con la ApiKey.
  "a3erp.health": async (cfg, f) => {
    if (!cfg.a3) return notConfigured;
    try {
      await getJson(f, `${cfg.a3.baseUrl}${listPath("cliente", { skip: 0, top: 1 })}`, { app: "A3ERP", headers: apiKeyHeaders(cfg.a3.apiKey), timeoutMs: TIMEOUT_MS });
      return { ok: true, status: "ok", message: "El servicio de la API de A3ERP responde." };
    } catch (e) {
      return fail(e);
    }
  },
  "a3erp.login_check": async (cfg, f) => {
    if (!cfg.a3) return notConfigured;
    try {
      const raw = await getJson(f, `${cfg.a3.baseUrl}${listPath("cliente", { skip: 0, top: 1 })}`, { app: "A3ERP", headers: apiKeyHeaders(cfg.a3.apiKey), timeoutMs: TIMEOUT_MS });
      mapClientes(raw); // valida el formato documentado
      return { ok: true, status: "ok", message: "A3ERP acepta la ApiKey." };
    } catch (e) {
      return fail(e);
    }
  },
  // Lecturas: los parámetros ya pasaron la lista blanca; se vuelven a validar aquí y el filtro OData lo construye read.ts.
  "a3erp.documentos.list": async (cfg, f, params) => {
    if (!cfg.a3) return notConfigured;
    try {
      const p = OPS["a3erp.documentos.list"].parse(params);
      const path = (skip: number, top: number) => listPath(p.entidad, { desde: p.desde, hasta: p.hasta, skip, top });
      const r = p.entidad === "facturaVenta" ? await a3List(cfg.a3, f, path, p.limite, mapFacturas)
        : p.entidad === "albaranVenta" ? await a3List(cfg.a3, f, path, p.limite, mapAlbaranes)
        : await a3List(cfg.a3, f, path, p.limite, mapEfectos);
      return { ok: true, status: "ok", message: `${r.items.length} de ${r.total} registros leídos${r.truncado ? " (hay más: se alcanzó el límite)" : ""}.`, data: { entidad: p.entidad, registros: r.items, total: r.total, truncado: r.truncado } };
    } catch (e) {
      return fail(e);
    }
  },
  "a3erp.clientes.list": async (cfg, f, params) => {
    if (!cfg.a3) return notConfigured;
    try {
      const p = OPS["a3erp.clientes.list"].parse(params);
      const r = await a3List(cfg.a3, f, (skip, top) => listPath("cliente", { skip, top }), p.limite, mapClientes);
      return { ok: true, status: "ok", message: `${r.items.length} de ${r.total} clientes leídos${r.truncado ? " (hay más: se alcanzó el límite)" : ""}.`, data: { clientes: r.items, total: r.total, truncado: r.truncado } };
    } catch (e) {
      return fail(e);
    }
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
