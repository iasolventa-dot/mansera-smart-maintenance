---
description: Arranque de sesión estructurado (recupera contexto y propone el plan del día)
---
Ejecuta el protocolo de inicio de sesión:
1. Lee `memory/ESTADO.md`, las últimas entradas de `memory/DIARIO.md`, `memory/SUPUESTOS.md` (resumen) y el hito en curso de `docs/11-roadmap.md`.
2. Comprueba coherencia: ¿ESTADO.md coincide con el código real (`git status`, `git log -5`)? Si no, dilo.
3. Resume en ≤ 10 líneas: hito actual, qué está hecho, qué falta, bloqueos y riesgos activos.
4. Propón la lista de tareas de esta sesión (TaskCreate) con criterios de aceptación del hito, y espera confirmación del usuario si hay decisiones abiertas.
No empieces a programar sin este resumen.
