"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { BookOpen, LifeBuoy, RotateCcw, SendHorizontal, X } from "lucide-react";
import { HINT, SUGGESTIONS, answerLocally, anchorFor, findTask, type NavId } from "@msm/core";
import { Tooltip, cn, spring } from "@msm/ui";
import type { AssistantResult } from "@/lib/assistant";

type NavLite = { id: string; label: string; href: string };
type Msg = { role: "user" | "assistant"; content: string; sources?: string[]; related?: string[]; note?: string };
type Props = {
  nav: NavLite[];
  storageKey: string;
  ask: (input: { messages: { role: "user" | "assistant"; content: string }[]; panel: string | null }) => Promise<AssistantResult>;
  role: string;
};

/** Evento para preguntar al asistente desde otro componente (p. ej. la paleta Ctrl+K). */
export const HELP_ASK_EVENT = "msm:help-ask";

/* ───────── Texto con formato mínimo: párrafos, listas, **negrita** y botones [[ir:id|Texto]] ───────── */
function Inline({ text, nav, onGo }: { text: string; nav: NavLite[]; onGo: (href: string) => void }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[\[ir:[a-z0-9-]+\|[^\]]{1,80}\]\])/g);
  return (
    <>
      {parts.map((p, i) => {
        const b = p.match(/^\*\*([^*]+)\*\*$/);
        if (b) return <strong key={i}>{b[1]}</strong>;
        const l = p.match(/^\[\[ir:([a-z0-9-]+)\|([^\]]+)\]\]$/);
        if (l) {
          const target = nav.find((n) => n.id === l[1]);
          if (!target) return null; // nunca se ofrece una pantalla que el rol no ve
          return (
            <button key={i} onClick={() => onGo(target.href)} className="mx-0.5 my-1 inline-flex min-h-9 items-center gap-1 rounded-full bg-primary px-3.5 text-[14px] font-bold text-white hover:bg-primary-hover">
              {l[2]} →
            </button>
          );
        }
        return <Fragment key={i}>{p}</Fragment>;
      })}
    </>
  );
}

function Rich({ text, nav, onGo }: { text: string; nav: NavLite[]; onGo: (href: string) => void }) {
  const blocks: ReactNode[] = [];
  let list: { type: "ol" | "ul"; items: string[] } | null = null;
  let para: string[] = [];
  const flushPara = () => { if (para.length) { blocks.push(<p key={blocks.length} className="mb-2 last:mb-0">{para.map((l, i) => <Fragment key={i}>{i ? <br /> : null}<Inline text={l} nav={nav} onGo={onGo} /></Fragment>)}</p>); para = []; } };
  const flushList = () => {
    if (!list) return;
    const Tag = list.type;
    blocks.push(<Tag key={blocks.length} className={cn("mb-2 grid gap-1 pl-5 last:mb-0", Tag === "ol" ? "list-decimal" : "list-disc")}>{list.items.map((it, i) => <li key={i}><Inline text={it} nav={nav} onGo={onGo} /></li>)}</Tag>);
    list = null;
  };
  for (const line of text.replace(/\r/g, "").split("\n")) {
    const m = line.match(/^\s*([-*•]|\d{1,2}[.)])\s+(.*)$/);
    if (m) {
      flushPara();
      const type = /\d/.test(m[1]!) ? "ol" : "ul";
      if (list && list.type !== type) flushList();
      list ??= { type, items: [] };
      list.items.push(m[2]!);
    } else if (!line.trim()) { flushList(); flushPara(); }
    else { flushList(); para.push(line); }
  }
  flushList(); flushPara();
  return <>{blocks}</>;
}

/* ───────── Asistente ───────── */
export function HelpAssistant({ nav, storageKey, ask, role }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [noAI, setNoAI] = useState(false);
  const [mode, setMode] = useState<"ia" | "guia" | null>(null);
  const [balloon, setBalloon] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  const panel = useMemo(() => nav.find((n) => pathname === n.href || pathname.startsWith(n.href + "/")) ?? null, [nav, pathname]);
  const manualHref = `/manual${panel ? "#" + (anchorFor(panel.id as NavId) ?? "") : ""}`;
  const hidden = pathname.startsWith("/copiloto"); // el Copiloto ya es un chat; evita tapar su cuadro de texto

  // Historial y estado de la IA en sessionStorage (se borran al cerrar la pestaña)
  useEffect(() => {
    try {
      const v = JSON.parse(sessionStorage.getItem(storageKey) ?? "null");
      // Restaura desde un sistema externo (almacenamiento del navegador), que no existe en el servidor.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (v && Array.isArray(v.msgs)) setMsgs(v.msgs.slice(-40));
      if (v?.noAI) setNoAI(true);
    } catch { /* sin almacenamiento: el chat funciona igual */ }
  }, [storageKey]);
  useEffect(() => {
    try { sessionStorage.setItem(storageKey, JSON.stringify({ msgs: msgs.slice(-40), noAI })); } catch { /* ignorar */ }
  }, [msgs, noAI, storageKey]);

  // Globo de bienvenida la primera vez (solo escritorio)
  useEffect(() => {
    let seen = true;
    try { seen = localStorage.getItem("msm_help_seen") === "1"; } catch { /* ignorar */ }
    if (seen || matchMedia("(max-width:1023px)").matches) return;
    const show = setTimeout(() => setBalloon(true), 2500);
    const hide = setTimeout(() => setBalloon(false), 11500);
    return () => { clearTimeout(show); clearTimeout(hide); };
  }, []);

  const toggle = useCallback((next?: boolean) => {
    setOpen((o) => {
      const v = typeof next === "boolean" ? next : !o;
      if (v) { setBalloon(false); try { localStorage.setItem("msm_help_seen", "1"); } catch { /* ignorar */ } }
      return v;
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && toggle(false);
    addEventListener("keydown", onKey);
    if (!matchMedia("(pointer:coarse)").matches) setTimeout(() => input.current?.focus(), 80);
    return () => removeEventListener("keydown", onKey);
  }, [open, toggle]);

  useEffect(() => { const el = box.current; if (el) el.scrollTop = el.scrollHeight; }, [msgs, sending, open]);

  // Móvil: el panel se ajusta al hueco visible cuando aparece el teclado
  useEffect(() => {
    const vv = window.visualViewport;
    const el = document.getElementById("msm-help-panel");
    if (!open || !vv || !el) return;
    const fit = () => {
      if (matchMedia("(max-width:1023px)").matches) { el.style.height = `${vv.height}px`; el.style.top = `${vv.offsetTop}px`; }
      else { el.style.height = ""; el.style.top = ""; }
    };
    fit();
    vv.addEventListener("resize", fit); vv.addEventListener("scroll", fit);
    return () => { vv.removeEventListener("resize", fit); vv.removeEventListener("scroll", fit); el.style.height = ""; el.style.top = ""; };
  }, [open]);

  const go = useCallback((href: string) => { router.push(href); if (matchMedia("(max-width:1023px)").matches) setOpen(false); }, [router]);

  const send = useCallback(async (raw?: string) => {
    const q = String(raw ?? text).trim().slice(0, 1500);
    if (!q || sending) return;
    setText("");
    setSending(true);
    const history: Msg[] = [...msgs, { role: "user", content: q }];
    setMsgs(history);
    let reply: Msg | null = null;
    let note: string | undefined;
    if (!noAI) {
      try {
        const r = await ask({ messages: history.slice(-12).map((m) => ({ role: m.role, content: m.content })), panel: panel?.label ?? null });
        if (r.ok) { reply = { role: "assistant", content: r.text, sources: r.sources }; setMode("ia"); }
        else if (r.mode === "sin_ia") setNoAI(true);
        else if (r.mode === "limite") { setNoAI(true); note = r.error; }
        else note = `La IA no ha respondido${r.error ? ` (${r.error})` : ""}. Te respondo con el manual.`;
      } catch { note = "No he podido contactar con la IA. Te respondo con el manual."; }
    }
    if (!reply) {
      const l = answerLocally(q, { panel: (panel?.id ?? null) as NavId | null, role: role as never });
      reply = { role: "assistant", content: l.text, sources: l.sources, related: l.related };
      setMode("guia");
    }
    setMsgs((m) => [...m, { ...reply!, note }]);
    setSending(false);
  }, [ask, msgs, noAI, panel, role, sending, text]);

  // Preguntas lanzadas desde otros componentes (Ctrl+K → «Preguntar a la ayuda»)
  useEffect(() => {
    const onAsk = (e: Event) => { const q = (e as CustomEvent<string>).detail; if (q) { toggle(true); void send(q); } };
    addEventListener(HELP_ASK_EVENT, onAsk);
    return () => removeEventListener(HELP_ASK_EVENT, onAsk);
  }, [send, toggle]);

  const chips = useMemo(() => {
    const last = msgs[msgs.length - 1];
    if (last?.role === "assistant" && last.related?.length) return last.related;
    const done = new Set(msgs.filter((m) => m.role === "user").map((m) => m.content));
    return (SUGGESTIONS[(panel?.id ?? "_") as NavId] ?? SUGGESTIONS._ ?? []).filter((s) => !done.has(s)).slice(0, 4);
  }, [msgs, panel]);

  if (hidden) return null;

  return (
    <>
      {/* Botón flotante */}
      <div className="print:hidden fixed right-4 z-40 bottom-[calc(5.25rem_+_env(safe-area-inset-bottom))] lg:bottom-6 lg:right-6">
        <AnimatePresence>
          {balloon && !open ? (
            <motion.button initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} transition={spring}
              onClick={() => toggle(true)} className="absolute bottom-[68px] right-0 whitespace-nowrap rounded-2xl rounded-br-md border border-border bg-surface px-4 py-2.5 text-[15px] font-bold shadow-xl">
              ¿Dudas? Pregúntame 👋
            </motion.button>
          ) : null}
        </AnimatePresence>
        <Tooltip hint={open ? null : HINT.helpFab} side="left">
          <motion.button whileTap={{ scale: 0.94 }} onClick={() => toggle()} aria-expanded={open} aria-controls="msm-help-panel"
            aria-label={open ? "Cerrar la ayuda" : "Abrir la ayuda: pregunta cómo hacer cualquier cosa"}
            className="grid size-14 place-items-center rounded-full bg-primary text-white shadow-[0_10px_30px_-8px_var(--primary)] hover:bg-primary-hover">
            {open ? <X className="size-6" aria-hidden="true" /> : <LifeBuoy className="size-7" aria-hidden="true" />}
          </motion.button>
        </Tooltip>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.div id="msm-help-panel" role="dialog" aria-label="Asistente de ayuda" initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.98 }} transition={spring}
            className="fixed inset-0 z-50 flex flex-col bg-surface lg:inset-auto lg:bottom-24 lg:right-6 lg:h-[min(640px,calc(100dvh-8rem))] lg:w-[410px] lg:rounded-3xl lg:border lg:border-border lg:shadow-2xl">
            <header className="flex items-center gap-3 border-b border-border px-4 py-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-white"><LifeBuoy className="size-5" aria-hidden="true" /></span>
              <div className="min-w-0 flex-1 leading-tight">
                <p className="text-[16px] font-extrabold">Asistente de ayuda</p>
                <p className="flex items-center gap-1.5 truncate text-[12.5px] text-muted">
                  <span className={cn("size-2 rounded-full", mode === "guia" || noAI ? "bg-warn" : "bg-ok")} aria-hidden="true" />
                  {mode === "ia" ? "Con IA · basado en el manual" : mode === "guia" || noAI ? "Modo guía · respuestas del manual" : "Pregúntame cómo usar la aplicación"}
                </p>
              </div>
              <Tooltip hint={HINT.newChat} side="bottom"><button onClick={() => { setMsgs([]); setMode(null); }} aria-label="Nueva conversación" className="grid size-10 place-items-center rounded-xl text-muted hover:bg-primary-soft"><RotateCcw className="size-[18px]" /></button></Tooltip>
              <Tooltip hint={{ title: "Abrir el manual", text: "Lleva al manual en la tarea de la pantalla en la que estás." }} side="bottom"><Link href={manualHref} onClick={() => setOpen(false)} aria-label="Abrir el manual" className="grid size-10 place-items-center rounded-xl text-muted hover:bg-primary-soft"><BookOpen className="size-[18px]" /></Link></Tooltip>
              <Tooltip hint={{ title: "Cerrar", text: "Cierra el asistente (también con Esc). La conversación se conserva mientras no cierres la pestaña." }} side="bottom"><button onClick={() => toggle(false)} aria-label="Cerrar (Esc)" className="grid size-10 place-items-center rounded-xl text-muted hover:bg-primary-soft"><X className="size-5" /></button></Tooltip>
            </header>

            <div ref={box} className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
              <Bubble who="bot">
                <Rich text={`¡Hola! Soy el asistente de ayuda. Pregúntame **cómo hacer cualquier cosa** en la aplicación.${panel ? `\n\nAhora estás en «${panel.label}».` : ""}\n\nPara preguntas sobre tus **datos** (averías, costes, contratos…), usa el Copiloto de IA.`} nav={nav} onGo={go} />
              </Bubble>
              {msgs.map((m, i) =>
                m.role === "user" ? (
                  <div key={i} className="ml-auto max-w-[88%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-[15.5px] font-semibold text-white">{m.content}</div>
                ) : (
                  <Bubble key={i} who="bot">
                    <Rich text={m.content} nav={nav} onGo={go} />
                    {m.sources?.length ? (
                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-border pt-2.5 text-[12.5px]">
                        <span className="font-bold uppercase tracking-wider text-muted">Fuente</span>
                        {m.sources.map((id) => {
                          const t = findTask(id);
                          return t ? <Link key={id} href={`/manual#${id}`} onClick={() => setOpen(false)} className="rounded-full border border-border bg-surface px-2.5 py-1 font-semibold text-primary-text hover:bg-primary-soft">Manual · {t.task.title.replace(/\s*\(.*\)$/, "")}</Link> : null;
                        })}
                      </div>
                    ) : null}
                    {m.note ? <p className="mt-2 text-[12.5px] italic text-muted">{m.note}</p> : null}
                  </Bubble>
                ),
              )}
              {sending ? (
                <Bubble who="bot"><span className="flex gap-1.5 py-1" role="status" aria-label="Escribiendo">{[0, 1, 2].map((d) => <motion.span key={d} className="size-2 rounded-full bg-muted" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: d * 0.18 }} />)}</span></Bubble>
              ) : null}
            </div>

            {chips.length && !sending ? (
              <div className="flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label="Preguntas sugeridas">
                {chips.map((c) => <button key={c} onClick={() => void send(c)} className="shrink-0 rounded-full border border-border bg-bg px-3.5 py-2 text-[13.5px] font-semibold hover:border-primary/50">{c}</button>)}
              </div>
            ) : null}

            <form onSubmit={(e) => { e.preventDefault(); void send(); }} className="flex items-end gap-2 border-t border-border p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <label htmlFor="msm-help-q" className="sr-only">Tu pregunta</label>
              <textarea id="msm-help-q" ref={input} rows={1} value={text} maxLength={1500} placeholder="Escribe tu duda…" disabled={sending}
                onChange={(e) => { setText(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(); } }}
                className="max-h-[120px] min-h-12 flex-1 resize-none rounded-[10px] border border-border bg-bg px-3.5 py-3 text-[16px] outline-none focus:border-primary" />
              <Tooltip hint={HINT.sendQuestion} side="top"><button type="submit" disabled={sending || !text.trim()} aria-label="Enviar" className="grid size-12 shrink-0 place-items-center rounded-[10px] bg-primary text-white hover:bg-primary-hover disabled:opacity-50"><SendHorizontal className="size-5" /></button></Tooltip>
            </form>
            <p className="px-4 pb-2 text-center text-[11.5px] text-muted">No escribas datos personales. La IA se equivoca a veces: la fuente te dice dónde comprobarlo.</p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

function Bubble({ who, children }: { who: "bot"; children: ReactNode }) {
  return <div data-who={who} className="max-w-[94%] rounded-2xl rounded-bl-md bg-bg px-4 py-3 text-[15.5px] leading-relaxed">{children}</div>;
}
