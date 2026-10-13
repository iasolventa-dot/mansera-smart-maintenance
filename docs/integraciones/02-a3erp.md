# A3ERP — ficha de integración

**Instalación MANSERA:** A3ERP 15.0.0.0 (a3 Software / Wolters Kluwer). Dueño de clientes, compras, facturación y contabilidad.

## Hechos [HECHO — documentación y fuentes de terceros; reverificar]
- Existe **a3ERP Link API** (módulo con licencia aparte), con lectura y escritura. Fuentes de terceros indican compatibilidad desde a3ERP 14+. No se conocen webhooks anunciados.
- No hay integración actual con PGMWin en MANSERA.

## Incógnitas (spike S-A3)
1. ¿Tiene MANSERA contratado el módulo Link API? ¿Coste de licencia/alta? (pregunta para Cristina → proveedor/distribuidor).
2. Local o nube; versión exacta del servicio Link.
3. Autenticación, entidades expuestas (clientes, artículos, albaranes, facturas…) y límites.
4. Entorno de pruebas / empresa de pruebas.
5. Qué restricciones impone la auditoría de ciberseguridad.

## Uso previsto
Lectura de clientes y facturación; creación de **facturas desde albaranes de PGMWin** (con propuesta validada); control de rentabilidad por cliente (cruce horas PGMWin + costes A3).

## Riesgos
Coste de licencia no previsto · escritura contable = alto impacto → **solo con validación humana y entorno de pruebas** · ventanas de mantenimiento/actualización.
