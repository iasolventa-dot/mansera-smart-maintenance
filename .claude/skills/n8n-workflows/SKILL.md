---
name: n8n-workflows
description: Úsala solo si hace falta orquestación auxiliar no crítica (informes programados, avisos, flujos Mi PRL). Define cuándo usar n8n, cómo versionar flujos y cómo evitar que entre en la ruta crítica.
---
# n8n: uso limitado

## Cuándo SÍ
Envío programado de informes/avisos · flujos Mi PRL (subida a Drive, plataformas CAE, correo) · tareas periódicas sin lógica de negocio crítica.
## Cuándo NO
Conectores, sincronización, permisos, escrituras en PGMWin/A3, cálculo de KPIs, copiloto: **en código** (el cliente asocia low-code con inestabilidad).

## Reglas
- Disparo por webhook autenticado (`N8N_WEBHOOK_TOKEN`) o cron; la app sigue siendo la fuente de verdad.
- Flujos exportados a `n8n/workflows/*.json` **sin credenciales**; credenciales dentro de n8n.
- Cada flujo: nombre claro, descripción, gestión de errores con notificación, idempotencia, reintentos limitados.
- Documentar cada flujo en `docs/10-entornos-despliegue.md` (propósito, disparador, dependencias).
- Si un flujo crece en lógica, migrarlo a código.
