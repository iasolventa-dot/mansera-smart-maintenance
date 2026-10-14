# Sésame HR — ficha de integración

Uso en MANSERA: portal del empleado, fichajes, ausencias. Dueño de datos de personal.

## Hechos [HECHO — documentación del proveedor; reverificar]
- API de Sésame HR disponible como **Add On de pago** (con webhooks y especificación OpenAPI según la documentación consultada).

## Incógnitas
¿Lo tiene contratado MANSERA o hay que contratarlo? Coste · entidades expuestas (empleados, fichajes, ausencias, departamentos) · autenticación.

## Privacidad (importante)
Datos personales (RGPD). Principio de **minimización**: solo los campos imprescindibles; acceso por rol (RR. HH.); sin enviar datos personales al LLM salvo necesidad justificada y pseudonimizada. Registro de accesos.

## Uso previsto
Disponibilidad de técnicos para planificación · horas por OT (cruce fichajes ↔ PGMWin) · RR. HH.: caducidad de formaciones/PRL (con Mi PRL).

## Autenticación y conexión [HECHO — docs oficiales, consultadas 2026-10-13; sin verificar contra la cuenta de MANSERA]
- Token Bearer generado por un administrador en Configuración → Integraciones → API. Base: `https://api-{región}.sesametime.com`; comprobación de solo lectura: `GET /core/v3/info`.
- Límite documentado: 1.000 peticiones/minuto por empresa, compartido entre tokens.
- **Incógnitas:** valores válidos de región, alcances del token, si la API es un complemento de pago (S-05: la documentación consultada no lo menciona), paginación y webhooks.
- En la aplicación: **Conexiones → Credenciales de acceso** (ADR-0010).

## Documentación oficial ampliada (aportada por el usuario, consultada 2026-10-14) [HECHO — sin verificar con la cuenta de MANSERA]
- Fuente: https://apidocs.sesametime.com/introduction, índice `/llms.txt` y especificación **OpenAPI** `/openapi.json` («Sesame Public API 3.0.0», 175 rutas) + `/openapi-v2.json` (endpoints nuevos v4).
- Base `https://api-{región}.sesametime.com`, región por defecto **eu1**; la de la cuenta aparece en *app.sesametime.com/admin/configuration/integrations/api-tokens*.
- Bearer en `Authorization`. Errores: 401 token inválido, **403 el token no tiene permisos**, 404, 409, 422, 429, 500, 503.
- Límite: 1.000 peticiones/min por empresa (compartido entre tokens). Paginación `page` + `limit` con `meta.lastPage` (máximo de `limit` no documentado).
- Webhooks: EmployeeCreated/Updated/Activated/Deactivated/Deleted, CheckInCreated, CheckOutCreated; **solo se activan pidiéndolo a soporte**.
- Changelog 2026: los endpoints actuales («legacy») se irán sustituyendo por una versión nueva → vigilar retiradas (R-20).
- Endpoints de lectura usados por el conector: `/core/v3/info`, `/core/v3/employees?status=active`, `/core/v3/employee-department-assignations`, `/core/v3/offices`, `/schedule/v1/absence-day-off`, `/schedule/v1/vacation-day-off`, `/schedule/v1/work-entries`, `/schedule/v1/reports/worked-hours`.
- **Minimización (RGPD):** la ficha de empleado trae DNI, nº SS, cuenta bancaria, salario, fecha de nacimiento, dirección… El conector (`packages/connectors/src/sesame/`) solo declara id, nombre, puesto, estado de fichaje y estado; Zod descarta el resto al recibirlo (prueba dedicada).
- **No documentado:** si la API es de pago, cómo se asignan permisos al token, lista completa de regiones.
