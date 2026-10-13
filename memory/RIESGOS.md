# Registro de riesgos
Probabilidad/Impacto: B/M/A. Revisar al cierre de cada hito.

| ID | Riesgo | P | I | Mitigación | Estado |
|---|---|---|---|---|---|
| R-01 | Presupuesto remanente (8–9 k€) < propuesta (13,5 k€ + cuotas) | A | A | Fases; Mi PRL como gancho; MVP acotado; decisión del usuario | Abierto |
| R-02 | PGMWin sin API/acceso soportado para lectura-escritura | M | A | Spike S-PGM; plan B por ficheros vía gateway; escritura solo vía enlace directo | Abierto |
| R-03 | Licencias API no contratadas (A3 Link, Sésame Add On) → costes | M | M | Preguntar pronto (Q3, Q4); reflejar en presupuesto | Abierto |
| R-04 | Informe de ciberseguridad impone restricciones (gateway, nube, IA) | M | A | Obtenerlo pronto (Q6); diseño modular de transporte | Abierto |
| R-05 | Escritura errónea en ERP/GMAO | B | A | ADR-0005, entornos de prueba, auditoría | Mitigado por diseño |
| R-06 | Datos maestros sucios impiden enlazar | A | M | M4 con revisión humana e informe de calidad | Abierto |
| R-07 | Alucinaciones del copiloto | M | A | ADR-0006, golden set, citas obligatorias | Mitigado por diseño |
| R-08 | Dependencia de personas clave (Cristina) | M | M | Documentación, runbooks, formación | Abierto |
| R-09 | Competencia/otro proveedor de IA en el cliente | M | M | Valor demostrable rápido (M3); no sustituir sistemas | Abierto |
| R-10 | Sobrecarga de UI/animación degrada rendimiento en móvil | M | M | Presupuesto de rendimiento en `07`; Lighthouse CI | Abierto |
