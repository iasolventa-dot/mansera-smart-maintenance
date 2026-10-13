import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import {
  NAV_LABEL, ROLE_ACCESS, assistantInstructions, knowledgeText, navFor, parseAssistantReply, sanitizeHistory,
  type NavId, type Role,
} from "@msm/core";
import { realAuthEnabled } from "./session";
import { createClient } from "./supabase/server";

/**
 * Asistente de ayuda (replica el de solventa-prl, adaptado a MANSERA).
 *  - Solo servidor: la clave `ANTHROPIC_API_KEY` nunca llega al navegador (ADR-0006).
 *  - Sin la clave responde `sin_ia` y el navegador usa el «modo guía» (búsqueda en el manual).
 *  - El rol se lee de la base de datos (la sesión), no del navegador.
 *  - Límite diario por usuario; no se guarda el texto de las conversaciones.
 *  - Solo recibe la conversación, el nombre de la pantalla y las secciones permitidas: ningún dato de la empresa.
 */
export type AssistantInput = { messages: unknown; panel: string | null };
export type AssistantResult =
  | { ok: true; text: string; sources: string[]; mode: "ia" }
  | { ok: false; mode: "sin_ia" | "limite" | "error_ia"; error?: string };

const MODEL = process.env.ASISTENTE_MODELO || "claude-opus-5-5";
const LIMIT = Number.parseInt(process.env.ASISTENTE_LIMITE_DIARIO ?? "150", 10) || 150;

/** Contador en memoria para el modo de demostración local (sin Supabase). */
const memoryCounter = new Map<string, number>();

async function countUse(userId: string): Promise<number | null> {
  if (realAuthEnabled()) {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("assistant_log_use");
    if (error) {
      console.error("asistente: contador", error.message);
      return null; // si falla el contador no se bloquea al usuario
    }
    return typeof data === "number" ? data : null;
  }
  const key = `${userId}:${new Date().toISOString().slice(0, 10)}`;
  const n = (memoryCounter.get(key) ?? 0) + 1;
  memoryCounter.set(key, n);
  return n;
}

export async function askAssistantServer(user: { id: string; role: Role }, input: AssistantInput): Promise<AssistantResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { ok: false, mode: "sin_ia" };

  const messages = sanitizeHistory(input.messages);
  if (!messages.length || messages[messages.length - 1]!.role !== "user") return { ok: false, mode: "error_ia", error: "Falta la pregunta" };

  const used = await countUse(user.id);
  if (typeof used === "number" && used > LIMIT) {
    return { ok: false, mode: "limite", error: `Has llegado al límite de ${LIMIT} preguntas de hoy. Mañana podrás seguir; mientras tanto respondo con el manual.` };
  }

  const allowedNav: NavId[] = navFor(user.role);
  const panelName = input.panel ? String(input.panel).slice(0, 60) : null;
  const client = new Anthropic({ apiKey, timeout: 45_000, maxRetries: 1 });

  try {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      output_config: { effort: "low" }, // ayuda de consulta: respuesta rápida
      // La base de conocimiento va primero y es idéntica en cada petición: se cachea.
      // Lo que cambia con el rol y la pantalla va después del punto de caché.
      system: [
        { type: "text", text: knowledgeText(), cache_control: { type: "ephemeral" } },
        { type: "text", text: assistantInstructions({ roleLabel: ROLE_ACCESS[user.role].label, panelName, allowedNav }) },
      ],
      messages,
    });

    if (res.stop_reason === "refusal") return { ok: false, mode: "error_ia", error: "La IA no ha podido responder a eso." };
    const raw = res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n").trim();
    if (!raw) return { ok: false, mode: "error_ia", error: "Respuesta vacía" };
    const parsed = parseAssistantReply(raw, allowedNav);
    return { ok: true, text: parsed.text || "No he sabido responder a eso. ¿Puedes reformular la pregunta?", sources: parsed.sources, mode: "ia" };
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return { ok: false, mode: "error_ia", error: "La IA está muy solicitada ahora mismo." };
    if (e instanceof Anthropic.AuthenticationError) {
      console.error("asistente: clave de Anthropic no válida");
      return { ok: false, mode: "error_ia", error: "La IA no está bien configurada." };
    }
    if (e instanceof Anthropic.APIConnectionTimeoutError) return { ok: false, mode: "error_ia", error: "La IA tardó demasiado en responder." };
    if (e instanceof Anthropic.APIError) {
      console.error("asistente:", e.status, e.message.slice(0, 300));
      return { ok: false, mode: "error_ia", error: `La IA no está disponible ahora mismo (${e.status}).` };
    }
    console.error("asistente:", (e as Error).message);
    return { ok: false, mode: "error_ia", error: "Error inesperado" };
  }
}

export { NAV_LABEL };
