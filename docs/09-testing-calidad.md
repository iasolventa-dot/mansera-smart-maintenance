# 09 · Pruebas, calidad y revisión

## Pirámide
| Nivel | Qué | Herramienta sugerida |
|---|---|---|
| Unidad | Dominio, mapeos `toCanonical`, cálculos de KPIs/anomalías | Vitest |
| Contrato | Cada conector vs mock y vs sandbox real (mismos tests) | Vitest + fixtures anonimizados |
| Base de datos | Migraciones + **políticas RLS por rol** | pgTAP / tests SQL en `supabase/tests` |
| Integración | Flujos: propuesta→aprobación→escritura→verificación | Vitest + Supabase local |
| E2E | Recorridos de usuario en móvil y escritorio | Playwright (360/768/1440, claro/oscuro) |
| Accesibilidad | axe automático + revisión manual | @axe-core/playwright |
| Rendimiento | LCP/INP/CLS, tamaño de bundle | Lighthouse CI |
| IA | Golden set, citas, alucinaciones, coste | Harness propio en `packages/ai/evals` |
| Seguridad | Dependencias, secretos, cabeceras | `pnpm audit`, gitleaks, revisión manual |

## Definition of Done (toda tarea)
- [ ] Cumple criterios de aceptación del hito (`11-roadmap.md`).
- [ ] Tipos estrictos, sin `any` injustificado, lint y typecheck verdes.
- [ ] Tests nuevos/actualizados y verdes; RLS probada si hay tablas.
- [ ] UI: 3 tamaños, claro/oscuro, estados vacío/carga/error, teclado y lector, movimiento reducido.
- [ ] Sin secretos ni datos reales en el repo.
- [ ] Docs y ADR actualizados; `memory/ESTADO.md` y `DIARIO.md` al día.
- [ ] Comandos PowerShell de commit entregados al usuario.

## Revisión
- **Continua:** el subagente `reviewer` (`/revision`) revisa con ojos frescos y solo lectura: arquitectura vs docs, seguridad, RLS, accesibilidad, coherencia con los principios.
- **Puertas de hito:** no se abre el hito siguiente con bloqueantes abiertos. Resultado de la revisión → `memory/DIARIO.md`.
- **Humana:** demo al usuario al cierre de cada hito con checklist de aceptación; el usuario decide.

## Datos de prueba
Sintéticos o anonimizados; fixtures en `fixtures/<app>/*.sample.json` (permitidos en git); datos reales **jamás** al repo. Entornos de prueba de las apps (PGMWin/A3) obligatorios antes de cualquier escritura.

## Pruebas de caos mínimas
App caída, rate limit, respuesta con esquema distinto, timeout del gateway, webhook duplicado/perdido: el sistema degrada y avisa, no se rompe.
