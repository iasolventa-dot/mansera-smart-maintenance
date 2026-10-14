import "server-only";
import { z } from "zod";
import { ConnectorError, refreshTokens } from "@msm/connectors";
import { createAdminClient } from "./supabase/admin";

/**
 * Renovación programada del refresh token de a3innuva Nómina (R-22): Wolters Kluwer lo invalida a los 30 días sin uso.
 * Se ejecuta a diario desde la tarea programada de Vercel. Guarda SIEMPRE el refresh token devuelto (atado al client_id).
 * Si Wolters Kluwer rechaza la renovación, marca la conexión en error para que TI vuelva a conectar.
 */
const Secret = z.object({ clientSecret: z.string().min(1), refreshToken: z.string().min(1).optional() });

export async function refreshA3NominaTokens(): Promise<{ renovadas: number; sinToken: number; fallidas: number }> {
  const admin = createAdminClient();
  const { data: rows } = await admin.from("connections").select("org_id, config, status").eq("app", "a3nomina").in("status", ["autorizada", "verificada", "error"]);
  const out = { renovadas: 0, sinToken: 0, fallidas: 0 };
  for (const row of rows ?? []) {
    const orgId = String(row.org_id);
    const clientId = (row.config as { clientId?: string } | null)?.clientId;
    try {
      const { data: text } = await admin.rpc("connection_read_secret", { p_org: orgId, p_app: "a3nomina" });
      const s = Secret.safeParse(typeof text === "string" ? JSON.parse(text) : null);
      if (!clientId || !s.success || !s.data.refreshToken) {
        out.sinToken++;
        continue;
      }
      const t = await refreshTokens({ clientId, clientSecret: s.data.clientSecret }, s.data.refreshToken);
      const { error } = await admin.rpc("connection_rotate_oauth", { p_org: orgId, p_app: "a3nomina", p_client_id: clientId, p_refresh: t.refreshToken });
      if (error) throw new Error("rotate");
      out.renovadas++;
    } catch (e) {
      out.fallidas++;
      console.error("[cron a3nomina] fallo:", e instanceof ConnectorError ? e.kind : "inesperado");
      if (e instanceof ConnectorError && e.kind === "auth") {
        await admin.from("connections").update({
          status: "error", last_check_at: new Date().toISOString(),
          last_check_message: "La autorización de Wolters Kluwer ha caducado o se ha revocado: vuelve a pulsar «Conectar con Wolters Kluwer».",
        }).eq("org_id", orgId).eq("app", "a3nomina");
      }
    }
  }
  return out;
}
