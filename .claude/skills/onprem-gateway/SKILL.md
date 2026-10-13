---
name: onprem-gateway
description: Úsala para diseñar, implementar o revisar el gateway on-prem (apps/gateway) que conecta la plataforma cloud con PGMWin/A3 en la red local de MANSERA sin abrir puertos.
---
# Gateway on-prem

## Cuándo existe
Solo si la app está en la red local de MANSERA y no expone API segura accesible (decisión ADR-0003 tras Q1/M1). Alternativas: túnel (Cloudflare Tunnel/Tailscale), VPN sitio-a-sitio.

## Diseño
- Servicio Node como **servicio de Windows**. Solo **conexiones salientes** HTTPS/WebSocket (o long-poll) a la nube; sin puertos entrantes.
- Autenticación mutua + **trabajos firmados** (HMAC/clave por organización, `nonce`, caducidad corta contra repetición).
- **Lista blanca** de operaciones definidas por los conectores (nada de "ejecuta este SQL/comando" genérico).
- Usuario de integración en la app local con **mínimo privilegio**; credenciales locales cifradas (DPAPI) y fuera de git (`config.local.*`).
- Cola local con reintentos + *outbox*; idempotencia; límites de concurrencia para no saturar PGMWin/A3.
- **Latido** periódico a la nube; el panel de salud alerta si falta; **kill-switch** remoto.
- Logs rotados sin datos personales ni credenciales.
- Actualización controlada (versionado, rollback).

## Pruebas
Caída de red, reinicio, doble entrega de trabajo, trabajo caducado/falsificado, BD lenta, app local en mantenimiento.

## Coordinación humana
Instalación con TI de MANSERA (Cristina) y alineada con la auditoría de ciberseguridad. Documenta puertos, dominios de salida y cuenta de servicio necesarios para que TI los autorice.
