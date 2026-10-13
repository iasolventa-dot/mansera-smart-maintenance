# 10 · Entornos y despliegue

## Entornos
| Entorno | Web | BD | Apps de MANSERA |
|---|---|---|---|
| Local | `pnpm dev` | Supabase local (CLI + Docker) | Mocks + fixtures |
| Preview | Vercel preview por PR/rama | Supabase *branch* | Mocks / sandbox |
| Staging | Vercel (rama `staging`) | Proyecto Supabase staging (UE) | **Entornos de prueba** de PGMWin/A3/Trello/Sésame |
| Producción | Vercel (rama `main`) | Proyecto Supabase prod (UE) | Reales, con usuario de integración |

## Repositorio y ramas
GitHub privado. `main` protegida (producción), `staging`, ramas `feat/*`, `fix/*`. Commits convencionales en español. El usuario ejecuta `git` desde PowerShell en la **raíz del proyecto** (comandos entregados por Claude tras cada bloque).

## CI/CD (GitHub Actions) — se crea en M0
Instalar → lint → typecheck → tests (unidad/contrato) → tests RLS (Supabase local) → build → e2e (en PR a staging) → gitleaks. Despliegue: Vercel por integración con GitHub; migraciones Supabase aplicadas por pipeline en staging y, tras aprobación manual, en producción.

## Vercel
Variables por entorno (`.env.example` lista los nombres). Funciones en **región UE**. Cabeceras de seguridad (CSP, HSTS, X-Content-Type-Options, Referrer-Policy). Cron para snapshots/reconciliación. Dominio propio (p. ej. `app.…`) cuando proceda.

## Supabase
Proyectos separados staging/prod, región UE. Auth con MFA para roles altos. Storage con políticas. Vault para credenciales de apps. Realtime solo para eventos. Backups automáticos + prueba de restauración trimestral. Revisar *advisors* de seguridad/rendimiento tras cada migración.

## Gateway on-prem
Empaquetado como servicio de Windows (instalador + actualización controlada), configuración local fuera de git (`config.local.*`), logs rotados, panel de salud en Administración, **kill-switch** desde la nube. Instalación acordada con Cristina/TI de MANSERA y alineada con la auditoría de ciberseguridad.

## n8n (si se usa)
Instancia en UE autoalojada o gestionada; flujos exportados en `n8n/workflows/*.json` (versionados **sin credenciales**); autenticación por token (`N8N_WEBHOOK_TOKEN`); nunca en la ruta crítica.

## Operación
Runbooks mínimos (en este doc al crecer): app caída · conector caído · gateway sin latido · rate limit · rotación de secretos · restauración de backup. Alertas a TI (correo/Teams) por salud de conectores.

## Versionado de apps del cliente
Registrar versión probada de cada app. Antes de que MANSERA actualice PGMWin/A3, ejecutar tests de contrato en pruebas.
