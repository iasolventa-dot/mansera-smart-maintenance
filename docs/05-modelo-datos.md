# 05 · Modelo de datos propio (Supabase)

Principio: **solo lo que no existe en las apps.** Todo con `org_id` (multi-tenant, ADR-0004) y **RLS activada** en cada tabla.

## Núcleo
| Tabla | Para qué |
|---|---|
| `orgs` | Organización (MANSERA = la primera) |
| `profiles` | Usuario (extiende `auth.users`): nombre, avatar, preferencias de UI |
| `memberships` | Usuario↔org + `role` (`admin`,`direccion`,`tecnico`,`compras`,`admin_fin`,`rrhh`,`campo`) |
| `departments`, `app_permissions` | Qué panel ve cada rol y qué operaciones por conector (lectura/propuesta/aprobar) |
| `connections` | Una por app y org: tipo, transporte (`cloud`/`gateway`), estado, versión de la app probada, `secret_ref` (Vault) |
| `connector_runs` | Latencia/errores por llamada agregada (observabilidad, retención corta) |

## Enlaces entre apps (golden record)
| Tabla | Para qué |
|---|---|
| `entities` | Entidad canónica propia: `id`, `type` (cliente, activo…), `display_name`, `org_id` |
| `entity_links` | `entity_id`, `app`, `external_id`, `external_url`, `confidence`, `confirmed_by`, `created_at` |
| `link_candidates` | Coincidencias sugeridas (nombre/NIF/dirección) pendientes de confirmar por humano |

## Escrituras controladas
| Tabla | Para qué |
|---|---|
| `sync_proposals` | `type`, `payload`, `diff`, `source_event`, `status` (`pendiente`,`aprobada`,`rechazada`,`ejecutada`,`fallida`), `requested_by`, `approved_by`, `idempotency_key`, `result` |
| `audit_log` | Quién, qué, cuándo, app, entidad, antes/después (inmutable, solo inserción) |

## Opcionales justificados (ver política en 03)
| Tabla | Para qué | Regenerable |
|---|---|---|
| `search_index` | id, tipo, texto corto, enlace (búsqueda global) | Sí |
| `kpi_snapshots` | Series agregadas diarias por cliente/activo/tipo (tendencias, anomalías) | Sí |
| `alert_rules`, `alerts` | Reglas y alertas generadas (estado, responsable, explicación) | Parcial |
| `reports` | Informes emitidos (copia inmutable + datos usados) | **No** (valor legal/comercial) |

## IA
`ai_conversations`, `ai_messages`, `ai_citations` (mensaje→fuente: app, entidad, id, periodo, consulta/cálculo, nivel de certeza) · `documents`, `document_chunks` (pgvector) para RAG · `ai_usage` (tokens, coste, usuario) · `ai_eval_cases`/`ai_eval_runs` (golden set).

## Plataforma
`feature_flags`, `notifications`, `saved_views`, `usage_metering` (futuro cobro por uso/pack).

## RLS (reglas base)
- Todas: `org_id = (auth.jwt() ->> 'org_id')::uuid` o pertenencia vía `memberships`.
- `audit_log`: solo insert + select por admin/dirección; nunca update/delete.
- `connections.secret_ref`: nunca expuesto al cliente; secretos solo vía función segura en servidor.
- Test automatizado de políticas por rol (M0 en adelante) — **sin test de RLS no hay migración**.

## Reglas de migración
Una migración = un cambio; reversible o documentada; nombre `YYYYMMDDHHMM_descripcion.sql`; sin datos reales; ejecutar `supabase db lint` y advisors de seguridad antes de dar por buena.
