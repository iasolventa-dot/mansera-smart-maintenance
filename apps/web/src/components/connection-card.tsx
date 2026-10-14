"use client";

import { useId, useState, useTransition } from "react";
import { CircleAlert, CircleCheck, CircleHelp, ExternalLink, KeyRound, Lock, Trash2 } from "lucide-react";
import type { ConnectorSpec } from "@msm/core";
import { Badge, Button, Card, Tooltip, cn } from "@msm/ui";
import type { ConnectionResult } from "@/app/actions";

export type StoredConnection = {
  config: Record<string, string>;
  status: "sin_probar" | "autorizada" | "verificada" | "error" | "no_probable";
  lastCheckAt: string | null;
  lastCheckMessage: string | null;
  updatedAt: string;
};

type Props = {
  spec: ConnectorSpec;
  stored: StoredConnection | null;
  /** Puede guardar (TI real con base de datos real). */
  canEdit: boolean;
  /** Motivo por el que no se puede editar, si procede. */
  readOnlyReason?: string;
  /** La autorización OAuth solo existe con la base de datos real (no en la demostración local). */
  oauthEnabled?: boolean;
  save: (app: string, values: Record<string, unknown>) => Promise<ConnectionResult>;
  remove: (app: string) => Promise<ConnectionResult>;
};

const STATUS = {
  sin_probar: { label: "Guardada, sin comprobar", cls: "bg-bg text-muted border border-border", Icon: CircleHelp },
  autorizada: { label: "Autorizada (sin datos leídos aún)", cls: "bg-ok-soft text-ok-text", Icon: CircleCheck },
  verificada: { label: "Verificada", cls: "bg-ok-soft text-ok-text", Icon: CircleCheck },
  error: { label: "Error al comprobar", cls: "bg-bad-soft text-bad-text", Icon: CircleAlert },
  no_probable: { label: "Guardada (no comprobable desde la nube)", cls: "bg-warn-soft text-warn-text", Icon: CircleHelp },
} as const;

const input = "min-h-12 w-full rounded-[10px] border border-border bg-bg px-4 text-[16px] outline-none focus:border-primary disabled:opacity-60";

export function ConnectionCard({ spec, stored, canEdit, readOnlyReason, oauthEnabled = false, save, remove }: Props) {
  const pending = spec.status === "pendiente_documentar";
  const inGateway = !pending && spec.credentialsIn === "gateway";
  const [values, setValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ConnectionResult | null>(null);
  const [busy, start] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const uid = useId();
  const st = stored ? STATUS[stored.status] : null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);
    start(async () => {
      const r = await save(spec.app, values);
      setResult(r);
      if (r.ok) setValues({}); // los secretos no se quedan en el navegador
    });
  };
  const del = () => {
    setConfirming(false);
    start(async () => setResult(await remove(spec.app)));
  };

  return (
    <Card className="h-full" data-testid={`conexion-${spec.app}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[21px] font-extrabold">{spec.name}</h2>
          <p className="text-sm text-muted">{spec.transportNote}</p>
        </div>
        {pending ? (
          <Badge tone="warn">Pendiente de documentar</Badge>
        ) : inGateway ? (
          <Badge tone="info">Se configura en el gateway</Badge>
        ) : st ? (
          <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[14px] font-bold", st.cls)}><st.Icon className="size-4" aria-hidden="true" />{st.label}</span>
        ) : (
          <Badge tone="neutral">Sin configurar</Badge>
        )}
      </div>

      <p className="mt-3 text-[15px]"><strong>Cómo se conecta: </strong>{spec.authSummary}</p>

      {pending ? (
        <div className="mt-3 rounded-xl border border-warn/40 bg-warn-soft p-3 text-[15px] text-warn-text">
          <p className="font-bold">No hay documentación pública de su API.</p>
          <ul className="mt-1 list-disc pl-5">{spec.unknown.map((u) => <li key={u}>{u}</li>)}</ul>
          <p className="mt-2">Hasta aclararlo no se piden credenciales: no queremos guardar datos de un formato que todavía no conocemos.</p>
        </div>
      ) : (
        <>
          <details className="mt-3 rounded-xl bg-bg p-3 text-[15px]">
            <summary className="cursor-pointer font-bold">Dónde conseguir las credenciales</summary>
            <ol className="mt-2 list-decimal space-y-1 pl-5">{spec.howTo.map((h) => <li key={h}>{h}</li>)}</ol>
            {spec.limits.length ? <ul className="mt-2 list-disc pl-5 text-muted">{spec.limits.map((l) => <li key={l}>{l}</li>)}</ul> : null}
          </details>

          {inGateway ? (
            <div className="mt-4 rounded-xl border border-border bg-bg p-3 text-[15px]">
              <p className="font-bold">Estas credenciales no se escriben aquí.</p>
              <p className="mt-1">Por seguridad se introducen al instalar el gateway en la red de MANSERA y quedan cifradas en ese equipo: nunca pasan por Internet ni se guardan en la nube. Datos que se pedirán:</p>
              <ul className="mt-2 list-disc pl-5">
                {spec.fields.map((f) => <li key={f.key}><strong>{f.label}</strong>{f.secret ? " (secreto)" : ""}: {f.help}</li>)}
              </ul>
            </div>
          ) : null}

          {!inGateway && stored ? (
            <p className="mt-3 text-[14px] text-muted">
              Guardada el {new Date(stored.updatedAt).toLocaleString("es-ES")}. {stored.lastCheckMessage ?? ""}
              {Object.entries(stored.config).length ? <> · Datos visibles: {Object.entries(stored.config).map(([k, v]) => `${spec.fields.find((f) => f.key === k)?.label ?? k}: ${v}`).join(" · ")}</> : null}
            </p>
          ) : null}

          {inGateway ? null : canEdit ? (
            <form onSubmit={submit} className="mt-4 grid gap-3" autoComplete="off">
              {spec.fields.map((f) => (
                <label key={f.key} className="grid gap-1">
                  <span className="flex items-center gap-1.5 text-[14px] font-bold">
                    {f.label}
                    {f.secret ? <Tooltip hint="Se guarda cifrado y no se vuelve a mostrar nunca."><span className="inline-flex items-center gap-1 rounded-full bg-bg px-2 py-0.5 text-[12px] font-semibold text-muted" tabIndex={0}><Lock className="size-3" aria-hidden="true" />secreto</span></Tooltip> : null}
                    {!f.required ? <span className="font-normal text-muted">(opcional)</span> : null}
                  </span>
                  <input
                    className={input}
                    type={f.secret ? "password" : "text"}
                    name={f.key}
                    value={values[f.key] ?? ""}
                    onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                    placeholder={stored && f.secret ? "•••••••• (escribe uno nuevo para reemplazarlo)" : f.placeholder}
                    autoComplete={f.secret ? "new-password" : "off"}
                    spellCheck={false}
                    required={f.required}
                    aria-describedby={`${uid}-${f.key}-ayuda ${uid}-resultado`}
                    disabled={busy}
                  />
                  <span id={`${uid}-${f.key}-ayuda`} className="text-[13px] text-muted">{f.help}</span>
                </label>
              ))}
              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" disabled={busy}><KeyRound className="size-4" aria-hidden="true" />{busy ? "Guardando…" : stored ? "Reemplazar credenciales" : "Guardar y comprobar"}</Button>
                {stored && !confirming ? <Button type="button" variant="secondary" onClick={() => setConfirming(true)} disabled={busy}><Trash2 className="size-4" aria-hidden="true" />Eliminar</Button> : null}
              </div>
              {confirming ? (
                <div role="alertdialog" aria-labelledby={`${uid}-borrar`} className="rounded-xl border border-bad/30 bg-bad-soft p-3">
                  <p id={`${uid}-borrar`} className="text-[15px] font-bold text-bad-text">¿Eliminar las credenciales de {spec.name}? Dejará de sincronizar hasta que se vuelvan a guardar.</p>
                  <div className="mt-2 flex flex-wrap gap-3">
                    <Button type="button" variant="danger" onClick={del} disabled={busy} autoFocus>Sí, eliminar</Button>
                    <Button type="button" variant="secondary" onClick={() => setConfirming(false)} disabled={busy}>Cancelar</Button>
                  </div>
                </div>
              ) : null}
              {stored ? <p className="text-[13px] text-muted">Al reemplazar hay que volver a escribir todos los campos: por seguridad no se pueden recuperar los anteriores.</p> : null}
            </form>
          ) : (
            <p className="mt-4 rounded-xl bg-bg p-3 text-[15px] text-muted">{readOnlyReason ?? "Solo el perfil de TI puede gestionar las credenciales."}</p>
          )}

          {spec.oauthStartPath && !inGateway ? (
            <div className="mt-4 rounded-xl border border-border bg-bg p-3 text-[15px]">
              <p className="font-bold">Autorización con el proveedor</p>
              {!stored ? (
                <p className="mt-1 text-muted">Primero guarda las credenciales; después podrás conectar con la cuenta del proveedor.</p>
              ) : !oauthEnabled ? (
                <p className="mt-1 text-muted">En el modo demostración no se puede conectar con el proveedor.</p>
              ) : canEdit ? (
                <>
                  <p className="mt-1 text-muted">Se abrirá el inicio de sesión de Wolters Kluwer. Entra con una cuenta de MANSERA con acceso a la nómina y elige solo las empresas necesarias.</p>
                  <form method="post" action={spec.oauthStartPath} className="mt-3">
                    <Button type="submit"><KeyRound className="size-4" aria-hidden="true" />{stored.status === "verificada" || stored.status === "autorizada" ? "Volver a conectar con Wolters Kluwer" : "Conectar con Wolters Kluwer"}</Button>
                  </form>
                </>
              ) : (
                <p className="mt-1 text-muted">Solo el perfil de TI puede autorizar la conexión.</p>
              )}
            </div>
          ) : null}

          <div id={`${uid}-resultado`} aria-live="polite" className="mt-3 text-[15px] font-semibold">
            {result ? (result.ok ? <p className={result.status === "error" ? "text-bad-text" : "text-ok-text"}>{result.message}</p> : <p className="text-bad-text">{result.error}</p>) : null}
          </div>
        </>
      )}

      {spec.docs.length ? (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
          {spec.docs.map((d) => (
            <li key={d.url}><a href={d.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary-text underline">{d.label}<ExternalLink className="size-3" aria-hidden="true" /></a> <span className="text-muted">(consultada {d.checkedAt})</span></li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}
