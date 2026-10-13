# ESTADO ACTUAL DEL PROYECTO  (se imprime al iniciar/compactar sesión — mantener < 80 líneas)

**Última actualización:** 2026-10-13 · demo completa de la interfaz (ADR-0008) desplegada en Vercel
**Fase/hito en curso:** M0 · Cimientos — UI, núcleo, Auth y Supabase hechos; faltan axe/Lighthouse, `/revision` y G0
**Puerta superada:** ninguna (G0 pendiente)

## Qué existe (verificado: lint, typecheck, 81 tests unitarios + 291 E2E, `pnpm build` de 22 rutas; recorrido por rol en navegador)
- Monorepo pnpm + Turborepo: `apps/web` (Next 16, React 19, Tailwind 4, Motion), `packages/core`, `packages/ui`, `supabase/`.
- `packages/core`: esquemas Zod (`schemas.ts` + `modules.ts`), contrato `DataProvider`, permisos por rol (`access.ts`: 7 roles, 17 secciones agrupadas), `demo/` con datos FICTICIOS (fechas relativas a hoy). Sin estado: las escrituras devuelven resultado.
- `packages/ui`: Button, Card, StatCard (contador), StatusPill, SourceChip, LineChart/BarList/Donut (SVG, al ancho real), Reveal/Stagger.
- 7 paneles por rol (Dirección, TI, Oficina técnica, Administración, Compras, RR. HH., Campo) con KPIs trazables, gráficos y alertas.
- Secciones: Alertas (evidencia), Órdenes (+acción rápida "Nueva OT" → propuesta), Mantenimiento, Activos (ficha 360), Clientes (vista 360), Comercial (kanban Trello), Facturación, Compras y almacén, Personal, PRL y CAE (preview pack Mi PRL), Propuestas (diff + aprobar), Informes, Copiloto (7 temas, siempre con fuente), Conexiones, Usuarios y auditoría (matriz de permisos).
- Ayuda (ADR-0009): manual de usuario `/manual` (índice, búsqueda con resaltado, imprimir, icono ? por pantalla) y asistente de ayuda flotante con IA de Claude (servidor, caché de prompt, modo guía sin clave, límite diario en `assistant_usage`, citas al manual). Fuente única: `packages/core/src/help/content.ts`. Activar la IA = variable `ANTHROPIC_API_KEY` en Vercel (sin ella funciona en modo guía).
- Ayuda contextual al pasar el ratón: componente `Tooltip` (ui) + textos centralizados en `packages/core/src/help/tooltips.ts` (menú, cabecera, indicadores con cálculo y fuente, etiquetas, filtros, propuestas). Documentada en el manual.
- Transversal: notificaciones, búsqueda global Ctrl+K (server action sobre `DataProvider.search`), tema claro/oscuro, PWA con iconos PNG/maskable (`apps/web/scripts/generate-icons.mjs`).
- Estado de la demo (propuestas creadas/decididas) en cookie `msm_demo_state` (`lib/demo-state.ts`); desaparece con datos reales.

## Infraestructura
- Supabase **Mansera** (ref synwtbopxwvggicrfjjj, eu-central-1): 4 migraciones aplicadas (núcleo, audit_log inmutable, roles compras/rrhh, assistant_usage); org `mansera-demo`. Advisor: solo `public.rls_auto_enable()` (la activó el usuario; se mantiene). RLS probada con PGlite (24 tests). Aviso Auth pendiente: protección contra contraseñas filtradas desactivada (ajuste del panel de Supabase).
- Vercel: proyecto `mansera` (equipo solventa-ia) → https://mansera-indol.vercel.app; lo gestiona el usuario. Valores públicos de Supabase por defecto en `next.config.mjs`. La conexión MCP de Vercel no tiene acceso a ese equipo.
- Usuarios: `demo@solventa.com` (rol Dirección, "Demo SOLVENTA", para la demo) y `iasolventa@gmail.com` (TI, administración). Rol real desde `memberships`; TI/Dirección pueden previsualizar otros paneles mientras los datos sean de ejemplo.
- CI GitHub Actions (lint, typecheck, test, build, gitleaks). Git: el usuario autorizó commit/push.

## Calidad verificada (G0)
- E2E + accesibilidad (Playwright + axe, WCAG 2.1 AA): **291 pruebas pasan** en 7 perfiles, 3 tamaños (375/768/1440), tema claro y oscuro; sin desbordamiento horizontal; permisos, propuestas, búsqueda, manual, asistente y tooltips. Se ejecutan en CI (job `e2e`). Local: `pnpm --filter @msm/web exec playwright test --workers=3` (cierra antes cualquier `pnpm dev` de este proyecto).
- Corregido gracias a ellas: contraste insuficiente (menú, etiqueta IA, azul principal en oscuro, botón secundario), desbordamiento (cabecera a 768, manual y usuarios a 375), error de hidratación del contador con «reducir movimiento».
- CI verde con el job `e2e` (291 pruebas también en Linux). Lighthouse móvil sobre https://mansera-indol.vercel.app/login: rendimiento 98 · accesibilidad 100 · buenas prácticas 100 · SEO 100; LCP 2,2 s, CLS 0, TBT 120 ms. Solo se midió la pantalla pública (el resto exige sesión).
- `/revision` independiente hecha: APTO CON CAMBIOS; bloqueantes corregidos (permisos en servidor con `canPerform`; ADR-0002/0004 aceptados de hecho). Detalle en DIARIO y riesgos R-11..R-15.
- **G0: cumplida** salvo confirmación expresa del usuario (ADR-0002/0004) y los pendientes asumidos: login real verificado a mano, Lighthouse solo en /login, auditoría y aprobación humana sin probar de extremo a extremo hasta M2.

## Siguiente paso concreto
1. Usuario: revisar la demo en producción con `demo@solventa.com` y dar feedback.
2. M0 pendiente: axe + Lighthouse sobre la URL real, `/revision` independiente, tests de componentes, confirmar ADR-0002/0004 (aceptados de hecho).
3. Luego M1 (spikes de API) y M2 (conectores → `LiveDataProvider` + tablas `sync_proposals`, `entities`, etc.). Los esquemas de `modules.ts` son hipótesis hasta los spikes.

## Bloqueos / pendientes de terceros
- Q1–Q7 de `docs/12-preguntas-abiertas.md` (Cristina/proveedores) — no bloquean la UI, sí M1.

## Avisos
- Datos demo ficticios (nombres de cliente inventados). El login demo local solo existe sin Supabase y fuera de producción.
- No hay entorno de pruebas verificado de PGMWin/A3: las propuestas dicen "entorno de pruebas" por diseño (ADR-0005), no por hecho.
- `AGENTS.md` lo genera turbo; mantenerlo versionado. Docker no instalado (no se ha probado `supabase start`).

## Riesgos activos top-3
R-02 PGMWin sin API utilizable · R-01 presupuesto remanente < propuesta · R-04 informe de ciberseguridad pendiente.
