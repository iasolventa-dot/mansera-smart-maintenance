---
name: security-gdpr
description: Úsala ante cualquier cambio que toque credenciales, datos personales, permisos, webhooks, gateway, envío de datos a IA o exposición pública. Aplica el checklist de seguridad y RGPD del proyecto.
---
# Seguridad y RGPD — checklist por cambio

Referencia: `docs/06-seguridad-rgpd.md`.

- [ ] **Secretos:** ninguno en repo/logs/cliente; entorno o Vault; `.env.example` actualizado (solo nombres).
- [ ] **Datos personales:** ¿nuevos? ¿necesarios? ¿minimizados? ¿quién accede? ¿retención? ¿se envían al LLM?
- [ ] **Autorización en servidor** + RLS (+test) — la UI nunca protege.
- [ ] **Entradas:** validadas con Zod; salidas escapadas; sin `dangerouslySetInnerHTML` con datos externos.
- [ ] **Webhooks:** firma verificada, anti-repetición, idempotencia.
- [ ] **Escrituras en apps:** propuesta + aprobación + auditoría + usuario de mínimo privilegio.
- [ ] **Gateway:** solo salientes, firma, lista blanca, kill-switch.
- [ ] **Cabeceras:** CSP, HSTS, X-Content-Type-Options, Referrer-Policy, frame-ancestors.
- [ ] **Dependencias:** nuevas revisadas (mantenimiento, licencia, vulnerabilidades); lockfile.
- [ ] **IA:** inyección de prompts considerada; qué sale hacia el proveedor registrado.
- [ ] **Región UE** para datos; subencargados documentados.
- [ ] **Logs** sin datos personales; retención definida.

Si algo falla o es dudoso: parar, anotar en `memory/RIESGOS.md`, consultar al usuario. Si se filtra un secreto: **rotar primero**, investigar después, avisar.
