# 01 · Contexto de negocio

## El cliente
**MANSERA — Mantenimientos y Servicios Aguilar, S.L.** (Sevilla). Empresa de servicios de ingeniería y mantenimiento industrial: producción, compras, oficina técnica (3 ingenieras), técnicos de campo, administración.
- **Interlocutores:** Javier Aguilar (gerente) · Cristina Durán (responsable TI; lidera la digitalización; es quien contacta con los proveedores de software). Contacto de SOLVENTA hacia MANSERA: Fran Gutiérrez. **[HECHO — acta reunión 15/09/2026]**
- Clientes relevantes: Coca-Cola (contrato marco anual) entre otros. Servicio técnico oficial de 28 marcas de maquinaria. **[HECHO]**
- Contabilidad analítica por cliente desde la fundación. Manual de procesos de hace 7-8 años, "cumplido al 100%" porque lo fuerza el ERP (con campos para saltárselo en urgencias). **[HECHO — declarado por el cliente]**

## Ecosistema actual (todos desconectados entre sí)
| Sistema | Versión | Función | Dueño de… |
|---|---|---|---|
| **PGMWin** (GMAO; fabricante EGEOtec) | 26.0 (07/07/2026) | Activos, OT, preventivo, repuestos. 12 años de histórico | Activos, OT, preventivo |
| **A3ERP** | 15.0.0.0 | ERP: clientes, compras, facturación, contabilidad | Clientes, facturación |
| **Trello** (web) | — | Proyectos y ofertas | Ofertas/proyectos |
| **Sésame HR** | — | Portal del empleado, fichajes | Personal |
| Excel/Word/PDF, correo, WhatsApp | — | Ofertas "a pelo", comunicación | — |

- No existe ninguna integración PGMWin↔A3. Datos maestros (clientes, máquinas) se crean varias veces. **[HECHO]**
- Algunos clientes tienen **SCADA** gestionado en remoto por MANSERA. **[HECHO]**
- **Ubicación (local vs nube) de PGMWin y A3: NO confirmada.** Se averigua con la *Plantilla de auditoría v2* (hojas Infraestructura y Programas). **[INCÓGNITA — bloquea decisiones del gateway]**

## Dolores declarados (acta 15/09/2026)
1. **CAE/PRL:** 128 centros de trabajo de clientes (>480 instalaciones citadas), una persona a tiempo completo subiendo documentación; el día 1 de mes es crítico. *(Nota: "128 plataformas" en el acta se corrigió: son 128 centros de trabajo, no 128 plataformas CAE.)* → Pack **Mi PRL** (producto propio de SOLVENTA).
2. **Falta de integración:** pasar Trello→OT en PGMWin, albarán PGMWin→factura A3 a mano.
3. **Flujos rígidos y manuales:** fichas de campo en "dos libracos"; ofertas con PDF/Excel/Word.
4. **Sin analítica** pese a 12 años de histórico en PGMWin.
5. **Comunicación:** RR. HH. recibe WhatsApp cada 2-3 s.
6. **Miedo a la privacidad** con IA pública; asocian low-code con inestabilidad → **prefieren solución desarrollada con código, estable, fácil de usar**.

## Expectativas
- Cuadro de mando unificado por estados **rojo/naranja/verde**, sin carga manual de datos.
- Productividad +40–80 % (objetivo declarado por el cliente; no es una promesa nuestra).
- Estándar que cubra el 80 % y sea personalizable. Multimodalidad (texto, voz, imagen) como futuro.

## Restricciones y calendario
- **Presupuesto remanente declarado: 8.000–9.000 €** (total tecnológico del año: 40.000 €). La propuesta comercial de SOLVENTA (implantación 13.500 € + cuotas 500 €/mes fase 1 · 650 €/mes completa) **supera** ese remanente → riesgo comercial R-01 (ver `memory/RIESGOS.md`). Estrategia prevista: usar Mi PRL como gancho para ampliar presupuesto.
- Auditoría de **ciberseguridad** externa en curso: su informe condicionará la arquitectura (`12-preguntas-abiertas.md`).
- Posible **piloto**: revisión del sistema Schaffer en Primor (Málaga), octubre 2026.
- NDA pendiente antes de compartir arquitectura final.
- Otra empresa de IA compite/colabora en conversaciones con el cliente.

## Datos económicos de referencia (propuesta vigente)
Implantación 13.500 € en 10 semanas · cuota mensual 500 € (fase 1) / 650 € (plataforma completa). ROI de la propuesta: supuestos a 25 €/h, escenario prudente ≈1.000 h y esperado ≈1.475 h ahorradas/año. **[HIPÓTESIS — validar con la auditoría]**
