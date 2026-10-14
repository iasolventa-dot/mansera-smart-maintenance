# a3innuva Nómina — ficha de integración

**Origen:** MANSERA (Cristina) confirma el 2026-10-14 que usa a3innuva Nómina (Wolters Kluwer) además de A3ERP, Trello, Sésame y PGMWin.
**Tipo:** software de nómina **en la nube** (familia a3innuva). No necesita gateway.
**Dueño de los datos (propuesta, ADR-0013):** nómina, contratos, incapacidades temporales (IT), convenios y costes de personal.

## Hechos [HECHO — documentación oficial a3developers, consultada 2026-10-14; sin verificar con la cuenta de MANSERA]
- **Requisitos previos** (página «Cómo empezar»): suscripción **Conectia** de a3innuva Nómina, acceso a a3innuva Nómina con una **Wolters Kluwer Account (WKA)** y un **cliente OAuth**.
- **API REST + JSON.** Se amplía con métodos nuevos manteniendo la retrocompatibilidad (ChangeLog en el portal).
- **Autenticación OAuth 2.0, flujo Authorization Code** (el híbrido está deprecado desde mayo de 2025):
  - autorización `https://login.wolterskluwer.eu/auth/core/connect/authorize`; token y refresco `…/connect/token`;
  - scope `offline_access openid IDInfo WK.ES.A3EquipoContex`;
  - **inicio de sesión interactivo** con la WKA de un usuario de MANSERA. Si tiene varias empresas, elige cuáles expone;
  - access token de 60 min, refresh token de 30 días, código de un solo uso válido 5 min;
  - `redirect_uri` en **https** (http solo para localhost en pruebas); TLS ≥ 1.2;
  - el **cliente OAuth es propio de cada cliente de a3innuva** y lo crea Wolters Kluwer mediante un formulario.
- **Cada llamada lleva** `Authorization: Bearer <token>` y `Ocp-Apim-Subscription-Key` (clave de la suscripción en a3developers).
- **Límites** (página «Límites»): Conectia 3.000 peticiones/min y 150.000/día; planes S/M/L de 100/1.000/3.000 por minuto. Al superarlos: 429 con `Retry-After`.
- **Endpoints** (Swagger «a3laboral-services-api»; listado público, rutas exactas no visibles sin acceso):
  - **Lectura útil para MANSERA:**
    - empresas y centros de trabajo;
    - empleados (listado, datos de contratación, puesto, contrato, convenio);
    - **pagas calculadas por empresa y fecha** y conceptos por paga (coste de personal);
    - **IT por empresa, centro y empleado** (enfermedad común, accidente…);
    - absentismos por empresa, centro y mes;
    - **módulo de formación** (acciones, grupos y participantes);
    - organigrama y centros de coste.
  - **Escritura** (no se usará sin ADR + propuesta validada, principio 4): empleados, contratos, IT, conceptos variables, anticipos, cuentas bancarias…

## Cómo encaja en el flujo
| Necesidad de MANSERA | Hoy | Con a3innuva Nómina |
|---|---|---|
| **Coste real por hora de cada técnico** → rentabilidad por OT y por cliente | Estimado | Coste de las pagas ÷ horas fichadas (Sésame) × horas imputadas a cada OT (PGMWin). Es el cruce de más valor del proyecto. |
| **Bajas oficiales (IT)** | Sésame da «ausencias» con categoría | La IT de nómina es la fuente oficial. Sésame sigue mandando en presencia y fichajes del día. |
| **Formación y PRL** (caducidad de cursos, acreditaciones CAE) | Datos de ejemplo | Módulo de formación de nómina (acciones y participantes), por confirmar si MANSERA lo usa. |
| **Plantilla y contratos** | Sésame (puesto, departamento) | Contrato, convenio y categoría vienen de nómina. Sésame queda como vista operativa. |

**Reparto de dueños (propuesta, a confirmar con MANSERA):**
- **Sésame:** presencia, fichajes, vacaciones del día a día.
- **a3innuva Nómina:** contrato, IT, coste y formación.
- Si discrepan (por ejemplo, una baja en nómina y nada en Sésame), se **avisa a RR. HH.**; no se corrige solo.

## Privacidad (crítico)
La nómina contiene los datos personales **más sensibles** del proyecto: salario, IRPF, cuenta bancaria, IT con causa médica. Reglas:
1. **Minimización en el conector**, como en Sésame: solo se declaran los campos que se usan; el resto se descarta al recibirlo.
2. **Agregar antes de mostrar.** Dirección y Administración ven costes agregados (por OT, cliente y departamento), no salarios individuales. El detalle individual queda solo para RR. HH.
3. **Nunca al LLM** (ni importes individuales ni causas de IT). El copiloto solo usa agregados.
4. **Solo lectura** hasta que exista un ADR específico. El scope documentado no distingue lectura de escritura, así que la barrera es nuestra lista de operaciones permitidas.
5. Registrar los accesos en `audit_log`.

## Estado en la plataforma (2026-10-14)
- **Conexiones:** tarjeta propia. Se pueden guardar client_id (visible), client_secret y clave de suscripción (cifrados en Vault). La base de datos valida el formato (migración `a3nomina`).
- **OAuth:** las piezas puras están hechas y probadas (`packages/connectors/src/a3nomina/oauth.ts`): URL de autorización, canje del código, renovación y cabeceras.
- **Flujo «Conectar con Wolters Kluwer» construido (2026-10-14):** `/api/oauth/a3nomina/start` → login WKA → `/api/oauth/a3nomina/callback`.
  - **Inicio:** solo TI real; `state` y `nonce` aleatorios en una cookie httpOnly de 10 min.
  - **Retorno:** comprueba sesión, usuario y `state`; lee el client_secret con la clave de servicio; canjea el código; comprueba el `nonce`; guarda el refresh token en el Vault con `connection_store_oauth` (solo service_role, y solo en nombre de un TI) y lo audita sin valores.
  - El navegador solo ve un código de resultado.
  - **Sin probar contra Wolters Kluwer:** falta el cliente OAuth de MANSERA, que exige registrar la dirección de retorno `https://mansera-indol.vercel.app/api/oauth/a3nomina/callback` (o el dominio definitivo).

## Incógnitas (preguntas para MANSERA / Wolters Kluwer)
- ¿Tiene MANSERA la suscripción Conectia? ¿Cuánto cuesta? (un tercero cita «desde 13,5 €/mes», sin confirmar).
- ¿Puede Wolters Kluwer crear el cliente OAuth de MANSERA con nuestra dirección de retorno?
- ¿Qué usuario WKA autorizará? Debe tener solo las empresas necesarias.
- URL base y rutas exactas (Swagger con acceso), paginación, y si existe una empresa de pruebas.
- ¿Usa MANSERA el módulo de formación? ¿Qué centros de trabajo y empresas hay en nómina? ¿Cuadran con los de PGMWin y Sésame?
