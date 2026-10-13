"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { motion } from "motion/react";
import { SendHorizontal, Sparkles } from "lucide-react";
import type { CopilotAnswer } from "@msm/core";
import { Badge, Button, SourceChip, spring } from "@msm/ui";
import { SOURCE_LABEL } from "./labels";

type Msg = { role: "user"; text: string } | { role: "ai"; answer: CopilotAnswer };

const SUGGESTIONS = ["¿Qué máquinas han fallado más este mes?", "¿Cuánto hemos gastado en mantenimiento y en qué clientes?", "¿Qué acreditaciones PRL vencen pronto?"];

/** Convierte **negrita** en <strong>, sin HTML arbitrario. */
function Rich({ text }: { text: string }) {
  return <>{text.split(/(\*\*[^*]+\*\*)/g).map((p, i) => p.startsWith("**") ? <strong key={i}>{p.slice(2, -2)}</strong> : <span key={i}>{p}</span>)}</>;
}

export function CopilotChat({ ask }: { ask: (q: string) => Promise<CopilotAnswer> }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [q, setQ] = useState("");
  const [pending, start] = useTransition();
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [msgs, pending]);

  const send = (text: string) => {
    const t = text.trim();
    if (!t || pending) return;
    setMsgs((m) => [...m, { role: "user", text: t }]);
    setQ("");
    start(async () => { const answer = await ask(t); setMsgs((m) => [...m, { role: "ai", answer }]); });
  };

  return (
    <div className="flex h-[calc(100dvh-15rem)] min-h-[420px] flex-col rounded-2xl border border-border bg-surface lg:h-[calc(100dvh-13rem)]">
      <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6" aria-live="polite">
        {msgs.length === 0 ? (
          <div className="grid h-full place-content-center justify-items-center gap-4 text-center">
            <span className="grid size-16 place-items-center rounded-2xl bg-primary-soft text-primary"><Sparkles className="size-8" aria-hidden="true" /></span>
            <h2 className="text-xl font-extrabold">Pregunta por tus datos</h2>
            <p className="max-w-md text-muted">Cada respuesta cita la aplicación, la entidad y el periodo de donde sale. Si no hay dato, te lo dice.</p>
            <div className="mt-2 grid w-full max-w-md gap-2.5">
              {SUGGESTIONS.map((s) => <button key={s} onClick={() => send(s)} className="min-h-12 rounded-xl border border-border bg-bg px-4 py-2.5 text-left text-[15.5px] font-semibold hover:border-primary/50">{s}</button>)}
            </div>
          </div>
        ) : null}

        {msgs.map((m, i) => m.role === "user" ? (
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-3 text-[16.5px] font-semibold text-white">{m.text}</motion.div>
        ) : (
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="max-w-[92%] rounded-2xl rounded-bl-md bg-bg px-4 py-3.5">
            <p className="text-[16.5px] leading-relaxed"><Rich text={m.answer.answer} /></p>
            {m.answer.noData ? <Badge tone="warn" className="mt-3">Sin datos verificables</Badge> : (
              <div className="mt-3 border-t border-border pt-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Fuentes · certeza {m.answer.confidence}</p>
                <div className="flex flex-wrap gap-2">
                  {m.answer.sources.map((s, j) => <SourceChip key={j} app={SOURCE_LABEL[s.source]} label={`${s.entity}${s.period ? ` · ${s.period}` : ""}`} />)}
                </div>
                {m.answer.sources.some((s) => s.calc) ? (
                  <details className="mt-3 text-sm text-muted"><summary className="min-h-8 cursor-pointer font-bold text-primary-text">Ver cálculo</summary>
                    <ul className="mt-1 list-disc pl-5">{m.answer.sources.filter((s) => s.calc).map((s, j) => <li key={j}>{s.calc}</li>)}</ul></details>
                ) : null}
              </div>
            )}
          </motion.div>
        ))}
        {pending ? <div className="flex gap-1.5 px-2" role="status" aria-label="El copiloto está consultando las fuentes">{[0, 1, 2].map((d) => <motion.span key={d} className="size-2.5 rounded-full bg-primary" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: d * 0.18 }} />)}</div> : null}
        <div ref={end} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send(q); }} className="flex gap-3 border-t border-border p-3 sm:p-4">
        <label htmlFor="q" className="sr-only">Pregunta</label>
        <input id="q" value={q} onChange={(e) => setQ(e.target.value)} maxLength={500} placeholder="Pregunta sobre averías, costes o contratos…" className="min-h-12 min-w-0 flex-1 rounded-[10px] border border-border bg-bg px-4 text-[16px] outline-none focus:border-primary" />
        <Button type="submit" disabled={pending || !q.trim()} aria-label="Enviar"><SendHorizontal className="size-5" aria-hidden="true" /><span className="hidden sm:inline">Enviar</span></Button>
      </form>
    </div>
  );
}
