# ESTADO ACTUAL DEL PROYECTO  (se imprime al iniciar/compactar sesión — mantener < 80 líneas)

**Última actualización:** 2026-10-15 · respuestas de MANSERA sobre los 4 sistemas; A3ERP reescrito para la API de Link Soluciones; plan de costes (docs/15)
**Fase/hito en curso:** M0 cerrado salvo confirmación del usuario · trabajo de M1/M2 adelantado sin G1 a petición del usuario («todo lo que se pueda preparar»)
**Puertas:** G0 técnicamente cumplida, **sin confirmación expresa** del usuario (ADR-0002/0004). G1 no superada: ningún spike contra APIs reales (R-17). ADR-0010/0011/0013/0014 «propuesto (implementado)»: falta aceptación expresa.

## Qué existe (verificado 2026-10-14: lint y typecheck en 5 paquetes · core 87 · connectors 84 · gateway 14 · RLS 43 · E2E ~304; build)
- Monorepo pnpm + Turborepo: `apps/web` (Next 16, React 19, Tailwind 4, Motion), `apps/gateway`, `packages/{core,ui,connectors}`, `supabase/`.
- `packages/core`: esquemas Zod, `DataProvider`, permisos (`canPerform`, `canUseRealData`: la vista previa nunca abre datos reales; `canSeeSickLeave`: la baja individual solo la ve RR. HH.), organización activa (`tenancy.ts`), indicadores (`kpis.ts`), catálogo de conectores, ayuda, `demo/` FICTICIO.
- `packages/connectors`: errores tipados, `http.ts` (tiempo límite y tope de tamaño), `policy.ts` (reintentos, cupo), Trello y Sésame (lectura), A3ERP (rutas y mapeo; filtro SQL solo con parámetros tipados), a3innuva Nómina (OAuth WKA), protocolo del gateway.
- `apps/gateway`: ejecutor con lista blanca para A3ERP vía la API de Link Soluciones (ApiKey, OData, `$skip`/`$top`): health, comprobación de clave, facturas/albaranes/efectos pendientes y clientes. Sin transporte ni servicio de Windows.
- 7 paneles por rol y 18 secciones; Personal (Sésame) y Comercial (Trello) con datos reales cuando haya credenciales, origen siempre visible; Conexiones con credenciales (Vault), OAuth de nómina, tablero de Trello y estado real.
- Pantallas de error, carga y 404 en español; cabeceras de seguridad (anti-clickjacking); menú móvil con «Más» siempre (cerrar sesión, tema, organización).

## Infraestructura
- Supabase **Mansera** (ref synwtbopxwvggicrfjjj, eu-central-1): **12 migraciones, todas aplicadas**. Vault verificado en real. Auditoría: solo funciones del sistema escriben. Caché: máximo 24 h y borrado con la conexión.
- Vercel: https://mansera-smart.vercel.app (el antiguo mansera-indol redirige). Funciones en **fra1** (verificado). Clave de servicio y `CRON_SECRET` configuradas (verificado: cron 401). Tarea diaria: renovación OAuth + purga de caché.
- Usuarios: `demo@solventa.com` (Dirección), `iasolventa@gmail.com` (TI). CI: lint, typecheck, test, build, e2e, gitleaks.

## Calidad y revisiones
- Revisiones independientes: n.º 1 (M0), n.º 2 (conexiones), n.º 3 (conectores), seguridad OAuth y **revisión completa 2026-10-14** (NO APTO por la vista previa → corregido; detalle en DIARIO).
- axe solo bloquea impactos serios/críticos; modo oscuro y 375 px en 6 pantallas. Lighthouse solo en /login.

## Pendiente de la revisión completa (no hecho todavía)
- R-15: exigir variables de Supabase en producción (necesita confirmar que están en Vercel).
- Miembros: alta por invitación y «al menos un TI» (M2 de seguridad).
- Pruebas: cambio de organización y caminos de datos reales en E2E (exigen Supabase de pruebas); paleta de búsqueda como combobox completo; trampa de foco en hojas.
- Contrato de conectores: `capabilities()` verificadas, versión de cada app.

## Siguiente paso concreto
1. Usuario: confirmar G0 y aceptar (o no) ADR-0010/0011/0013/0014; credenciales de PRUEBA de Trello o Sésame.
2. Respuestas del cuestionario (dónde están instalados los programas, PGMWin, A3ERP, Sésame, Conectia, ciberseguridad).
3. MANSERA/asesoría: EIPD y contrato de encargo (art. 28) antes de conectar nómina (docs/14).

## Bloqueos / pendientes de terceros
- Respondido (2026-10-15): PGMWin (nube de EGEOtec), Sésame (54 €/mes), A3ERP (local, API de Link Soluciones no contratada) y a3innuva (Conectia 45 €/mes). Pendiente: Trello, ciberseguridad (Q6), cliente OAuth de Wolters Kluwer.
- Decisiones de MANSERA: vía PGMWin (ADR-0015: pedir a EGEOtec documentación, entorno de pruebas y usuario SQL de lectura sobre vistas) y contratar la API de Sésame (54 €/mes).

## Avisos
- Datos demo ficticios. El login demo solo existe sin Supabase y fuera de producción.
- Todo lo de conectores está probado con respuestas SIMULADAS (R-17); la vista previa ya no abre datos reales.

## Riesgos activos top-3
R-26 datos de empleados/salud sin EIPD ni art. 28 · R-04 informe de ciberseguridad pendiente · R-27 token de Sésame sin modo solo lectura.
