import { validateGatewayCredentials } from "@msm/core";
import type { GatewayConfig } from "./runner";

/**
 * Configuración del gateway (ADR-0012): las credenciales de A3ERP viven SOLO aquí, en el equipo de la red de MANSERA.
 * Hoy se leen de variables de entorno del servicio; en la instalación real (M2) vendrán de un fichero local cifrado
 * con DPAPI (`config.local.*`, fuera de git). Se validan con las mismas reglas del catálogo (`specs.ts`).
 * Los mensajes de error nunca incluyen valores.
 */
export type ConfigResult = { ok: true; config: GatewayConfig } | { ok: false; errors: string[] };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function loadConfig(env: Record<string, string | undefined>): ConfigResult {
  const errors: string[] = [];
  const orgId = env.MSM_ORG_ID ?? "";
  const signingKey = env.MSM_GATEWAY_KEY ?? "";
  if (!UUID.test(orgId)) errors.push("MSM_ORG_ID no es un identificador de organización válido.");
  if (signingKey.length < 32) errors.push("MSM_GATEWAY_KEY debe tener al menos 32 caracteres.");

  let a3: GatewayConfig["a3"] = null;
  const wantsA3 = env.A3_URL || env.A3_APIKEY;
  if (wantsA3) {
    const r = validateGatewayCredentials("a3erp", { baseUrl: env.A3_URL ?? "", apiKey: env.A3_APIKEY ?? "" });
    if (r.ok) a3 = { baseUrl: r.config.baseUrl!, apiKey: r.secrets.apiKey! };
    else errors.push(...r.errors.map((e) => `A3ERP: ${e}`));
  }
  return errors.length ? { ok: false, errors } : { ok: true, config: { orgId, signingKey, a3 } };
}
