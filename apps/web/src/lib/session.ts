import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { canAccess, homeFor, Role, type NavId } from "@msm/core";

/**
 * Sesión de la aplicación. Interfaz estable: `getSession()` / `requireSession()`.
 * Hoy la sesión es de DEMOSTRACIÓN (cookie firmada por nadie, solo para enseñar la UI).
 * En M0 (Supabase Auth) solo se reemplaza la implementación de este fichero;
 * el rol saldrá de `memberships` y se aplicará con RLS en base de datos.
 */
export type Session = { userId: string; name: string; email: string; role: Role };

const COOKIE = "msm_demo_session";

export const DEMO_USERS: Record<Role, Session> = {
  direccion: { userId: "u-dir", name: "Javier Aguilar", email: "direccion@demo.mansera.es", role: "direccion" },
  oficina_tecnica: { userId: "u-ot", name: "Elena Marín", email: "tecnica@demo.mansera.es", role: "oficina_tecnica" },
  administracion: { userId: "u-adm", name: "Carmen Vidal", email: "administracion@demo.mansera.es", role: "administracion" },
  ti: { userId: "u-ti", name: "Cristina Durán", email: "ti@demo.mansera.es", role: "ti" },
  campo: { userId: "u-cam", name: "Marcos Ruiz", email: "campo@demo.mansera.es", role: "campo" },
};

/** El acceso de demostración jamás debe existir en producción. */
export const demoAuthEnabled = (): boolean => process.env.MSM_DATA_MODE !== "live";

export async function getSession(): Promise<Session | null> {
  if (!demoAuthEnabled()) return null;
  const raw = (await cookies()).get(COOKIE)?.value;
  const role = Role.safeParse(raw);
  return role.success ? DEMO_USERS[role.data] : null;
}

export async function requireSession(): Promise<Session> {
  const s = await getSession();
  if (!s) redirect("/login");
  return s;
}

/** Guarda de ruta: un rol sin acceso a la sección vuelve a su inicio. */
export async function requireAccess(id: NavId): Promise<Session> {
  const s = await requireSession();
  if (!canAccess(s.role, id)) redirect(homeFor(s.role));
  return s;
}

export async function startDemoSession(role: Role): Promise<void> {
  if (!demoAuthEnabled()) throw new Error("Acceso de demostración deshabilitado");
  (await cookies()).set(COOKIE, role, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 8 });
}

export async function endSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}
