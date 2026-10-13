import { NAV_LABEL, ROLE_ACCESS, canAccess, type NavId } from "../access";
import type { Role } from "../schemas";
import { MANUAL, type ManualChapter, type ManualTask } from "./content";

/* ───────── Normalización y tokens ───────── */
const STOP = new Set(
  ("segun a al algo algun alguna como con cual cuales cuando de del donde el ella en entre es esa ese eso esta este esto estoy hay la las le lo los " +
    "me mi mis muy no nos o para pero por porque puedo puede que quiero se sea si sin sobre su sus tengo tiene te ti tu tus un una uno unos unas y ya " +
    "hacer hago hace debo deberia necesito saber quisiera ayuda ayudame favor aplicacion app mansera").split(" "),
);

/** Minúsculas, sin tildes ni signos. */
export function norm(s: string): string {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9ñ ]+/g, " ");
}

export function tokens(s: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of norm(s).split(/\s+/)) {
    if (!t || (t.length < 3 && !/^\d+$/.test(t)) || STOP.has(t) || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

/** Coincidencia tolerante: igual, prefijo (≥ 4) o mismos 6 primeros caracteres (singular/plural, género, conjugación). */
function matches(a: string, b: string): boolean {
  if (a === b) return true;
  const n = Math.min(a.length, b.length);
  if (n >= 4 && (a.startsWith(b) || b.startsWith(a))) return true;
  if (n >= 6 && a.slice(0, 6) === b.slice(0, 6)) return true;
  // Misma raíz con distinta terminación (busco/buscar, aviso/avisar): comparten todo salvo la última letra de la más corta.
  let cp = 0;
  while (cp < n && a[cp] === b[cp]) cp++;
  return n >= 5 && cp >= 4 && cp >= n - 1;
}

/* ───────── Índice ───────── */
export type HelpEntry = {
  task: ManualTask;
  chapter: ManualChapter;
  tTitle: string[];
  tKeys: string[];
  tBody: string[];
};

const strip = (s: string) => s.replace(/\*\*/g, "");
const ENTRIES: HelpEntry[] = MANUAL.flatMap((chapter) =>
  chapter.tasks.map((task) => ({
    task,
    chapter,
    tTitle: tokens(task.title),
    tKeys: tokens(task.keywords.join(" ")),
    tBody: tokens([...task.steps, ...(task.notes ?? []).map((n) => n.text)].map(strip).join(" ")),
  })),
);

export const helpEntries = (): readonly HelpEntry[] => ENTRIES;
export const findTask = (id: string): HelpEntry | undefined => ENTRIES.find((e) => e.task.id === id);

/** Roles que tienen acceso a la sección de la tarea (null = todos, tarea general). */
export function rolesFor(panel: NavId | null): Role[] | null {
  if (!panel) return null;
  return (Object.keys(ROLE_ACCESS) as Role[]).filter((r) => canAccess(r, panel));
}

/** Texto para el manual: «Disponible para …» solo cuando la sección está restringida. */
export function availabilityLabel(panel: NavId | null): string | null {
  const roles = rolesFor(panel);
  // Solo interesa avisar cuando la sección es restringida; «casi todos» no aporta nada.
  if (!roles || roles.length > 4) return null;
  return roles.map((r) => ROLE_ACCESS[r].label.split(" · ")[0]).join(", ");
}

/** Tarea a la que lleva el icono «?» de cada sección. */
export function anchorFor(panel: NavId | null): string | null {
  if (!panel) return null;
  return ENTRIES.find((e) => e.task.panel === panel)?.task.id ?? null;
}

/* ───────── Búsqueda ───────── */
/** Intenciones que el simple recuento de palabras no distingue: «no veo X» pide permisos, no la pantalla X. */
const INTENTS: { re: RegExp; task: string; boost: number }[] = [
  { re: /no (me )?(veo|vea|aparece|aparecen|sale|salen|muestra|deja|dejan|puedo (ver|entrar|acceder|abrir))/, task: "roles", boost: 16 },
];
export type HelpHit = { entry: HelpEntry; score: number; accessible: boolean };

/**
 * Busca las tareas más parecidas a la pregunta. Puntúa título (×4), sinónimos (×3) y texto (×1),
 * pondera cada palabra por lo rara que es en el manual, y da un pequeño empujón a la sección abierta.
 * Las tareas de secciones a las que el rol no accede se devuelven con `accessible: false`.
 */
export function searchHelp(query: string, opts: { panel?: NavId | null; role?: Role } = {}): HelpHit[] {
  const q = tokens(query);
  if (!q.length) return [];
  const has = (list: string[], t: string) => list.some((x) => matches(x, t));
  const n = ENTRIES.length;
  const weights = q.map((t) => {
    const df = ENTRIES.filter((e) => has(e.tTitle, t) || has(e.tKeys, t) || has(e.tBody, t)).length;
    return df ? Math.log(1 + n / df) : 0;
  });
  const hits: HelpHit[] = [];
  for (const entry of ENTRIES) {
    let score = 0;
    q.forEach((t, i) => {
      const w = weights[i] ?? 0;
      if (!w) return;
      if (has(entry.tTitle, t)) score += 4 * w;
      if (has(entry.tKeys, t)) score += 3 * w;
      if (has(entry.tBody, t)) score += 1 * w;
    });
    if (score && opts.panel && entry.task.panel === opts.panel) score += 0.6;
    for (const it of INTENTS) if (entry.task.id === it.task && it.re.test(norm(query))) score += it.boost;
    if (score > 0) {
      const accessible = !opts.role || !entry.task.panel || canAccess(opts.role, entry.task.panel);
      hits.push({ entry, score, accessible });
    }
  }
  return hits.sort((a, b) => b.score - a.score);
}

/* ───────── Respuesta local («modo guía», sin IA) ───────── */
export type LocalAnswer = { text: string; sources: string[]; related: string[] };
export const MIN_SCORE = 3;

const NOTE_LABEL = { info: "Nota", importante: "Importante", consejo: "Consejo" } as const;

export function answerLocally(question: string, opts: { panel?: NavId | null; role?: Role } = {}): LocalAnswer {
  const n = norm(question).trim();
  if (/^(hola|buenas|buenos dias|buenas tardes|hey|saludos)\b/.test(n) && n.split(" ").length <= 3) {
    return { text: "¡Hola! Pregúntame cómo hacer algo en la aplicación. Por ejemplo: «¿cómo creo una orden de trabajo?» o «¿qué significa el semáforo?».", sources: [], related: [] };
  }
  if (/^(gracias|muchas gracias|genial|perfecto|ok|vale|estupendo)\b/.test(n) && n.split(" ").length <= 4) {
    return { text: "¡De nada! Si te surge otra duda, aquí estoy.", sources: [], related: [] };
  }
  const hits = searchHelp(question, opts);
  const top = hits[0];
  if (!top || top.score < MIN_SCORE) {
    return {
      text: "No he encontrado nada sobre eso en el manual. Prueba con otras palabras (el nombre de la sección o del botón). Para preguntas sobre tus datos, usa el Copiloto de IA. Algunos temas en los que puedo ayudarte:",
      sources: [],
      related: ["Entrar en la aplicación", "Por qué no veo un apartado del menú", "Crear una orden de trabajo (acción rápida)", "Aprobar o rechazar una propuesta"],
    };
  }
  const { task } = top.entry;
  const lines = [`**${task.title}**`, "", ...task.steps.map((s, i) => `${i + 1}. ${s}`)];
  for (const note of task.notes ?? []) lines.push("", `**${NOTE_LABEL[note.kind]}:** ${note.text}`);
  if (!top.accessible && task.panel) {
    lines.push("", `Tu perfil no tiene acceso a «${NAV_LABEL[task.panel]}». Si lo necesitas, pídeselo a TI.`);
  } else if (task.panel && task.panel !== opts.panel && task.panel !== "manual") {
    lines.push("", `[[ir:${task.panel}|${NAV_LABEL[task.panel]}]]`);
  }
  const related = hits.slice(1, 4).filter((h) => h.score >= top.score * 0.45).map((h) => h.entry.task.title);
  return { text: lines.join("\n"), sources: [task.id], related };
}

/* ───────── Conocimiento para la IA ───────── */
/**
 * Texto que se envía al modelo como base de conocimiento. Determinista (mismo orden y contenido siempre)
 * para que la caché de prompts funcione. Cada ficha lleva su id para poder citarla.
 */
export function knowledgeText(): string {
  const parts: string[] = ["# Base de conocimiento de MANSERA Smart Maintenance"];
  for (const ch of MANUAL) {
    parts.push("", `# CAPÍTULO: ${ch.title}`, ch.intro);
    for (const t of ch.tasks) {
      const avail = availabilityLabel(t.panel);
      parts.push("", `## [${t.id}] ${t.title}`);
      if (t.panel) parts.push(`Sección: ${NAV_LABEL[t.panel]} (id de sección: ${t.panel})${avail ? ` · Disponible para: ${avail}` : ""}`);
      parts.push(`Palabras clave: ${t.keywords.join(", ")}`);
      t.steps.forEach((s, i) => parts.push(`${i + 1}. ${s}`));
      for (const note of t.notes ?? []) parts.push(`${NOTE_LABEL[note.kind]}: ${note.text}`);
    }
  }
  return parts.join("\n");
}
