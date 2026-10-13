# ADR 0010 · Almacén de credenciales de los conectores (Supabase Vault)
- **Fecha:** 2026-10-13 · **Estado:** propuesto (pendiente de confirmación del usuario; implementado en M0 como base)
## Contexto
El usuario pidió una sección para introducir las credenciales de cada aplicación (PGMWin, A3ERP, Trello, Sésame) con el formato que exija cada una, y dejar «Pendiente de documentar» lo que no tenga documentación. CLAUDE.md: secretos fuera del repo, mínimo privilegio, RLS en todo, auditoría.
## Decisión
1. **Catálogo por aplicación** (`packages/core/src/connectors/specs.ts`): campos, cuáles son secretos, reglas de validación, pasos para conseguir cada credencial, enlaces a la documentación oficial con fecha de consulta y lista de incógnitas. PGMWin = `pendiente_documentar` sin campos: el servidor se niega a guardar nada.
2. **Dónde vive cada dato:** lo no sensible (URL, región, clave pública) en `connections.config`; lo sensible, **cifrado en Supabase Vault** (un secreto JSON por conexión); la tabla solo guarda el `secret_id`.
3. **El navegador nunca lee secretos:** `secret_id` sin permiso de columna, sin acceso al esquema `vault`, y `connection_read_secret` solo ejecutable por `service_role` (conectores/gateway en el servidor).
4. **Escritura solo por funciones definer** (`connection_save`, `connection_delete`, `connection_record_test`) que exigen rol **TI** de la organización y dejan fila en `audit_log` con los *nombres* de los campos secretos, nunca los valores.
5. **Servidor:** las acciones `saveConnection`/`deleteConnection` validan con Zod por sistema, exigen TI real (no vista previa) y Supabase real, no devuelven ni registran secretos y los mensajes de error no incluyen el valor.
6. **Comprobación** (`packages/connectors`): solo lectura, con tiempo límite, sin seguir redirecciones; Sésame valida la región para que el host no pueda salirse de sesametime.com. A3ERP y PGMWin no se pueden probar desde la nube (red local): quedan «guardada, no comprobable» hasta el gateway.
## Alternativas
1. Variables de entorno en Vercel: sin interfaz, sin multi-tenant y sin auditoría.
2. Cifrado propio en una columna: reinventa Vault y obliga a gestionar claves.
3. Guardar secretos en el gateway: válido para A3ERP/PGMWin en M2 (el secreto nunca saldría de la red de MANSERA); se valorará en el ADR del gateway.
## Consecuencias
- Probado: 10 pruebas de RLS/Vault (PGlite con un Vault simulado SIN cifrado: la prueba valida permisos y lógica, no el cifrado, que es de Supabase) y pruebas unitarias de validación y sondeo con respuestas simuladas.
- **No verificado** contra las APIs reales hasta M1 (credenciales de prueba). Las fichas indican qué es hecho documentado y qué es incógnita.
- Al reemplazar hay que reescribir todos los campos (no se pueden recuperar).
- Pendiente: rotación/caducidad de tokens, varias organizaciones (R-14), mover la comprobación de A3ERP al gateway.

## Actualización (ADR-0012)
A3ERP (y PGMWin) quedan fuera de este almacén: sus credenciales viven solo en el gateway. Aquí solo Trello y Sésame.
