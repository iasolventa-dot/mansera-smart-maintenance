# ADR 0009 · Manual de usuario y asistente de ayuda con IA (fuente única)
- **Fecha:** 2026-10-13 · **Estado:** aceptado (decisión del usuario: replicar lo hecho en `solventa-prl`)
## Contexto
`solventa-prl` (Mi-PRL) tiene un manual HTML buscable y un asistente de ayuda (chat flotante) que envía una guía en Markdown al modelo, con límite diario y un «modo guía» sin IA. MANSERA necesita lo mismo, pero con la regla de `CLAUDE.md` de «sin fuente no hay respuesta» (ADR-0006) y sin mantener dos documentos a la vez.
## Decisión
1. **Fuente única** en `packages/core/src/help/content.ts`: capítulos → tareas con pasos, notas, palabras clave y sección (`NavId`). De ahí salen la página `/manual`, la búsqueda, el asistente y los enlaces «?» de cada pantalla.
2. **Disponibilidad y permisos derivan de `ROLE_ACCESS`**, no se escriben a mano.
3. **Asistente** = botón flotante + chat. Servidor: `apps/web/src/lib/assistant.ts` con `@anthropic-ai/sdk`; la base de conocimiento va primero y se cachea (prompt caching); las instrucciones (rol, pantalla, secciones permitidas) van después. Modelo por defecto `claude-opus-5-5`, esfuerzo `low`; configurable con `ASISTENTE_MODELO`.
4. **Modo guía** (sin `ANTHROPIC_API_KEY`, límite diario superado o fallo de la IA): búsqueda local (`searchHelp`/`answerLocally`) sobre el mismo manual. La aplicación es plenamente usable sin clave.
5. **Citas**: el modelo cierra con `FUENTES: id…`; el servidor solo conserva ids que existen en el manual y elimina enlaces «Ir a…» a secciones que el rol no puede ver.
6. **Límite diario** en `assistant_usage` + función `assistant_log_use()` (security definer, cuenta solo a `auth.uid()`): no necesita service role y no guarda el texto de las conversaciones.
7. **Separación de funciones**: el asistente explica *cómo usar la aplicación* y no ve datos; las preguntas sobre datos van al **Copiloto** (con fuentes y solo lectura).
## Alternativas consideradas
1. Dos ficheros (manual HTML + guía Markdown) como en Mi-PRL: se desincronizan.
2. Un único chat que mezcle ayuda y datos: mezcla riesgos (fugas de datos, alucinaciones numéricas) y dificulta la trazabilidad.
3. Contador con `service_role` (Mi-PRL): obliga a exponer una clave privilegiada al servidor web.
## Consecuencias
- Test de cobertura: falla si una sección de la aplicación no está documentada; falla si una pregunta sugerida no tiene respuesta en el manual.
- Coste: cada pregunta con IA cuesta unos céntimos con Opus; `ASISTENTE_MODELO=claude-haiku-5-5` lo reduce ~20×. Decisión del usuario.
- El manual solo documenta lo que la aplicación hace hoy; al construir funciones reales (M2+), se actualiza en la misma PR.
- Pendiente: evaluar el asistente con un conjunto de preguntas reales (golden set) cuando haya clave de IA activa.
