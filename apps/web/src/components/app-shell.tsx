"use client";

import { Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  Bell, BellRing, BookOpen, Building2, CalendarCheck, CircleHelp, ClipboardList, FileText, GitPullRequestArrow, HandCoins, LayoutDashboard, LogOut,
  Menu, Moon, Plug, Search, ShieldCheck, ShoppingCart, Sparkles, Sun, TriangleAlert, UserCog, Users, Wrench, X, Wrench as Tool, type LucideIcon,
} from "lucide-react";
import type { CreateOrderResult } from "@/app/actions";
import { HINT, NAV_HINT, anchorFor, type NavId, type NewWorkOrderInput, type SearchHit } from "@msm/core";
import type { AssistantResult } from "@/lib/assistant";
import { Avatar, Badge, Logo, Tooltip, cn, spring } from "@msm/ui";
import { HELP_ASK_EVENT, HelpAssistant } from "./help-assistant";
import { QuickOrderDialog } from "./quick-order-dialog";

export type NavItem = { id: string; label: string; href: string; group: string };
export type NotificationItem = { id: string; title: string; body: string; at: string; href: string; tone: "info" | "warn" | "bad" | "ok"; read: boolean };
type Props = {
  nav: NavItem[];
  user: { name: string; roleLabel: string };
  roles: { value: string; label: string; current: boolean }[];
  notifications: NotificationItem[];
  demo: boolean;
  canPreview: boolean;
  quick: { clients: string[]; assets: { name: string; client: string }[] };
  switchRole: (formData: FormData) => Promise<void>;
  signOut: () => Promise<void>;
  createWorkOrder: (input: NewWorkOrderInput) => Promise<CreateOrderResult>;
  searchAll: (q: string) => Promise<SearchHit[]>;
  askAssistant: (input: { messages: { role: "user" | "assistant"; content: string }[]; panel: string | null }) => Promise<AssistantResult>;
  helpKey: string;
  role: string;
  children: ReactNode;
};

const ICONS: Record<string, LucideIcon> = {
  campo: CalendarCheck, panel: LayoutDashboard, alertas: TriangleAlert, ordenes: ClipboardList, mantenimiento: Tool, activos: Wrench,
  clientes: Building2, comercial: HandCoins, facturacion: FileText, compras: ShoppingCart, personal: Users, prl: ShieldCheck,
  propuestas: GitPullRequestArrow, informes: FileText, copiloto: Sparkles, conexiones: Plug, usuarios: UserCog, manual: BookOpen,
};
/** Destinos que ocupan la barra inferior móvil, por orden de prioridad. */
const MOBILE_PRIORITY = ["campo", "panel", "ordenes", "alertas", "activos", "copiloto", "propuestas"];

const rel = (iso: string) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 1) return "ahora";
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  return h < 24 ? `hace ${h} h` : `hace ${Math.round(h / 24)} d`;
};

export function AppShell(props: Props) {
  return (
    <Suspense fallback={null}>
      <Shell {...props} />
    </Suspense>
  );
}

function Shell({ nav, user, roles, notifications, demo, canPreview, quick, switchRole, signOut, createWorkOrder, searchAll, askAssistant, helpKey, role, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const [more, setMore] = useState(false);
  const [palette, setPalette] = useState(false);
  const [bell, setBell] = useState(false);
  const [dark, setDark] = useState(false);
  const orderOpen = params.get("accion") === "ot";

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
  const byPriority = MOBILE_PRIORITY.map((id) => nav.find((n) => n.id === id)).filter((n): n is NavItem => Boolean(n));
  const primary = (nav.length > 5 ? byPriority.slice(0, 4) : nav).sort((a, b) => nav.indexOf(a) - nav.indexOf(b));
  const overflow = nav.filter((n) => !primary.includes(n));
  const groups = nav.reduce<Record<string, NavItem[]>>((acc, n) => { (acc[n.group] ??= []).push(n); return acc; }, {});
  const unread = notifications.filter((n) => !n.read).length;
  const here = nav.find((n) => pathname === n.href || pathname.startsWith(n.href + "/"));
  const helpAnchor = here && here.id !== "manual" ? anchorFor(here.id as NavId) : null;
  const goTo = useCallback((href: string) => {
    if (href.startsWith("#help:")) window.dispatchEvent(new CustomEvent(HELP_ASK_EVENT, { detail: href.slice(6) }));
    else router.push(href);
  }, [router]);
  const closeOrder = useCallback(() => router.replace(pathname, { scroll: false }), [router, pathname]);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[272px_1fr] print:block">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:font-bold">Saltar al contenido</a>

      {/* Barra lateral (escritorio) */}
      <aside className="sticky top-0 hidden print:!hidden h-dvh flex-col bg-sidebar px-4 py-5 text-white lg:flex">
        <Logo inverted className="px-2" />
        <nav aria-label="Principal" className="mt-6 flex-1 overflow-y-auto pr-1">
          {Object.entries(groups).map(([group, items]) => (
            <div key={group} className="mb-4">
              {Object.keys(groups).length > 1 ? <p className="mb-1 px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-white/45">{group}</p> : null}
              <div className="grid gap-0.5">
                {items.map((n) => {
                  const Icon = ICONS[n.id] ?? LayoutDashboard;
                  const active = isActive(n.href);
                  return (
                    <Tooltip key={n.id} hint={NAV_HINT[n.id as NavId]} side="right">
                      <Link href={n.href} aria-current={active ? "page" : undefined}
                        className={cn("relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-bold transition-colors", active ? "text-white" : "text-white/75 hover:bg-white/8 hover:text-white")}>
                        {active ? <motion.span layoutId="side-active" transition={spring} className="absolute inset-0 rounded-xl bg-white/14 ring-1 ring-white/10" /> : null}
                        <Icon className="relative size-[18px]" aria-hidden="true" />
                        <span className="relative">{n.label}</span>
                        {n.id === "copiloto" ? <Badge tone="info" className="relative ml-auto !bg-cyan/25 !text-cyan">IA</Badge> : null}
                      </Link>
                    </Tooltip>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="grid gap-2 pt-3">
          {demo && canPreview ? <RoleSwitcher roles={roles} switchRole={switchRole} dark /> : null}
          <form action={signOut}>
            <Tooltip hint={HINT.signOut} side="right">
              <button className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-[15px] font-semibold text-white/75 hover:bg-white/8 hover:text-white">
                <LogOut className="size-[18px]" aria-hidden="true" /> Cerrar sesión
              </button>
            </Tooltip>
          </form>
          <p className="px-3 text-xs text-white/50">Desarrollado por SOLVENTA IA</p>
        </div>
      </aside>

      <div className="min-w-0">
        {/* Cabecera */}
        <header className="print:hidden sticky top-0 z-30 flex min-h-16 items-center gap-3 border-b border-border bg-surface/85 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="lg:hidden"><Logo /></div>
          <Tooltip hint={HINT.search} side="bottom">
            <button onClick={() => setPalette(true)} className="hidden min-h-11 w-full max-w-sm items-center gap-2 rounded-xl border border-border bg-bg px-3.5 text-muted hover:border-primary/50 sm:flex" aria-label="Buscar o ir a… (Ctrl+K)">
              <Search className="size-[18px]" aria-hidden="true" /> <span className="text-[15px]">Buscar o ir a…</span>
              <kbd className="ml-auto rounded-md border border-border bg-surface px-1.5 text-xs font-bold">Ctrl K</kbd>
            </button>
          </Tooltip>
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            {demo ? <Badge tone="warn" hint={HINT.demo} className="whitespace-nowrap uppercase tracking-wide"><span className="sm:hidden">Demo</span><span className="hidden sm:inline">Datos de ejemplo</span></Badge> : null}
            <button onClick={() => setPalette(true)} aria-label="Buscar" className="grid size-11 place-items-center rounded-xl text-muted hover:bg-primary-soft sm:hidden"><Search className="size-5" /></button>
            <div className="relative">
              <Tooltip hint={bell ? null : { ...HINT.bell, text: unread ? `Tienes ${unread} sin leer. ${HINT.bell.text}` : HINT.bell.text }} side="bottom">
                <button onClick={() => setBell((b) => !b)} aria-label={`Notificaciones${unread ? `, ${unread} sin leer` : ""}`} aria-expanded={bell}
                  className="relative grid size-11 place-items-center rounded-xl text-muted hover:bg-primary-soft">
                  {unread ? <BellRing className="size-5" /> : <Bell className="size-5" />}
                  {unread ? <span className="absolute right-2 top-2 grid size-4 place-items-center rounded-full bg-bad text-[10px] font-extrabold text-white">{unread}</span> : null}
                </button>
              </Tooltip>
              <AnimatePresence>{bell ? <NotificationsPanel items={notifications} onClose={() => setBell(false)} /> : null}</AnimatePresence>
            </div>
            <Tooltip hint={HINT.helpHere} side="bottom">
              <Link href={helpAnchor ? `/manual#${helpAnchor}` : "/manual"} aria-label="Ayuda de esta pantalla (manual)" className="hidden size-11 place-items-center rounded-xl text-muted hover:bg-primary-soft sm:grid">
                <CircleHelp className="size-5" aria-hidden="true" />
              </Link>
            </Tooltip>
            <Tooltip hint={{ ...HINT.theme, title: dark ? "Cambiar a tema claro" : "Cambiar a tema oscuro" }} side="bottom">
              <button onClick={toggleTheme} aria-label={dark ? "Cambiar a tema claro" : "Cambiar a tema oscuro"} className="grid size-11 place-items-center rounded-xl text-muted hover:bg-primary-soft">
                {dark ? <Sun className="size-5" /> : <Moon className="size-5" />}
              </button>
            </Tooltip>
            <Tooltip hint={HINT.user} side="bottom">
              <div className="hidden items-center gap-3 pl-2 md:flex">
                <Avatar name={user.name} />
                <div className="leading-tight"><div className="text-[15px] font-bold">{user.name}</div><div className="text-[13px] text-muted">{user.roleLabel}</div></div>
              </div>
            </Tooltip>
          </div>
        </header>

        <main id="contenido" className="px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-12">{children}</main>
      </div>

      {/* Barra inferior (móvil) */}
      <nav aria-label="Principal" className="print:hidden safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/90 backdrop-blur-xl lg:hidden">
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
            {Object.entries(overflow.reduce<Record<string, NavItem[]>>((acc, n) => { (acc[n.group] ??= []).push(n); return acc; }, {})).map(([group, items]) => (
              <div key={group} className="mb-2">
                <p className="mb-1 px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-muted">{group}</p>
                <ul className="grid gap-0.5">
                  {items.map((n) => {
                    const Icon = ICONS[n.id] ?? LayoutDashboard;
                    return <li key={n.id}><Link href={n.href} onClick={() => setMore(false)} className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-[17px] font-bold hover:bg-primary-soft"><Icon className="size-5 text-primary" aria-hidden="true" />{n.label}</Link></li>;
                  })}
                </ul>
              </div>
            ))}
            {demo && canPreview ? <div className="mt-3 border-t border-border pt-4"><RoleSwitcher roles={roles} switchRole={switchRole} /></div> : null}
            <form action={signOut} className="mt-2"><button className="flex min-h-14 w-full items-center gap-3 rounded-xl px-3 text-[17px] font-bold text-bad-text hover:bg-bad-soft"><LogOut className="size-5" aria-hidden="true" />Cerrar sesión</button></form>
          </Sheet>
        ) : null}
        {palette ? <Palette nav={nav} searchAll={searchAll} onClose={() => setPalette(false)} onGo={(href) => { setPalette(false); goTo(href); }} /> : null}
        {orderOpen ? <QuickOrderDialog clients={quick.clients} assets={quick.assets} create={createWorkOrder} onClose={closeOrder} /> : null}
      </AnimatePresence>
      <HelpAssistant nav={nav} storageKey={helpKey} ask={askAssistant} role={role} />
    </div>
  );
}

function NotificationsPanel({ items, onClose }: { items: NotificationItem[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", onDown);
    addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); removeEventListener("keydown", onKey); };
  }, [onClose]);
  const dot = { info: "bg-primary", warn: "bg-warn", bad: "bg-bad", ok: "bg-ok" } as const;
  return (
    <motion.div ref={ref} role="dialog" aria-label="Notificaciones" initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }} transition={spring}
      className="fixed inset-x-3 top-[68px] z-50 max-h-[70dvh] overflow-auto rounded-2xl border border-border bg-surface shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-[52px] sm:w-[380px]">
      <div className="flex items-center justify-between border-b border-border px-4 py-3"><h2 className="text-[16px] font-extrabold">Notificaciones</h2><span className="text-sm text-muted">{items.filter((n) => !n.read).length} sin leer</span></div>
      {items.length === 0 ? <p className="px-4 py-8 text-center text-muted">Todo al día.</p> : (
        <ul>
          {items.map((n) => (
            <li key={n.id} className="border-b border-border last:border-0">
              <Link href={n.href} onClick={onClose} className="flex gap-3 px-4 py-3.5 hover:bg-primary-soft">
                <span className={cn("mt-2 size-2.5 shrink-0 rounded-full", n.read ? "bg-border" : dot[n.tone])} aria-hidden="true" />
                <span className="min-w-0"><span className={cn("block text-[15.5px]", n.read ? "font-semibold" : "font-extrabold")}>{n.title}{n.read ? "" : <span className="sr-only"> (sin leer)</span>}</span>
                  <span className="block text-[14px] leading-snug text-muted">{n.body}</span><span className="mt-0.5 block text-[12.5px] font-semibold text-muted">{rel(n.at)}</span></span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}

function RoleSwitcher({ roles, switchRole, dark }: { roles: Props["roles"]; switchRole: Props["switchRole"]; dark?: boolean }) {
  return (
    <form action={switchRole} className="grid min-w-0 gap-1.5">
      <label htmlFor={dark ? "role-d" : "role-m"} className={cn("text-xs font-bold uppercase tracking-wider", dark ? "text-cyan" : "text-muted")}>Vista previa como</label>
      <Tooltip hint={HINT.roleSwitch} side={dark ? "right" : "top"}>
        <select id={dark ? "role-d" : "role-m"} name="role" defaultValue={roles.find((r) => r.current)?.value}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
          className={cn("min-h-11 w-full min-w-0 truncate rounded-xl border px-3 text-[15px] font-semibold", dark ? "border-white/20 bg-white/10 text-white [&>option]:text-black" : "border-border bg-bg text-text")}>
          {roles.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </Tooltip>
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

const KIND_LABEL: Record<SearchHit["kind"], string> = { cliente: "Cliente", activo: "Activo", orden: "Orden", oferta: "Oferta", persona: "Persona" };

function Palette({ nav, searchAll, onClose, onGo }: { nav: NavItem[]; searchAll: Props["searchAll"]; onClose: () => void; onGo: (href: string) => void }) {
  const [q, setQ] = useState("");
  const [i, setI] = useState(0);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { input.current?.focus(); }, []);

  useEffect(() => {
    if (q.trim().length < 2) return;
    let live = true;
    const t = setTimeout(async () => {
      setBusy(true);
      try { const r = await searchAll(q); if (live) setHits(r); } finally { if (live) setBusy(false); }
    }, 180);
    return () => { live = false; clearTimeout(t); };
  }, [q, searchAll]);

  const needle = q.toLowerCase();
  const navHits = nav.filter((n) => n.label.toLowerCase().includes(needle));
  const items: { id: string; label: string; sub?: string; href: string; tag: string }[] = [
    ...(needle.includes("orden") || needle.includes("nueva") || !needle ? [{ id: "act-ot", label: "Nueva orden de trabajo", sub: "Acción rápida · crea una propuesta", href: "?accion=ot", tag: "Acción" }] : []),
    ...navHits.map((n) => ({ id: n.id, label: n.label, href: n.href, tag: "Ir a" })),
    ...(q.trim().length >= 2 ? hits.map((h) => ({ id: h.kind + h.id, label: h.title, sub: h.subtitle, href: h.href, tag: KIND_LABEL[h.kind] })) : []),
    ...(q.trim().length >= 3 ? [{ id: "ask-help", label: `Preguntar a la ayuda: «${q.trim().slice(0, 60)}»`, sub: "El asistente te explica cómo hacerlo", href: `#help:${q.trim()}`, tag: "Ayuda" }] : []),
  ];
  const cur = Math.min(i, Math.max(items.length - 1, 0));

  return (
    <motion.div className="fixed inset-0 z-[60] grid place-items-start justify-items-center bg-black/45 p-4 pt-[10vh]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div role="dialog" aria-modal="true" aria-label="Buscar o ir a" className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
        initial={{ y: -12, scale: 0.97 }} animate={{ y: 0, scale: 1 }} exit={{ y: -8, opacity: 0 }} transition={spring}>
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search className="size-5 text-muted" aria-hidden="true" />
          <input ref={input} value={q} onChange={(e) => { setQ(e.target.value); setI(0); }} placeholder="Busca clientes, activos, órdenes, ofertas… o ve a una sección" aria-label="Buscar"
            className="min-h-14 w-full bg-transparent text-[17px] outline-none placeholder:text-muted"
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "ArrowDown") { e.preventDefault(); setI(Math.min(cur + 1, items.length - 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setI(Math.max(cur - 1, 0)); }
              if (e.key === "Enter" && items[cur]) onGo(items[cur].href);
            }} />
          {busy ? <span className="text-xs font-semibold text-muted">Buscando…</span> : null}
        </div>
        <ul className="max-h-[55dvh] overflow-auto p-2" role="listbox">
          {items.length === 0 ? <li className="px-3 py-6 text-center text-muted">Sin resultados</li> : null}
          {items.map((n, idx) => (
            <li key={n.id} role="option" aria-selected={idx === cur}>
              <button onClick={() => onGo(n.href)} onMouseEnter={() => setI(idx)} className={cn("flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left", idx === cur && "bg-primary-soft")}>
                <Badge tone={n.tag === "Acción" ? "info" : "neutral"} className="shrink-0">{n.tag}</Badge>
                <span className="min-w-0"><span className="block truncate text-[16px] font-semibold">{n.label}</span>{n.sub ? <span className="block truncate text-[13.5px] text-muted">{n.sub}</span> : null}</span>
              </button>
            </li>
          ))}
        </ul>
      </motion.div>
    </motion.div>
  );
}
