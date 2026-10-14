import type { Offer } from "./modules";
import type { Series } from "./schemas";

/**
 * Cálculos de indicadores (fuera de los componentes, regla de CLAUDE.md). Sin dato ⇒ null, nunca 0 inventado.
 */
export type PipelineKpis = {
  openCount: number;
  openAmount: number;
  weighted: number;
  wonAmount: number;
  won: number;
  lost: number;
  /** % de ofertas ganadas sobre las cerradas; null si no hay ninguna cerrada. */
  winRate: number | null;
};

export function pipelineKpis(offers: Offer[]): PipelineKpis {
  const open = offers.filter((o) => o.stage === "borrador" || o.stage === "enviada" || o.stage === "negociacion");
  const won = offers.filter((o) => o.stage === "ganada");
  const lost = offers.filter((o) => o.stage === "perdida");
  const closed = won.length + lost.length;
  return {
    openCount: open.length,
    openAmount: open.reduce((s, o) => s + o.amountEur, 0),
    weighted: Math.round(open.reduce((s, o) => s + o.amountEur * (o.probability / 100), 0)),
    wonAmount: won.reduce((s, o) => s + o.amountEur, 0),
    won: won.length,
    lost: lost.length,
    winRate: closed ? Math.round((won.length / closed) * 100) : null,
  };
}

/** Último valor de una serie y su variación con el anterior (null si faltan datos). */
export function lastWithDelta(series: Series[]): { value: number | null; delta: number | null } {
  const value = series.at(-1)?.value ?? null;
  const prev = series.at(-2)?.value ?? null;
  return { value, delta: value !== null && prev !== null ? Math.round((value - prev) * 10) / 10 : null };
}

/** «1 perdida» / «2 perdidas». */
export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
