"use client";

import { useState } from "react";
import { PackageCheck, Truck } from "lucide-react";
import { HINT, type PurchaseOrder, type StockItem } from "@msm/core";
import { Badge, ProgressBar, StatusPill, fmt } from "@msm/ui";
import { FilterTabs } from "./filter-tabs";

const TONE = { pendiente: "neutral", enviado: "info", recibido: "ok", retrasado: "bad" } as const;
const LABEL = { pendiente: "Pendiente de enviar", enviado: "En camino", recibido: "Recibido", retrasado: "Retrasado" } as const;
const STOCK_LABEL = { ok: "Correcto", warn: "Bajo", bad: "Crítico" } as const;
const day = (iso: string) => new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short" });

export function PurchasingView({ orders, stock }: { orders: PurchaseOrder[]; stock: StockItem[] }) {
  const [tab, setTab] = useState<"pedidos" | "stock">("pedidos");
  return (
    <div>
      <FilterTabs id="pur" label="Compras y almacén" value={tab} onChange={setTab} options={[
        { id: "pedidos", label: "Pedidos", count: orders.length, hint: "Pedidos a proveedores con su estado y la orden de trabajo para la que son." }, { id: "stock", label: "Existencias", count: stock.length, hint: "Repuestos en almacén frente a su stock mínimo." },
      ]} />
      {tab === "pedidos" ? (
        <ul className="grid gap-3">
          {orders.map((o) => (
            <li key={o.id} className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4 sm:flex-row sm:items-center sm:p-5">
              <span className="hidden size-12 shrink-0 place-items-center rounded-xl bg-bg text-primary sm:grid">{o.status === "recibido" ? <PackageCheck className="size-6" aria-hidden="true" /> : <Truck className="size-6" aria-hidden="true" />}</span>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2"><span className="text-sm font-bold tabular-nums text-muted">{o.id}</span><Badge tone={TONE[o.status]}>{LABEL[o.status]}</Badge>{o.forOrder ? <Badge tone="info">Para {o.forOrder}</Badge> : null}</div>
                <p className="text-[17px] font-extrabold leading-snug">{o.supplier}</p>
                <p className="text-[15px] text-muted">{o.summary}</p>
              </div>
              <div className="flex items-baseline justify-between gap-4 sm:flex-col sm:items-end sm:gap-0.5">
                <strong className="text-[20px] tabular-nums">{fmt(o.amountEur)} €</strong>
                <span className="text-sm font-semibold text-muted">{o.status === "recibido" ? "recibido" : "llegada"} {day(o.eta)}</span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {stock.map((s) => (
            <li key={s.ref} className="rounded-2xl border border-border bg-surface p-5">
              <div className="mb-2 flex items-start justify-between gap-3"><div><p className="text-sm font-bold tabular-nums text-muted">{s.ref} · {s.location}</p><h3 className="text-[17.5px] font-extrabold leading-snug">{s.name}</h3></div><StatusPill status={s.status} label={STOCK_LABEL[s.status]} className="!text-xs" /></div>
              <div className="mb-1.5 flex justify-between text-[14.5px] font-semibold"><span className="text-muted">Existencias / mínimo</span><span className="tabular-nums">{s.stock} / {s.min}</span></div>
              <ProgressBar value={s.stock} max={Math.max(s.min * 2, s.stock)} tone={s.status === "ok" ? "ok" : s.status} label={`Existencias de ${s.name}`} hint={HINT.stockBar} />
              <p className="mt-2 text-[14px] text-muted">Proveedor: {s.supplier}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
