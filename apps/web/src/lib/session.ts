import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { canAccess, homeFor, Role, type NavId } from "@msm/core";
import { getProvider } from "./data";
import { supabaseConfigured } from "./supabase/env";
import { createClient } from "./supabase/server";

/**
 * Sesión de la aplicación (interfaz estable para el resto del código).
 *  - Con Supabase configurado: login real; el rol sale de `memberships` (RLS).
 *  - Sin Supabase y fuera de producción: acceso de DEMOSTRACIÓN local por cookie.
 *  - En producción sin Supabase: no hay acceso (el modo demo jamás se expone).
 */
export type Session = {
  userId: string;
  name: string;
  email: string;
  role: Role;
  /** Rol real (de la base de datos); `role` puede ser una vista previa en la demo. */
  realRole: Role;
  /** TI y Dirección pueden previsualizar otros paneles mientras los datos sean de ejemplo. */
  canPreview: boolean;
};

export type SessionState =
  | { state: "anon" }
  | { state: "no-membership"; email: string }
  | { state: "ok"; session: Session };

const DEMO_COOKIE = "msm_demo_session";
const PREVIEW_COOKIE = "msm_preview_role";

export const DEMO_USERS: Record<Role, { userId: string; name: string; email: string }> = {
  direccion: { userId: "u-dir", name: "Javier Aguilar", email: "direccion@demo.mansera.es" },
  oficina_tecnica: { userId: "u-ot", name: "Elena Marín", email: "tecnica@demo.mansera.es" },
  administracion: { userId: "u-adm", name: "Carmen Vidal", email: "administracion@demo.mansera.es" },
  ti: { userId: "u-ti", name: "Cristina Durán", email: "ti@demo.mansera.es" },
  campo: { userId: "u-cam", name: "Marcos Ruiz", email: "campo@demo.mansera.es" },
};

/** El acceso de demostración solo existe en local y sin Supabase configurado. */
export const demoAuthEnabled = (): boolean =>
  !supabaseConfigured() && process.env.NODE_ENV !== "production" && process.env.MSM_DATA_MODE !== "live";

export const realAuthEnabled = (): boolean => supabaseConfigured();

export async function getSessionState(): Promise<SessionState> {
  if (realAuthEnabled()) return getSupabaseState();
  if (!demoAuthEnabled()) return { state: "anon" };
  const raw = (await cookies()).get(DEMO_COOKIE)?.value;
  const role = Role.safeParse(raw);
  if (!role.success) return { state: "anon" };
  const u = DEMO_USERS[role.data];
  return { state: "ok", session: { ...u, role: role.data, realRole: role.data, canPreview: true } };
}

async function getSupabaseState(): Promise<SessionState> {
  const supabase = await createClient();
  // getUser() valida el token contra Supabase Auth (no se fía solo de la cookie).
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return { state: "anon" };

  const { data: m } = await supabase.from("memberships").select("role").eq("user_id", user.id).limit(1).maybeSingle();
  const real = Role.safeParse(m?.role);
  if (!real.success) return { state: "no-membership", email: user.email ?? "" };

  const { data: p } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
  const canPreview = getProvider().mode === "demo" && (real.data === "ti" || real.data === "direccion");
  const preview = Role.safeParse((await cookies()).get(PREVIEW_COOKIE)?.value);
  return {
    state: "ok",
    session: {
      userId: user.id,
      name: p?.full_name || user.email || "Usuario",
      email: user.email ?? "",
      role: canPreview && preview.success ? preview.data : real.data,
      realRole: real.data,
      canPreview,
    },
  };
}

export async function getSession(): Promise<Session | null> {
  const s = await getSessionState();
  return s.state === "ok" ? s.session : null;
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

const COOKIE_OPTS = { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 8, secure: process.env.NODE_ENV === "production" } as const;

export async function startDemoSession(role: Role): Promise<void> {
  if (!demoAuthEnabled()) throw new Error("Acceso de demostración deshabilitado");
  (await cookies()).set(DEMO_COOKIE, role, COOKIE_OPTS);
}

/** Vista previa de otro panel (solo con datos de ejemplo y rol TI/Dirección). */
export async function setPreviewRole(role: Role): Promise<void> {
  const s = await getSession();
  if (!s?.canPreview) throw new Error("Vista previa no permitida");
  if (demoAuthEnabled()) return startDemoSession(role);
  (await cookies()).set(PREVIEW_COOKIE, role, COOKIE_OPTS);
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  store.delete(DEMO_COOKIE);
  store.delete(PREVIEW_COOKIE);
  if (realAuthEnabled()) await (await createClient()).auth.signOut();
}
