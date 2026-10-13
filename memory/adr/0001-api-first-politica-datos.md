# ADR 0001 · API-first con política de acceso a datos
- **Fecha:** 2026-10-13 · **Estado:** aceptado (decisión del usuario, matizada)
## Contexto
Se espera tener API en todas las apps (PGMWin incluido, **por verificar**). El usuario no quiere una BD como intermediaria obligatoria para hablar con las apps.
## Decisión
Operar (leer/escribir) **directamente contra las APIs** mediante conectores. La BD propia guarda solo lo no existente en las apps (usuarios, permisos, auditoría, enlaces, IA). Permitido, explícito y regenerable: índice de búsqueda, snapshots históricos agregados (tendencias/anomalías), índice vectorial de documentos, copia inmutable de informes emitidos. Detalle: `docs/03-arquitectura.md`.
## Alternativas
1. Réplica completa en Postgres (descartada: dos fuentes de verdad, desfase, mantenimiento).
2. Cero almacenamiento (descartada: sin búsqueda cruzada ni series de 12 años, rate limits).
## Consecuencias
Más dependencia de disponibilidad/latencia de las apps (mitigar con caché corta, circuit breaker y degradación). Menos riesgo de incoherencias. Se revisa si una API resulta inviable (plan B en `docs/integraciones/01-pgmwin.md`).
