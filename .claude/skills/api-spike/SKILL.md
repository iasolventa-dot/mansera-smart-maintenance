---
name: api-spike
description: Úsala para verificar qué ofrece realmente la API de PGMWin, A3ERP, Trello o Sésame antes de construir un conector. Convierte suposiciones en hechos con evidencia y decide go/no-go/plan B.
---
# Spike de verificación de API

Principio: **no afirmar que una app permite algo hasta verificarlo en la instalación concreta de MANSERA** (PGMWin 26.0, A3 15.0.0.0).

## Procedimiento (máx. 1–3 días por app)
1. **Lee** `docs/integraciones/<app>.md` y `memory/SUPUESTOS.md`. Lista incógnitas.
2. **Documentación oficial** primero (WebFetch/WebSearch); anota URL y fecha. Terceros solo como pista, marcados como tal.
3. **Acceso:** ¿credenciales de prueba? ¿entorno de pruebas? Si no hay, DETENTE y pide a Cristina (no pruebes escritura en producción).
4. **Pruebas de lectura:** 3 entidades, paginación, filtros, latencia, límites, versión. Guarda respuestas anonimizadas como `fixtures/<app>/*.sample.json` (sin datos reales).
5. **Pruebas de escritura (solo en pruebas):** crear→leer→modificar→verificar; repetir con la misma clave (idempotencia); provocar error.
6. **Eventos:** ¿webhooks? ¿qué garantías? ¿polling suficiente?
7. **Seguridad:** autenticación, permisos mínimos, TLS, caducidad de tokens, registro de accesos.
8. **Transporte:** ¿local o nube? ¿necesita gateway?
9. **Coste/licencia** y condiciones del proveedor.

## Entregable (en SUPUESTOS.md + doc de la app)
Tabla de capabilities `verified/assumed/no-go` con evidencia · recomendación **go / go parcial / no-go + plan B** · impacto en roadmap y presupuesto · preguntas pendientes y a quién.

## No hacer
Inventar endpoints · extrapolar de otra versión · escribir en producción · guardar credenciales en el repo · dar por bueno un tercero sin contrastar.
