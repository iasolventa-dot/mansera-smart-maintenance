/**
 * Errores tipados del contrato de conectores (docs/integraciones/00-contrato-conectores.md §Reglas 2).
 * Los mensajes son para personas y NUNCA incluyen credenciales ni URLs con credenciales.
 */
export type ConnectorErrorKind = "auth" | "rate_limited" | "not_found" | "validation" | "transient" | "unavailable";

export class ConnectorError extends Error {
  constructor(
    readonly kind: ConnectorErrorKind,
    message: string,
    readonly retryAfterSec?: number,
  ) {
    super(message);
    this.name = "ConnectorError";
  }
  /** Solo se reintentan errores transitorios y límites de peticiones (y nunca una escritura sin clave de idempotencia). */
  get retryable(): boolean {
    return this.kind === "transient" || this.kind === "rate_limited";
  }
}

export function errorFromStatus(app: string, status: number, retryAfter: string | null): ConnectorError {
  if (status === 401 || status === 403) return new ConnectorError("auth", `${app} rechazó las credenciales (HTTP ${status}).`);
  if (status === 404) return new ConnectorError("not_found", `${app}: recurso no encontrado (HTTP 404).`);
  if (status === 429) {
    const s = Number(retryAfter);
    return new ConnectorError("rate_limited", `${app} ha limitado las peticiones (HTTP 429).`, Number.isFinite(s) && s > 0 ? s : undefined);
  }
  // 502/503/504 = pasarela o mantenimiento: transitorio (se puede reintentar). 500 y demás 5xx: fallo del servicio.
  if (status === 502 || status === 503 || status === 504) return new ConnectorError("transient", `${app} no está disponible ahora mismo (HTTP ${status}); se reintentará.`);
  if (status >= 500) return new ConnectorError("unavailable", `${app} no está disponible (HTTP ${status}).`);
  return new ConnectorError("validation", `${app} respondió con un resultado inesperado (HTTP ${status}).`);
}
