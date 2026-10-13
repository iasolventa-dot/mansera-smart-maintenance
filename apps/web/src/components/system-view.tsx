"use client";

import { useState } from "react";
import { Check, Minus } from "lucide-react";
import type { AuditEvent, SystemUser } from "@msm/core";
import { Avatar, Badge, Card } from "@msm/ui";
import { FilterTabs } from "./filter-tabs";
import { SOURCE_LABEL } from "./labels";

type Matrix = { sections: { id: string; label: string }[]; roles: { id: string; label: string; allowed: string[] }[] };

const rel = (iso: string | null) => {
  if (!iso) return "nunca";
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  return m < 1 ? "ahora" : m < 60 ? `hace ${m} min` : m < 1440 ? `hace ${Math.round(m / 60)} h` : `hace ${Math.round(m / 1440)} d`;
};

export function SystemView({ users, audit, matrix }: { users: SystemUser[]; audit: AuditEvent[]; matrix: Matrix }) {
  const [tab, setTab] = useState<"usuarios" | "permisos" | "auditoria">("usuarios");
  return (
    <div>
      <FilterTabs id="sys" label="Administración" value={tab} onChange={setTab} options={[
        { id: "usuarios", label: "Usuarios", count: users.length }, { id: "permisos", label: "Permisos por rol" }, { id: "auditoria", label: "Auditoría" },
      ]} />

      {tab === "usuarios" ? (
        <ul className="grid gap-3 md:grid-cols-2">
          {users.map((u) => (
            <li key={u.id} className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4">
              <Avatar name={u.name} className="size-12" />
              <div className="min-w-0 flex-1"><p className="truncate text-[17px] font-extrabold">{u.name}</p><p className="truncate text-[14px] text-muted">{u.email}</p><p className="mt-1 text-[13.5px] text-muted">{u.role} · último acceso {rel(u.lastSeen)}</p></div>
              <Badge tone={u.active ? "ok" : "neutral"}>{u.active ? "Activo" : "Inactivo"}</Badge>
            </li>
          ))}
        </ul>
      ) : null}

      {tab === "permisos" ? (
        <Card className="!p-0">
          <p className="border-b border-border px-5 py-4 text-[15px] text-muted">Qué sección ve cada rol. La barrera real son las políticas RLS de la base de datos y los permisos por conector.</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[14.5px]">
              <caption className="sr-only">Matriz de permisos por rol</caption>
              <thead className="bg-bg text-xs uppercase tracking-wider text-muted">
                <tr><th scope="col" className="sticky left-0 bg-bg px-4 py-3">Sección</th>{matrix.roles.map((r) => <th key={r.id} scope="col" className="px-3 py-3 text-center">{r.label}</th>)}</tr>
              </thead>
              <tbody>
                {matrix.sections.map((s) => (
                  <tr key={s.id} className="border-t border-border">
                    <th scope="row" className="sticky left-0 bg-surface px-4 py-3 font-bold">{s.label}</th>
                    {matrix.roles.map((r) => (
                      <td key={r.id} className="px-3 py-3 text-center">
                        {r.allowed.includes(s.id) ? <Check className="mx-auto size-5 text-ok-text" aria-label="Con acceso" /> : <Minus className="mx-auto size-5 text-border" aria-label="Sin acceso" />}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {tab === "auditoria" ? (
        <Card>
          <p className="mb-4 text-[15px] text-muted">Registro inmutable: nadie puede modificarlo ni borrarlo, ni siquiera un administrador.</p>
          <ol className="relative grid gap-5 border-l-2 border-border pl-6">
            {audit.map((e) => (
              <li key={e.id} className="relative">
                <span className="absolute -left-[31px] top-1.5 size-3 rounded-full border-2 border-primary bg-surface" aria-hidden="true" />
                <div className="flex flex-wrap items-center gap-2"><strong className="text-[16px]">{e.action}</strong><Badge>{SOURCE_LABEL[e.app]}</Badge><span className="ml-auto text-sm text-muted">{rel(e.at)}</span></div>
                <p className="text-[15px]"><span className="font-semibold">{e.actor}</span> <span className="text-muted">· {e.entity}</span></p>
                <p className="text-[14.5px] text-muted">{e.detail}</p>
              </li>
            ))}
          </ol>
        </Card>
      ) : null}
    </div>
  );
}
