# Registro de hechos, hipótesis y verificaciones

Estados: **HECHO** (fuente) · **HIPÓTESIS** · **VERIFICADO (spike)** · **REFUTADO**. Al verificar: fecha, entorno, evidencia, quién.

| ID | Afirmación | Estado | Fuente / evidencia | Fecha |
|---|---|---|---|---|
| S-01 | MANSERA usa PGMWin 26.0, A3ERP 15.0.0.0, Trello web, Sésame | HECHO | Usuario | 2026-09 |
| S-02 | No hay integración actual PGMWin↔A3 | HECHO | Usuario / acta | 2026-09-15 |
| S-03 | PGMWin ofrecerá una vía de integración utilizable | HECHO (EGEOtec, 2026-10-15): API a medida (módulo ~1.150 € + desarrollo) o lectura SQL autorizada con usuario limitado; documentación y entorno de pruebas disponibles (ADR-0015) | Respuesta de EGEOtec vía MANSERA | 2026-10-15 |
| S-04 | A3ERP tiene API contratada | HECHO: NO contratada. Ofrecida: «Integrador API ERP» de Link Soluciones, 75 €/mes (1.000 llamadas) o 100 €/mes (ilimitadas) + 1.800 € de configuración; compatible con 15.0.0.0 | Respuesta del distribuidor vía MANSERA | 2026-10-15 |
| S-05 | Sésame API es complemento de pago | HECHO: 54 €/mes, no incluido en el plan (Sésame a MANSERA) | Respuesta de Sésame vía MANSERA | 2026-10-15 |
| S-06 | Trello: 300 req/10 s por clave, 100/10 s por token; webhooks pueden duplicarse/perderse | HECHO (docs, reverificar) | Docs oficiales | — |
| S-07 | PGMWin y A3 están en servidor local | PGMWin: REFUTADO (nube de EGEOtec). A3ERP: HECHO, servidor local de MANSERA | Respuestas de EGEOtec y del distribuidor de A3 | 2026-10-15 |
| S-08 | Existe red local con todos los usuarios | HIPÓTESIS | Pendiente Q1 | — |
| S-09 | Remanente presupuestario 8–9 k€; propuesta 13,5 k€ | HECHO (acta) / HECHO (propuesta) | Acta; propuesta | 2026-09 |
| S-10 | Umbral 8 h/mes para justificar botón propio | HIPÓTESIS (a calibrar con auditoría de funciones) | Plantilla v2 | — |
| S-11 | A3ERP: login POST /api/login → JWT (documentación de a3erpapi.appcloud.es) | OBSOLETO: esa API es de otro proveedor; la ofrecida (Link Soluciones) usa la cabecera ApiKey (S-32) | PDF Link Soluciones | 2026-10-15 |
| S-12 | Trello: key+token; Sésame: Bearer en https://api-{región}.sesametime.com | HECHO (docs oficiales); sin verificar con cuentas de MANSERA (las pruebas del sondeo usan respuestas simuladas) | developer.atlassian.com · apidocs.sesametime.com | 2026-10-13 |
| S-13 | PGMWin no tiene documentación pública de integración | HECHO (sigue sin ser pública), pero EGEOtec la facilita a MANSERA junto con un entorno de pruebas | Respuesta de EGEOtec | 2026-10-15 |
| S-14 | Región de Sésame y permisos del token | Región: «eu1» por defecto, visible en el panel (OpenAPI). Permisos: HECHO, NO existen tokens de solo lectura ni permisos por token (Sésame a MANSERA) | OpenAPI + respuesta de Sésame | 2026-10-15 |
| S-15 | MANSERA guarda importe, cliente y probabilidad de cada oferta en campos personalizados de Trello | HIPÓTESIS: si no es así, el mapeo deja las ofertas como «incompletas» (no inventa); confirmar con la pregunta E | — | 2026-10-13 |
| S-16 | La API de Trello acepta la cabecera Authorization: OAuth oauth_consumer_key/oauth_token | HECHO (docs Atlassian); sin verificar con la cuenta de MANSERA | developer.atlassian.com | 2026-10-13 |
| S-17 | Sésame admite limit=100 por página | HIPÓTESIS (el máximo no está documentado); el conector pagina con meta.lastPage y se detiene a las 50 páginas | — | 2026-10-14 |
| S-18 | Una «baja» se puede distinguir de otras ausencias en Sésame | HECHO DOCUMENTADO (OpenAPI: absence-types.category = sick_leave | permission; la ausencia trae absenceType.id): el conector marca «baja» solo con sick_leave. Pendiente de spike con los tipos reales de MANSERA | OpenAPI oficial | 2026-10-14 |
| S-19 | Rutas y respuesta de error de Trello (/1/members/me) y Sésame (/core/v3/info) | VERIFICADO PARCIAL (2026-10-14, Internet, token inventado): ambas responden 401 JSON a credenciales inválidas, como documentan. Sin verificar el camino con credenciales válidas | spike:trello / spike:sesame | 2026-10-14 |
| S-20 | Una región de Sésame inexistente da error de red | REFUTADO (2026-10-14): responde 200 con una página HTML de mantenimiento; corregido en sondeo y conector (no se da por verificada) | curl api-zz9.sesametime.com | 2026-10-14 |
| S-21 | /schedule/v1/work-entries?from=d&to=d filtra por la fecha de ENTRADA y en hora local | HIPÓTESIS: un turno de noche abierto desde ayer podría no aparecer; verificar en el spike | — | 2026-10-14 |
| S-22 | absence-day-off / vacation-day-off solo incluyen días APROBADOS (no solicitudes pendientes) | HIPÓTESIS: no documentado; verificar en el spike | — | 2026-10-14 |
| S-23 | Trello /boards/{id}/cards devuelve todas las tarjetas abiertas sin truncar | HIPÓTESIS: no hay detección de truncado; verificar con el tablero real | — | 2026-10-14 |
| S-24 | MANSERA usa a3innuva Nómina | HECHO (usuario, comunicado por Cristina) | Usuario | 2026-10-14 |
| S-25 | a3innuva Nómina: OAuth Authorization Code con WKA, scope offline_access openid IDInfo WK.ES.A3EquipoContex, Ocp-Apim-Subscription-Key, token 60 min / refresh 30 días, límites Conectia 3.000/min | HECHO (docs a3developers); sin verificar con MANSERA | a3developers.wolterskluwer.es | 2026-10-14 |
| S-26 | MANSERA tiene (o contratará) Conectia y un cliente OAuth propio | Conectia: HECHO, NO incluida, 45 €/mes. Cliente OAuth: pendiente de pedir a Wolters Kluwer | Respuesta del distribuidor | 2026-10-15 |
| S-27 | URL base, rutas exactas y paginación de la API de nómina | DESCONOCIDO: el Swagger exige acceso al portal | — | 2026-10-14 |
| S-28 | Emisor exacto del id_token de WKA, soporte de PKCE (S256) y rotación del refresh token | DESCONOCIDO: hoy se exige el dominio https://login.wolterskluwer.eu/; verificar con /.well-known/openid-configuration en el spike | — | 2026-10-14 |
| S-29 | Campos y paginación de A3ERP (API de a3erpapi.appcloud.es) | SUSTITUIDO por S-32 (la API ofrecida es la de Link Soluciones) | — | 2026-10-15 |
| S-30 | Límite de Sésame | HECHO: 600 peticiones/min por empresa (Sésame a MANSERA), no 1.000 como dice su web; cupo propio 400/min | Respuesta de Sésame | 2026-10-15 |
| S-31 | Sésame sin webhooks de ausencias | HECHO (Sésame): solo empleados y fichajes; ausencias por consulta periódica | Respuesta de Sésame | 2026-10-15 |
| S-32 | API de A3ERP de Link Soluciones: ApiKey en cabecera, OData, `{ PageData, TotalCount }`, campos de facturas, albaranes, efectos y clientes | HECHO (PDF v2.31.3.1 del distribuidor); sin verificar en la instalación. Desconocido: elección de empresa en multiempresa, máximo de $top, significado de EstadoFactura, si los albaranes indican si están facturados | PDF Link Soluciones | 2026-10-15 |
| S-33 | a3innuva Nómina | HECHO: v1.9.29 en Azure; Conectia 45 €/mes no incluida; enlace contable a A3ERP por fichero suenlace.dat; integración Sésame↔a3innuva disponible en el marketplace (la soporta Sésame) | Respuesta del distribuidor | 2026-10-15 |
