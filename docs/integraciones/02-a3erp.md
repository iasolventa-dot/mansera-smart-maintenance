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

## Autenticación y conexión [HECHO — documentación oficial de la API, consultada 2026-10-13; sin verificar en la instalación de MANSERA]
- La API oficial (a3ERP Link API / «A3ERP API») es un **servicio de Windows dentro de la red del cliente** con un puerto propio (Config.ini). Requiere A3ERP 14+ y el diccionario «JNCAPI».
- Login: `POST /api/login` con `Authorization: Basic base64(usuario:contraseña)` → JWT; después `Authorization: Bearer`. Sin endpoint de refresco documentado: repetir el login al recibir 401. Paginación `Page`/`PageSize`.
- Un tercero (Chift) dice que A3ERP no tiene API pública; contradice la documentación oficial. Se confirma en la instalación (Q3).
- No es accesible desde la nube: se prueba y se usa **desde el gateway** (M2). Credenciales ya guardables en **Conexiones**.
- Documentación: a3erpapi.appcloud.es (introducción, validación, instalación).
