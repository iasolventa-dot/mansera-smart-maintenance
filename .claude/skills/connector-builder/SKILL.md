---
name: connector-builder
description: Úsala para crear o modificar un conector (packages/connectors/*) con la interfaz común, capabilities honestas, mapeo canónico, reintentos, límites, idempotencia y tests de contrato.
---
# Construcción de un conector

Precondición: spike aprobado (`api-spike`). Sin capabilities `verified`, no se implementa esa operación.

## Pasos
1. Lee `docs/integraciones/00-contrato-conectores.md` y la ficha de la app.
2. Estructura: `packages/connectors/<app>/{client.ts, mapping.ts, schemas.ts, capabilities.ts, index.ts, __tests__/}`.
3. **schemas.ts:** Zod para respuestas crudas de la app (falla controlada si cambia el esquema).
4. **mapping.ts:** `toCanonical` / `fromCanonical` puras + tests con fixtures anonimizados.
5. **client.ts:** HTTP con timeout, `AbortSignal`, token bucket por conector, `Retry-After`, backoff con jitter, errores tipados, `correlationId`, coalescencia de lecturas idénticas, circuit breaker.
6. **Escrituras:** requieren `idempotencyKey` y `proposalId`; tras escribir, **lee de nuevo** para verificar; escribe en `audit_log` (antes/después). Sin reintento ciego.
7. **capabilities.ts:** declara solo lo verificado; el resto `assumed` (la UI lo desactiva).
8. **Transporte:** `cloud` (directo) o `gateway` (trabajo firmado, lista blanca). El conector no sabe de UI.
9. **Tests de contrato:** mismo set contra mock y contra sandbox cuando exista; simulaciones de 429, 5xx, timeout, esquema alterado, duplicado de webhook.
10. **Observabilidad:** métricas (latencia, errores, rate limit) y `health()`.
11. Documenta cambios en `docs/integraciones/` y registra versión de app probada.

## Checklist final
- [ ] Sin secretos en código/logs · [ ] Zod en frontera · [ ] Idempotencia probada · [ ] Degradación con aviso · [ ] Fixtures sin datos reales · [ ] Capabilities honestas · [ ] Docs al día.
