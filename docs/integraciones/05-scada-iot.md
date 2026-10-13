# SCADA / PLC / IoT — alcance futuro

Algunos clientes tienen SCADA gestionado en remoto por MANSERA [HECHO]. **No es parte del MVP.** No todos los clientes necesitan predictivo.

## A averiguar antes de diseñar nada
Qué clientes · qué datos y frecuencia · quién los gestiona · si hay histórico almacenado · protocolo (OPC UA, Modbus, MQTT…) · si pueden relacionarse con activos de PGMWin · acuerdos de acceso.

## Principios
- Anomalías con reglas/estadística sobre series; **predicción real** exige histórico de calidad + modelo ML; la IA generativa solo **explica** resultados.
- Acceso de solo lectura, aislado, con autorización explícita del cliente. Nunca control de planta.
- Mapeo `sensor/tag ↔ activo` mantenido en `entity_links`.
