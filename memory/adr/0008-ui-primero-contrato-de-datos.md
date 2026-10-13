# ADR 0008 · Interfaz primero, sobre un contrato de datos (DataProvider)
- **Fecha:** 2026-10-13 · **Estado:** aceptado (decisión del usuario, motivo comercial)
## Contexto
Se necesita una visión general navegable de la aplicación para la estrategia de venta antes de tener conectores (M2), Supabase (M0) o respuestas a Q1–Q7. Requisito explícito del usuario: **no es una maqueta desechable; todo debe reutilizarse en el entorno real.**
## Decisión
Construir ya la UI real (`apps/web`, `packages/ui`) y el núcleo (`packages/core`: esquemas Zod del modelo canónico, permisos por rol y la interfaz `DataProvider`). Las pantallas **solo** hablan con `DataProvider`. Hoy lo implementa `DemoDataProvider` (datos ficticios, validados con los mismos esquemas Zod); el selector único está en `apps/web/src/lib/data.ts`. La sesión también está tras una interfaz (`lib/session.ts`) y su implementación demo se desactiva con `MSM_DATA_MODE=live`.
## Alternativas consideradas
1. HTML/prototipo aparte (se tira después; rechazado por el usuario).
2. Esperar a M2 para tener datos reales (no permite enseñar nada ahora).
## Consecuencias
- Positivas: la UI, los esquemas y los permisos se reutilizan tal cual; pasar a real = escribir `LiveDataProvider` (M2) y sustituir `session.ts` por Supabase Auth (M0).
- Negativas/riesgos: los esquemas canónicos son hipótesis hasta los spikes de M1 (S-03, S-04…) y pueden cambiar; la UI muestra "Datos de ejemplo" siempre que `mode === "demo"`. No desplegar a un dominio público sin `MSM_DATA_MODE=live` y auth real (el login demo no es seguridad).
- Revisar: al cerrar M1 (ajustar esquemas a lo que las APIs ofrecen realmente).
