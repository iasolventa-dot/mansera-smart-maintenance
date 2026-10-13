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
