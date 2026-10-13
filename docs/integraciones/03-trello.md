# Trello — ficha de integración

Uso en MANSERA: proyectos y ofertas (web). Dueño de ofertas/proyectos.

## Hechos [HECHO — docs oficiales; reverificar antes de implementar]
- **REST API** (OAuth/clave+token) y **webhooks** para eventos de tablero/tarjeta/lista.
- Límites orientativos: **300 peticiones / 10 s por clave de API y 100 / 10 s por token** → presupuesto y caché obligatorios.
- Los webhooks pueden **perderse o duplicarse** → idempotencia por id de acción + reconciliación periódica.
- Usar un **usuario de servicio** dedicado (no cuentas personales).

## Diseño
Conector cloud directo desde Vercel. Webhook entrante → `/api/webhooks/trello` (verificar firma `HMAC-SHA1` del callback URL + cuerpo) → evento a Realtime. Reconciliación cada N minutos.

## Uso previsto
Tarjeta de oferta → estado "Ganada" dispara propuesta "Crear OT en PGMWin" · KPIs de ofertas · adjuntos de oferta.

## Incógnitas
Estructura real de tableros/listas/etiquetas de MANSERA (levantar en auditoría) · plan de Trello contratado (límites de Power-Ups/automatizaciones).

## Autenticación y conexión [HECHO — docs oficiales, consultadas 2026-10-13; sin verificar contra la cuenta de MANSERA]
- Clave de API (key) + token de usuario en cada petición (también OAuth 1.0). Comprobación de solo lectura: `GET https://api.trello.com/1/members/me?key=…&token=…`.
- Token con `scope=read` al principio; `write` solo cuando existan propuestas de escritura. Usar una cuenta de servicio. Un token revocado devuelve 401.
- En la aplicación: **Conexiones → Credenciales de acceso** (ADR-0010). Catálogo: `packages/core/src/connectors/specs.ts`.
