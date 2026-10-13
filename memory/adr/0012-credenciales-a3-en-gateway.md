# ADR 0012 · Las credenciales de los sistemas locales viven solo en el gateway
- **Fecha:** 2026-10-13 · **Estado:** aceptado (el usuario delegó la decisión: «lo dejo a tu criterio»)
## Contexto
La auditoría n.º 2 detectó dos posibles dueños de las credenciales de A3ERP: el Vault de la nube (ADR-0010) y la configuración local del gateway (ADR-0011). Dos dueños = riesgo de desincronización y más superficie de ataque (R-19).
## Decisión
1. Las credenciales de los sistemas que están en la red de MANSERA (A3ERP; PGMWin cuando se documente) se introducen **al instalar el gateway** y se guardan **solo en ese equipo** (hoy variables de entorno del servicio; en M2, fichero local cifrado con DPAPI fuera de git).
2. La plataforma **no las acepta**: `validateCredentials` las rechaza, la base de datos solo admite `trello` y `sesame` (migración `a3_credenciales_en_gateway`) y la tarjeta de A3ERP en Conexiones explica qué datos pedirá el gateway, sin formulario.
3. El gateway valida con las mismas reglas del catálogo (`validateGatewayCredentials`, `apps/gateway/src/config.ts`).
4. Trello y Sésame, que son servicios en la nube, siguen en Supabase Vault (ADR-0010).
## Alternativas
Guardarlas en Vault y enviarlas al gateway en cada trabajo: los trabajos van firmados pero no cifrados y la contraseña de A3ERP saldría de la red de MANSERA. Descartada.
## Consecuencias
- Si la nube se ve comprometida, no expone las credenciales del ERP.
- Rotar la contraseña de A3ERP exige acceso al equipo del gateway (lo hará TI de MANSERA).
- La plataforma solo conocerá el estado de A3ERP a través de los resultados firmados del gateway.
