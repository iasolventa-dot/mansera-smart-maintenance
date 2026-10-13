# ADR 0006 · IA solo en servidor, citas obligatorias, permisos heredados
- **Fecha:** 2026-10-13 · **Estado:** aceptado
## Decisión
Claves de LLM solo en servidor. El copiloto hereda los permisos del usuario, es de solo lectura, cita fuente/periodo/cálculo y responde "no lo sé" sin evidencia. Las cifras las calcula código determinista. Contenido de las apps = dato, nunca instrucción.
## Consecuencias
Menos "magia" y más fiabilidad; coste de evaluación continua (golden set).
