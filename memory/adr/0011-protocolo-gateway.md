# ADR 0011 · Protocolo del gateway on-prem (borrador)
- **Fecha:** 2026-10-13 · **Estado:** propuesto (desarrolla ADR-0003; depende de Q1 y de la auditoría de ciberseguridad Q6)
## Contexto
La API de A3ERP es un servicio dentro de la red de MANSERA y PGMWin previsiblemente también. La nube no puede llamarlas; el gateway on-prem las alcanza sin abrir puertos entrantes.
## Decisión (lo ya construido y probado)
1. **Solo salientes:** el gateway recoge trabajos y devuelve resultados; no escucha en ningún puerto.
2. **Trabajo firmado:** `packages/connectors/src/gateway-protocol.ts`. HMAC-SHA256 sobre JSON canónico, clave por organización, `orgId`, `iat/exp` (TTL máx. 60 s, tolerancia de reloj 5 s) y `nonce` de un solo uso.
3. **Lista blanca `OPS`:** hoy solo `a3erp.health` y `a3erp.login_check` (solo lectura, parámetros estrictos). Una operación firmada pero no listada se descarta. Escribir en un sistema exigirá añadir una operación nueva y su ADR (principio 4).
4. **Resultado firmado** (`signResult`), sin tokens ni contraseñas; fallos de A3ERP = error controlado.
5. **Ejecutor puro** (`apps/gateway/src/runner.ts`) con `fetch` inyectable: probado con 5 pruebas (falsificado, repetido, caducado, operación no permitida, A3ERP caído, no filtra secretos).
## Sin construir todavía (necesita Q1/Q6 y la instalación en MANSERA)
Transporte (long-poll/WebSocket saliente) y su autenticación mutua; persistencia de nonces; servicio de Windows; credenciales locales con DPAPI; cola/outbox; latido y kill-switch; actualización y rollback; dominios de salida para que TI los autorice.
## Alternativas
Túnel (Cloudflare/Tailscale) o VPN sitio-a-sitio: más simples de operar pero exponen la red; se decide con el informe de ciberseguridad.
## Consecuencias
La clave de firma por organización debe generarse, repartirse y rotarse (pendiente; irá en Vault y en el almacén local del gateway).
