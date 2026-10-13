---
name: session-protocol
description: Úsala al empezar, reanudar o tras compactar una sesión, al cerrar un bloque de trabajo o cuando el contexto sea largo. Garantiza que el estado del proyecto sobrevive a compactaciones leyendo y escribiendo memory/.
---
# Protocolo de sesión y memoria

## Por qué
El contexto se pierde al compactar. La única memoria fiable es el repositorio: `memory/` y `docs/`.

## Al empezar / tras compactar
1. El hook imprime `memory/ESTADO.md`. Léelo entero.
2. Verifica con `git status` y `git log -5` que coincide con la realidad.
3. Lee del roadmap solo el hito en curso y sus criterios de aceptación.
4. Si ESTADO.md está desactualizado, corrígelo ANTES de seguir.

## Durante
- Trabaja con lista de tareas (TaskCreate/TaskUpdate); una tarea = un resultado verificable.
- Cada ~45 min de trabajo o tras cada subhito: mini-actualización de ESTADO.md (siguiente paso concreto).
- Decisión relevante → ADR. Suposición verificada/refutada → SUPUESTOS.md. Riesgo → RIESGOS.md.
- Si el contexto va largo, ejecuta `/cierre` ANTES de que compacte.

## Al cerrar
Ejecuta `/cierre`. El "siguiente paso concreto" debe poder ejecutarlo alguien sin contexto (ruta de fichero, comando, criterio).

## Reglas de ESTADO.md
< 80 líneas · fecha · hito · qué existe · qué se hizo · siguiente paso · bloqueos · riesgos top-3 · nada de historia larga (eso va al DIARIO).

## Anti-patrones
Fiarse de la memoria de la conversación · dejar decisiones solo en el chat · ESTADO.md con "TODO varios" · marcar hecho sin evidencia.
