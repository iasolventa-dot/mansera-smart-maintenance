"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactElement } from "react";
import { createPortal } from "react-dom";
import { cn } from "./cn";

export type Hint = { title?: string; text: string };
type Side = "top" | "bottom" | "left" | "right";
const GAP = 10;
const MARGIN = 8;

/**
 * Ayuda contextual: al pasar el ratón (o enfocar con teclado) por un elemento, explica qué es y para qué sirve.
 *  - Accesible: `role="tooltip"` + `aria-describedby`; se cierra con Esc, al hacer clic o al desplazarse.
 *  - Se pinta en un portal con posición fija: no lo recorta ningún `overflow` (p. ej. el menú lateral).
 *  - Se coloca en el lado indicado y se voltea o desplaza si no cabe en pantalla.
 *  - Solo con ratón o teclado: en pantallas táctiles no hay «pasar por encima»; ahí ayudan el manual y el asistente.
 * Envuelve UN elemento; no añade ninguna caja al diseño (`display: contents`).
 */
export function Tooltip({
  hint, side = "top", delay = 450, children,
}: { hint: Hint | string | null | undefined; side?: Side; delay?: number; children: ReactElement }) {
  const id = useId();
  const anchor = useRef<HTMLSpanElement>(null);
  const tip = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const content: Hint | null = typeof hint === "string" ? { text: hint } : hint ?? null;

  const target = () => anchor.current?.firstElementChild as HTMLElement | null;
  const show = useCallback((wait: number) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(true), wait);
  }, []);
  const hide = useCallback(() => {
    clearTimeout(timer.current);
    setOpen(false);
    setPos(null);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);

  // Colocación: se mide el tooltip real y se ajusta al hueco disponible.
  useLayoutEffect(() => {
    const el = target(), t = tip.current;
    if (!open || !el || !t) return;
    const r = el.getBoundingClientRect();
    const { width: w, height: h } = t.getBoundingClientRect();
    const vw = document.documentElement.clientWidth, vh = window.innerHeight;
    const room: Record<Side, number> = { top: r.top, bottom: vh - r.bottom, left: r.left, right: vw - r.right };
    const need = (s: Side) => (s === "top" || s === "bottom" ? h : w) + GAP + MARGIN;
    const opposite: Record<Side, Side> = { top: "bottom", bottom: "top", left: "right", right: "left" };
    const use = room[side] >= need(side) ? side : room[opposite[side]] >= need(opposite[side]) ? opposite[side] : side;
    let x: number, y: number;
    if (use === "top" || use === "bottom") {
      x = r.left + r.width / 2 - w / 2;
      y = use === "top" ? r.top - h - GAP : r.bottom + GAP;
    } else {
      y = r.top + r.height / 2 - h / 2;
      x = use === "left" ? r.left - w - GAP : r.right + GAP;
    }
    // Medir el DOM real y colocar el globo es justo lo que hace este efecto.
    setPos({ x: Math.min(Math.max(x, MARGIN), Math.max(vw - w - MARGIN, MARGIN)), y: Math.min(Math.max(y, MARGIN), Math.max(vh - h - MARGIN, MARGIN)) });
  }, [open, side]);

  // Accesibilidad y cierre
  useEffect(() => {
    const el = target();
    if (!open || !el) return;
    el.setAttribute("aria-describedby", id);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && hide();
    addEventListener("keydown", onKey);
    addEventListener("pointerdown", hide, true);
    addEventListener("scroll", hide, true);
    return () => {
      el.removeAttribute("aria-describedby");
      removeEventListener("keydown", onKey);
      removeEventListener("pointerdown", hide, true);
      removeEventListener("scroll", hide, true);
    };
  }, [open, id, hide]);

  // El envoltorio es siempre el mismo (con o sin texto) para que el hijo no se reconstruya ni pierda el foco.
  const enabled = content !== null;
  return (
    <>
      <span
        ref={anchor}
        className="contents"
        onPointerEnter={(e) => { if (enabled && e.pointerType === "mouse") show(delay); }}
        onPointerLeave={hide}
        onFocus={(e) => { if (enabled && (e.target as HTMLElement).matches(":focus-visible")) show(150); }}
        onBlur={hide}
      >
        {children}
      </span>
      {content && open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={tip}
              id={id}
              role="tooltip"
              style={{ left: pos?.x ?? 0, top: pos?.y ?? 0 }}
              className={cn(
                "pointer-events-none fixed z-[90] max-w-[290px] rounded-xl bg-text px-3.5 py-2.5 text-[13.5px] leading-snug text-bg shadow-[0_12px_32px_-8px_rgba(0,0,0,0.45)] transition-opacity duration-150 motion-reduce:transition-none",
                pos ? "opacity-100" : "opacity-0",
              )}
            >
              {content.title ? <p className="mb-0.5 text-[13.5px] font-extrabold">{content.title}</p> : null}
              <p className="font-medium opacity-90">{content.text}</p>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
