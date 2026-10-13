"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  CalendarCheck, ClipboardList, FileText, GitPullRequestArrow, LayoutDashboard, LogOut, Menu, Moon, Plug,
  Search, Sparkles, Sun, Wrench, X, type LucideIcon,
} from "lucide-react";
import { Avatar, Badge, Logo, cn, spring } from "@msm/ui";

export type NavItem = { id: string; label: string; href: string };
type Props = {
  nav: NavItem[];
  user: { name: string; roleLabel: string };
  roles: { value: string; label: string; current: boolean }[];
  demo: boolean;
  canPreview: boolean;
  switchRole: (formData: FormData) => Promise<void>;
  signOut: () => Promise<void>;
  children: ReactNode;
};

const ICONS: Record<string, LucideIcon> = {
  panel: LayoutDashboard, ordenes: ClipboardList, activos: Wrench, propuestas: GitPullRequestArrow,
  copiloto: Sparkles, informes: FileText, conexiones: Plug, campo: CalendarCheck,
};

export function AppShell({ nav, user, roles, demo, canPreview, switchRole, signOut, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [more, setMore] = useState(false);
  const [palette, setPalette] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    // Sincroniza con el DOM/preferencia del sistema (no existe en el servidor).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDark(document.documentElement.dataset.theme === "dark" ||
      (!document.documentElement.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches));
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPalette((p) => !p); }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);

  const toggleTheme = useCallback(() => {
    const next = dark ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("msm-theme", next); } catch { /* sin almacenamiento: solo no se recuerda */ }
    setDark(!dark);
  }, [dark]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const primary = nav.slice(0, nav.length > 5 ? 4 : nav.length);
  const overflow = nav.slice(primary.length);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[264px_1fr]">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:font-bold">Saltar al contenido</a>

      {/* Barra lateral (escritorio) */}
      <aside className="sticky top-0 hidden h-dvh flex-col bg-sidebar px-4 py-5 text-white lg:flex">
        <Logo inverted className="px-2" />
        <nav aria-label="Principal" className="mt-8 grid gap-1">
          {nav.map((n) => {
            const Icon = ICONS[n.id] ?? LayoutDashboard;
            const active = isActive(n.href);
            return (
              <Link key={n.id} href={n.href} aria-current={active ? "page" : undefined}
                className={cn("relative flex min-h-12 items-center gap-3 rounded-xl px-3 text-[15.5px] font-bold transition-colors", active ? "text-white" : "text-white/75 hover:bg-white/8 hover:text-white")}>
                {active ? <motion.span layoutId="side-active" transition={spring} className="absolute inset-0 rounded-xl bg-white/14 ring-1 ring-white/10" /> : null}
                <Icon className="relative size-5" aria-hidden="true" />
                <span className="relative">{n.label}</span>
                {n.id === "copiloto" ? <Badge tone="info" className="relative ml-auto !bg-cyan/25 !text-cyan">IA</Badge> : null}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto grid gap-3">
          {demo && canPreview ? <RoleSwitcher roles={roles} switchRole={switchRole} dark /> : null}
          <form action={signOut}>
            <button className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-[15px] font-semibold text-white/75 hover:bg-white/8 hover:text-white">
              <LogOut className="size-5" aria-hidden="true" /> Cerrar sesión
            </button>
          </form>
          <p className="px-3 text-xs text-white/50">Desarrollado por SOLVENTA</p>
        </div>
      </aside>

      <div className="min-w-0">
        {/* Cabecera */}
        <header className="sticky top-0 z-30 flex min-h-16 items-center gap-3 border-b border-border bg-surface/85 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="lg:hidden"><Logo /></div>
          <button onClick={() => setPalette(true)} className="ml-auto hidden min-h-11 w-full max-w-sm items-center gap-2 rounded-xl border border-border bg-bg px-3.5 text-muted hover:border-primary/50 sm:flex lg:ml-0" aria-label="Buscar o ir a… (Ctrl+K)">
            <Search className="size-4.5" aria-hidden="true" /> <span className="text-[15px]">Buscar o ir a…</span>
            <kbd className="ml-auto rounded-md border border-border bg-surface px-1.5 text-xs font-bold">Ctrl K</kbd>
          </button>
          <div className="ml-auto flex items-center gap-2 sm:ml-0">
            {demo ? <Badge tone="warn" className="whitespace-nowrap uppercase tracking-wide"><span className="sm:hidden">Demo</span><span className="hidden sm:inline">Datos de ejemplo</span></Badge> : null}
            <button onClick={() => setPalette(true)} aria-label="Buscar" className="grid size-11 place-items-center rounded-xl text-muted hover:bg-primary-soft sm:hidden"><Search className="size-5" /></button>
            <button onClick={toggleTheme} aria-label={dark ? "Cambiar a tema claro" : "Cambiar a tema oscuro"} className="grid size-11 place-items-center rounded-xl text-muted hover:bg-primary-soft">
              {dark ? <Sun className="size-5" /> : <Moon className="size-5" />}
            </button>
            <div className="hidden items-center gap-3 pl-2 sm:flex">
              <Avatar name={user.name} />
              <div className="leading-tight"><div className="text-[15px] font-bold">{user.name}</div><div className="text-[13px] text-muted">{user.roleLabel}</div></div>
            </div>
          </div>
        </header>

        <main id="contenido" className="px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-12">{children}</main>
      </div>

      {/* Barra inferior (móvil) */}
      <nav aria-label="Principal" className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/90 backdrop-blur-xl lg:hidden">
        <ul className="mx-auto grid max-w-xl" style={{ gridTemplateColumns: `repeat(${primary.length + (overflow.length ? 1 : 0)}, minmax(0, 1fr))` }}>
          {primary.map((n) => {
            const Icon = ICONS[n.id] ?? LayoutDashboard;
            const active = isActive(n.href);
            return (
              <li key={n.id}>
                <Link href={n.href} aria-current={active ? "page" : undefined} className={cn("relative flex min-h-16 flex-col items-center justify-center gap-0.5 text-[12px] font-bold", active ? "text-primary-text" : "text-muted")}>
                  {active ? <motion.span layoutId="tab-active" transition={spring} className="absolute inset-x-3 top-0 h-1 rounded-b-full bg-primary" /> : null}
                  <Icon className="size-6" aria-hidden="true" />
                  {n.label.split(" ")[0]}
                </Link>
              </li>
            );
          })}
          {overflow.length ? (
            <li><button onClick={() => setMore(true)} className="flex min-h-16 w-full flex-col items-center justify-center gap-0.5 text-[12px] font-bold text-muted"><Menu className="size-6" aria-hidden="true" />Más</button></li>
          ) : null}
        </ul>
      </nav>

      <AnimatePresence>
        {more ? (
          <Sheet onClose={() => setMore(false)} title="Más opciones">
            <ul className="grid gap-1">
              {overflow.map((n) => {
                const Icon = ICONS[n.id] ?? LayoutDashboard;
                return <li key={n.id}><Link href={n.href} onClick={() => setMore(false)} className="flex min-h-14 items-center gap-3 rounded-xl px-3 text-[17px] font-bold hover:bg-primary-soft"><Icon className="size-5 text-primary" aria-hidden="true" />{n.label}</Link></li>;
              })}
            </ul>
            {demo && canPreview ? <div className="mt-4 border-t border-border pt-4"><RoleSwitcher roles={roles} switchRole={switchRole} /></div> : null}
            <form action={signOut} className="mt-2"><button className="flex min-h-14 w-full items-center gap-3 rounded-xl px-3 text-[17px] font-bold text-bad-text hover:bg-bad-soft"><LogOut className="size-5" aria-hidden="true" />Cerrar sesión</button></form>
          </Sheet>
        ) : null}
        {palette ? <Palette nav={nav} onClose={() => setPalette(false)} onGo={(href) => { setPalette(false); router.push(href); }} /> : null}
      </AnimatePresence>
    </div>
  );
}

function RoleSwitcher({ roles, switchRole, dark }: { roles: Props["roles"]; switchRole: Props["switchRole"]; dark?: boolean }) {
  return (
    <form action={switchRole} className="grid gap-1.5 px-1">
      <label htmlFor={dark ? "role-d" : "role-m"} className={cn("text-xs font-bold uppercase tracking-wider", dark ? "text-cyan" : "text-muted")}>Vista previa como</label>
      <select id={dark ? "role-d" : "role-m"} name="role" defaultValue={roles.find((r) => r.current)?.value}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className={cn("min-h-12 rounded-xl border px-3 text-[15px] font-semibold", dark ? "border-white/20 bg-white/10 text-white [&>option]:text-black" : "border-border bg-bg text-text")}>
        {roles.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
      </select>
    </form>
  );
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <motion.div className="fixed inset-0 z-50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <button aria-label="Cerrar" onClick={onClose} className="absolute inset-0 bg-black/45" />
      <motion.div role="dialog" aria-modal="true" aria-label={title}
        className="safe-bottom absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-auto rounded-t-3xl bg-surface p-5 shadow-2xl"
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={spring}
        drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.6 }} onDragEnd={(_, i) => i.offset.y > 90 && onClose()}>
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-border" aria-hidden="true" />
        <div className="mb-2 flex items-center justify-between"><h2 className="text-lg font-extrabold">{title}</h2>
          <button onClick={onClose} aria-label="Cerrar" className="grid size-11 place-items-center rounded-xl hover:bg-primary-soft"><X className="size-5" /></button></div>
        {children}
      </motion.div>
    </motion.div>
  );
}

function Palette({ nav, onClose, onGo }: { nav: NavItem[]; onClose: () => void; onGo: (href: string) => void }) {
  const [q, setQ] = useState("");
  const [i, setI] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { input.current?.focus(); }, []);
  const items = useMemo(() => {
    const extra = [
      { id: "x-b14", label: "Bomba B-14 · ficha del activo", href: "/activos/A-0142" },
      { id: "x-prop", label: "Revisar propuestas pendientes", href: "/propuestas" },
    ].filter((e) => e.href === "/propuestas" ? nav.some((n) => n.id === "propuestas") : nav.some((n) => n.id === "activos"));
    return [...nav, ...extra].filter((n) => n.label.toLowerCase().includes(q.toLowerCase()));
  }, [nav, q]);

  return (
    <motion.div className="fixed inset-0 z-[60] grid place-items-start justify-items-center bg-black/45 p-4 pt-[12vh]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div role="dialog" aria-modal="true" aria-label="Buscar o ir a" className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
        initial={{ y: -12, scale: 0.97 }} animate={{ y: 0, scale: 1 }} exit={{ y: -8, opacity: 0 }} transition={spring}>
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search className="size-5 text-muted" aria-hidden="true" />
          <input ref={input} value={q} onChange={(e) => { setQ(e.target.value); setI(0); }} placeholder="Ir a… (panel, activos, propuestas)" aria-label="Buscar"
            className="min-h-14 w-full bg-transparent text-[17px] outline-none placeholder:text-muted"
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "ArrowDown") { e.preventDefault(); setI((x) => Math.min(x + 1, items.length - 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setI((x) => Math.max(x - 1, 0)); }
              if (e.key === "Enter" && items[i]) onGo(items[i].href);
            }} />
        </div>
        <ul className="max-h-80 overflow-auto p-2" role="listbox">
          {items.length === 0 ? <li className="px-3 py-6 text-center text-muted">Sin resultados</li> : null}
          {items.map((n, idx) => (
            <li key={n.id} role="option" aria-selected={idx === i}>
              <button onClick={() => onGo(n.href)} onMouseEnter={() => setI(idx)} className={cn("flex min-h-12 w-full items-center rounded-xl px-3 text-left text-[16px] font-semibold", idx === i && "bg-primary-soft text-primary-text")}>{n.label}</button>
            </li>
          ))}
        </ul>
      </motion.div>
    </motion.div>
  );
}
