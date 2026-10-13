import "server-only";
import type { DataProvider } from "@msm/core";
import { DemoDataProvider } from "@msm/core/demo";

/**
 * ÚNICO punto donde se elige de dónde salen los datos.
 * Hoy: datos de ejemplo. Cuando existan los conectores (M2), aquí se devolverá
 * un `LiveDataProvider` (conectores + Supabase) con `MSM_DATA_MODE=live`;
 * ninguna pantalla cambia.
 */
let instance: DataProvider | undefined;

export function getProvider(): DataProvider {
  if (process.env.MSM_DATA_MODE === "live") {
    throw new Error("MSM_DATA_MODE=live todavía no tiene implementación (pendiente de M2).");
  }
  instance ??= new DemoDataProvider();
  return instance;
}
