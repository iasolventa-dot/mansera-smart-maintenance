"use client";

import { useId, useState, useTransition } from "react";
import { LayoutList } from "lucide-react";
import { Button } from "@msm/ui";
import type { ConnectionResult, TrelloStructure } from "@/app/actions";

const STAGES = [
  { id: "", label: "No usar esta lista" },
  { id: "borrador", label: "Borrador" },
  { id: "enviada", label: "Enviada" },
  { id: "negociacion", label: "En negociación" },
  { id: "ganada", label: "Ganada" },
  { id: "perdida", label: "Perdida" },
] as const;

export type TrelloMappingValue = { boardId: string; stageByList: Record<string, string>; fields: { amount?: string; client?: string; probability?: string } };

type Props = {
  initial: TrelloMappingValue | null;
  load: (boardId?: string) => Promise<TrelloStructure>;
  save: (mapping: TrelloMappingValue) => Promise<ConnectionResult>;
};

const select = "min-h-12 w-full rounded-[10px] border border-border bg-surface px-3 text-[15px] outline-none focus:border-primary";

/** Elegir el tablero de ofertas, qué lista es cada etapa y qué campos guardan importe, cliente y probabilidad. */
export function TrelloMappingForm({ initial, load, save }: Props) {
  const uid = useId();
  const [open, setOpen] = useState(false);
  const [busy, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [boards, setBoards] = useState<{ id: string; name: string }[]>([]);
  const [lists, setLists] = useState<{ id: string; name: string }[]>([]);
  const [fields, setFields] = useState<{ id: string; name: string; type: string }[]>([]);
  const [value, setValue] = useState<TrelloMappingValue>(initial ?? { boardId: "", stageByList: {}, fields: {} });

  const run = (boardId?: string) => start(async () => {
    setError(null);
    const r = await load(boardId);
    if (!r.ok) return setError(r.error);
    setBoards(r.boards);
    setLists(r.lists ?? []);
    setFields(r.fields ?? []);
  });

  const onOpen = () => {
    setOpen(true);
    run(value.boardId || undefined);
  };
  const onBoard = (boardId: string) => {
    setValue({ boardId, stageByList: {}, fields: {} });
    if (boardId) run(boardId);
  };
  const onSave = () => start(async () => {
    setError(null);
    setDone(null);
    const stageByList = Object.fromEntries(Object.entries(value.stageByList).filter(([, s]) => s));
    const f = Object.fromEntries(Object.entries(value.fields).filter(([, id]) => id));
    const r = await save({ boardId: value.boardId, stageByList, fields: f });
    if (r.ok) setDone(r.message);
    else setError(r.error);
  });

  const numberFields = fields.filter((f) => f.type === "number");

  return (
    <div className="mt-4 rounded-xl border border-border bg-bg p-3 text-[15px]" data-testid="trello-mapping">
      <p className="font-bold">Tablero de ofertas</p>
      <p className="mt-1 text-muted">{initial ? "Configurado. Puedes cambiarlo." : "Elige qué tablero contiene las ofertas y cómo se leen. Sin esto, Comercial sigue con datos de ejemplo."}</p>
      {!open ? (
        <Button type="button" variant="secondary" className="mt-3" onClick={onOpen}><LayoutList className="size-4" aria-hidden="true" />{initial ? "Cambiar configuración" : "Configurar tablero de ofertas"}</Button>
      ) : (
        <div className="mt-3 grid gap-3">
          <label className="grid gap-1">
            <span className="text-[14px] font-bold">Tablero</span>
            <select className={select} value={value.boardId} onChange={(e) => onBoard(e.target.value)} disabled={busy}>
              <option value="">{busy && !boards.length ? "Cargando…" : "Elige un tablero"}</option>
              {boards.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </label>

          {value.boardId && lists.length ? (
            <fieldset className="grid gap-2">
              <legend className="mb-1 text-[14px] font-bold">Etapa de cada lista</legend>
              {lists.map((l) => (
                <label key={l.id} className="grid gap-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-center">
                  <span className="min-w-0 truncate">{l.name}</span>
                  <select className={select} value={value.stageByList[l.id] ?? ""} onChange={(e) => setValue((v) => ({ ...v, stageByList: { ...v.stageByList, [l.id]: e.target.value } }))} disabled={busy}>
                    {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </label>
              ))}
            </fieldset>
          ) : null}

          {value.boardId && lists.length ? (
            <fieldset className="grid gap-2" aria-describedby={`${uid}-campos`}>
              <legend className="mb-1 text-[14px] font-bold">Campos personalizados</legend>
              <p id={`${uid}-campos`} className="text-[13px] text-muted">Importe y probabilidad deben ser campos de tipo número. Si un dato no existe en Trello, déjalo sin elegir: esas tarjetas saldrán como «incompletas», no se inventa nada.</p>
              {([["amount", "Importe (€)", numberFields], ["probability", "Probabilidad (0-100)", numberFields], ["client", "Cliente", fields]] as const).map(([key, label, opts]) => (
                <label key={key} className="grid gap-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-center">
                  <span>{label}</span>
                  <select className={select} value={value.fields[key] ?? ""} onChange={(e) => setValue((v) => ({ ...v, fields: { ...v.fields, [key]: e.target.value } }))} disabled={busy}>
                    <option value="">Sin elegir</option>
                    {opts.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </label>
              ))}
            </fieldset>
          ) : null}

          {value.boardId ? <Button type="button" onClick={onSave} disabled={busy}>{busy ? "Guardando…" : "Guardar configuración"}</Button> : null}
        </div>
      )}
      <div aria-live="polite" className="mt-2 text-[14px] font-semibold">
        {error ? <p className="text-bad-text">{error}</p> : null}
        {done ? <p className="text-ok-text">{done}</p> : null}
      </div>
    </div>
  );
}
