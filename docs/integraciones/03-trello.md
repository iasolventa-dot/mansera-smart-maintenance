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
