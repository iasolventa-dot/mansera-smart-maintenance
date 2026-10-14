import { ConnectorError, errorFromStatus } from "./errors";

/**
 * Petición GET de solo lectura común a los conectores:
 * - el tiempo límite cubre TODA la petición, también la lectura del cuerpo (un servidor lento no cuelga la función);
 * - tope de tamaño de respuesta (se corta la lectura al superarlo);
 * - sin redirecciones ni caché; los mensajes de error nunca incluyen la URL ni credenciales.
 */
export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;
export type GetJsonOptions = { app: string; headers: Record<string, string>; timeoutMs?: number; maxBytes?: number; requireJson?: boolean; notJsonMessage?: string };

const DEFAULT_TIMEOUT = 15_000;
const DEFAULT_MAX_BYTES = 10 * 1024 * 1024;

async function readCapped(res: Response, maxBytes: number, app: string): Promise<string> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined);
      throw new ConnectorError("validation", `${app} devolvió una respuesta demasiado grande; se detiene la lectura por seguridad.`);
    }
    chunks.push(value);
  }
  const buf = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) { buf.set(c, off); off += c.byteLength; }
  return new TextDecoder().decode(buf);
}

export async function getJson(fetchImpl: FetchLike, url: string, o: GetJsonOptions): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), o.timeoutMs ?? DEFAULT_TIMEOUT);
  try {
    let res: Response;
    try {
      res = await fetchImpl(url, { method: "GET", headers: o.headers, redirect: "error", cache: "no-store", signal: ctrl.signal });
    } catch {
      throw ctrl.signal.aborted
        ? new ConnectorError("transient", `${o.app} tardó demasiado en responder.`)
        : new ConnectorError("transient", `No se pudo contactar con ${o.app}.`);
    }
    if (!res.ok) {
      await res.body?.cancel().catch(() => undefined);
      throw errorFromStatus(o.app, res.status, res.headers.get("retry-after"));
    }
    if (o.requireJson && !(res.headers.get("content-type") ?? "").includes("json")) {
      await res.body?.cancel().catch(() => undefined);
      throw new ConnectorError("unavailable", o.notJsonMessage ?? `${o.app} no respondió con datos: revisa la configuración o si el servicio está en mantenimiento.`);
    }
    let text: string;
    try {
      text = await readCapped(res, o.maxBytes ?? DEFAULT_MAX_BYTES, o.app);
    } catch (e) {
      if (e instanceof ConnectorError) throw e;
      throw new ConnectorError("transient", ctrl.signal.aborted ? `${o.app} tardó demasiado en responder.` : `${o.app} cortó la respuesta.`);
    }
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return undefined; // el esquema Zod del llamante lo convierte en un error de formato controlado
    }
  } finally {
    clearTimeout(timer);
  }
}
