import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseKey, supabaseUrl } from "./env";

/** Cliente de Supabase en servidor, con la sesión del usuario (las consultas pasan por RLS). */
export async function createClient() {
  if (!supabaseUrl || !supabaseKey) throw new Error("Supabase no está configurado");
  const store = await cookies();
  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Llamado desde un Server Component: el refresco de sesión lo hace proxy.ts.
        }
      },
    },
  });
}
