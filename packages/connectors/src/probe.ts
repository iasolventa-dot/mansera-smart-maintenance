import type { ConnectorApp } from "@msm/core";
import { ConnectorError } from "./errors";
import type { FetchLike } from "./http";
import { createSesameClient } from "./sesame/client";
import { createTrelloClient } from "./trello/client";

/**
 * Comprobación de credenciales (SOLO LECTURA): ¿se puede entrar con lo que ha puesto el administrador?
 * Se llama justo al guardar, con las credenciales que el servidor tiene en memoria en ese momento; después
 * no se vuelven a leer del Vault desde el navegador. Nunca escribe en los sistemas de MANSERA.
 * Usa los mismos clientes que los conectores (mismo tiempo límite, tope de tamaño y validaciones).
 * Los mensajes devueltos NUNCA incluyen credenciales.
 */
export type ProbeStatus = "verificada" | "error" | "no_probable";
export type ProbeResult = { status: ProbeStatus; message: string; latencyMs?: number };
type Values = Record<string, string>;

function fromError(name: string, e: unknown): ProbeResult {
  if (!(e instanceof ConnectorError)) return { status: "error", message: `No se pudo comprobar ${name}.` };
  if (e.kind === "auth") return { status: "error", message: `${e.message} Comprueba que son correctas y que no han caducado o se han revocado.` };
  if (e.kind === "rate_limited") return { status: "error", message: `${e.message} Inténtalo de nuevo en unos minutos.` };
  return { status: "error", message: e.message };
}

export async function probeTrello(config: Values, secrets: Values, fetchImpl: FetchLike = fetch): Promise<ProbeResult> {
  const apiKey = config.apiKey, token = secrets.token;
  if (!apiKey || !token) return { status: "error", message: "Faltan la clave de API o el token." };
  const t0 = Date.now();
  try {
    await createTrelloClient({ apiKey, token }, fetchImpl).me();
    return { status: "verificada", message: "Conexión correcta con Trello.", latencyMs: Date.now() - t0 };
  } catch (e) {
    return fromError("Trello", e);
  }
}

export async function probeSesame(config: Values, secrets: Values, fetchImpl: FetchLike = fetch): Promise<ProbeResult> {
  const region = config.region, token = secrets.token;
  if (!region || !token) return { status: "error", message: "Faltan la región o el token." };
  const t0 = Date.now();
  try {
    // /core/v3/info devuelve la empresa del token (documentado): se muestra para confirmar que es la cuenta correcta.
    const company = await createSesameClient({ region, token }, fetchImpl).info();
    return { status: "verificada", message: `Conexión correcta con Sésame HR (empresa: ${company.name.slice(0, 80)}).`, latencyMs: Date.now() - t0 };
  } catch (e) {
    return fromError("Sésame HR", e);
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
