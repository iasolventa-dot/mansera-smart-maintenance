import "server-only";
import { cookies } from "next/headers";
import { z } from "zod";
import { Proposal } from "@msm/core";

/**
 * Estado de la DEMOSTRACIÓN por sesión de navegador (cookie): propuestas creadas y decisiones.
 * Con datos reales (`DataProvider` live) esto desaparece: la propuesta vive en `sync_proposals`.
 * Se guarda en cookie y no en memoria porque en Vercel cada petición puede caer en otra instancia.
 */
const COOKIE = "msm_demo_state";
const Overlay = z.object({
  decided: z.record(z.string(), z.object({ status: z.enum(["aprobada", "rechazada"]), by: z.string() })).default({}),
  created: z.array(Proposal).default([]),
});
type Overlay = z.infer<typeof Overlay>;

async function read(): Promise<Overlay> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return { decided: {}, created: [] };
  try {
    return Overlay.parse(JSON.parse(raw));
  } catch {
    return { decided: {}, created: [] };
  }
}

async function write(o: Overlay): Promise<void> {
  const trimmed: Overlay = { decided: o.decided, created: o.created.slice(0, 4) };
  (await cookies()).set(COOKIE, JSON.stringify(trimmed), {
    httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 8, secure: process.env.NODE_ENV === "production",
  });
}

/** Aplica las acciones de la sesión sobre la lista que devuelve el proveedor. */
export async function applyOverlay(list: Proposal[]): Promise<Proposal[]> {
  const o = await read();
  const merged = [...o.created, ...list].map((p) => {
    const d = o.decided[p.id];
    return d ? { ...p, status: d.status, summary: `${p.summary} · ${d.status === "aprobada" ? "Aprobada" : "Rechazada"} por ${d.by}.` } : p;
  });
  return merged;
}

export async function recordCreated(p: Proposal): Promise<void> {
  const o = await read();
  await write({ ...o, created: [p, ...o.created] });
}

export async function recordDecision(id: string, status: "aprobada" | "rechazada", by: string): Promise<void> {
  const o = await read();
  await write({ ...o, decided: { ...o.decided, [id]: { status, by } } });
}
