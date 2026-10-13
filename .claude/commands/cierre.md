---
description: Cierre de bloque de trabajo (guarda estado para sobrevivir a compactaciones)
---
Ejecuta el protocolo de cierre. Es obligatorio antes de terminar la sesión, antes de compactar y tras cada bloque relevante:
1. Actualiza `memory/ESTADO.md` (fecha, hito, qué existe, qué se hizo, siguiente paso concreto, bloqueos). Máximo 80 líneas: condensa.
2. Añade una entrada breve a `memory/DIARIO.md` (arriba).
3. Si hubo una decisión → ADR nuevo en `memory/adr/` y fila en `memory/DECISIONES.md`.
4. Si se verificó o refutó algo → actualiza `memory/SUPUESTOS.md` con evidencia.
5. Si apareció/cambió un riesgo → `memory/RIESGOS.md`.
6. Si cambió el comportamiento del sistema → actualiza el doc correspondiente en `docs/`.
7. Comprueba la Definition of Done de `docs/09-testing-calidad.md` para lo trabajado.
8. Entrega al usuario los comandos PowerShell de `git add` / `git commit` / `git push` (mensaje convencional en español), a ejecutar desde la raíz del proyecto.
