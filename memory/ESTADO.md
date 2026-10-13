# ESTADO ACTUAL DEL PROYECTO  (se imprime al iniciar/compactar sesión — mantener < 80 líneas)

**Última actualización:** 2026-10-13 · auditoría independiente n.º 2 corregida; base de conectores y gateway preparada
**Fase/hito en curso:** M0 cerrado salvo confirmación del usuario · trabajo preparatorio de M1/M2 adelantado (borrador, sin G1)
**Puerta superada:** G0 técnicamente cumplida; falta la confirmación EXPRESA del usuario (ADR-0002/0004 y aceptar el adelanto de M2: ADR-0010/0011)

## Qué existe (verificado: lint, typecheck, 99 tests unitarios [core 71 · connectors 23 · gateway 5] + 37 de RLS + ~295 E2E; build)
- Monorepo pnpm + Turborepo: `apps/web` (Next 16, React 19, Tailwind 4, Motion), `apps/gateway`, `packages/{core,ui,connectors}`, `supabase/`.
- `packages/core`: esquemas Zod, contrato `DataProvider`, permisos por rol (`access.ts`, `canPerform`), `demo/` con datos FICTICIOS, ayuda (`help/`), catálogo de conectores (`connectors/specs.ts`).
- `packages/connectors`: sondeo de credenciales de solo lectura (Trello, Sésame) y protocolo del gateway (trabajos firmados, lista blanca).
- `apps/gateway`: ejecutor puro de trabajos (solo `a3erp.health` y `a3erp.login_check`). Sin transporte ni servicio de Windows.
- 7 paneles por rol y 17 secciones (detalle en `docs/02`): alertas, órdenes (+«Nueva OT» → propuesta), mantenimiento, activos, clientes, comercial, facturación, compras, personal, PRL/CAE, propuestas, informes, copiloto, **conexiones**, usuarios y auditoría, manual.
- **Conexiones → Credenciales de acceso** (ADR-0010): Trello, Sésame y A3ERP según documentación oficial; PGMWin «Pendiente de documentar». Secretos en Supabase Vault, solo TI, auditoría sin valores, validación en servidor Y en SQL. En demostración local el formulario funciona pero no guarda nada.
- Ayuda (ADR-0009): manual `/manual`, asistente con IA (modo guía sin `ANTHROPIC_API_KEY`) y tooltips centralizados.

## Infraestructura
- Supabase **Mansera** (ref synwtbopxwvggicrfjjj, eu-central-1): 6 migraciones aplicadas (núcleo, audit_log, roles, assistant_usage, connections_vault, hardening_auditoria). **Vault verificado en real** (2026-10-13): TI guarda, el secreto queda cifrado, solo `service_role` descifra; prueba en transacción deshecha, sin restos.
- Advisor: `rls_auto_enable()` (del usuario, aceptado R-12); funciones de conexiones ejecutables por `authenticated` a propósito (comprueban TI dentro); contraseñas filtradas desactivado (R-11, panel de Supabase).
- Vercel: proyecto `mansera` → https://mansera-indol.vercel.app (lo gestiona el usuario). Valores públicos de Supabase por defecto en `next.config.mjs` (R-15).
- Usuarios: `demo@solventa.com` (Dirección) e `iasolventa@gmail.com` (TI). CI: lint, typecheck, test, build, e2e, gitleaks.

## Calidad
- E2E + axe (WCAG 2.1 AA) en 7 perfiles, 375/768/1440, claro y oscuro; incluye ya el formulario de credenciales.
- Lighthouse móvil /login: 98/100/100/100 (solo pantalla pública).
- Auditorías independientes: n.º 1 (M0) y n.º 2 (conexiones + gateway): APTO CON CAMBIOS, importantes corregidos (ver DIARIO).

## Siguiente paso concreto
1. Usuario: confirmar ADR-0002/0004 y aceptar (o no) ADR-0010/0011; probar en Conexiones con credenciales de PRUEBA de Trello o Sésame (solo lectura).
2. Pasar el cuestionario de integración a MANSERA (pendiente de respuesta; versión sin códigos entregada en el chat).
3. Con respuestas: spikes (`scripts/spikes/`) → M1; luego M2 (`LiveDataProvider`, transporte del gateway).

## Decisiones abiertas
- Dueño de las credenciales de A3ERP: Vault en la nube (hoy) o solo en el gateway local (recomendado; ADR-0011 §Abierto).
- A3ERP por `http` en la LAN enviaría usuario/contraseña sin cifrar (R-18): exigir https si el servicio lo admite (Q3).

## Bloqueos / pendientes de terceros
- Cuestionario de integración (dónde están instalados, vía oficial de PGMWin, API de A3, API de Sésame, Trello, ciberseguridad). Bloquea M1, no la UI.

## Avisos
- Datos demo ficticios. El login demo solo existe sin Supabase y fuera de producción.
- Probes y gateway probados con respuestas SIMULADAS; nada verificado contra APIs reales (R-17).
- `core`, `ui`, `connectors` y `gateway` no tienen lint propio (solo typecheck/test); deuda menor.
- `AGENTS.md` lo genera turbo. Docker no instalado.

## Riesgos activos top-3
R-02 PGMWin sin API utilizable · R-01 presupuesto remanente < propuesta · R-04 informe de ciberseguridad pendiente.
