---
name: docs-adr
description: Úsala para registrar decisiones (ADR), actualizar documentación de docs/, mantener índices y evitar que el conocimiento quede solo en el chat.
---
# Documentación y decisiones

- Decisión que afecta a arquitectura, datos, seguridad, coste o alcance → ADR en `memory/adr/NNNN-titulo.md` (plantilla `0000-plantilla.md`) + fila en `memory/DECISIONES.md`.
- Cambio de comportamiento → actualizar el doc de `docs/` **en la misma sesión**. Si cambia el índice, `docs/00-INDEX.md`.
- Etiquetar afirmaciones sobre apps: [HECHO]/[HIPÓTESIS]/[DECISIÓN] con fuente y fecha.
- Documentos cortos, con tablas y listas de comprobación; sin duplicar (enlazar).
- Instrucciones de configuración para el usuario: **en el chat**, no en .md sueltos.
- Revisar enlaces internos y rutas citadas tras mover o renombrar ficheros.
