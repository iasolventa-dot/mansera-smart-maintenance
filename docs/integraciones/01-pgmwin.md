# PGMWin (GMAO) — ficha de integración

**Instalación MANSERA:** PGMWin 26.0 (07/07/2026). Fabricante: EGEOtec. Manual de usuario 2020 en los documentos del proyecto (puede no coincidir con 26.0).

## Hechos [HECHO — con fuente]
- Es el sistema de referencia de activos, órdenes de trabajo, preventivo, repuestos y 12 años de histórico en MANSERA.
- El manual describe exportación a ficheros (CSV/TXT/Excel) y existe variante web (PGMweb) y app de campo (PGMWET, citada en el acta para registro de horas).
- Investigación previa (sesiones anteriores): **no se encontró API pública documentada**; hay precedentes de integración con ERP (p. ej. webservices con SAP Business One en un caso publicado, 2020) → indica que EGEOtec *puede* ofrecer integración bajo petición.

## Premisa actual del proyecto [HIPÓTESIS DE TRABAJO — del usuario]
"Vamos a tener acceso a la API de cada aplicación". **No asumir forma, endpoints ni alcance hasta el spike.** Es el mayor riesgo técnico del proyecto (R-02).

## Incógnitas críticas (resolver en M1/spike S-PGM)
1. ¿Qué mecanismo concreto ofrece EGEOtec para v26.0? (webservice SOAP/REST, acceso SQL directo, ficheros, PGMweb). ¿Licencia/coste?
2. Motor de base de datos y si está en servidor local; ¿se permite acceso de solo lectura soportado por el fabricante?
3. ¿Lectura y escritura? ¿Qué entidades (activos, OT, partes, preventivos, repuestos, clientes)?
4. ¿Autenticación, límites, versionado ante actualizaciones?
5. ¿Eventos/webhooks o solo polling?
6. ¿Entorno de pruebas disponible? ¿Quién autoriza (Cristina ↔ proveedor)?
7. ¿Local o nube? → decide si hace falta Gateway.

## Plan de spike S-PGM (≤ 3 días, tras respuesta del proveedor)
Objetivo: pasar capabilities de `assumed` a `verified` o declarar *no-go*.
1. Lectura de 3 entidades (activos, OT, clientes) en entorno de pruebas.
2. Medir latencia, paginación, límites.
3. Prueba de escritura **solo en pruebas** (crear OT) y verificación de integridad.
4. Documentar en `SUPUESTOS.md` con evidencia.
**Criterio no-go:** si no hay vía soportada de lectura fiable → activar plan B (`memory/adr`): exportación programada de ficheros por el Gateway (lectura, no escritura) y botón "abrir en PGMWin" para escritura.

## Orden de opciones (mejor → peor) si no hay API
1) API/webservice oficial · 2) acceso SQL de solo lectura autorizado por el fabricante · 3) exportación programada CSV/Excel vía Gateway · 4) informes PGMWin automatizados enviados por correo y procesados · 5) captura manual asistida. Nunca escribir directamente en la BD sin respaldo del fabricante.

## Acciones previstas con valor (si hay escritura)
Crear OT desde oferta ganada de Trello · consultar historial de un activo · parte de trabajo desde móvil · preventivos pendientes por cliente.
