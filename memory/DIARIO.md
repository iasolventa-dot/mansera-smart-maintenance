# Diario de proyecto (bitácora; más reciente arriba)

Formato: `AAAA-MM-DD · hito · qué se hizo · decisiones · pendientes`. Mantener breve (≤ 6 líneas por entrada).

- 2026-10-13 · M0 (ayuda) · Replicado de solventa-prl: manual de usuario (/manual) y asistente de ayuda con IA (botón flotante, modo guía sin IA, límite diario, citas al manual) sobre una fuente única en packages/core/src/help; migración assistant_usage aplicada en Supabase · Decisión: ADR-0009 · Pendiente: activar ANTHROPIC_API_KEY en Vercel y evaluar con preguntas reales.
- 2026-10-13 · M0 (demo completa) · Ampliada la UI a 7 roles y 17 secciones (alertas, clientes 360, comercial, facturación, compras, personal, PRL/CAE, usuarios y auditoría), notificaciones, búsqueda global y acción rápida "Nueva OT" → propuesta; auth real con Supabase, usuario demo@solventa.com, iconos PWA · Decisión: estado de la demo en cookie (Vercel sin memoria compartida) · Pendiente: axe/Lighthouse, /revision.
- 2026-10-13 · M0 (UI) · Construida la interfaz real (9 pantallas, móvil+escritorio, claro/oscuro) sobre `packages/core` (esquemas Zod + `DataProvider`) y `packages/ui` · Decisión: UI primero por estrategia de venta, sin maqueta desechable (ADR-0008) · Pendiente: Supabase/Auth/RLS, CI, tests, `/revision`.
- 2026-10-13 · Preparación · Creado el proyecto Claude Code (docs, skills, comandos, revisor) a partir de la auditoría de MANSERA · Decisión: API-first con política de datos (ADR-0001) · Pendiente: arrancar M0.
