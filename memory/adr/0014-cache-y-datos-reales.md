# ADR 0014 · Caché por organización y capa de datos reales
- **Fecha:** 2026-10-14 · **Estado:** propuesto (implementado; el usuario pidió construir «todo lo que se pueda»)
## Contexto
ADR-0001 dice: API primero, y caché solo si es opcional y justificada. Está justificada: Sésame limita a 1.000 peticiones/min por EMPRESA, compartidas entre todos los tokens, y cada visita a «Personal» necesita unas 8 lecturas paginadas; Trello limita a 100/10 s por token. Además, si un sistema cae, las pantallas deben seguir mostrando algo y avisar.
## Decisión
1. **Caché** `connector_snapshots` (org, app, tipo): guarda solo datos **ya minimizados y mapeados**, se sobrescribe en cada lectura y no guarda histórico. Solo la usa el servidor con la clave de servicio, después de comprobar el permiso de la sección. Validez: Personal 5 min, Comercial 10 min.
2. **Si falla la lectura:** se sirven los últimos datos con aviso («No se pudo actualizar… últimos datos disponibles»). Sin caché previa, se usan los datos de ejemplo, diciéndolo.
3. **Política de llamadas:** cupo por sistema (token bucket, por debajo de los límites documentados) y reintentos solo de errores transitorios o 429, con espera exponencial + aleatoriedad y respetando `Retry-After`.
4. **Origen siempre visible:** cada pantalla con datos de sistemas muestra «Datos reales de X · leídos hace N min» o «Datos de ejemplo».
5. **Configuración no secreta** de los conectores en `connector_settings`: la escribe solo TI con una función definer auditada, e invalida la caché. Primer uso: tablero de ofertas de Trello (listas → etapas, campos de importe, cliente y probabilidad), validado con Zod y contra la estructura real del tablero.
6. **Renovación diaria** del refresh token de a3innuva Nómina (tarea de Vercel `/api/cron/oauth-refresh`, protegida con `CRON_SECRET`).
## Alternativas
- **Sin caché:** agota el cupo de Sésame y deja las pantallas vacías cuando un sistema cae.
- **Réplica completa de los datos:** contradice ADR-0001 y duplica al dueño de los datos.
## Consecuencias
- El cupo en memoria es por instancia de Vercel. La caché hace que casi ninguna visita llegue al proveedor, pero no es un límite global estricto.
- La caché contiene datos personales minimizados (nombre, puesto, estado) de Sésame: misma protección que el resto (solo servidor). Se borra al cambiar la configuración o al borrar la organización.
- Pendiente: ampliar a A3ERP, PGMWin y nómina cuando existan sus lecturas; histórico de absentismo.
