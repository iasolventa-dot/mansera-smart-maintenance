# 08 · IA: copiloto, anomalías, informes

## Reglas de oro
1. La IA **interpreta, explica y redacta**; los **números** los calculan consultas/código deterministas.
2. **Trazabilidad:** cada respuesta con datos incluye fuente (app + entidad + id), periodo, cálculo, nivel de certeza. Sin fuente → "no lo sé / no tengo ese dato".
3. **Nunca inventar** procedimientos técnicos, repuestos ni cifras. RAG técnico: solo documentación disponible, con enlace a la página.
4. **Lectura por defecto.** Las herramientas de escritura producen una **propuesta** humana, nunca ejecutan.
5. Anomalía ≠ predicción de averías. No presentar IA generativa como predictor.

## Copiloto (patrón)
`Pregunta → clasificación de intención → selección de herramientas (tool-use) → llamadas a conectores (solo lectura) / consultas a snapshots → cálculo determinista → redacción con citas → validación (Zod + comprobación de que cada cifra tiene fuente) → respuesta`.
- Herramientas tipadas (p. ej. `buscarActivos`, `historialActivo`, `horasPorContrato`, `preventivosPendientes`, `gastoPorCliente`) con permisos del usuario (el copiloto **hereda** los permisos de quien pregunta).
- Preferir **tool-use sobre APIs/consultas parametrizadas** antes que texto-a-SQL libre. Si se usa SQL generado, solo lectura, vistas permitidas, límite de filas y revisión.
- Respuesta estructurada: texto breve + tabla/gráfico + `SourceChip`s + "ver cálculo".
- Memoria de conversación acotada; nada sensible persistente sin necesidad.

## Preguntas objetivo (casos de aceptación)
"¿Qué máquinas han tenido más averías este mes?" · "¿Qué preventivos están pendientes?" · "¿Cuánto hemos gastado en este cliente?" · "¿Qué averías se repiten?" · "¿Cuántas horas hemos dedicado a este contrato?" · "¿Qué máquinas están empeorando?".
Dependen de que PGMWin y A3 den esos datos (ver `integraciones/`).

## Anomalías (fase posterior al panel)
Reglas y estadística primero (umbral, z-score robusto, EWMA, comparación con máquinas similares, cambio de tendencia); **IA generativa solo para explicar** ("la bomba P-12 tiene 3 averías de rodamiento en 60 días, el doble que sus 4 gemelas…"). Cada alerta: evidencia, gravedad, responsable sugerido, acción propuesta, botón "descartar con motivo" (retroalimenta umbrales).

## Informes de cliente
Plantilla determinista (KPIs, intervenciones, preventivos hechos/pendientes, horas, costes, tendencias) + resumen redactado por IA con revisión humana antes de enviar. Se guarda copia inmutable (`reports`).

## Asistente técnico (RAG) — pack posterior
Manuales/procedimientos/historial indexados con pgvector; respuestas con cita de página; sin cita no se afirma. Permisos por cliente/activo. Evaluar calidad con golden set.

## Voz e imagen (pack posterior, exploratorio)
Relato por voz → transcripción → parte estructurado (propuesta). Foto de avería → descripción + antecedentes del activo; **siempre como ayuda a diagnóstico, no veredicto**.

## Evaluación (obligatoria)
Golden set de preguntas con respuesta esperada y fuente (20 → 100) · métricas: exactitud, % con cita verificable, latencia, coste/consulta · ejecución en CI para cambios de prompts/herramientas/modelo · revisión humana mensual de muestras reales · registro de alucinaciones y fallos en `memory/RIESGOS.md`.

## Proveedor y costes
Capa de abstracción de modelos (cambiar proveedor sin reescribir). Solo servidor. Presupuesto mensual con corte y alertas. Elegir modelo por tarea (rápido/barato para clasificar, potente para razonar). Verificar condiciones de privacidad vigentes del proveedor antes de enviar datos reales.
