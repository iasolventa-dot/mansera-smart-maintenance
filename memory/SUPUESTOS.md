# Registro de hechos, hipótesis y verificaciones

Estados: **HECHO** (fuente) · **HIPÓTESIS** · **VERIFICADO (spike)** · **REFUTADO**. Al verificar: fecha, entorno, evidencia, quién.

| ID | Afirmación | Estado | Fuente / evidencia | Fecha |
|---|---|---|---|---|
| S-01 | MANSERA usa PGMWin 26.0, A3ERP 15.0.0.0, Trello web, Sésame | HECHO | Usuario | 2026-09 |
| S-02 | No hay integración actual PGMWin↔A3 | HECHO | Usuario / acta | 2026-09-15 |
| S-03 | PGMWin ofrecerá una vía de integración (API/webservice) utilizable | HIPÓTESIS | Premisa del usuario; investigación previa no halló API pública | — |
| S-04 | A3ERP Link API disponible (módulo con licencia) y contratado en MANSERA | HIPÓTESIS (existencia de la API: HECHO, docs oficiales a3erpapi.appcloud.es; contratación en MANSERA: sin confirmar) | Docs oficiales | 2026-10-13 |
| S-05 | Sésame API es Add On de pago | SIN CONFIRMAR: ni la documentación de 2026-10-13 ni la oficial ampliada (2026-10-14, aportada por el usuario) lo mencionan; preguntar a Sésame | Docs | 2026-10-14 |
| S-06 | Trello: 300 req/10 s por clave, 100/10 s por token; webhooks pueden duplicarse/perderse | HECHO (docs, reverificar) | Docs oficiales | — |
| S-07 | PGMWin y A3 están en servidor local | HIPÓTESIS | Pendiente Q1 | — |
| S-08 | Existe red local con todos los usuarios | HIPÓTESIS | Pendiente Q1 | — |
| S-09 | Remanente presupuestario 8–9 k€; propuesta 13,5 k€ | HECHO (acta) / HECHO (propuesta) | Acta; propuesta | 2026-09 |
| S-10 | Umbral 8 h/mes para justificar botón propio | HIPÓTESIS (a calibrar con auditoría de funciones) | Plantilla v2 | — |
| S-11 | A3ERP: login POST /api/login (Basic) → JWT Bearer; servicio de Windows en la red del cliente | HECHO (docs oficiales); sin verificar en MANSERA | a3erpapi.appcloud.es | 2026-10-13 |
| S-12 | Trello: key+token; Sésame: Bearer en https://api-{región}.sesametime.com | HECHO (docs oficiales); sin verificar con cuentas de MANSERA (las pruebas del sondeo usan respuestas simuladas) | developer.atlassian.com · apidocs.sesametime.com | 2026-10-13 |
| S-13 | PGMWin no tiene documentación pública de integración | HECHO (búsquedas 2026-10-13); formato de conexión PENDIENTE DE DOCUMENTAR | — | 2026-10-13 |
| S-14 | Región de Sésame y permisos del token | PARCIAL: región por defecto «eu1» y visible en el panel de tokens (HECHO, OpenAPI oficial); permisos del token existen (error 403) pero no se documenta cómo se asignan (HIPÓTESIS) | OpenAPI oficial | 2026-10-14 |
| S-15 | MANSERA guarda importe, cliente y probabilidad de cada oferta en campos personalizados de Trello | HIPÓTESIS: si no es así, el mapeo deja las ofertas como «incompletas» (no inventa); confirmar con la pregunta E | — | 2026-10-13 |
| S-16 | La API de Trello acepta la cabecera Authorization: OAuth oauth_consumer_key/oauth_token | HECHO (docs Atlassian); sin verificar con la cuenta de MANSERA | developer.atlassian.com | 2026-10-13 |
| S-17 | Sésame admite limit=100 por página | HIPÓTESIS (el máximo no está documentado); el conector pagina con meta.lastPage y se detiene a las 50 páginas | — | 2026-10-14 |
| S-18 | Una «baja» se puede distinguir de otras ausencias en Sésame | HIPÓTESIS: el endpoint de días de ausencia solo trae el nombre del tipo; el conector NO deduce bajas (muestra «ausente») hasta ver los tipos reales de MANSERA | — | 2026-10-14 |
| S-19 | Rutas y respuesta de error de Trello (/1/members/me) y Sésame (/core/v3/info) | VERIFICADO PARCIAL (2026-10-14, Internet, token inventado): ambas responden 401 JSON a credenciales inválidas, como documentan. Sin verificar el camino con credenciales válidas | spike:trello / spike:sesame | 2026-10-14 |
| S-20 | Una región de Sésame inexistente da error de red | REFUTADO (2026-10-14): responde 200 con una página HTML de mantenimiento; corregido en sondeo y conector (no se da por verificada) | curl api-zz9.sesametime.com | 2026-10-14 |
