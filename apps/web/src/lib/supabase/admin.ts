import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { supabaseUrl } from "./env";

/**
 * Cliente con la CLAVE DE SERVICIO (ADR-0013). Salta RLS: úsese solo en el servidor y solo para las funciones
 * pensadas para ello (`connection_read_secret`, `connection_store_oauth`). Nunca se envía al navegador
 * (`server-only` hace fallar el build si un componente de cliente lo importa).
 * Acepta el nombre manual (`SUPABASE_SERVICE_ROLE_KEY`) y el de la integración de Vercel (`SUPABASE_SECRET_KEY`).
 */
const serviceKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";

export const adminConfigured = (): boolean => Boolean(supabaseUrl && serviceKey());

export function createAdminClient() {
  const key = serviceKey();
  if (!supabaseUrl || !key) throw new Error("Falta la clave de servicio de Supabase en el servidor.");
  return createSupabaseClient(supabaseUrl, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}
