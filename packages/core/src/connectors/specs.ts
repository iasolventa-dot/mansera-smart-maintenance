import { z } from "zod";

/**
 * Qué exige cada sistema para conectarse. Fuente ÚNICA para: el formulario de «Conexiones», la validación en
 * servidor, el manual y los scripts de spike. Solo lleva lo que la documentación OFICIAL afirma; lo demás
 * se declara en `unknown` y queda como pendiente. Fecha de consulta de la documentación: 2026-10-13.
 * Un sistema sin documentación es `pendiente_documentar`: no tiene formulario, pero la base segura
 * (Vault + permisos + auditoría) es genérica y sirve en cuanto se documente.
 */
export const CONNECTOR_APPS = ["pgmwin", "a3erp", "a3nomina", "trello", "sesame"] as const;
export type ConnectorApp = (typeof CONNECTOR_APPS)[number];

export type FieldRule = { min: number; max: number; pattern?: string; patternMessage?: string; url?: boolean };
export type FieldDef = {
  key: string;
  label: string;
  /** true = va cifrado en Vault y no se vuelve a mostrar; false = configuración visible (no sensible). */
  secret: boolean;
  required: boolean;
  placeholder?: string;
  help: string;
  rule: FieldRule;
};
export type DocLink = { label: string; url: string; checkedAt: string };

export type ConnectorSpec = {
  app: ConnectorApp;
  name: string;
  /** `documentado` = hay documentación oficial de la autenticación; `pendiente_documentar` = no se ha encontrado. */
  status: "documentado" | "pendiente_documentar";
  transport: "cloud" | "gateway";
  /**
   * Dónde se introducen y guardan las credenciales (ADR-0012):
   * `plataforma` = en Conexiones (cifradas en Supabase Vault); `gateway` = SOLO en el gateway de la red de MANSERA,
   * nunca salen de esa red ni pasan por la nube. Los campos describen lo que el gateway pedirá al instalarlo.
   */
  credentialsIn: "plataforma" | "gateway";
  /** Si además de guardar credenciales hay que autorizar con el proveedor (OAuth), ruta del servidor que lo inicia. */
  oauthStartPath?: string;
  /** Cómo sabemos que se llega al sistema (la API de A3ERP es un servicio dentro de la red de MANSERA). */
  transportNote: string;
  authSummary: string;
  howTo: string[];
  fields: FieldDef[];
  docs: DocLink[];
  /** Endpoint documentado para comprobar que las credenciales sirven (solo lectura). */
  testEndpoint?: string;
  /** Límites y comportamiento documentados. */
  limits: string[];
  /** Lo que NO sabemos todavía y a quién se pregunta. */
  unknown: string[];
};

const D = "2026-10-13";

export const CONNECTOR_SPECS: Record<ConnectorApp, ConnectorSpec> = {
  trello: {
    app: "trello",
    name: "Trello",
    status: "documentado",
    transport: "cloud",
    credentialsIn: "plataforma",
    transportNote: "API en la nube: se llama directamente desde el servidor de la aplicación.",
    authSummary: "Clave de API (key) + token de usuario (token), enviados en cada petición. OAuth 1.0 es una alternativa.",
    howTo: [
      "Entra en la administración de Power-Ups de Trello (trello.com/power-ups/admin), crea o abre un Power-Up y, en su pestaña de clave de API («API Key» / «Trello Auth»), genera la clave.",
      "Con esa clave, autoriza una cuenta de servicio de MANSERA (no una personal) abriendo: https://trello.com/1/authorize?expiration=never&scope=read&response_type=token&name=MANSERA&key=TU_CLAVE y copia el token. Empieza con permiso de solo lectura (scope=read); «write» se pedirá cuando existan propuestas de escritura.",
      "Opcional: el «secreto» de la aplicación (misma pestaña) sirve para verificar la firma de los webhooks.",
    ],
    fields: [
      { key: "apiKey", label: "Clave de API (key)", secret: false, required: true, placeholder: "32 caracteres", help: "Identifica la aplicación; en la documentación de Trello puede ser pública.", rule: { min: 16, max: 64, pattern: "^[A-Za-z0-9]+$", patternMessage: "Solo letras y números" } },
      { key: "token", label: "Token de usuario (token)", secret: true, required: true, help: "Es la credencial que da acceso a los datos. Se guarda cifrado y no se vuelve a mostrar.", rule: { min: 20, max: 400, pattern: "^[!#-~]+$", patternMessage: "Solo caracteres ASCII visibles, sin espacios ni comillas" } },
      { key: "apiSecret", label: "Secreto de la aplicación (opcional)", secret: true, required: false, help: "Solo para verificar la firma de los webhooks de Trello.", rule: { min: 16, max: 200, pattern: "^\\S+$", patternMessage: "No debe llevar espacios" } },
    ],
    docs: [{ label: "Trello · Autorización de la REST API", url: "https://developer.atlassian.com/cloud/trello/guides/rest-api/authorization", checkedAt: D }],
    testEndpoint: "GET https://api.trello.com/1/members/me?key=…&token=…",
    limits: ["Orientativo, de la ficha de integración (reverificar): 300 peticiones/10 s por clave y 100/10 s por token.", "Token revocado o caducado: la API responde 401 «invalid token»; hay que autorizar de nuevo."],
    unknown: ["Estructura real de tableros, listas y etiquetas de MANSERA (se levanta en M3).", "Plan de Trello contratado."],
  },

  sesame: {
    app: "sesame",
    name: "Sésame HR",
    status: "documentado",
    transport: "cloud",
    credentialsIn: "plataforma",
    transportNote: "API en la nube: se llama directamente desde el servidor de la aplicación.",
    authSummary: "Token Bearer en la cabecera Authorization. La URL base depende de la región de la cuenta.",
    howTo: [
      "Un administrador entra en app.sesametime.com → Configuración (Settings) → Integraciones (Integrations) → API.",
      "Pulsa «Crear token» (Generate token) y cópialo en el momento. Solo los administradores pueden generarlo.",
      "Crea un token propio para esta integración (no reutilices el de otra). Si se revoca, la aplicación recibirá 401.",
      "Anota la región de la cuenta: aparece en el mismo panel de tokens (app.sesametime.com/admin/configuration/integrations/api-tokens). Por defecto es «eu1».",
    ],
    fields: [
      { key: "region", label: "Región de la cuenta", secret: false, required: true, placeholder: "p. ej. eu1", help: "Va en la URL de la API. La especificación oficial indica «eu1» por defecto; la tuya aparece en el panel de tokens de Sésame.", rule: { min: 1, max: 20, pattern: "^[a-z0-9]([a-z0-9-]{0,18}[a-z0-9])?$", patternMessage: "Solo minúsculas, números y guiones (sin guion al principio ni al final)" } },
      { key: "token", label: "Token de API", secret: true, required: true, help: "Se guarda cifrado y no se vuelve a mostrar.", rule: { min: 20, max: 600, pattern: "^[!-~]+$", patternMessage: "Solo caracteres ASCII visibles, sin espacios" } },
    ],
    docs: [
      { label: "Sésame · Introducción", url: "https://apidocs.sesametime.com/introduction", checkedAt: "2026-10-14" },
      { label: "Sésame · Especificación OpenAPI", url: "https://apidocs.sesametime.com/openapi.json", checkedAt: "2026-10-14" },
      { label: "Sésame · Autenticación", url: "https://apidocs.sesametime.com/authentication", checkedAt: D },
      { label: "Sésame · Inicio rápido", url: "https://apidocs.sesametime.com/quickstart", checkedAt: D },
      { label: "Sésame · Límites de peticiones", url: "https://apidocs.sesametime.com/rate-limiting", checkedAt: D },
    ],
    testEndpoint: "GET https://api-{región}.sesametime.com/core/v3/info",
    limits: [
      "600 peticiones por minuto por empresa, compartidas entre todos los tokens (confirmado por Sésame a MANSERA el 2026-10-15; su web decía 1.000).",
      "La API es un complemento de pago: 54 €/mes (confirmado por Sésame).",
      "El token NO se puede limitar a solo lectura: da acceso también a escribir. Usa un token exclusivo para esta integración (la plataforma solo consulta) y revócalo si se compromete.",
      "Paginación con page y limit; la respuesta indica la última página (documentado).",
      "Webhooks (altas/bajas de empleados y fichajes) existen, pero se activan pidiéndolo a soporte de Sésame (documentado).",
      "Sésame avisa de que los endpoints actuales se irán sustituyendo por una versión nueva (changelog 2026): hay que vigilar los avisos de retirada.",
    ],
    unknown: ["Qué permisos tiene cada token: existe el error 403 «el token no tiene permisos», pero no se describe cómo se asignan.", "Si el acceso a la API es un complemento de pago: la documentación no lo menciona.", "Lista completa de regiones (solo consta «eu1» por defecto).", "Tamaño máximo de página (limit) no documentado."],
  },

  a3erp: {
    app: "a3erp",
    name: "A3ERP",
    status: "documentado",
    transport: "gateway",
    credentialsIn: "gateway",
    transportNote: "La API es un servicio de Windows instalado dentro de la red de MANSERA (escucha en el puerto de su Config.ini): no es accesible desde Internet, así que se alcanza a través del gateway.",
    authSummary: "POST /api/login con la cabecera Authorization: Basic base64(usuario:contraseña) → devuelve un token JWT, que se envía como Authorization: Bearer en el resto de peticiones.",
    howTo: [
      "Comprueba con el distribuidor de A3ERP que la versión es 14 o superior (el acta indica 15.0.0.0) y que está instalado el diccionario «JNCAPI» (sin él la API no funciona).",
      "Verifica que el servicio de la API está registrado en Windows y responde: GET /api debe devolver 401 (eso indica que está bien instalado).",
      "Pide un usuario de A3ERP dedicado a la integración, con los mínimos permisos (lectura primero).",
      "Anota la dirección y el puerto del servicio (están en su fichero Config.ini).",
      "Estos datos NO se escriben en la plataforma: se introducen al instalar el gateway en la red de MANSERA y quedan cifrados en ese equipo.",
    ],
    fields: [
      { key: "baseUrl", label: "Dirección del servicio de la API", secret: false, required: true, placeholder: "https://servidor-a3:puerto", help: "Servidor y puerto del servicio (Config.ini). No incluyas usuario ni contraseña.", rule: { min: 8, max: 200, url: true } },
      { key: "username", label: "Usuario de A3ERP", secret: true, required: true, help: "Usuario de integración. Se guarda cifrado en el gateway.", rule: { min: 1, max: 100 } },
      { key: "password", label: "Contraseña", secret: true, required: true, help: "Se guarda cifrada en el gateway y no sale de la red de MANSERA.", rule: { min: 1, max: 200 } },
    ],
    docs: [
      { label: "A3ERP API · Introducción", url: "https://a3erpapi.appcloud.es/introduccion.md", checkedAt: D },
      { label: "A3ERP API · Autenticación (login)", url: "https://a3erpapi.appcloud.es/api/validacion.md", checkedAt: D },
      { label: "A3ERP API · Instalación", url: "https://a3erpapi.appcloud.es/inicio-rapido/instalacion.md", checkedAt: D },
      { label: "Wolters Kluwer · a3ERP Link API", url: "https://www.wolterskluwer.com/es-es/solutions/a3erp/link-api", checkedAt: D },
    ],
    testEndpoint: "POST {baseUrl}/api/login (Authorization: Basic …)",
    limits: ["El token JWT caduca (la duración no está documentada); no hay endpoint de refresco: se repite el login al recibir 401.", "Paginación con Page (desde 1) y PageSize; máximo no documentado."],
    unknown: ["Licencia o coste de la API y si MANSERA la tiene instalada (Q3).", "Si HTTP o HTTPS y qué certificado (no documentado).", "Permisos que necesita el usuario de integración.", "Duración del token.", "Un tercero (Chift) afirma que A3ERP no tiene API pública: lo contradice la documentación oficial; se confirma en la instalación de MANSERA."],
  },

  a3nomina: {
    app: "a3nomina",
    name: "a3innuva Nómina",
    status: "documentado",
    transport: "cloud",
    credentialsIn: "plataforma",
    transportNote: "Servicio en la nube de Wolters Kluwer: se llama directamente desde el servidor de la aplicación (sin gateway).",
    oauthStartPath: "/api/oauth/a3nomina/start",
    authSummary: "OAuth 2.0 (Authorization Code) con la cuenta Wolters Kluwer Account (WKA) de un usuario de MANSERA + cabecera Ocp-Apim-Subscription-Key de la suscripción Conectia. El token dura 60 min y se renueva con un refresh token (30 días).",
    howTo: [
      "Contratar la suscripción «Conectia» de a3innuva Nómina con Wolters Kluwer (o el distribuidor): da la clave de suscripción del portal a3developers.",
      "Solicitar a Wolters Kluwer, mediante su formulario, el cliente OAuth propio de MANSERA (client_id y client_secret) con esta dirección de retorno: https://<dominio de la plataforma>/api/oauth/a3nomina/callback.",
      "Guardar aquí el client_id, el client_secret y la clave de suscripción.",
      "Después, pulsa «Conectar con Wolters Kluwer» e inicia sesión con una cuenta WKA de MANSERA que tenga acceso a a3innuva Nómina (solo las empresas necesarias). La autorización se renueva sola; si pasan 30 días sin uso, habrá que volver a conectar.",
    ],
    fields: [
      { key: "clientId", label: "Client ID (cliente OAuth)", secret: false, required: true, help: "Identificador del cliente OAuth que Wolters Kluwer crea para MANSERA.", rule: { min: 3, max: 200, pattern: "^[A-Za-z0-9._-]+$", patternMessage: "Solo letras, números, puntos, guiones y guiones bajos" } },
      { key: "clientSecret", label: "Client secret", secret: true, required: true, help: "Secreto del cliente OAuth. Se guarda cifrado y no se vuelve a mostrar.", rule: { min: 8, max: 400, pattern: "^\\S+$", patternMessage: "No debe llevar espacios" } },
      { key: "subscriptionKey", label: "Clave de suscripción (Conectia)", secret: true, required: true, help: "Clave principal de la suscripción en el portal a3developers (cabecera Ocp-Apim-Subscription-Key). Se guarda cifrada.", rule: { min: 16, max: 200, pattern: "^\\S+$", patternMessage: "No debe llevar espacios" } },
    ],
    docs: [
      { label: "a3developers · a3innuva Nómina: cómo empezar", url: "https://a3developers.wolterskluwer.es/doc/a3innuva-n%C3%B3mina/como-empezar/", checkedAt: "2026-10-14" },
      { label: "a3developers · Autenticación OAuth 2.0", url: "https://a3developers.wolterskluwer.es/doc/a3innuva-n%C3%B3mina/OAuth/", checkedAt: "2026-10-14" },
      { label: "a3developers · Endpoints", url: "https://a3developers.wolterskluwer.es/doc/a3innuva-n%C3%B3mina/endpoints", checkedAt: "2026-10-14" },
      { label: "a3developers · Límites", url: "https://a3developers.wolterskluwer.es/doc/a3innuva-n%C3%B3mina/limites", checkedAt: "2026-10-14" },
    ],
    testEndpoint: "Tras autorizar con WKA: GET de las empresas a las que tiene acceso el usuario (endpoint de «Seguridad»)",
    limits: [
      "Suscripción Conectia: 3.000 peticiones/min y 150.000/día (documentado); otros planes: S 100/min, M 1.000/min, L 3.000/min.",
      "Al superar el límite: HTTP 429 con cabecera Retry-After (documentado).",
      "Token de acceso: 60 min; refresh token: 30 días (si no se usa en 30 días hay que volver a autorizar).",
      "Solo TLS 1.2 o superior; la dirección de retorno debe ser https.",
    ],
    unknown: [
      "Coste de Conectia y si MANSERA ya la tiene (un tercero cita «desde 13,5 €/mes»: sin confirmar).",
      "URL base de la API y rutas exactas: están en un Swagger del portal a3developers que exige acceso.",
      "Paginación (hay una página de paginación en el portal que no se ha podido leer).",
      "Entorno de pruebas (empresa de pruebas) para no tocar la nómina real.",
      "Si el cliente OAuth puede limitarse a SOLO LECTURA: el scope documentado (WK.ES.A3EquipoContex) no distingue lectura de escritura.",
    ],
  },

  pgmwin: {
    app: "pgmwin",
    name: "PGMWin",
    status: "pendiente_documentar",
    transport: "gateway",
    credentialsIn: "gateway",
    transportNote: "Alojado en la nube de EGEOtec, con base de datos SQL Server (confirmado por MANSERA el 2026-10-15). La vía de acceso está por decidir (ADR-0015).",
    authSummary: "Pendiente de documentar el formato técnico. EGEOtec confirma dos vías: (1) su API de integración, módulo aparte (~1.150 € de partida) que habría que adaptar a medida, con lectura y escritura; (2) lectura directa de la base de datos SQL Server con un usuario de integración de permisos limitados, que autorizan sin problema. Facilitan documentación y un entorno de pruebas.",
    howTo: [
      "Pedir a EGEOtec la documentación técnica de la vía elegida y el entorno de pruebas (sin datos reales), que han confirmado que facilitan.",
      "Si se elige la lectura SQL: pedir un usuario de solo lectura limitado a vistas acordadas (no a tablas internas), y cómo se conecta de forma segura a su nube (lista de IP permitidas, VPN o similar).",
      "Si se elige la API: pedir presupuesto y plazo del desarrollo a medida (lectura de OT, activos, preventivos y partes; escritura de OT más adelante).",
      "Con la documentación, se activa aquí el formulario: la base segura de credenciales ya está construida.",
    ],
    fields: [],
    docs: [],
    limits: ["EGEOtec indica que, al actualizar de versión, la conexión se mantiene y avisan de los cambios."],
    unknown: [
      "Documentación técnica de la API o del esquema/vistas de la base de datos (pendiente de que EGEOtec la envíe).",
      "Coste y plazo del desarrollo a medida de la API (solo hay un punto de partida de ~1.150 € sin desarrollos).",
      "Cómo se accede de forma segura al SQL Server de su nube (IP permitidas, VPN, réplica de lectura).",
      "Qué versión exacta y qué módulos tiene MANSERA contratados.",
    ],
  },
};

/** Orden en el que se muestran las conexiones. */
export const connectorList = (): ConnectorSpec[] => CONNECTOR_APPS.map((a) => CONNECTOR_SPECS[a]);

/* ───────── Validación (en servidor; nunca se confía en el navegador) ───────── */
function fieldSchema(f: FieldDef): z.ZodType<string | undefined> {
  let s = z.string().trim().min(f.rule.min, `«${f.label}»: mínimo ${f.rule.min} caracteres`).max(f.rule.max, `«${f.label}»: máximo ${f.rule.max} caracteres`);
  if (f.rule.pattern) s = s.regex(new RegExp(f.rule.pattern), `«${f.label}»: ${f.rule.patternMessage ?? "formato no válido"}`);
  let out: z.ZodType<string> = s;
  if (f.rule.url) {
    out = s.refine((v) => {
      try {
        const u = new URL(v);
        // Sin credenciales en la URL, sin parámetros ni fragmentos; solo http(s).
        return (u.protocol === "https:" || u.protocol === "http:") && !u.username && !u.password && !u.search && !u.hash && u.pathname === "/";
      } catch {
        return false;
      }
    }, `«${f.label}»: usa solo el servidor y el puerto, p. ej. https://servidor:puerto (sin usuario, ruta ni parámetros)`)
      // Se guarda normalizado (sin barra final): así `${baseUrl}/api` nunca queda con doble barra.
      .transform((v) => new URL(v).origin);
  }
  return f.required ? out : z.union([z.literal("").transform(() => undefined), out]).optional();
}

export type CredentialInput = Record<string, unknown>;
export type CredentialResult =
  | { ok: true; config: Record<string, string>; secrets: Record<string, string> }
  | { ok: false; errors: string[] };

/** Valida lo que llega del formulario de la plataforma y lo separa en configuración visible y secretos cifrados. */
export function validateCredentials(app: ConnectorApp, input: CredentialInput): CredentialResult {
  const spec = CONNECTOR_SPECS[app];
  if (spec.credentialsIn === "gateway" && spec.status === "documentado") {
    return { ok: false, errors: [`Las credenciales de ${spec.name} se configuran solo en el gateway de la red de MANSERA, nunca en la plataforma.`] };
  }
  return validateFields(app, input);
}

/** Validación para el gateway (mismas reglas), usada al instalarlo con la configuración local. */
export function validateGatewayCredentials(app: ConnectorApp, input: CredentialInput): CredentialResult {
  if (CONNECTOR_SPECS[app].credentialsIn !== "gateway") return { ok: false, errors: [`${CONNECTOR_SPECS[app].name} no se configura en el gateway.`] };
  return validateFields(app, input);
}

function validateFields(app: ConnectorApp, input: CredentialInput): CredentialResult {
  const spec = CONNECTOR_SPECS[app];
  if (spec.status === "pendiente_documentar" || spec.fields.length === 0) {
    return { ok: false, errors: [`${spec.name} está pendiente de documentar: todavía no se pueden guardar credenciales.`] };
  }
  const known = new Set(spec.fields.map((f) => f.key));
  const unknownKeys = Object.keys(input).filter((k) => !known.has(k));
  if (unknownKeys.length) return { ok: false, errors: [`Campos no permitidos: ${unknownKeys.join(", ")}`] };

  const errors: string[] = [];
  const config: Record<string, string> = {};
  const secrets: Record<string, string> = {};
  for (const f of spec.fields) {
    const raw = input[f.key];
    const r = fieldSchema(f).safeParse(typeof raw === "string" ? raw : raw == null ? "" : String(raw));
    if (!r.success) { errors.push(r.error.issues[0]?.message ?? `«${f.label}» no es válido`); continue; }
    if (r.data === undefined) continue;
    (f.secret ? secrets : config)[f.key] = r.data;
  }
  return errors.length ? { ok: false, errors } : { ok: true, config, secrets };
}

/** Se puede guardar en la plataforma si está documentado, tiene campos y sus credenciales no son del gateway. */
export const isConfigurable = (app: ConnectorApp): boolean => {
  const s = CONNECTOR_SPECS[app];
  return s.status === "documentado" && s.fields.length > 0 && s.credentialsIn === "plataforma";
};

export const ConnectorAppSchema = z.enum(CONNECTOR_APPS);
