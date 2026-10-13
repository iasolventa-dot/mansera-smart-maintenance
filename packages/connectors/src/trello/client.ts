import { z } from "zod";
import { ConnectorError, errorFromStatus } from "../errors";

/**
 * Cliente de SOLO LECTURA de la API REST de Trello (https://developer.atlassian.com/cloud/trello/rest/).
 * - Autenticación por cabecera `Authorization: OAuth oauth_consumer_key="…", oauth_token="…"` (documentada por Atlassian),
 *   así las credenciales no viajan en la URL y no pueden acabar en registros de URLs.
 * - Toda respuesta se valida con Zod: si Trello cambia el formato, el conector falla de forma controlada.
 * ESTADO: según documentación oficial (2026-10-13), probado con datos de ejemplo anonimizados. Sin verificar con la cuenta de MANSERA (M1).
 */
type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;
export type TrelloCredentials = { apiKey: string; token: string };

const API = "https://api.trello.com/1";
const ID = z.string().regex(/^[0-9a-f]{24}$/, "identificador de Trello no válido");

export const TrelloList = z.object({ id: ID, name: z.string(), closed: z.boolean(), pos: z.number() });
export type TrelloList = z.infer<typeof TrelloList>;

/** Valor de un campo personalizado: Trello envía los números como texto (documentado). */
const CustomFieldValue = z.object({
  text: z.string().optional(),
  number: z.string().optional(),
  date: z.string().optional(),
  checked: z.string().optional(),
}).partial();
export const TrelloCustomFieldItem = z.object({ idCustomField: ID, value: CustomFieldValue.nullable().optional(), idValue: ID.nullable().optional() });

export const TrelloCard = z.object({
  id: ID,
  name: z.string(),
  idList: ID,
  closed: z.boolean(),
  due: z.string().nullable(),
  dateLastActivity: z.string(),
  idMembers: z.array(ID),
  labels: z.array(z.object({ id: ID, name: z.string(), color: z.string().nullable() })),
  shortUrl: z.string().url(),
  customFieldItems: z.array(TrelloCustomFieldItem).optional(),
});
export type TrelloCard = z.infer<typeof TrelloCard>;

export const TrelloCustomField = z.object({
  id: ID,
  name: z.string(),
  type: z.enum(["text", "number", "date", "checkbox", "list"]),
  options: z.array(z.object({ id: ID, value: z.object({ text: z.string() }) })).optional(),
});
export type TrelloCustomField = z.infer<typeof TrelloCustomField>;

export const TrelloMember = z.object({ id: ID, fullName: z.string() });
export type TrelloMember = z.infer<typeof TrelloMember>;

export type BoardSnapshot = { lists: TrelloList[]; cards: TrelloCard[]; customFields: TrelloCustomField[]; members: TrelloMember[]; fetchedAt: string };

const TIMEOUT_MS = 15_000;

export function createTrelloClient(creds: TrelloCredentials, fetchImpl: FetchLike = fetch) {
  const auth = `OAuth oauth_consumer_key="${creds.apiKey}", oauth_token="${creds.token}"`;

  async function get<T>(path: string, schema: z.ZodType<T>): Promise<T> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetchImpl(`${API}${path}`, { method: "GET", headers: { Authorization: auth, Accept: "application/json" }, redirect: "error", cache: "no-store", signal: ctrl.signal });
    } catch (e) {
      const aborted = e instanceof DOMException && e.name === "AbortError";
      throw new ConnectorError("transient", aborted ? "Trello tardó demasiado en responder." : "No se pudo contactar con Trello.");
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) throw errorFromStatus("Trello", res.status, res.headers.get("retry-after"));
    const parsed = schema.safeParse(await res.json().catch(() => undefined));
    if (!parsed.success) throw new ConnectorError("validation", "Trello devolvió datos con un formato inesperado (¿cambio de versión de la API?).");
    return parsed.data;
  }

  return {
    /** Comprobación de solo lectura de las credenciales. */
    me: () => get("/members/me?fields=fullName", z.object({ id: ID, fullName: z.string() })),
    boards: () => get("/members/me/boards?fields=name,closed&filter=open", z.array(z.object({ id: ID, name: z.string(), closed: z.boolean() }))),
    /** Todo lo necesario de un tablero en 4 peticiones (límite documentado: 100 peticiones/10 s por token). */
    async board(boardId: string): Promise<BoardSnapshot> {
      const id = ID.parse(boardId);
      const [lists, cards, customFields, members] = await Promise.all([
        get(`/boards/${id}/lists?filter=open&fields=name,closed,pos`, z.array(TrelloList)),
        get(`/boards/${id}/cards?filter=open&customFieldItems=true&fields=name,idList,closed,due,dateLastActivity,idMembers,labels,shortUrl`, z.array(TrelloCard)),
        get(`/boards/${id}/customFields`, z.array(TrelloCustomField)),
        get(`/boards/${id}/members?fields=fullName`, z.array(TrelloMember)),
      ]);
      return { lists, cards, customFields, members, fetchedAt: new Date().toISOString() };
    },
  };
}
