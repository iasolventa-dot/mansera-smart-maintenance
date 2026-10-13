# Contrato común de conectores

Todo conector (`packages/connectors/<app>`) implementa esta interfaz conceptual (TypeScript, detalle a definir en M1):

```ts
interface Connector {
  id: 'pgmwin' | 'a3erp' | 'trello' | 'sesame' | string;
  capabilities(): Capabilities;          // qué soporta DE VERDAD (verificado) y qué no
  health(): Promise<Health>;             // ok | degradado | caído + latencia + versión
  // Lectura (modelo canónico + referencia a origen)
  list<T>(entity: EntityName, q: Query): Promise<Page<Canonical<T>>>;
  get<T>(entity: EntityName, id: string): Promise<Canonical<T>>;
  // Escritura: SIEMPRE idempotente y auditada
  write(op: WriteOp, ctx: { idempotencyKey: string; proposalId: string }): Promise<WriteResult>;
  // Eventos (si la app los ofrece)
  subscribe?(topic: string): Promise<Subscription>;
}
```

## Capabilities (declaración honesta)
```ts
{ read: { cliente: 'verified'|'assumed'|'none', ... },
  write: { ... }, events: 'webhook'|'poll'|'none',
  rateLimit: { windowSec, max }, transport: 'cloud'|'gateway' }
```
Nada puede marcarse `verified` sin un **spike** documentado en `memory/SUPUESTOS.md` (fecha, entorno, evidencia). `assumed` = la UI debe mostrarlo como "no disponible" o desactivado.

## Reglas
1. **Autenticación** guardada cifrada (Supabase Vault) por organización+conexión; rotación posible; jamás en logs.
2. **Errores tipados:** `AuthError · RateLimited(retryAfter) · NotFound · Conflict · Validation · Transient · Unavailable`. La UI muestra mensajes en lenguaje claro.
3. **Reintentos:** solo errores transitorios; *exponential backoff + jitter*; máximo configurable; **nunca** reintentar una escritura sin `idempotencyKey`.
4. **Límites:** token bucket por conector; respetar `Retry-After`; coalescer lecturas idénticas simultáneas.
5. **Paginación:** abstraída con cursores; nunca cargar "todo" en memoria.
6. **Mapeo:** función pura `toCanonical(raw)` + `fromCanonical(op)`, con tests y fixtures **anonimizados** (`fixtures/<app>/*.sample.json`). Datos reales de MANSERA nunca al repo.
7. **Validación de salida:** respuesta de la app validada con Zod; si el esquema cambia (actualización de versión), el conector falla de forma controlada y avisa a TI.
8. **Versionado:** cada conector registra la versión de la app contra la que se probó (PGMWin 26.0, A3 15.0.0.0…). Alerta si cambia.
9. **Pruebas:** contrato (mismos tests contra mock y contra sandbox/real cuando exista), propiedad de idempotencia, simulación de caída y de rate limit.
10. **Seguridad:** usuario de integración de mínimo privilegio, solo operaciones necesarias, todo cambio de escritura en `audit_log`.
