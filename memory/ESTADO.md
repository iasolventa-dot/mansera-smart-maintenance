# ESTADO ACTUAL DEL PROYECTO  (se imprime al iniciar/compactar sesión — mantener < 80 líneas)

**Última actualización:** 2026-10-13 · por: construcción de la interfaz (decisión del usuario: UI primero por estrategia de venta, ADR-0008)
**Fase/hito en curso:** M0 · Cimientos — **parcial**: UI + núcleo hechos; faltan Supabase/Auth real, RLS, CI, Vercel
**Puerta superada:** ninguna (G0 pendiente)

## Qué existe (verificado: `pnpm build` y `pnpm -r typecheck` OK; rutas probadas por rol con curl y en navegador)
- Monorepo pnpm + Turborepo: `apps/web` (Next 16, React 19, Tailwind 4, Motion), `packages/core`, `packages/ui`.
- `packages/core`: esquemas Zod (modelo canónico mínimo), `DataProvider` (contrato de datos), permisos por rol (`access.ts`), `demo/` (datos FICTICIOS que cumplen el contrato).
- `packages/ui`: tokens en `apps/web/src/app/globals.css` (claro/oscuro), Button, Card, StatCard (contador animado), StatusPill, SourceChip, charts SVG, Reveal/Stagger, tokens de movimiento.
- Pantallas: login (perfil demo), panel por rol, órdenes (filtros), activos + ficha 360 con timeline, mi día (campo), propuestas (diff + aprobar/rechazar), copiloto (respuestas con fuentes y "ver cálculo"), informes, conexiones (TI). Barra lateral, barra inferior móvil, hoja "Más", paleta Ctrl+K, tema claro/oscuro, PWA manifest.
- Cómo se enchufa lo real: `apps/web/src/lib/data.ts` (elegir proveedor) y `lib/session.ts` (sustituir por Supabase Auth). Con `MSM_DATA_MODE=live` el login demo se desactiva.

## Siguiente paso concreto
1. Usuario: revisar la UI (`pnpm dev` → http://localhost:3000) y dar feedback visual; commit con los comandos del chat.
2. Hecho tras la UI: ESLint, 11 tests (vitest en `packages/core`), CI en `.github/workflows/ci.yml` (lint, typecheck, test, build, gitleaks; aún sin ejecutar en GitHub), TypeScript fijado a 6.x (typescript-eslint no soporta 7). Permisos: el usuario autorizó git add/commit/push (se retiró el deny de `git push`).
   Supabase: migraciones `orgs/profiles/memberships/audit_log` con RLS y 19 tests (PGlite, sin Docker). Docker NO está instalado: `supabase start` aún no se ha podido probar; las migraciones son las mismas para local y web (`supabase link` + `db push`).
   Pendiente de M0: crear proyecto Supabase (local con Docker o en la nube) y sustituir `session.ts` por Auth; iconos PNG maskable; tests de componentes/axe/Lighthouse; `/revision`.
3. M1 (spikes) ajustará los esquemas canónicos a lo que las APIs ofrezcan realmente.

## Bloqueos / pendientes de terceros
- Q1–Q7 de `docs/12-preguntas-abiertas.md` (Cristina/proveedores) — no bloquean la UI, sí M1.

## Infraestructura (2026-10-13)
- Supabase **Mansera** (ref synwtbopxwvggicrfjjj, eu-central-1): migraciones orgs/profiles/memberships/audit_log aplicadas; org `mansera-demo` creada. Advisors: solo `public.rls_auto_enable()` (la activó el usuario; se mantiene).
- Vercel: proyecto `mansera` en equipo solventa-ia (https://mansera-indol.vercel.app); lo gestiona el usuario (la conexión MCP de Vercel no tiene acceso a ese equipo).
- Auth real: `lib/session.ts` usa Supabase Auth si hay `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; rol desde `memberships`. El login demo solo existe en local sin Supabase y fuera de producción. TI/Dirección pueden previsualizar otros paneles mientras los datos sean de ejemplo.
- Para entrar: crear usuario en Supabase Auth y añadir fila en `memberships` (org mansera-demo + rol).

## Avisos
- El login demo ya no se expone en producción. Los datos demo son ficticios (nombres de cliente inventados).
- ADR-0002 (stack) y ADR-0004 (multi-tenant) siguen "propuestos" aunque ya se construye sobre ellos: pedir aceptación al usuario.
- `AGENTS.md` lo genera turbo; mantenerlo versionado.

## Decisiones vigentes (detalle en `DECISIONES.md`)
ADR-0001 API-first · 0005 humano en el circuito · 0006 IA trazable · 0008 UI primero sobre `DataProvider` (aceptados) · 0002, 0003, 0004, 0007 (propuestos).

## Riesgos activos top-3
R-02 PGMWin sin API utilizable · R-01 presupuesto remanente < propuesta · R-04 informe de ciberseguridad pendiente.
