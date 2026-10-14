# 11 · Roadmap

> **Cómo usar este documento:** es el plan de trabajo. Cada hito tiene objetivo, entregables y **criterios de aceptación** verificables. Estado vivo en `memory/ESTADO.md`. No abrir un hito con bloqueantes abiertos del anterior (puertas G0–G10).
> Las semanas son orientativas y se alinean con la propuesta comercial de **10 semanas** (implantación). **[POR CONFIRMAR]** la correspondencia exacta entre fase comercial 1 / plataforma completa y los hitos M0–M10 contra la *Propuesta MANSERA Smart Maintenance*; ajustar aquí si difiere.

## Vista general
| Hito | Semana | Nombre | Resultado visible |
|---|---|---|---|
| M0 | 1 | Cimientos | Repo, CI, Vercel+Supabase, login funcionando, design system base |
| M1 | 1–2 | Spikes de API y entorno | Cada app: verified / assumed / no-go + decisión gateway |
| M2 | 2–4 | Capa de conectores + Gateway | Salud de conexiones y lecturas reales |
| M3 | 3–5 | Panel unificado + vista 360 | Panel semáforo con datos reales |
| M4 | 5–6 | Enlaces de datos maestros | Cliente/activo unificados con confirmación |
| M5 | 6–8 | Propuestas y acciones rápidas | 2–3 acciones cross-app con validación humana |
| M6 | 7–9 | Copiloto trazable | Consultas objetivo con citas |
| M7 | 8–10 | Alertas/anomalías e informes | Informe de cliente + alertas explicadas |
| M8 | 10 | Piloto, endurecimiento y entrega | Piloto con usuarios, formación, runbooks |
| M9 | post | Packs (Mi PRL, asistente técnico, planificador…) | Según prioridad validada |
| M10 | post | Productización | Multi-tenant real, onboarding, conectores adicionales |

Dependencias críticas: **M1 desbloquea M2–M7.** Si PGMWin resulta no-go para escritura, M5 se replantea (ver riesgos).

---
## M0 · Cimientos (semana 1)
**Objetivo:** base sólida y repetible.
**Entregables:** monorepo pnpm+Turborepo (`apps/web`, `packages/*`) · Next.js+TS+Tailwind+shadcn+Motion · tokens de diseño y 8 componentes base · Supabase (proyectos staging/prod UE, Auth, esquema núcleo `orgs/profiles/memberships/audit_log` con RLS y tests) · login + rutas protegidas por rol · CI (lint, typecheck, test, gitleaks) · Vercel conectado · PWA instalable (manifest + icons) · `README` de arranque en el chat (no .md).
**Aceptación:** `pnpm i && pnpm dev` funciona desde cero · login real con 2 roles que ven paneles distintos · test RLS verde · despliegue automático a preview · Lighthouse PWA/Accesibilidad ≥ 90 · sin secretos en git.
**Riesgos:** deriva de alcance en UI → limitar a shell + login + panel vacío animado.

## M1 · Spikes de API y entorno (semanas 1–2)
**Objetivo:** convertir suposiciones en hechos. Comando `/spike <app>`.
**Entregables:** por app (Trello, Sésame, A3, PGMWin) informe en `memory/SUPUESTOS.md`: acceso, autenticación, entidades, límites, eventos, entorno de pruebas, coste de licencia, local/nube · decisión **gateway sí/no/alternativa** (ADR-0003) · respuesta a `12-preguntas-abiertas.md` críticas (con Cristina) · matriz de capabilities.
**Aceptación:** cada capability marcada `verified`/`assumed`/`no-go` con evidencia · plan B definido para PGMWin si no-go · usuario de integración de mínimo privilegio acordado.
**Riesgo:** R-02 (PGMWin sin API utilizable), R-03 (licencias no contratadas), R-04 (informe de ciberseguridad condiciona).

## M2 · Capa de conectores + Gateway (semanas 2–4)
**Objetivo:** hablar con las apps, de forma segura y observable.
**Entregables:** interfaz común + conectores Trello y Sésame (cloud) · conectores A3/PGMWin según M1 (cloud o vía gateway) · `apps/gateway` (servicio Windows, salientes, trabajos firmados, lista blanca, latido) · Vault de credenciales · panel de salud en Administración · reintentos/rate-limit/circuit breaker · tests de contrato + fixtures · registro de versión de app.
**Estado (2026-10-14), adelantado sin pasar G1 a petición del usuario («todo lo que se pueda preparar»):**
- **Hecho y probado con datos simulados:**
  - Vault y Conexiones, con a3innuva Nómina (OAuth WKA) añadida al ecosistema.
  - Conectores de lectura de Trello y Sésame.
  - Lecturas de A3ERP en el gateway; protocolo y ejecutor del gateway.
  - Reintentos, cupos y caché.
  - Estado real de las conexiones; Personal y Comercial con datos reales cuando haya credenciales.
- **Falta:**
  - Transporte del gateway, que depende de Q1/Q6.
  - Spikes reales (M1).
  - `capabilities()` verificadas y registro de la versión de cada app.
  - PGMWin (Q2).

**Aceptación:** `health()` correcto de cada app visible en UI · lectura real de ≥ 3 entidades por app confirmada · apagar una app degrada con aviso sin romper · caída/recuperación del gateway probada · ningún secreto en logs.

## M3 · Panel unificado + vista 360 (semanas 3–5)
**Objetivo:** primer valor visible, solo lectura.
**Entregables:** panel por rol con semáforo (rojo/naranja/verde con icono+texto) y "requiere tu atención" · KPIs (OT abiertas/vencidas, preventivos pendientes, ofertas por estado, fichajes/ausencias, facturación pendiente según datos disponibles) · búsqueda global ⌘K · vista 360 de cliente y ficha de activo (línea de tiempo) · estados de carga/vacío/error/dato antiguo · tiempo real vía webhooks Trello/Sésame · UI premium completa (animaciones, móvil).
**Aceptación:** datos reales de ≥ 2 apps en el mismo panel · LCP < 2,5 s · semáforo coincide con las reglas acordadas con MANSERA (documentadas) · 3 usuarios de MANSERA completan 3 tareas clave en < la mitad de tiempo vs. método actual (medido) · axe sin críticos.

## M4 · Enlaces de datos maestros (semanas 5–6)
**Objetivo:** "una sola vista" de clientes y activos sin copiar datos.
**Entregables:** `entities/entity_links/link_candidates` · algoritmo de coincidencia (NIF, nombre normalizado, dirección) con **confirmación humana** · pantalla de revisión de duplicados/huérfanos · informe de calidad de datos maestros.
**Aceptación:** ≥ 90 % de clientes activos enlazados o con candidato revisado · 0 enlaces automáticos con confianza < umbral sin humano · informe entregado a MANSERA.

## M5 · Propuestas y acciones rápidas (semanas 6–8)
**Objetivo:** eliminar el doble tecleo con control.
**Entregables:** `sync_proposals` + cola de aprobación con *diff* · 2–3 acciones elegidas con la auditoría de funciones (candidatas: **oferta ganada Trello → OT en PGMWin**; **albarán PGMWin → factura en A3**; alta de cliente A3 → PGMWin) · idempotencia + verificación posterior + auditoría · botones "Acciones rápidas" y enlaces directos al resto.
**Aceptación:** flujo completo probado en **entornos de prueba** sin duplicados ante reintentos · aprobación obligatoria · reversión/corrección documentada · tiempo por tarea medido antes/después · cero escrituras sin auditoría.
**Puerta:** autorización explícita de MANSERA para escribir en producción.

## M6 · Copiloto trazable (semanas 7–9)
**Objetivo:** consultar en lenguaje natural con confianza.
**Entregables:** herramientas tipadas sobre conectores y snapshots · citas (`SourceChip`) y "ver cálculo" · permisos heredados · golden set (≥ 30 preguntas) y arnés de evaluación · límites de coste · modo "sin dato".
**Aceptación:** ≥ 90 % de respuestas correctas y ≥ 95 % con cita verificable en el golden set · 0 respuestas con cifras sin fuente · pruebas de inyección de prompts superadas · coste/consulta dentro de presupuesto.

## M7 · Alertas, anomalías e informes (semanas 8–10)
**Objetivo:** pasar de "ver" a "avisar y explicar".
**Entregables:** snapshots nocturnos (`kpi_snapshots`) · reglas de anomalía (frecuencia de averías, coste, horas, preventivos incumplidos, comparación con máquinas gemelas) · explicaciones con IA · informe mensual de cliente (plantilla + resumen IA + revisión humana + copia inmutable).
**Aceptación:** alertas con evidencia y tasa de falsos positivos medida con MANSERA (< objetivo acordado) · informe de ≥ 2 clientes aprobado por MANSERA · distinción visible "anomalía" vs "predicción".

## M8 · Piloto, endurecimiento y entrega (semana 10)
**Entregables:** piloto con usuarios reales (candidato: proyecto Schaffer/Primor si encaja) · formación · runbooks · revisión de seguridad final (alineada con informe de ciberseguridad) · pruebas de carga y caos · backups restaurados · documentación de entrega · informe de resultados vs. criterios de éxito (`02`).
**Aceptación:** checklist de seguridad completo · SLA y plan de soporte acordados · satisfacción ≥ 4/5 · decisión del cliente sobre siguientes packs.

## M9 · Packs (post-entrega; priorizar con datos)
Orden candidato (a validar): **Mi PRL/CAE** (dolor nº 1; producto propio; integración de identidad y datos de plantilla → plataformas CAE) · **Generador de ofertas** (PoC con ~100 presupuestos históricos + precios PGMWin; fiabilidad medible) · **Asistente técnico RAG** · **Planificador inteligente** (priorizar→asignar→planificar→replanificar, con validación humana) · **Modo campo con voz/foto** · SCADA/IoT selectivo.
Cada pack entra por la ficha de oportunidad del proyecto (problema, proceso, usuarios, frecuencia, tiempo, coste, datos, complejidad, viabilidad).

## M10 · Productización
Multi-tenant efectivo (onboarding de organizaciones, aislamiento probado) · conectores para otros GMAO/ERP detrás de la interfaz común · facturación/medición de uso · documentación pública · estudio de canal (usuarios PGMWin). Sin dar por hecho ningún modelo comercial hasta validar valor.

---
## Puertas de revisión
| Puerta | Condición para pasar |
|---|---|
| G0 | M0 aceptado; CI verde; login+RLS probados |
| G1 | Capabilities verificadas; decisión gateway; preguntas críticas respondidas |
| G2 | Conectores con salud real; seguridad de credenciales revisada |
| G3 | Panel con datos reales validado por usuarios |
| G4 | Enlaces maestros revisados por MANSERA |
| G5 | Autorización de escritura en producción por escrito |
| G6 | Golden set superado; sin fugas de datos hacia LLM no previstas |
| G7 | Alertas calibradas; informe aprobado |
| G8 | Entrega aceptada |

## Gestión de cambios de alcance
Todo cambio se registra como ADR + actualización de este documento y se evalúa contra presupuesto (8.000–9.000 € remanente declarado vs. propuesta) y plazo. Lo que no mejore **tiempo, información, decisión, coste o calidad de servicio** se aparca.
