---
name: supabase-rls
description: Úsala al crear o cambiar tablas, políticas RLS, migraciones, Vault, Realtime o funciones en Supabase. Obliga a RLS + tests por rol + migraciones versionadas.
---
# Supabase: esquema, RLS y migraciones

## Reglas
1. Toda tabla con `org_id` y **RLS activada** desde su creación. Sin política = sin acceso.
2. Políticas por rol (`memberships.role`) y pertenencia a la org. Helper SQL `auth_org_id()` / `has_role()` (SECURITY DEFINER con `search_path` fijo).
3. `audit_log`: solo INSERT; sin UPDATE/DELETE para nadie.
4. Secretos de conexiones en **Vault**; la tabla guarda solo `secret_ref`. Nunca devolver secretos al cliente.
5. Service role solo en servidor; jamás en cliente ni en variables `NEXT_PUBLIC_*`.
6. Realtime: solo tablas/canales de eventos; nada de datos sensibles en payloads.
7. Índices para columnas de política y búsqueda; revisar planes en tablas grandes.

## Flujo de una migración
1. Revisa `docs/05-modelo-datos.md` (¿ya existe algo similar?).
2. Crea `supabase/migrations/YYYYMMDDHHMM_descripcion.sql` (una cosa por migración).
3. Escribe **tests de RLS** en `supabase/tests` (por rol: puede/no puede leer/escribir; otra org no ve nada).
4. Aplica en local (`supabase db reset`), ejecuta tests y `supabase db lint`; revisa *advisors* de seguridad/rendimiento.
5. Genera tipos TS (`supabase gen types`). Actualiza `05-modelo-datos.md`.
6. Staging → (aprobación) → producción.

## Prohibido
Desactivar RLS "por ahora" · políticas `using (true)` · datos reales en seeds · migraciones destructivas sin plan de respaldo.
