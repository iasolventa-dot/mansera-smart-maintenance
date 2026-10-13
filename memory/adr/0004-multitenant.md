# ADR 0004 · Multi-tenant desde el día 1
- **Fecha:** 2026-10-13 · **Estado:** aceptado (de hecho: el usuario creó los proyectos de Supabase y Vercel el 2026-10-13; sin confirmación expresa, revocable)
**Decisión:** `org_id` en todas las tablas y RLS por org, aunque MANSERA sea la única organización al inicio. Evita reescritura si se productiza (M10). **Coste:** algo más de disciplina en consultas y tests. **Alternativa:** single-tenant y migrar después (descartada: migrar RLS con datos reales es caro).
