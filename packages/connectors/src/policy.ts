import { ConnectorError } from "./errors";

/**
 * Política de llamadas común a los conectores (docs/integraciones/00-contrato-conectores.md, reglas 3 y 4):
 * - Cupo por sistema (token bucket): no superar los límites documentados de cada proveedor.
 * - Reintentos SOLO de errores transitorios o de límite (lecturas; nunca escrituras sin clave de idempotencia),
 *   con espera exponencial + aleatoriedad, respetando `Retry-After`, y con un máximo.
 * Reloj y espera inyectables para probarlo sin esperar de verdad.
 *
 * Nota: en Vercel cada instancia tiene su propio cupo en memoria; el reparto entre instancias lo cubre la caché
 * por organización (`connector_snapshots`), que hace que casi todas las visitas no lleguen al proveedor.
 */
export type Clock = { now: () => number; sleep: (ms: number) => Promise<void> };
export const realClock: Clock = { now: () => Date.now(), sleep: (ms) => new Promise((r) => setTimeout(r, ms)) };

export class RateLimiter {
  private tokens: number;
  private last: number;
  constructor(
    private readonly capacity: number,
    private readonly perMs: number,
    private readonly clock: Clock = realClock,
  ) {
    this.tokens = capacity;
    this.last = clock.now();
  }
  private refill() {
    const now = this.clock.now();
    this.tokens = Math.min(this.capacity, this.tokens + ((now - this.last) * this.capacity) / this.perMs);
    this.last = now;
  }
  /** Espera hasta que haya cupo y lo consume. */
  async take(): Promise<void> {
    for (;;) {
      this.refill();
      if (this.tokens >= 1) {
        this.tokens -= 1;
        return;
      }
      await this.clock.sleep(Math.ceil(((1 - this.tokens) * this.perMs) / this.capacity));
    }
  }
}

/** Política opcional que reciben los clientes (sin ella: sin cupo ni reintentos, útil en pruebas). */
export type CallPolicy = { limiter?: RateLimiter; retry?: RetryOptions };

export type RetryOptions = { retries?: number; baseMs?: number; maxMs?: number; clock?: Clock; random?: () => number };

/** Ejecuta `fn` reintentando solo `ConnectorError` reintentables. */
export async function withRetry<T>(fn: () => Promise<T>, o: RetryOptions = {}): Promise<T> {
  const retries = o.retries ?? 2, base = o.baseMs ?? 500, max = o.maxMs ?? 8_000;
  const clock = o.clock ?? realClock, random = o.random ?? Math.random;
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (e) {
      if (!(e instanceof ConnectorError) || !e.retryable || attempt >= retries) throw e;
      const backoff = Math.min(max, base * 2 ** attempt) * (0.5 + random() / 2); // «equal jitter»
      // Si el proveedor pide esperar más de 30 s, no se reintenta antes de tiempo: se devuelve el error (la caché cubre).
      if (e.retryAfterSec && e.retryAfterSec > 30) throw e;
      const wait = e.retryAfterSec ? e.retryAfterSec * 1000 : backoff;
      await clock.sleep(wait);
    }
  }
}

/** Cupos por sistema, por debajo de los límites documentados (margen para otros usos de la misma cuenta). */
export const LIMITS = {
  trello: { capacity: 80, perMs: 10_000 }, // documentado: 100 / 10 s por token
  sesame: { capacity: 600, perMs: 60_000 }, // documentado: 1.000 / min por EMPRESA, compartido
  a3nomina: { capacity: 1_000, perMs: 60_000 }, // documentado (Conectia): 3.000 / min
} as const;

const shared = new Map<string, RateLimiter>();
/** Un limitador por sistema y cuenta dentro de la instancia. */
export function limiterFor(app: keyof typeof LIMITS, account: string): RateLimiter {
  const key = `${app}:${account}`;
  let l = shared.get(key);
  if (!l) {
    l = new RateLimiter(LIMITS[app].capacity, LIMITS[app].perMs);
    shared.set(key, l);
  }
  return l;
}
