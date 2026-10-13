# MANSERA Smart Maintenance

Capa de integración e inteligencia (SaaS de SOLVENTA IA) sobre PGMWin, A3ERP, Trello y Sésame HR. Documentación y método de trabajo para desarrollarlo con Claude Code.

- **Empezar:** abre Claude Code en esta carpeta y pega el contenido de [`PROMPT_INICIAL.md`](PROMPT_INICIAL.md).
- **Reglas del proyecto:** [`CLAUDE.md`](CLAUDE.md) · **Índice:** [`docs/00-INDEX.md`](docs/00-INDEX.md) · **Plan:** [`docs/11-roadmap.md`](docs/11-roadmap.md) · **Estado:** [`memory/ESTADO.md`](memory/ESTADO.md)

```
CLAUDE.md            reglas y memoria permanente (se carga siempre)
PROMPT_INICIAL.md    prompt de arranque
docs/                documentación estable (arquitectura, integraciones, seguridad, UI, IA, roadmap…)
memory/              estado vivo: ESTADO, DECISIONES+adr, SUPUESTOS, RIESGOS, DIARIO
.claude/             skills, comandos (/inicio /cierre /revision /estado /spike), subagente revisor, hooks
scripts/hooks/       recuperación de contexto y detector de secretos
design/              mock-ups de referencia
apps/ packages/      código (web, gateway, conectores, core, ia, ui)
supabase/ n8n/       migraciones y flujos auxiliares
```
