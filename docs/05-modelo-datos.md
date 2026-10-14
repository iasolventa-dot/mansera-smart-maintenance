# 05 · Modelo de datos propio (Supabase)

Principio: **solo lo que no existe en las apps.** Todo con `org_id` (multi-tenant, ADR-0004) y **RLS activada** en cada tabla.

## Núcleo
| Tabla | Para qué |
|---|---|
| `orgs` | Organización (MANSERA = la primera) |
| `profiles` | Usuario (extiende `auth.users`): nombre, avatar, preferencias de UI |
| `memberships` | Usuario↔org + `role` (`direccion`,`ti`,`oficina_tecnica`,`administracion`,`campo`; alineados con la UI. `compras` y `rrhh` se añaden con `alter type app_role add value` cuando existan sus paneles) |
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

## Estado de implementación
Migraciones en `supabase/migrations`, todas aplicadas en el proyecto Mansera. RLS y pruebas en `supabase/tests` (motor PGlite; `pnpm test`). Funciones auxiliares en el esquema `private`, no expuesto por la API.

**Tablas:**
| Tabla | Para qué | Quién lee / escribe |
|---|---|---|
| `orgs`, `profiles`, `memberships` | Organizaciones, perfiles y rol por organización (organización activa elegible) | Miembros leen; TI gestiona miembros |
| `audit_log` | Auditoría inmutable (solo se permite anonimizar el autor al borrar un usuario) | Dirección y TI leen; **solo funciones del sistema escriben** |
| `assistant_usage` | Contador diario del asistente (sin texto) | El propio usuario; función `assistant_log_use` |
| `connections` | Credenciales: configuración visible + `secret_id` en Vault (columna no legible); estado (sin_probar, autorizada, verificada, error) | TI lee; escriben funciones definer (TI) y el servidor (service_role) |
| `connector_settings` | Configuración no secreta de conectores (p. ej. tablero de ofertas de Trello) | TI lee; `connector_settings_save` (TI) |
| `connector_snapshots` | Caché de lecturas minimizadas, 5-10 min de validez y 24 h como máximo (purga diaria) | Solo el servidor (service_role) |

**Funciones del servidor (service_role):** `connection_read_secret`, `connection_store_oauth`, `connection_rotate_oauth`, `connection_audit_oauth` y `purge_connector_snapshots`.
