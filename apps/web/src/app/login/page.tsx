import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Check } from "lucide-react";
import { homeFor, ROLE_ACCESS, Role } from "@msm/core";
import { Button, Logo, Reveal } from "@msm/ui";
import { signInDemo, signInWithPassword, signOut } from "../actions";
import { demoAuthEnabled, getSessionState, realAuthEnabled } from "@/lib/session";

export const metadata: Metadata = { title: "Acceder" };

const POINTS = ["Un panel para cada departamento", "Datos de todas las aplicaciones, conectados", "Copiloto de IA con respuestas trazables"];

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const state = await getSessionState();
  if (state.state === "ok") redirect(homeFor(state.session.role));
  const demo = demoAuthEnabled();
  const real = realAuthEnabled();
  const failed = (await searchParams).error === "credenciales";

  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <section className="mesh-hero relative overflow-hidden px-6 pb-10 pt-8 text-white sm:px-12 lg:flex lg:flex-col lg:justify-between lg:py-12">
        <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-cyan">Plataforma de mantenimiento inteligente</p>
        <div className="my-8 lg:my-0">
          <Reveal>
            <h1 className="text-[34px] font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-[56px]">
              MANSERA<br />Smart Maintenance
            </h1>
            <p className="mt-5 max-w-md text-[19px] leading-snug text-white/85">
              Un solo acceso a la información de PGMWin, A3, Trello y Sésame, con inteligencia artificial para decidir mejor.
            </p>
          </Reveal>
          <ul className="mt-7 hidden gap-3 sm:grid">
            {POINTS.map((p) => (
              <li key={p} className="flex items-center gap-3 text-[17px] font-semibold">
                <span className="grid size-6 place-items-center rounded-md bg-cyan/25 text-cyan"><Check className="size-4" aria-hidden="true" /></span>
                {p}
              </li>
            ))}
          </ul>
        </div>
        <p className="hidden text-sm text-white/70 lg:block">Desarrollado por SOLVENTA</p>
        <svg aria-hidden="true" className="pointer-events-none absolute -bottom-10 -right-16 hidden w-[520px] opacity-30 lg:block" viewBox="0 0 400 400">
          <path d="M400 40 L400 400 L60 400 Z" fill="#3E97D0" opacity=".5" />
          <path d="M400 150 L400 400 L170 400 Z" fill="#61BDE4" opacity=".5" />
        </svg>
      </section>

      <section className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-[440px]">
          <div className="rounded-3xl border border-border bg-surface p-7 shadow-[0_24px_60px_-28px_rgba(16,36,70,0.35)] sm:p-9">
            <Logo />
            <h2 className="mt-8 text-[30px] font-extrabold tracking-tight">Acceder</h2>
            <p className="mt-1 text-muted">Introduce tus credenciales para continuar.</p>

            {state.state === "no-membership" ? (
              <div className="mt-7 grid gap-4">
                <p role="status" className="rounded-xl bg-warn-soft px-4 py-3 text-[15px] font-semibold text-warn-text">
                  Has iniciado sesión como {state.email}, pero tu cuenta todavía no tiene acceso asignado. Pide a TI que te dé de alta en MANSERA.
                </p>
                <form action={signOut}><Button type="submit" variant="secondary" size="lg" className="w-full">Cerrar sesión</Button></form>
              </div>
            ) : real ? (
              <form action={signInWithPassword} className="mt-7 grid gap-4">
                {failed ? <p role="alert" className="rounded-xl bg-bad-soft px-4 py-3 text-[15px] font-semibold text-bad-text">Correo o contraseña incorrectos.</p> : null}
                <div className="grid gap-1.5">
                  <label htmlFor="email" className="text-[15px] font-bold">Correo electrónico</label>
                  <input id="email" name="email" type="email" autoComplete="username" required placeholder="nombre@mansera.es"
                    className="min-h-14 rounded-[10px] border border-border bg-bg px-4 text-[17px] outline-none focus:border-primary" />
                </div>
                <div className="grid gap-1.5">
                  <label htmlFor="password" className="text-[15px] font-bold">Contraseña</label>
                  <input id="password" name="password" type="password" autoComplete="current-password" required
                    className="min-h-14 rounded-[10px] border border-border bg-bg px-4 text-[17px] outline-none focus:border-primary" />
                </div>
                <Button type="submit" size="lg" className="mt-1 w-full">Entrar</Button>
              </form>
            ) : demo ? (
              <form action={signInDemo} className="mt-7 grid gap-5">
                <p className="rounded-xl bg-warn-soft px-4 py-3 text-[14.5px] font-semibold text-warn-text">
                  Modo demostración: elige un perfil para ver la aplicación tal y como la vería cada departamento. Datos de ejemplo.
                </p>
                <div className="grid gap-2.5" role="group" aria-label="Perfil de demostración">
                  {Role.options.map((r) => (
                    <Button key={r} type="submit" name="role" value={r} variant={r === "direccion" ? "primary" : "secondary"} size="lg" className="!justify-between text-left">
                      <span>{ROLE_ACCESS[r].label}</span>
                      <span aria-hidden="true">→</span>
                    </Button>
                  ))}
                </div>
              </form>
            ) : (
              <p role="status" className="mt-7 rounded-xl bg-bg px-4 py-3 text-muted">El acceso no está configurado en este entorno.</p>
            )}

            <p className="mt-6 text-[13.5px] leading-snug text-muted">
              Acceso reservado al personal autorizado de MANSERA. Cada usuario ve únicamente los datos de su departamento.
            </p>
          </div>
          <p className="mt-5 text-center text-sm text-muted">MANSERA Smart Maintenance · desarrollado por SOLVENTA</p>
        </div>
      </section>
    </main>
  );
}
