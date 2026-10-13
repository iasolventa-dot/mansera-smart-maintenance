# ADR 0005 · Escrituras como propuesta con aprobación humana
- **Fecha:** 2026-10-13 · **Estado:** aceptado
## Contexto
ERP/GMAO son sistemas de registro; una escritura errónea tiene impacto contable/operativo. Regla del proyecto: humano en el circuito en decisiones con consecuencias.
## Decisión
Toda escritura = `sync_proposals` (diff visible) → aprobación → ejecución idempotente → verificación → auditoría. Se podrá automatizar un flujo concreto solo con análisis de riesgos, controles y autorización escrita de MANSERA.
## Consecuencias
Más fricción inicial; seguridad y confianza. La auditoría de funciones decide qué flujos merecen automatizarse tras demostrar fiabilidad.
