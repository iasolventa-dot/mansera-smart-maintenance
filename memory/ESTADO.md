# ESTADO ACTUAL DEL PROYECTO  (se imprime al iniciar/compactar sesión — mantener < 80 líneas)

**Última actualización:** 2026-10-14 · datos reales listos para Personal (Sésame) y Comercial (Trello) con caché (ADR-0014); OAuth de nómina endurecido
**Fase/hito en curso:** M0 cerrado salvo confirmación del usuario · trabajo preparatorio de M1/M2 adelantado (borrador, sin G1)
**Puerta superada:** G0 técnicamente cumplida; falta la confirmación EXPRESA del usuario (ADR-0002/0004 y aceptar el adelanto de M2: ADR-0010/0011)

## Qué existe (verificado: lint, typecheck, 99 tests unitarios [core 71 · connectors 23 · gateway 5] + 37 de RLS + ~295 E2E; build)
- Monorepo pnpm + Turborepo: `apps/web` (Next 16, React 19, Tailwind 4, Motion), `apps/gateway`, `packages/{core,ui,connectors}`, `supabase/`.
- `packages/core`: esquemas Zod, contrato `DataProvider`, permisos por rol (`access.ts`, `canPerform`), `demo/` con datos FICTICIOS, ayuda (`help/`), catálogo de conectores (`connectors/specs.ts`).
- `packages/connectors`: errores tipados, sondeo de credenciales (Trello, Sésame), **conectores de lectura de Trello** (mapeo configurable a ofertas) **y Sésame HR** (según su OpenAPI oficial; minimización RGPD de la ficha de empleado), con datos de ejemplo inventados y protocolo del gateway.
- `apps/gateway`: ejecutor puro de trabajos (solo `a3erp.health` y `a3erp.login_check`). Sin transporte ni servicio de Windows.
- 7 paneles por rol y 17 secciones (detalle en `docs/02`): alertas, órdenes (+«Nueva OT» → propuesta), mantenimiento, activos, clientes, comercial, facturación, compras, personal, PRL/CAE, propuestas, informes, copiloto, **conexiones**, usuarios y auditoría, manual.
- **Conexiones → Credenciales de acceso** (ADR-0010): Trello, Sésame y **a3innuva Nómina** (OAuth WKA, ADR-0013) se guardan aquí; A3ERP «Se configura en el gateway» (ADR-0012); PGMWin «Pendiente de documentar». Secretos en Supabase Vault, solo TI, auditoría sin valores, validación en servidor Y en SQL. En demostración local el formulario funciona pero no guarda nada.
- Ayuda (ADR-0009): manual `/manual`, asistente con IA (modo guía sin `ANTHROPIC_API_KEY`) y tooltips centralizados.

## Infraestructura
- Supabase **Mansera** (ref synwtbopxwvggicrfjjj, eu-central-1): 6 migraciones aplicadas (núcleo, audit_log, roles, assistant_usage, connections_vault, hardening_auditoria). **Vault verificado en real** (2026-10-13): TI guarda, el secreto queda cifrado, solo `service_role` descifra; prueba en transacción deshecha, sin restos.
- Advisor: `rls_auto_enable()` (del usuario, aceptado R-12); funciones de conexiones ejecutables por `authenticated` a propósito (comprueban TI dentro); contraseñas filtradas desactivado (R-11, panel de Supabase).
- Vercel: proyecto `mansera` → https://mansera-smart.vercel.app (lo gestiona el usuario). Valores públicos de Supabase por defecto en `next.config.mjs` (R-15).
- Usuarios: `demo@solventa.com` (Dirección) e `iasolventa@gmail.com` (TI). CI: lint, typecheck, test, build, e2e, gitleaks.

## Calidad
- E2E + axe (WCAG 2.1 AA) en 7 perfiles, 375/768/1440, claro y oscuro; incluye ya el formulario de credenciales.
- Lighthouse móvil /login: 98/100/100/100 (solo pantalla pública).
- Auditorías independientes: n.º 1 (M0) y n.º 2 (conexiones + gateway): APTO CON CAMBIOS, importantes corregidos (ver DIARIO).

## Siguiente paso concreto
1. Usuario: confirmar ADR-0002/0004 y aceptar (o no) ADR-0010/0011; probar en Conexiones con credenciales de PRUEBA de Trello o Sésame (solo lectura).
2. Pasar el cuestionario de integración a MANSERA (pendiente de respuesta; versión sin códigos entregada en el chat).
3. Con respuestas: spikes (`scripts/spikes/`) → M1; luego M2 (`LiveDataProvider`, transporte del gateway).

## Datos reales (ADR-0014)
- Personal ← Sésame y Comercial ← Trello en cuanto haya credenciales en Conexiones (Trello necesita además «Configurar tablero de ofertas»). Origen siempre visible. Caché por organización; reintentos y cupo por sistema. 10 migraciones aplicadas.
- `CRON_SECRET` y clave de servicio configuradas en Vercel (comprobado 2026-10-14: la tarea responde 401 sin credenciales). Dominio principal ahora **https://mansera-smart.vercel.app** (el antiguo redirige).

## Privacidad
- Funciones de Vercel fijadas en fra1 (Frankfurt) el 2026-10-14; antes en iad1 (EE. UU.). Verificar tras el despliegue. Borrador RGPD: docs/14 (EIPD recomendada antes de nómina; falta contrato art. 28).

## Decisiones abiertas
- a3innuva Nómina (ADR-0013 propuesto): reparto de dueños con Sésame; contratar Conectia y pedir el cliente OAuth con la dirección de retorno https://mansera-smart.vercel.app/api/oauth/a3nomina/callback. Flujo «Conectar» ya construido; clave de servicio configurada por el usuario en Vercel (2026-10-14, no verificable desde aquí). 8 migraciones aplicadas.
- (Resuelto, ADR-0012) Credenciales de A3ERP/PGMWin: solo en el gateway; en la nube solo Trello y Sésame. 7 migraciones aplicadas.
- A3ERP por `http` en la LAN enviaría usuario/contraseña sin cifrar (R-18): exigir https si el servicio lo admite (Q3).

## Bloqueos / pendientes de terceros
- Cuestionario de integración (dónde están instalados, vía oficial de PGMWin, API de A3, API de Sésame, Trello, ciberseguridad). Bloquea M1, no la UI.

## Avisos
- Datos demo ficticios. El login demo solo existe sin Supabase y fuera de producción.
- Probes y gateway probados con respuestas SIMULADAS; nada verificado contra APIs reales (R-17).
- Lint en los 5 paquetes (configuración raíz `eslint.config.mjs` para paquetes; `apps/web` usa la de Next).
- `AGENTS.md` lo genera turbo. Docker no instalado.

## Riesgos activos top-3
R-02 PGMWin sin API utilizable · R-01 presupuesto remanente < propuesta · R-04 informe de ciberseguridad pendiente.
