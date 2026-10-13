---
description: Revisión independiente del hito o del cambio actual (subagente reviewer, solo lectura)
---
Lanza el subagente `reviewer` sobre: $ARGUMENTS (si está vacío, el hito en curso y los cambios sin commitear).
Pásale: criterios de aceptación del hito (`docs/11-roadmap.md`), principios de `CLAUDE.md`, y la lista de ficheros cambiados.
Cuando devuelva el informe:
1. Clasifica hallazgos en **Bloqueante / Importante / Mejora**.
2. Corrige los bloqueantes (o explica por qué no) y vuelve a revisar si fueron más de 2.
3. Registra el resultado en `memory/DIARIO.md` y, si afecta a una puerta (G0–G8), en `memory/ESTADO.md`.
4. No declares el hito terminado con bloqueantes abiertos.
