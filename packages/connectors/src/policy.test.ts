import { describe, expect, it } from "vitest";
import { ConnectorError } from "./errors";
import { RateLimiter, withRetry, type Clock } from "./policy";

/** Reloj simulado: `sleep` avanza el tiempo al instante. */
function fakeClock(): Clock & { slept: number[] } {
  let t = 0;
  const slept: number[] = [];
  return { now: () => t, sleep: async (ms) => { slept.push(ms); t += ms; }, slept };
}

describe("reintentos", () => {
  it("reintenta errores transitorios con espera creciente y acaba devolviendo el resultado", async () => {
    const clock = fakeClock();
    let n = 0;
    const r = await withRetry(async () => { if (++n < 3) throw new ConnectorError("transient", "x"); return "ok"; }, { clock, random: () => 1, baseMs: 100 });
    expect(r).toBe("ok");
    expect(clock.slept).toEqual([100, 200]);
  });
  it("respeta Retry-After en un 429", async () => {
    const clock = fakeClock();
    let n = 0;
    await withRetry(async () => { if (++n < 2) throw new ConnectorError("rate_limited", "x", 7); return 1; }, { clock });
    expect(clock.slept).toEqual([7000]);
  });
  it("si Retry-After pide más de 30 s, no reintenta antes de tiempo", async () => {
    let n = 0;
    await expect(withRetry(async () => { n++; throw new ConnectorError("rate_limited", "x", 120); }, { clock: fakeClock() })).rejects.toMatchObject({ retryAfterSec: 120 });
    expect(n).toBe(1);
  });
  it("no reintenta errores de credenciales ni de formato, ni excepciones ajenas", async () => {
    for (const e of [new ConnectorError("auth", "x"), new ConnectorError("validation", "x"), new Error("otro")]) {
      let n = 0;
      await expect(withRetry(async () => { n++; throw e; }, { clock: fakeClock() })).rejects.toBe(e);
      expect(n).toBe(1);
    }
  });
  it("se rinde tras el máximo de reintentos", async () => {
    let n = 0;
    await expect(withRetry(async () => { n++; throw new ConnectorError("transient", "x"); }, { clock: fakeClock(), retries: 2 })).rejects.toMatchObject({ kind: "transient" });
    expect(n).toBe(3);
  });
});

describe("cupo (token bucket)", () => {
  it("deja pasar ráfagas hasta la capacidad y después espera lo justo", async () => {
    const clock = fakeClock();
    const l = new RateLimiter(5, 1000, clock);
    for (let i = 0; i < 5; i++) await l.take();
    expect(clock.slept).toEqual([]);
    await l.take();
    expect(clock.slept).toEqual([200]); // 1 ficha cada 200 ms
  });
  it("nunca supera el ritmo configurado", async () => {
    const clock = fakeClock();
    const l = new RateLimiter(10, 60_000, clock);
    for (let i = 0; i < 40; i++) await l.take();
    // 40 peticiones con 10/min: al menos 3 minutos.
    expect(clock.now()).toBeGreaterThanOrEqual(3 * 60_000 - 1);
  });
});
