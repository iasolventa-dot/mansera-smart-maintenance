import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { refreshA3NominaTokens } from "@/lib/oauth-refresh";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Tarea programada diaria (vercel.json). Vercel la llama con `Authorization: Bearer <CRON_SECRET>`.
 * Sin CRON_SECRET configurado no hace nada: nadie de fuera puede dispararla.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !adminConfigured()) return NextResponse.json({ ok: false, motivo: "no configurado" }, { status: 503 });
  const got = request.headers.get("authorization") ?? "";
  const want = `Bearer ${secret}`;
  if (got.length !== want.length || !timingSafeEqual(Buffer.from(got), Buffer.from(want))) return new NextResponse(null, { status: 401 });
  const tokens = await refreshA3NominaTokens();
  // Retención: la caché con datos personales no se conserva más de 24 h (docs/14).
  const { data: purgadas } = await createAdminClient().rpc("purge_connector_snapshots", { p_max_age_hours: 24 });
  return NextResponse.json({ ok: true, ...tokens, cachesPurgadas: typeof purgadas === "number" ? purgadas : null });
}
