# 15 · Costes de terceros por fases (para decidir con MANSERA)

> Preparado el 2026-10-15 a partir de lo que han comunicado los proveedores a MANSERA (vía Cristina) y de las tarifas públicas. **Hay que confirmar si los importes incluyen IVA.** No incluye el coste del desarrollo de la plataforma (propuesta comercial de SOLVENTA IA). Decisión registrada como propuesta en ADR-0016.

## 1. Qué cuesta cada conexión
| Sistema | Qué hace falta | Alta | Cuota | Fuente |
|---|---|---|---|---|
| **Sésame HR** | Complemento de API | — | **54 €/mes** | Sésame a MANSERA |
| **A3ERP** | API «Integrador API ERP» (Link Soluciones) | **1.800 €** (configuración multiempresa) | **75 €/mes** (1.000 llamadas) o **100 €/mes** (ilimitadas) | Distribuidor a MANSERA |
| **PGMWin**, lectura | Usuario SQL de solo lectura sobre vistas (ADR-0015) | **0 €** de licencia; confirmar si EGEOtec cobra horas por crear las vistas y el usuario | — | EGEOtec a MANSERA |
| **PGMWin**, escritura (crear OT) | Módulo API + desarrollo a medida | **~1.150 €** + desarrollo sin presupuestar | Por confirmar | EGEOtec a MANSERA |
| **a3innuva Nómina** | API Conectia | — | **45 €/mes** | Distribuidor a MANSERA |
| **Trello** | API REST | Previsiblemente 0 € (confirmar el plan contratado) | — | Pendiente |

**Plataforma** (orientativo; confirmar en las webs de precios):

| Servicio | Plan | Cuota |
|---|---|---|
| **Vercel** | **Pro**, obligatorio para uso comercial: el plan gratuito «Hobby» solo permite uso personal y no comercial (documentación de Vercel) | 20 USD/mes por usuario desarrollador |
| **Supabase** | Pro, recomendado en producción (copias de seguridad, sin pausas por inactividad) | ~25 USD/mes |
| **IA (Anthropic)** | Solo si se activa el asistente con IA | Pago por uso (céntimos por pregunta) |
| **Gateway** | Se instala en el servidor de MANSERA donde está A3ERP | 0 € |

## 2. Propuesta por fases
**Fase 1, lectura (lo que da valor antes):** Personal con datos reales, Comercial, Facturación y cobros, y órdenes de trabajo y activos.

| Concepto | Alta | Mensual |
|---|---|---|
| Sésame API | — | 54 € |
| A3ERP API (tarifa de 1.000 llamadas; se mide en el spike) | 1.800 € | 75 € |
| PGMWin lectura SQL | 0 € (+ horas de EGEOtec, si las cobra) | — |
| Trello | 0 € | — |
| **Total proveedores de MANSERA** | **1.800 €** | **129 €/mes** |
| Plataforma (Vercel Pro + Supabase Pro), orientativo | — | ~45 USD/mes |

**Primer año de la fase 1:** 1.800 € + 12 × 129 € = **3.348 €** en proveedores, más ~540 USD de plataforma.

**Fase 2, cuando se apruebe** (rentabilidad real por OT y escritura):

| Concepto | Coste |
|---|---|
| a3innuva Conectia (coste de personal por técnico) | 45 €/mes |
| PGMWin API para **crear OT** desde ofertas ganadas | ~1.150 € + desarrollo |
| A3ERP ilimitada, solo si las 1.000 llamadas no bastan | +25 €/mes |

## 3. Notas para decidir
- **Lo imprescindible para empezar:** Sésame (54 €/mes) y A3ERP (1.800 € + 75 €/mes). La lectura de PGMWin no tiene coste de licencia.
- **Lo que puede esperar:**
  - La **nómina** (45 €/mes): solo hace falta para el coste real por técnico.
  - La **escritura en PGMWin**: mientras tanto, la plataforma prepara la propuesta y se da de alta a mano en PGMWin.
- **Llamadas de A3ERP:** sincronizando cada 1-2 horas en horario laboral con los endpoints de «cambios» se estiman entre ~400 y 900 llamadas/mes. Es una estimación (R-31) y se medirá en el spike antes de elegir tarifa.
- **Sésame ↔ a3innuva:** existe una integración propia de Sésame en el marketplace de Wolters Kluwer, para pasar fichajes y ausencias a la nómina. Es independiente de esta plataforma y la contrata MANSERA con Sésame si le interesa.
- **Riesgo de presupuesto (R-01):** estos costes son de terceros y se suman al proyecto. Conviene acordarlos antes de contratar nada.
