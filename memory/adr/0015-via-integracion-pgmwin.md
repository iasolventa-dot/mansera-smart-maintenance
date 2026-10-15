# ADR 0015 · Vía de integración con PGMWin
- **Fecha:** 2026-10-15 · **Estado:** propuesto (necesita decisión de MANSERA: presupuesto y prioridad)
## Contexto (respuesta de EGEOtec vía Cristina, 2026-10-15)
- PGMWin está **en la nube de EGEOtec**, con base de datos **SQL Server**. MANSERA tiene PGMWin y PGMweb.
- **API de integración:** existe, se usa para integraciones con ERP. Es un **módulo aparte**; punto de partida **~1.150 €** sin desarrollos, y «seguro que habría que desarrollar a medida». Permite lectura y escritura («cualquier cosa»).
- **Lectura directa de la base de datos:** la autorizan «sin problema» («los datos no son nuestros, son de MANSERA»). No afecta a garantía ni soporte. Pueden crear un usuario de integración con permisos limitados.
- Facilitan **documentación técnica y entorno de pruebas**. Al actualizar, la conexión se mantiene y avisan de los cambios.
## Opciones
| | A · Lectura SQL (usuario limitado) | B · API a medida | C · Exportación a fichero |
|---|---|---|---|
| Coste | Bajo (sin módulo) | 1.150 € + desarrollo (sin presupuesto) | Bajo |
| Plazo | Corto, en cuanto haya documentación y acceso | Depende de EGEOtec | Corto |
| Lectura | Sí, casi en tiempo real | Sí | Con retraso (lotes) |
| Escritura (crear OT) | **No: nunca se escribe en su base de datos** | Sí, con propuesta validada | No |
| Riesgo | Acoplamiento al esquema interno: mitigar con **vistas acordadas** con EGEOtec | Dependencia del desarrollo a medida | Frescura y fiabilidad |
## Recomendación
1. **Fase 1 (M1-M3): opción A, solo lectura.** Usuario SQL de solo lectura limitado a **vistas** que EGEOtec mantenga entre versiones (OT, activos, preventivos, partes, repuestos, clientes). Primero sobre el **entorno de pruebas**. Spike antes de construir nada encima.
2. **Escritura (crear OT desde una oferta ganada, partes): opción B**, solo cuando el valor lo justifique y con presupuesto cerrado. Mientras tanto, la plataforma genera la propuesta y el enlace directo a PGMWin, y la persona la da de alta allí (plan B ya previsto en R-02).
3. **Nunca** escribir directamente en la base de datos de PGMWin, aunque técnicamente se pudiera: rompería la integridad de su aplicación y el soporte.
## Acceso técnico (por decidir con EGEOtec y el informe de ciberseguridad, Q6)
- El SQL Server está en la nube de EGEOtec, que exigirá restringir el origen (lista de IP o VPN). Las funciones de Vercel no tienen IP fija.
- **Opción preferida:** leer desde el **gateway** (ADR-0011): IP fija de la oficina, credenciales fuera de la nube (ADR-0012) y la misma lista blanca de operaciones. Las consultas serían parametrizadas, sobre vistas, sin SQL libre.
- **Alternativa:** que EGEOtec exponga una réplica de lectura con acceso por IP restringida a un servicio con salida fija.
## Consecuencias
- R-02 (PGMWin sin API utilizable) baja de probabilidad: hay una vía de lectura viable y barata.
- Coste nuevo a presupuestar si se quiere escritura (R-28).
- Datos: mismas reglas de minimización. Las OT pueden contener nombres de técnicos y clientes.
