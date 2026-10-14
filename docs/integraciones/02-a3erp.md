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

## Lecturas preparadas en el gateway (2026-10-14, documentación oficial; sin probar en MANSERA)
- **Operaciones de la lista blanca:**
  - `a3erp.documentos.list`: tipo **FVS/FVC/AV/PV**, fechas `desde`/`hasta` y `limite` ≤ 500.
  - `a3erp.clientes.list`: `limite` ≤ 2000.
  - Código en `packages/connectors/src/a3erp/read.ts` y `apps/gateway/src/runner.ts`.
- **Documentado:**
  - documentos `GET /api/documento/{tipo}` y maestros `GET /api/maestro/{maestro}`;
  - paginación por cabeceras `Page`/`PageSize`, que exige `/order/{columna} asc|desc` en la ruta;
  - filtro `/filtro/{condición SQL}`, que **se ejecuta directamente en la base de datos**.
- **Seguridad:** la nube nunca envía condiciones SQL. El gateway construye el filtro solo con un tipo de una lista cerrada y fechas reales validadas (formato `'AAAAMMDD'`). Un trabajo con cualquier otro parámetro se descarta antes de tocar A3ERP (probado).
- **Minimización:** de cada documento solo se devuelven serie, número, cliente (código y nombre), fecha, importes y `situacion` (sin NIF ni líneas). El token JWT nunca sale del gateway.
- **Pendiente de spike (S-29):**
  - nombres reales de los campos por tipo (la documentación usa `idpedv` en el ejemplo de pedidos) y en el maestro de clientes (se suponen `codcli`/`nomcli`, que son los del documento);
  - formato de fecha que acepta el filtro;
  - máximo de `PageSize`;
  - significado de `situacion`. Por eso **no se traduce a «cobrada/pendiente»**: el cobro está en «Cartera avanzada», aún sin leer.
