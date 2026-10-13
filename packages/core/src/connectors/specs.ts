import { z } from "zod";

/**
 * Qué exige cada sistema para conectarse. Fuente ÚNICA para: el formulario de «Conexiones», la validación en
 * servidor, el manual y los scripts de spike. Solo lleva lo que la documentación OFICIAL afirma; lo demás
 * se declara en `unknown` y queda como pendiente. Fecha de consulta de la documentación: 2026-10-13.
 * Un sistema sin documentación es `pendiente_documentar`: no tiene formulario, pero la base segura
 * (Vault + permisos + auditoría) es genérica y sirve en cuanto se documente.
 */
export const CONNECTOR_APPS = ["pgmwin", "a3erp", "trello", "sesame"] as const;
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
    transportNote: "API en la nube: se llama directamente desde el servidor de la aplicación.",
    authSummary: "Clave de API (key) + token de usuario (token), enviados en cada petición. OAuth 1.0 es una alternativa.",
    howTo: [
      "Entra en la administración de Power-Ups de Trello (trello.com/power-ups/admin), crea o abre un Power-Up y, en su pestaña de clave de API («API Key» / «Trello Auth»), genera la clave.",
      "Con esa clave, autoriza una cuenta de servicio de MANSERA (no una personal) abriendo: https://trello.com/1/authorize?expiration=never&scope=read&response_type=token&name=MANSERA&key=TU_CLAVE y copia el token. Empieza con permiso de solo lectura (scope=read); «write» se pedirá cuando existan propuestas de escritura.",
      "Opcional: el «secreto» de la aplicación (misma pestaña) sirve para verificar la firma de los webhooks.",
    ],
    fields: [
      { key: "apiKey", label: "Clave de API (key)", secret: false, required: true, placeholder: "32 caracteres", help: "Identifica la aplicación; en la documentación de Trello puede ser pública.", rule: { min: 16, max: 64, pattern: "^[A-Za-z0-9]+$", patternMessage: "Solo letras y números" } },
      { key: "token", label: "Token de usuario (token)", secret: true, required: true, help: "Es la credencial que da acceso a los datos. Se guarda cifrado y no se vuelve a mostrar.", rule: { min: 20, max: 400, pattern: "^\\S+$", patternMessage: "No debe llevar espacios" } },
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
    transportNote: "API en la nube: se llama directamente desde el servidor de la aplicación.",
    authSummary: "Token Bearer en la cabecera Authorization. La URL base depende de la región de la cuenta.",
    howTo: [
      "Un administrador entra en app.sesametime.com → Configuración (Settings) → Integraciones (Integrations) → API.",
      "Pulsa «Crear token» (Generate token) y cópialo en el momento. Solo los administradores pueden generarlo.",
      "Crea un token propio para esta integración (no reutilices el de otra). Si se revoca, la aplicación recibirá 401.",
      "Anota la región de la cuenta: forma parte de la dirección (https://api-{región}.sesametime.com).",
    ],
    fields: [
      { key: "region", label: "Región de la cuenta", secret: false, required: true, placeholder: "p. ej. eu1", help: "Va en la URL de la API. La documentación no enumera los valores válidos: confírmalo con Sésame o en la sección API de la cuenta.", rule: { min: 2, max: 20, pattern: "^[a-z0-9-]+$", patternMessage: "Solo minúsculas, números y guiones" } },
      { key: "token", label: "Token de API", secret: true, required: true, help: "Se guarda cifrado y no se vuelve a mostrar.", rule: { min: 20, max: 600, pattern: "^\\S+$", patternMessage: "No debe llevar espacios" } },
    ],
    docs: [
      { label: "Sésame · Autenticación", url: "https://apidocs.sesametime.com/authentication", checkedAt: D },
      { label: "Sésame · Inicio rápido", url: "https://apidocs.sesametime.com/quickstart", checkedAt: D },
      { label: "Sésame · Límites de peticiones", url: "https://apidocs.sesametime.com/rate-limiting", checkedAt: D },
    ],
    testEndpoint: "GET https://api-{región}.sesametime.com/core/v3/info",
    limits: ["1.000 peticiones por minuto por empresa, compartidas entre todos los tokens (documentado)."],
    unknown: ["Valores válidos de región (la documentación no los lista).", "Permisos/alcances del token (no descritos).", "Si el acceso a la API es un complemento de pago (Q4): la documentación consultada no lo menciona.", "Webhooks y paginación completa (no aparecen en el inicio rápido)."],
  },

  a3erp: {
    app: "a3erp",
    name: "A3ERP",
    status: "documentado",
    transport: "gateway",
    transportNote: "La API es un servicio de Windows instalado dentro de la red de MANSERA (escucha en el puerto de su Config.ini): no es accesible desde Internet, así que se alcanza a través del gateway.",
    authSummary: "POST /api/login con la cabecera Authorization: Basic base64(usuario:contraseña) → devuelve un token JWT, que se envía como Authorization: Bearer en el resto de peticiones.",
    howTo: [
      "Comprueba con el distribuidor de A3ERP que la versión es 14 o superior (el acta indica 15.0.0.0) y que está instalado el diccionario «JNCAPI» (sin él la API no funciona).",
      "Verifica que el servicio de la API está registrado en Windows y responde: GET /api debe devolver 401 (eso indica que está bien instalado).",
      "Pide un usuario de A3ERP dedicado a la integración, con los mínimos permisos (lectura primero).",
      "Anota la dirección y el puerto del servicio (están en su fichero Config.ini).",
    ],
    fields: [
      { key: "baseUrl", label: "Dirección del servicio de la API", secret: false, required: true, placeholder: "https://servidor-a3:puerto", help: "Servidor y puerto del servicio (Config.ini). No incluyas usuario ni contraseña.", rule: { min: 8, max: 200, url: true } },
      { key: "username", label: "Usuario de A3ERP", secret: true, required: true, help: "Usuario de integración. Se guarda cifrado.", rule: { min: 1, max: 100 } },
      { key: "password", label: "Contraseña", secret: true, required: true, help: "Se guarda cifrada y no se vuelve a mostrar.", rule: { min: 1, max: 200 } },
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

  pgmwin: {
    app: "pgmwin",
    name: "PGMWin",
    status: "pendiente_documentar",
    transport: "gateway",
    transportNote: "Previsiblemente en la red local de MANSERA (por confirmar, Q1), por lo que se alcanzaría a través del gateway.",
    authSummary: "Pendiente de documentar: no se ha encontrado ninguna documentación pública de API, webservice ni integración de PGMWin (búsquedas del 2026-10-13).",
    howTo: [
      "Pregunta a EGEOtec (Q2) qué mecanismo oficial de integración ofrece PGMWin 26.0 (API/webservice, acceso SQL de lectura o ficheros), con su coste y requisitos.",
      "Cuando respondan, se documenta aquí el formato de conexión y se activa el formulario: la base segura de credenciales ya está construida.",
    ],
    fields: [],
    docs: [],
    limits: [],
    unknown: ["Mecanismo de integración (API/webservice, SQL, ficheros).", "Autenticación y formato de conexión.", "Licencia, entorno de pruebas y si admite escritura (plan B: solo lectura + enlace directo).", "Ubicación del servidor (Q1)."],
  },
};

/** Orden en el que se muestran las conexiones. */
export const connectorList = (): ConnectorSpec[] => CONNECTOR_APPS.map((a) => CONNECTOR_SPECS[a]);

/* ───────── Validación (en servidor; nunca se confía en el navegador) ───────── */
function fieldSchema(f: FieldDef): z.ZodType<string | undefined> {
  let s = z.string().trim().min(f.rule.min, `«${f.label}»: mínimo ${f.rule.min} caracteres`).max(f.rule.max, `«${f.label}»: máximo ${f.rule.max} caracteres`);
  if (f.rule.pattern) s = s.regex(new RegExp(f.rule.pattern), `«${f.label}»: ${f.rule.patternMessage ?? "formato no válido"}`);
  if (f.rule.url) {
    s = s.refine((v) => {
      try {
        const u = new URL(v);
        // Sin credenciales en la URL, sin parámetros ni fragmentos; solo http(s).
        return (u.protocol === "https:" || u.protocol === "http:") && !u.username && !u.password && !u.search && !u.hash && u.pathname === "/";
      } catch {
        return false;
      }
    }, `«${f.label}»: usa solo el servidor y el puerto, p. ej. https://servidor:puerto (sin usuario, ruta ni parámetros)`);
  }
  return f.required ? s : z.union([z.literal("").transform(() => undefined), s]).optional();
}

export type CredentialInput = Record<string, unknown>;
export type CredentialResult =
  | { ok: true; config: Record<string, string>; secrets: Record<string, string> }
  | { ok: false; errors: string[] };

/** Valida lo que llega del formulario y lo separa en configuración visible y secretos cifrados. */
export function validateCredentials(app: ConnectorApp, input: CredentialInput): CredentialResult {
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

/** Un conector solo admite guardar si está documentado y tiene campos. */
export const isConfigurable = (app: ConnectorApp): boolean => CONNECTOR_SPECS[app].status === "documentado" && CONNECTOR_SPECS[app].fields.length > 0;

export const ConnectorAppSchema = z.enum(CONNECTOR_APPS);
