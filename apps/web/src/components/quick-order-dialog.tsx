"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { CheckCircle2, ShieldCheck, X } from "lucide-react";
import type { NewWorkOrderInput } from "@msm/core";
import { Button, cn, spring } from "@msm/ui";
import type { CreateOrderResult } from "@/app/actions";

type Props = {
  clients: string[];
  assets: { name: string; client: string }[];
  create: (input: NewWorkOrderInput) => Promise<CreateOrderResult>;
  onClose: () => void;
};

const PRIORITIES = [
  { id: "normal", label: "Normal" },
  { id: "alta", label: "Alta" },
  { id: "urgente", label: "Urgente" },
] as const;

const field = "min-h-14 w-full rounded-[10px] border border-border bg-bg px-4 text-[16.5px] outline-none focus:border-primary";

export function QuickOrderDialog({ clients, assets, create, onClose }: Props) {
  const [client, setClient] = useState(clients[0] ?? "");
  const [asset, setAsset] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<NewWorkOrderInput["priority"]>("normal");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  const clientAssets = assets.filter((a) => a.client === client);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = () => {
    setError(null);
    start(async () => {
      const r = await create({ client, asset: asset || clientAssets[0]?.name || "Sin activo", description, priority });
      if (r.ok) setDone(true);
      else setError(r.error);
    });
  };

  return (
    <motion.div className="fixed inset-0 z-[70] grid items-end justify-items-center bg-black/50 sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div role="dialog" aria-modal="true" aria-labelledby="qo-title"
        className="safe-bottom max-h-[92dvh] w-full max-w-lg overflow-auto rounded-t-3xl bg-surface p-6 shadow-2xl sm:rounded-3xl"
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} transition={spring}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="qo-title" className="text-[22px] font-extrabold">Nueva orden de trabajo</h2>
            <p className="text-[15px] text-muted">Se creará como propuesta; no se escribe en PGMWin hasta que alguien la apruebe.</p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="grid size-11 shrink-0 place-items-center rounded-xl hover:bg-primary-soft"><X className="size-5" /></button>
        </div>

        {done ? (
          <div className="grid justify-items-center gap-3 py-6 text-center" role="status">
            <motion.span initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={spring} className="grid size-16 place-items-center rounded-full bg-ok-soft text-ok-text"><CheckCircle2 className="size-9" aria-hidden="true" /></motion.span>
            <h3 className="text-xl font-extrabold">Propuesta creada</h3>
            <p className="max-w-sm text-muted">Queda pendiente de aprobación en «Propuestas», con el detalle de lo que cambiará en PGMWin.</p>
            <div className="mt-2 grid w-full grid-cols-2 gap-3">
              <Button variant="secondary" onClick={onClose}>Cerrar</Button>
              <Link href="/propuestas" onClick={onClose} className="inline-flex min-h-12 items-center justify-center rounded-[10px] bg-primary px-4 text-[15px] font-bold text-white hover:bg-primary-hover">Ver propuesta</Link>
            </div>
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="grid gap-4">
            <div className="grid gap-1.5">
              <label htmlFor="qo-client" className="text-[15px] font-bold">Cliente</label>
              <select id="qo-client" value={client} onChange={(e) => { setClient(e.target.value); setAsset(""); }} className={field}>
                {clients.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="qo-asset" className="text-[15px] font-bold">Activo</label>
              <select id="qo-asset" value={asset} onChange={(e) => setAsset(e.target.value)} className={field}>
                {clientAssets.length === 0 ? <option value="">Sin activos registrados</option> : clientAssets.map((a) => <option key={a.name}>{a.name}</option>)}
              </select>
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="qo-desc" className="text-[15px] font-bold">¿Qué ocurre?</label>
              <textarea id="qo-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={400} required placeholder="Ej.: fuga en el sello mecánico, ruido anómalo…" className={cn(field, "min-h-28 py-3")} />
            </div>
            <fieldset className="grid gap-1.5">
              <legend className="mb-1.5 text-[15px] font-bold">Prioridad</legend>
              <div className="grid grid-cols-3 gap-2">
                {PRIORITIES.map((p) => (
                  <label key={p.id} className={cn("grid min-h-12 cursor-pointer place-items-center rounded-[10px] border text-[15px] font-bold has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-accent", priority === p.id ? "border-primary bg-primary-soft text-primary-text" : "border-border text-muted")}>
                    <input type="radio" name="priority" value={p.id} checked={priority === p.id} onChange={() => setPriority(p.id)} className="sr-only" />{p.label}
                  </label>
                ))}
              </div>
            </fieldset>
            {error ? <p role="alert" className="rounded-xl bg-bad-soft px-4 py-3 text-[15px] font-semibold text-bad-text">{error}</p> : null}
            <p className="flex items-start gap-2 text-[14px] text-muted"><ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />Humano en el circuito: quedará registrada en la auditoría.</p>
            <Button type="submit" size="lg" loading={pending} disabled={description.trim().length < 3}>Crear propuesta</Button>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}
