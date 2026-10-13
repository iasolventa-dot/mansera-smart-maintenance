---
name: testing-review
description: Úsala al terminar una tarea o hito para aplicar la Definition of Done, ejecutar pruebas (unidad, contrato, RLS, e2e, accesibilidad, rendimiento, IA) y lanzar la revisión independiente.
---
# Pruebas y revisión

Referencia: `docs/09-testing-calidad.md`.

## Antes de dar algo por hecho
1. `pnpm lint && pnpm typecheck && pnpm test` verdes.
2. Si hay BD: tests de RLS por rol verdes.
3. Si hay conector: tests de contrato + caos (429, 5xx, timeout, esquema distinto, duplicado).
4. Si hay UI: Playwright 360/768/1440 × claro/oscuro, axe, Lighthouse; mirar las capturas.
5. Si hay IA: golden set + inyección + coste.
6. Recorre la Definition of Done completa.
7. Lanza `/revision`. Resuelve bloqueantes. Registra en `DIARIO.md`.

## Honestidad
Informa de lo que NO pudiste probar (p. ej. sin acceso al entorno real) y por qué. Nunca afirmes "funciona" sin haberlo ejecutado. Si un test falla, no lo desactives: arregla la causa o escálalo.
