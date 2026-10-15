# 12 · Preguntas abiertas (lo que NO sabemos de MANSERA)

No rellenar con suposiciones. Cuando se responda, mover a `memory/SUPUESTOS.md` como verificado.

## Críticas (bloquean M1/M2)
| # | Pregunta | Quién | Impacto |
|---|---|---|---|
| Q1 | ¿PGMWin y A3 están en servidor local, en la nube del proveedor o mixto? ¿Hay red local con todos los usuarios? | Cristina (TI) | Decide gateway/túnel/VPN **Respuesta parcial (2026-10-15): PGMWin en la nube de EGEOtec; A3ERP pendiente.** |
| Q2 | ¿Qué mecanismo oficial de integración ofrece EGEOtec para PGMWin 26.0 (API/webservice/SQL/ficheros)? Coste y requisitos | Cristina → EGEOtec | Viabilidad de lectura/escritura **RESPONDIDA (2026-10-15): API a medida (~1.150 € + desarrollo) o lectura SQL autorizada; documentación y entorno de pruebas. ADR-0015.** |
| Q3 | ¿Tiene MANSERA contratado a3ERP Link API? Coste si no | Cristina → distribuidor A3 | Escritura/lectura ERP |
| Q4 | ¿Tiene contratado el Add On de API de Sésame? Coste | Cristina → Sésame | Datos de personal **RESPONDIDA (2026-10-15): 54 €/mes; 600 peticiones/min; sin tokens de solo lectura.** |
| Q5 | ¿Entornos de prueba para PGMWin y A3? | Cristina → proveedores | Seguridad de escrituras |
| Q6 | Resultado/directrices de la auditoría de ciberseguridad | Cristina | Arquitectura permitida |
| Q8 | a3innuva Nómina: ¿tienen la suscripción Conectia (coste)? ¿Puede Wolters Kluwer crear el cliente OAuth de MANSERA con nuestra dirección de retorno? ¿Qué usuario WKA autoriza y con qué empresas? ¿Hay empresa de pruebas? ¿Usan el módulo de formación? | Cristina → Wolters Kluwer | Coste de personal, IT y formación (ADR-0013) |
| Q7 | Presupuesto real y fase comercial 1 acordada (remanente 8–9 k€ vs propuesta 13,5 k€) | Fran / Gerencia | Alcance y priorización |

## Importantes
- Qué proveedor de IA y qué política de datos acepta MANSERA (UE, sin entrenamiento, DPA). NDA firmado.
- Qué usuarios por departamento y qué debe ver cada uno (matriz de permisos).
- Estructura real de Trello (tableros, listas, etiquetas) y de ofertas.
- Calidad de los datos maestros en cada app (duplicados, códigos distintos).
- Qué datos de coste/horas están realmente en PGMWin (¿partes con horas y repuestos?) y cómo se imputan a A3.
- Reglas del semáforo: ¿qué es rojo/naranja/verde para cada departamento?
- SLA y contratos por cliente: ¿dónde viven hoy?
- ¿Qué botones propios merecen la pena? → resultado de la **auditoría de funciones** (Plantilla de auditoría v2, hoja Funciones).
- SCADA: qué clientes, datos, frecuencia y acuerdos.
- CAE/PRL: plataformas externas reales (no 128), cuáles exigen subida y con qué API.

## Fuentes que ya tenemos
Acta de reunión inicial (15/09/2026) · Manual PGMWin 2020 · Manual A3ERP · Plantilla de auditoría v2 (por rellenar).
