# MANSERA Smart Maintenance — memoria del proyecto

> Se carga en CADA sesión: mantenlo corto (< 150 líneas). El detalle vive en `docs/`, el estado vivo en `memory/`.

## Qué es
SaaS multiusuario (login, paneles por departamento) de **SOLVENTA IA** para **MANSERA** (Mantenimientos y Servicios Aguilar, S.L., Sevilla).
Es una **capa de integración + inteligencia** sobre los sistemas que MANSERA ya usa: **PGMWin** (GMAO), **A3ERP** (ERP), **Trello** (proyectos/ofertas), **Sésame HR** (personal).
**No sustituye** esos sistemas: ellos siguen siendo la fuente de verdad de sus datos.
Objetivo comercial a medio plazo: producto replicable para otras empresas de mantenimiento con software desconexo.

## Principios no negociables
1. **PROBLEMA → PROCESO → DATOS → TECNOLOGÍA → SOLUCIÓN → BENEFICIO.** Nunca "IA y buscar dónde ponerla".
2. **API-first, sin base de datos como intermediario obligatorio.** Lecturas y escrituras van directamente a la API de cada app (vía capa de conectores). Supabase guarda solo lo propio (usuarios, permisos, auditoría, enlaces entre entidades, IA) y, de forma opcional y justificada, caché/histórico. Ver `docs/03-arquitectura.md` §Política de acceso a datos.
3. **Cada dato tiene un dueño.** A3 = clientes/facturación · PGMWin = activos/OT/preventivo · Trello = ofertas/proyectos · Sésame = personal. Enlazamos, no duplicamos.
4. **Humano en el circuito.** Toda escritura en un sistema de registro nace como *propuesta* validable (ADR-0005) hasta que se decida lo contrario por flujo.
5. **IA trazable.** Sin fuente no hay respuesta. Se cita app, entidad, periodo y cálculo. Nunca inventar procedimientos técnicos. Anomalía ≠ predicción.
6. **No inventar funcionalidades de las apps.** Lo no verificado se registra en `memory/SUPUESTOS.md` y se prueba con un *spike* antes de construir encima.
7. **Seguridad por defecto:** mínimo privilegio, secretos fuera del repo, RLS en todas las tablas, datos en UE.
8. **Simple antes que complejo.** Si se resuelve sin IA o sin n8n, se hace sin ellos.

## Protocolo de sesión (OBLIGATORIO — evita perder contexto)
**Al empezar o tras compactar:** el hook `SessionStart` imprime `memory/ESTADO.md`. Léelo entero; después lee solo lo que necesite la tarea (`docs/00-INDEX.md` indica qué).
**Durante:** trabaja por hito (`docs/11-roadmap.md`), con lista de tareas (TaskCreate/TaskUpdate). Una decisión relevante = un ADR en `memory/adr/`.
**Antes de cerrar un bloque de trabajo o cuando el contexto vaya largo:** ejecuta `/cierre` (actualiza `ESTADO.md`, `DIARIO.md`, `SUPUESTOS.md`, `RIESGOS.md`).
**Al terminar un hito:** `/revision` (revisor independiente, solo lectura) y no avanzar al siguiente hasta resolver bloqueantes.
**Nunca** confíes en que "lo recordarás": si no está en `memory/` o `docs/`, no existe.

## Reglas de trabajo con el usuario
- Idioma: **español (es-ES)** en conversación, documentación, textos de UI y commits.
- Tras cada bloque de cambios de código, entrega al usuario los comandos **PowerShell** `git add` / `git commit` / `git push` (el usuario trabaja en Windows y los ejecuta él). No hagas push por tu cuenta.
- Instrucciones de configuración/despliegue para el usuario: **en el chat, con sus comandos**, no como ficheros `.md` sueltos. (La documentación técnica de `docs/` sí se mantiene.)
- Todos los comandos git, siempre desde la raíz de ESTE proyecto (nunca desde la carpeta de usuario de Windows).
- Sé crítico: si una petición es mala idea, dilo con argumentos y una alternativa.
- Distingue siempre **hecho / hipótesis / recomendación**. Si falta un dato de MANSERA, dilo; no rellenes con suposiciones.

## Stack (resumen; detalle y estado de cada decisión en `docs/03` y `memory/adr/`)
Monorepo pnpm + Turborepo · **Next.js (App Router) + TypeScript + Tailwind + shadcn/ui + Motion** (PWA) en **Vercel** · **Supabase** (Auth, Postgres+RLS, Storage, Realtime, pgvector) · **Gateway on-prem** (Node, solo conexiones salientes) para PGMWin/A3 locales · **n8n** solo para orquestación auxiliar no crítica · LLM vía API (Anthropic/OpenAI) **solo desde servidor**.

## Reglas de código
- TypeScript estricto; validación con Zod en todas las fronteras (API de apps, entradas de usuario, salidas del LLM).
- Cada conector implementa la interfaz común (`docs/integraciones/00-contrato-conectores.md`), declara sus *capabilities* y tiene tests de contrato con fixtures.
- Sin lógica de negocio en componentes UI. Sin secretos en cliente. Sin `any` sin comentario justificado.
- Migraciones SQL versionadas en `supabase/migrations`; toda tabla con RLS y test de políticas.
- Una PR/commit = un cambio coherente; mensaje en español, imperativo, prefijo convencional (`feat:`, `fix:`, `docs:`, `chore:`…).
- UI: seguir `docs/07-ui-ux-design-system.md` y la skill `premium-ui`. Móvil primero. Sin excepciones de accesibilidad.

## Mapa de documentos
`docs/00-INDEX.md` es el índice maestro. Lo esencial: contexto `01` · producto `02` · arquitectura `03` · integraciones `integraciones/` · datos `05` · seguridad `06` · UI `07` · IA `08` · calidad `09` · entornos `10` · **roadmap `11`** · preguntas abiertas `12`.
Vivo: `memory/ESTADO.md` · `DECISIONES.md` · `SUPUESTOS.md` · `RIESGOS.md` · `DIARIO.md`.
Skills: `.claude/skills/*` · Comandos: `/inicio` `/cierre` `/revision` `/estado` `/spike` · Subagente: `reviewer`.
