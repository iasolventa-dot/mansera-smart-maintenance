"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { homeFor, Role, type CopilotAnswer } from "@msm/core";
import { getProvider } from "@/lib/data";
import { DEMO_USERS, endSession, requireSession, startDemoSession } from "@/lib/session";

export async function signInDemo(formData: FormData): Promise<void> {
  const role = Role.safeParse(formData.get("role") ?? "direccion");
  if (!role.success) redirect("/login");
  await startDemoSession(role.data);
  redirect(homeFor(role.data));
}

export async function switchRole(formData: FormData): Promise<void> {
  const role = Role.safeParse(formData.get("role"));
  if (!role.success) return;
  await startDemoSession(role.data);
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
  await getProvider().decideProposal(id, decision, DEMO_USERS[session.role].name);
  revalidatePath("/propuestas");
}

export async function askCopilot(question: string): Promise<CopilotAnswer> {
  const session = await requireSession();
  const q = question.trim().slice(0, 500);
  return getProvider().askCopilot(q, session.role);
}
