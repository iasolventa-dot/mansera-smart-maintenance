import { timingSafeEqual } from "node:crypto";
import { z } from "zod";

/**
 * Comprobación PURA del retorno de Wolters Kluwer (sin red ni cookies), para poder probar todos los casos.
 * Orden deliberado: primero el `state` (también si el proveedor devuelve `error=`, para que un tercero no pueda
 * abortar un flujo ajeno), después usuario/organización y por último el código.
 */
export const PendingOAuth = z.object({
  state: z.string().min(32),
  nonce: z.string().min(32),
  org: z.uuid(),
  uid: z.uuid(),
  clientId: z.string().min(3),
  redirectUri: z.string().url(),
});
export type PendingOAuth = z.infer<typeof PendingOAuth>;

export type CallbackCheck = { ok: true; code: string; pending: PendingOAuth } | { ok: false; outcome: "caducado" | "denegado" };

const same = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y); // longitud en BYTES: con caracteres multibyte no lanza
};

export function checkCallback(rawPending: string | undefined, params: URLSearchParams, ctx: { uid: string; org: string }): CallbackCheck {
  let pending: PendingOAuth;
  try {
    pending = PendingOAuth.parse(JSON.parse(rawPending ?? ""));
  } catch {
    return { ok: false, outcome: "caducado" }; // sin cookie (más de 10 min, otro navegador) o manipulada
  }
  const state = params.get("state") ?? "";
  if (!same(state, pending.state)) return { ok: false, outcome: "caducado" };
  if (params.get("error")) return { ok: false, outcome: "denegado" };
  if (pending.uid !== ctx.uid || pending.org !== ctx.org) return { ok: false, outcome: "caducado" };
  const code = params.get("code") ?? "";
  if (!code || code.length > 2000) return { ok: false, outcome: "caducado" };
  return { ok: true, code, pending };
}
