import type { ConnectorApp } from "@msm/core";

/**
 * Comprobación de credenciales (SOLO LECTURA): ¿se puede entrar con lo que ha puesto el administrador?
 * Se llama justo al guardar, con las credenciales que el servidor tiene en memoria en ese momento; después
 * no se vuelven a leer del Vault desde el navegador. Nunca escribe en los sistemas de MANSERA.
 *
 * ESTADO: implementado según la documentación oficial (consultada el 2026-10-13) y probado solo con respuestas
 * simuladas. NO verificado contra las APIs reales hasta que haya credenciales de prueba (M1).
 * Los mensajes devueltos NUNCA incluyen credenciales.
 */
export type ProbeStatus = "verificada" | "error" | "no_probable";
export type ProbeResult = { status: ProbeStatus; message: string; latencyMs?: number };
type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;
type Values = Record<string, string>;

const TIMEOUT_MS = 10_000;

async function timed(fetchImpl: FetchLike, url: string, init: RequestInit): Promise<{ res: Response; ms: number }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  const t0 = Date.now();
  try {
    const res = await fetchImpl(url, { ...init, signal: ctrl.signal, redirect: "error", cache: "no-store" });
    return { res, ms: Date.now() - t0 };
  } finally {
    clearTimeout(timer);
  }
}

function describeHttp(name: string, status: number): ProbeResult {
  if (status === 401 || status === 403) return { status: "error", message: `${name} rechazó las credenciales (HTTP ${status}). Comprueba que son correctas y que no han caducado o se han revocado.` };
  if (status === 429) return { status: "error", message: `${name} ha limitado las peticiones (HTTP 429). Inténtalo de nuevo en unos minutos.` };
  if (status >= 500) return { status: "error", message: `${name} no está disponible ahora mismo (HTTP ${status}).` };
  return { status: "error", message: `${name} respondió con un resultado inesperado (HTTP ${status}).` };
}

function describeNetwork(name: string, e: unknown): ProbeResult {
  const aborted = e instanceof DOMException && e.name === "AbortError";
  return { status: "error", message: aborted ? `${name} tardó más de ${TIMEOUT_MS / 1000} s en responder.` : `No se pudo contactar con ${name}. Comprueba la conexión.` };
}

export async function probeTrello(config: Values, secrets: Values, fetchImpl: FetchLike = fetch): Promise<ProbeResult> {
  const key = config.apiKey, token = secrets.token;
  if (!key || !token) return { status: "error", message: "Faltan la clave de API o el token." };
  // Documentado: GET /1/members/me. Credenciales en la cabecera OAuth (nunca en la URL, que podría acabar en registros).
  const url = "https://api.trello.com/1/members/me?fields=username";
  try {
    const { res, ms } = await timed(fetchImpl, url, { method: "GET", headers: { Accept: "application/json", Authorization: `OAuth oauth_consumer_key="${key}", oauth_token="${token}"` } });
    if (res.status === 200) return { status: "verificada", message: "Conexión correcta con Trello.", latencyMs: ms };
    return describeHttp("Trello", res.status);
  } catch (e) {
    return describeNetwork("Trello", e);
  }
}

export async function probeSesame(config: Values, secrets: Values, fetchImpl: FetchLike = fetch): Promise<ProbeResult> {
  const region = config.region, token = secrets.token;
  if (!region || !token) return { status: "error", message: "Faltan la región o el token." };
  // La región forma parte del nombre de host: se vuelve a validar aquí para que nunca pueda salirse de sesametime.com.
  if (!/^[a-z0-9-]{2,20}$/.test(region) || region.startsWith("-") || region.endsWith("-")) return { status: "error", message: "La región no es válida." };
  const url = `https://api-${region}.sesametime.com/core/v3/info`;
  try {
    const { res, ms } = await timed(fetchImpl, url, { method: "GET", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" } });
    if (res.status === 200) {
      // /core/v3/info devuelve la empresa del token (documentado): se muestra para confirmar que es la cuenta correcta.
      const body = (await res.json().catch(() => null)) as { data?: { company?: { name?: unknown } } } | null;
      const company = typeof body?.data?.company?.name === "string" ? body.data.company.name.slice(0, 80) : null;
      return { status: "verificada", message: company ? `Conexión correcta con Sésame HR (empresa: ${company}).` : "Conexión correcta con Sésame HR.", latencyMs: ms };
    }
    return describeHttp("Sésame HR", res.status);
  } catch (e) {
    return describeNetwork("Sésame HR", e);
  }
}

/** Punto único: qué comprobación aplica a cada sistema. A3ERP y PGMWin no se alcanzan desde la nube. */
export async function probeConnection(app: ConnectorApp, config: Values, secrets: Values, fetchImpl: FetchLike = fetch): Promise<ProbeResult> {
  switch (app) {
    case "trello": return probeTrello(config, secrets, fetchImpl);
    case "sesame": return probeSesame(config, secrets, fetchImpl);
    case "a3erp": return { status: "no_probable", message: "A3ERP se comprueba desde el gateway de la red de MANSERA, donde viven sus credenciales (ADR-0012)." };
    case "pgmwin": return { status: "no_probable", message: "PGMWin está pendiente de documentar: no hay nada que comprobar todavía." };
  }
}
