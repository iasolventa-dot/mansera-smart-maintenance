"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, ChevronDown, ListTree, Printer, Search, UserRound, X } from "lucide-react";
import { norm } from "@msm/core";
import { Badge, cn, spring } from "@msm/ui";

export type ManualTaskView = {
  id: string; title: string; steps: string[]; keywords: string[];
  notes: { kind: "info" | "importante" | "consejo"; text: string }[];
  /** «Dirección, TI…» cuando la sección está restringida; null si es para todos. */
  availability: string | null;
  /** Destino del botón «Ir a…» (null si el rol no tiene acceso o es una tarea general). */
  goto: { href: string; label: string } | null;
  /** El rol actual no tiene acceso a la sección de esta tarea. */
  locked: boolean;
};
export type ManualChapterView = { id: string; title: string; intro: string; tasks: ManualTaskView[] };

const NOTE = {
  info: { label: "Nota", cls: "border-primary bg-primary-soft" },
  importante: { label: "Importante", cls: "border-warn bg-warn-soft" },
  consejo: { label: "Consejo", cls: "border-ok bg-ok-soft" },
} as const;

/** Resalta las coincidencias sin importar tildes ni mayúsculas, conservando el texto original. */
function Highlight({ text, words }: { text: string; words: string[] }) {
  if (!words.length) return <>{text}</>;
  // Se normaliza carácter a carácter para que los índices coincidan con el texto original.
  const map: string[] = [...text].map((ch) => { const n = norm(ch); return n.length === 1 ? n : ch.toLowerCase(); });
  const flat = map.join("");
  const marks: [number, number][] = [];
  for (const w of words) { let i = flat.indexOf(w); while (i !== -1) { marks.push([i, i + w.length]); i = flat.indexOf(w, i + w.length); } }
  if (!marks.length) return <>{text}</>;
  marks.sort((a, b) => a[0] - b[0]);
  const out: ReactNode[] = [];
  let pos = 0;
  const chars = [...text];
  for (const [s, e] of marks) {
    if (s < pos) continue;
    out.push(chars.slice(pos, s).join(""), <mark key={s} className="rounded bg-warn/30 px-0.5 text-inherit">{chars.slice(s, e).join("")}</mark>);
    pos = e;
  }
  out.push(chars.slice(pos).join(""));
  return <>{out.map((n, i) => <Fragment key={i}>{n}</Fragment>)}</>;
}

function Rich({ text, words }: { text: string; words: string[] }) {
  return <>{text.split(/(\*\*[^*]+\*\*)/g).map((p, i) => (/^\*\*[^*]+\*\*$/.test(p) ? <strong key={i}><Highlight text={p.slice(2, -2)} words={words} /></strong> : <Highlight key={i} text={p} words={words} />))}</>;
}

export function ManualView({ chapters, roleLabel }: { chapters: ManualChapterView[]; roleLabel: string }) {
  const [q, setQ] = useState("");
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [printing, setPrinting] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const [active, setActive] = useState(chapters[0]?.id ?? "");
  const sections = useRef<Record<string, HTMLElement | null>>({});

  const words = useMemo(() => norm(q).split(/\s+/).filter((w) => w.length >= 2), [q]);
  const searchText = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of chapters) for (const t of c.tasks) m.set(t.id, norm([t.title, ...t.keywords, ...t.steps, ...t.notes.map((n) => n.text)].join(" ").replace(/\*\*/g, "")));
    return m;
  }, [chapters]);

  const visible = useMemo(() => {
    const ids = new Set<string>();
    for (const c of chapters) for (const t of c.tasks) if (!words.length || words.every((w) => searchText.get(t.id)!.includes(w))) ids.add(t.id);
    return ids;
  }, [chapters, words, searchText]);
  const total = visible.size;
  const isOpen = (id: string) => printing || (words.length > 0 && visible.has(id)) || openIds.has(id);

  const toggleTask = (id: string, open: boolean) => setOpenIds((s) => { const n = new Set(s); if (open) n.add(id); else n.delete(id); return n; });

  // Abrir la tarea del enlace (#id) y llevar hasta ella
  const openHash = useCallback(() => {
    const id = decodeURIComponent(location.hash.slice(1));
    if (!id) return;
    const el = document.getElementById(id);
    if (!el) return;
    setOpenIds((s) => new Set(s).add(id));
    setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }, []);
  useEffect(() => {
    // Sincroniza con la dirección de la página (#ancla), un sistema externo.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    openHash();
    addEventListener("hashchange", openHash);
    return () => removeEventListener("hashchange", openHash);
  }, [openHash]);

  // Capítulo activo en el índice
  useEffect(() => {
    const els = Object.values(sections.current).filter((e): e is HTMLElement => Boolean(e));
    const io = new IntersectionObserver((entries) => {
      const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (top) setActive(top.target.id.replace(/^cap-/, ""));
    }, { rootMargin: "-120px 0px -65% 0px" });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [chapters, words.length]);

  useEffect(() => {
    const before = () => setPrinting(true), after = () => setPrinting(false);
    addEventListener("beforeprint", before); addEventListener("afterprint", after);
    return () => { removeEventListener("beforeprint", before); removeEventListener("afterprint", after); };
  }, []);

  const toc = (
    <nav aria-label="Índice del manual" className="grid gap-0.5">
      {chapters.map((c, i) => (
        <a key={c.id} href={`#cap-${c.id}`} onClick={() => setTocOpen(false)}
          className={cn("rounded-lg px-3 py-2 text-[14.5px] leading-snug", active === c.id ? "bg-primary-soft font-bold text-primary-text" : "text-muted hover:bg-bg hover:text-text")}>
          <span className="tabular-nums">{i + 1}.</span> {c.title}
        </a>
      ))}
    </nav>
  );

  return (
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[250px_1fr]">
      <aside className="print:hidden hidden lg:block">
        <div className="sticky top-24 max-h-[calc(100dvh-8rem)] overflow-y-auto rounded-2xl border border-border bg-surface p-3">
          <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-muted">Índice</p>
          {toc}
        </div>
      </aside>

      <div className="min-w-0">
        <div className="print:hidden sticky top-[68px] z-20 -mx-4 mb-5 flex gap-2 border-b border-border bg-bg/90 px-4 py-3 backdrop-blur-xl sm:mx-0 sm:rounded-2xl sm:border">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Buscar en el manual</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted" aria-hidden="true" />
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar en el manual… (p. ej. alerta)"
              className="min-h-12 w-full rounded-[10px] border border-border bg-surface pl-10 pr-3 text-[16px] outline-none focus:border-primary" />
          </label>
          <button onClick={() => setTocOpen(true)} className="inline-flex min-h-12 items-center gap-2 rounded-[10px] border border-border bg-surface px-3.5 text-[14.5px] font-bold lg:hidden"><ListTree className="size-[18px]" aria-hidden="true" />Índice</button>
          <button onClick={() => { setPrinting(true); setTimeout(() => { window.print(); }, 150); }} className="hidden min-h-12 items-center gap-2 rounded-[10px] border border-border bg-surface px-3.5 text-[14.5px] font-bold hover:bg-primary-soft sm:inline-flex"><Printer className="size-[18px]" aria-hidden="true" />Imprimir</button>
        </div>

        <p className="mb-4 flex items-center gap-2 text-[14.5px] text-muted print:hidden"><UserRound className="size-4" aria-hidden="true" />Estás viendo el manual como <strong className="text-text">{roleLabel}</strong>. Cada tarea indica para qué perfiles está disponible.</p>

        {words.length ? <p role="status" className="mb-4 text-[15px] font-semibold">{total ? `${total} ${total === 1 ? "tarea coincide" : "tareas coinciden"}` : "Sin resultados. Prueba con otras palabras."}</p> : null}

        {chapters.map((c, ci) => {
          const tasks = c.tasks.filter((t) => visible.has(t.id));
          const introMatch = words.length > 0 && words.every((w) => norm(c.title + " " + c.intro).includes(w));
          if (words.length && !tasks.length && !introMatch) return null;
          return (
            <section key={c.id} id={`cap-${c.id}`} ref={(el) => { sections.current[`cap-${c.id}`] = el; }} className="mb-6 scroll-mt-40 rounded-2xl border border-border bg-surface p-5 sm:p-7 print:break-inside-avoid-page">
              <h2 className="flex items-center gap-3 text-[24px] font-extrabold leading-tight tracking-tight">
                <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-primary-soft text-[16px] font-extrabold text-primary-text">{ci + 1}</span>
                <Highlight text={c.title} words={words} />
              </h2>
              <p className="mb-3 mt-2 text-[16.5px] text-muted"><Highlight text={c.intro} words={words} /></p>
              {tasks.map((t) => (
                <TaskCard key={t.id} t={t} words={words} open={isOpen(t.id)} onToggle={(o) => toggleTask(t.id, o)} />
              ))}
            </section>
          );
        })}

        <p className="mb-8 text-center text-[13.5px] text-muted print:hidden">MANSERA Smart Maintenance · desarrollado por SOLVENTA IA</p>
      </div>

      <AnimatePresence>
        {tocOpen ? (
          <motion.div className="fixed inset-0 z-[55] lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button aria-label="Cerrar el índice" onClick={() => setTocOpen(false)} className="absolute inset-0 bg-black/45" />
            <motion.div role="dialog" aria-modal="true" aria-label="Índice del manual" initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={spring}
              className="safe-bottom absolute inset-x-0 bottom-0 max-h-[80dvh] overflow-auto rounded-t-3xl bg-surface p-5">
              <div className="mb-2 flex items-center justify-between"><h2 className="text-lg font-extrabold">Índice</h2><button onClick={() => setTocOpen(false)} aria-label="Cerrar" className="grid size-11 place-items-center rounded-xl hover:bg-primary-soft"><X className="size-5" /></button></div>
              {toc}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function TaskCard({ t, words, open, onToggle }: { t: ManualTaskView; words: string[]; open: boolean; onToggle: (open: boolean) => void }) {
  return (
    <details id={t.id} open={open} onToggle={(e) => { const o = (e.currentTarget as HTMLDetailsElement).open; if (o !== open) onToggle(o); }}
      className={cn("group my-2.5 scroll-mt-40 rounded-[14px] border bg-surface transition-shadow", open ? "border-primary/30 shadow-[0_6px_16px_-6px_rgba(16,36,70,0.18)]" : "border-border")}>
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3 text-[16.5px] font-bold [&::-webkit-details-marker]:hidden">
        <ChevronDown className="size-5 shrink-0 text-primary transition-transform group-open:rotate-180" aria-hidden="true" />
        <span className="min-w-0 flex-1"><Highlight text={t.title} words={words} /></span>
        {t.availability ? <span className="hidden max-w-[45%] shrink-0 sm:block"><Badge tone="warn" className="max-w-full truncate">{t.availability}</Badge></span> : null}
      </summary>
      <div className="px-4 pb-4 pt-1">
        {t.availability ? <p className="mb-3 text-[14px] font-semibold text-warn-text sm:hidden">Disponible para: {t.availability}</p> : null}
        {t.locked ? <p className="mb-3 rounded-xl bg-bg px-3.5 py-2.5 text-[14.5px] font-semibold text-muted">Tu perfil no tiene acceso a esta sección. Si la necesitas, pídeselo a TI.</p> : null}
        <ol className="mb-3 grid gap-2.5">
          {t.steps.map((s, i) => (
            <li key={i} className="relative pl-10 text-[16px] leading-relaxed">
              <span className="absolute left-0 top-0.5 grid size-7 place-items-center rounded-full bg-primary text-[13.5px] font-extrabold text-white print:border print:border-black print:bg-white print:text-black">{i + 1}</span>
              <Rich text={s} words={words} />
            </li>
          ))}
        </ol>
        {t.notes.map((n, i) => (
          <div key={i} className={cn("my-2 rounded-xl border-l-4 px-3.5 py-2.5 text-[15px] leading-snug", NOTE[n.kind].cls)}>
            <b className="mr-1.5">{NOTE[n.kind].label}.</b><Rich text={n.text} words={words} />
          </div>
        ))}
        {t.goto ? (
          <Link href={t.goto.href} className="mt-2 inline-flex min-h-12 items-center gap-1.5 rounded-[10px] bg-primary px-4 text-[15px] font-bold text-white hover:bg-primary-hover print:hidden">
            Ir a «{t.goto.label}»<ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        ) : null}
      </div>
    </details>
  );
}
