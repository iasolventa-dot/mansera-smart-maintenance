# 03 · Arquitectura

## Visión en una imagen
```
 Usuario (móvil / escritorio, PWA)
        │  HTTPS
        ▼
 ┌─────────────── Vercel · Next.js ────────────────┐
 │  UI  ·  Route Handlers / Server Actions          │
 │  ┌────────────── packages/connectors ─────────┐  │
 │  │ Trello  Sésame  A3ERP  PGMWin  (SCADA)     │  │  ← llamadas DIRECTAS a las APIs
 │  └────────────────────────────────────────────┘  │
 │  packages/ai (copiloto, herramientas, citas)     │
 └───────┬───────────────────────┬──────────────────┘
         │                       │ trabajos firmados (cola)
         ▼                       ▼
   Supabase (propio)      Gateway on-prem (Node, en la red de MANSERA)
   Auth · RLS · Auditoría   solo conexiones SALIENTES
   Enlaces · IA · Realtime  → PGMWin / A3 si están en local
   (caché/histórico opcional)
         ▲
   Webhooks entrantes: Trello, Sésame (→ Realtime → UI)
```
Apps en la nube (Trello, Sésame) se llaman directamente desde Vercel. Apps en la red local (previsiblemente PGMWin y A3 — **por confirmar**) se alcanzan a través del **Gateway**, porque una función serverless de Vercel no puede entrar en una LAN privada.

## Qué cambia al tener API en todas las apps
Antes se pensaba en "volcar todo a una BD y trabajar sobre ella". Con API en cada app:
- La UI y el copiloto **hablan con las apps** (lectura y escritura) sin pasar por una copia.
- Eliminamos el problema de **datos desactualizados** y de **dos fuentes de verdad**.
- La BD propia se reduce a lo que **no existe en ninguna app** (usuarios, permisos, auditoría, enlaces, IA…).

## Política de acceso a datos (decisión por caso de uso — ADR-0001)
Regla por defecto: **LIVE** (consultar la app en el momento). Se permite almacenar solo si se cumple una razón de la tabla y queda anotado.

| Caso de uso | Modo | Por qué |
|---|---|---|
| Ficha de OT, activo, cliente, oferta | **Live** | Siempre el dato vigente |
| Contadores/semáforos del panel | **Live + caché corta (TTL 30–120 s) en memoria/KV** | Evitar martillear la API y respetar rate limits (Trello 300 req/10 s por clave) |
| Búsqueda global entre apps | **Índice ligero propio** (ids, nombres, tipo, enlace — no el registro completo) | Ninguna API ofrece búsqueda cruzada |
| Tendencias de 12 años, anomalías, comparativas entre máquinas | **Snapshot histórico agregado (nocturno)** | Las APIs no están pensadas para escanear años de datos; la detección estadística necesita series |
| Copiloto sobre documentos/manuales | **Índice vectorial (pgvector)** de documentos | RAG requiere embeddings |
| Informes mensuales a cliente | Live en el momento de generar + **copia inmutable del informe emitido** | Trazabilidad legal/comercial |
| Escrituras (crear OT, factura…) | **Directas a la API, vía propuesta validada**, con auditoría | Humano en el circuito |

**Honestidad técnica:** "sin BD intermediaria" se cumple para operar (leer/escribir). Para analítica histórica y búsqueda cruzada un almacén propio es la opción más simple y robusta; se mantiene **mínimo, regenerable y explícito** (puede borrarse y reconstruirse desde las apps).

## Capas
1. **Presentación** (`apps/web`): PWA Next.js. Sin lógica de negocio.
2. **Aplicación/dominio** (`packages/core`): casos de uso (p. ej. `CrearOtDesdeOferta`), reglas, tipos y esquemas Zod.
3. **Conectores** (`packages/connectors`): una implementación por app tras la interfaz común (`integraciones/00-contrato-conectores.md`). Aquí viven autenticación, paginación, límites, reintentos, mapeo a modelo canónico.
4. **Gateway** (`apps/gateway`): agente on-prem que ejecuta operaciones *en lista blanca* contra apps locales.
5. **IA** (`packages/ai`): herramientas (tool-use) sobre conectores, citas, evaluación.
6. **Datos propios** (`supabase/`): ver `05-modelo-datos.md`.

## Modelo canónico mínimo
`Cliente · Centro/Instalación · Activo · OrdenTrabajo · PlanPreventivo · Oferta · Albarán · Factura · Empleado · Fichaje · Alerta`. Cada entidad canónica guarda `source` (app), `externalId`, `url` de origen y `fetchedAt`. **No se redefine la verdad**: se normaliza para mostrar y enlazar.

## Enlaces, no copias (golden record)
Tabla `entity_links` (ver 05): "Cliente X" = A3:`4501` = PGMWin:`CL-122` = Trello board `abc`. Permite vistas 360 y sincronización de maestros sin duplicar datos. El dueño de cada dato sigue siendo su app.

## Gateway on-prem (ADR-0003 — propuesto; depende de respuestas de infraestructura)
- Servicio Node (servicio de Windows) instalado en un equipo/servidor de MANSERA con acceso a PGMWin/A3.
- **Solo conexiones salientes** HTTPS/WebSocket hacia la nube (sin abrir puertos). Autenticación mutua + trabajos **firmados** (`GATEWAY_SHARED_SECRET`/claves por organización).
- Ejecuta **solo operaciones permitidas** (lista blanca declarada en el conector), con usuario de integración de **mínimo privilegio**. Reintentos con cola y *outbox*; idempotencia por `Idempotency-Key`.
- Si PGMWin/A3 están en la nube del proveedor o ya exponen API segura, el gateway no hace falta para ese conector.
- Alternativas (si el análisis de seguridad lo prefiere): túnel tipo Cloudflare Tunnel/Tailscale, VPN sitio-a-sitio. Decisión → ADR tras `docs/12`.

## Tiempo real (tres niveles — no afirmar más de lo verificado)
1. **Periódico:** jobs programados (snapshot nocturno, informes).
2. **Casi tiempo real:** polling del gateway cada 30–120 s sobre PGMWin/A3 (si no hay eventos).
3. **Eventos:** webhooks de Trello y Sésame → ruta de entrada con verificación de firma → Supabase Realtime → UI (se envía el *evento*, la UI consulta el dato). Trello puede perder/duplicar webhooks → reconciliación periódica.

## Escrituras seguras
`Intención del usuario → Propuesta (tabla sync_proposals, diff visible) → Validación humana → Ejecución por conector (idempotente) → Verificación (lectura posterior) → Auditoría`. Fallos: reintento con *backoff*, luego estado `fallida` visible con acción manual. Nunca escritura "a ciegas".

## Dónde encaja n8n
Solo orquestación auxiliar **no crítica** (envío de correos/informes programados, avisos, flujos Mi PRL→Drive/plataformas CAE). El cliente asocia low-code con inestabilidad: **la ruta crítica (conectores, sincronización, permisos) se escribe en código**. Si no hace falta n8n, no se usa.

## Rendimiento y límites
Presupuesto de peticiones por conector (`rate budget`), caché corta, *request coalescing*, circuit breaker por app: si una app cae, el panel degrada con aviso ("dato de hace 3 min / Trello no disponible") y no se rompe.

## Observabilidad
Log estructurado con `correlationId` por petición; métricas por conector (latencia, errores, rate-limit hits); panel de salud en Administración; alertas a TI.
