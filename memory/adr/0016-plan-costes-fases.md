# ADR 0016 · Plan de costes de terceros por fases
- **Fecha:** 2026-10-15 · **Estado:** propuesto (Cristina pidió una visión global de los gastos; decide MANSERA)
## Contexto
Los proveedores han comunicado sus costes:
- Sésame: 54 €/mes.
- A3ERP (API de Link Soluciones): 1.800 € + 75 o 100 €/mes.
- PGMWin: lectura SQL sin licencia, o API desde ~1.150 € + desarrollo.
- a3innuva Conectia: 45 €/mes.

Además, el plan gratuito de Vercel no permite uso comercial.
## Decisión propuesta
1. **Fase 1, solo lectura:**
   - Sésame API.
   - A3ERP con la tarifa de 1.000 llamadas, que se mide en el spike.
   - PGMWin por lectura SQL sobre vistas (ADR-0015).
   - Trello.
   - Plataforma en planes de pago aptos para uso comercial (Vercel Pro, Supabase Pro).
2. **Fase 2, cuando se apruebe:** Conectia (coste por técnico) y la API de PGMWin para crear OT.
3. No contratar nada sin el visto bueno de MANSERA y la validación técnica previa (spike) de cada conexión.
## Consecuencias
- Proveedores en la fase 1: 1.800 € de alta + 129 €/mes. Plataforma: ~45 USD/mes. Detalle en docs/15.
- Si la estimación de llamadas de A3ERP falla, pasar a la tarifa ilimitada (+25 €/mes).
