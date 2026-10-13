"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { homeFor, NewWorkOrderInput, Role, type CopilotAnswer, type SearchHit } from "@msm/core";
import { getProvider } from "@/lib/data";
import { askAssistantServer, type AssistantResult } from "@/lib/assistant";
import { applyOverlay, recordCreated, recordDecision } from "@/lib/demo-state";
import { createClient } from "@/lib/supabase/server";
import { endSession, realAuthEnabled, requireSession, setPreviewRole, startDemoSession } from "@/lib/session";

const Credentials = z.object({ email: z.email().max(200), password: z.string().min(1).max(200) });

/** Login real con Supabase Auth. Mensaje de error genérico (no revela si el correo existe). */
export async function signInWithPassword(formData: FormData): Promise<void> {
  if (!realAuthEnabled()) redirect("/login");
  const parsed = Credentials.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) redirect("/login?error=credenciales");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) redirect("/login?error=credenciales");
  redirect("/");
}

/** Acceso de demostración local (deshabilitado con Supabase y en producción). */
export async function signInDemo(formData: FormData): Promise<void> {
  const role = Role.safeParse(formData.get("role") ?? "direccion");
  if (!role.success) redirect("/login");
  await startDemoSession(role.data);
  redirect(homeFor(role.data));
}

/** Previsualizar el panel de otro rol (solo TI/Dirección y datos de ejemplo). */
export async function switchRole(formData: FormData): Promise<void> {
  const role = Role.safeParse(formData.get("role"));
  if (!role.success) return;
  await setPreviewRole(role.data);
  redirect(homeFor(role.data));
}

export async function signOut(): Promise<void> {
  await endSession();
  redirect("/login");
}

export async function decideProposal(formData: FormData): Promise<void> {
  const session = await requireSession();
  const id = String(formData.get("id") ?? "");
  const decision = formData.get("decision") === "aprobada" ? "aprobada" : "rechazada";
  const current = (await applyOverlay(await getProvider().listProposals())).find((p) => p.id === id);
  if (!current || current.status !== "pendiente") return;
  await recordDecision(id, decision, session.name);
  revalidatePath("/propuestas");
}

export type CreateOrderResult = { ok: true; id: string } | { ok: false; error: string };

/** Acción rápida: crea una PROPUESTA de OT (nunca escribe en PGMWin sin aprobación). */
export async function createWorkOrder(input: NewWorkOrderInput): Promise<CreateOrderResult> {
  const session = await requireSession();
  const parsed = NewWorkOrderInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revisa los datos: falta cliente, activo o descripción." };
  const proposal = await getProvider().createWorkOrderProposal(parsed.data, session.name);
  await recordCreated(proposal);
  revalidatePath("/propuestas");
  return { ok: true, id: proposal.id };
}

export async function askCopilot(question: string): Promise<CopilotAnswer> {
  const session = await requireSession();
  const q = question.trim().slice(0, 500);
  return getProvider().askCopilot(q, session.role);
}

export async function searchAll(query: string): Promise<SearchHit[]> {
  const session = await requireSession();
  return getProvider().search(query.slice(0, 80), session.role);
}

/** Asistente de ayuda: la IA (si está activada) responde desde el servidor; si no, el navegador usa el modo guía. */
export async function askAssistant(input: { messages: unknown; panel: string | null }): Promise<AssistantResult> {
  const session = await requireSession();
  return askAssistantServer({ id: session.userId, role: session.role }, input);
}
