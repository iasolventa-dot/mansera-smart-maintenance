import { z } from "zod";
import { ConnectorError } from "../errors";
import { getJson, type FetchLike } from "../http";
import { withRetry, type CallPolicy } from "../policy";

/**
 * Cliente de SOLO LECTURA de la API REST de Trello (https://developer.atlassian.com/cloud/trello/rest/).
 * - Autenticación por cabecera `Authorization: OAuth oauth_consumer_key="…", oauth_token="…"` (documentada por Atlassian),
 *   así las credenciales no viajan en la URL y no pueden acabar en registros de URLs.
 * - Toda respuesta se valida con Zod: si Trello cambia el formato, el conector falla de forma controlada.
 * ESTADO: según documentación oficial (2026-10-13), probado con datos de ejemplo anonimizados. Sin verificar con la cuenta de MANSERA (M1).
 */
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
  due: z.iso.datetime({ offset: true }).nullable(),
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
  /** Tipos documentados: text, number, date, checkbox, list. Se acepta cualquiera para que un tipo nuevo no rompa la lectura. */
  type: z.string(),
  options: z.array(z.object({ id: ID, value: z.object({ text: z.string() }) })).optional(),
});
export type TrelloCustomField = z.infer<typeof TrelloCustomField>;

export const TrelloMember = z.object({ id: ID, fullName: z.string() });
export type TrelloMember = z.infer<typeof TrelloMember>;

export type BoardSnapshot = { lists: TrelloList[]; cards: TrelloCard[]; customFields: TrelloCustomField[]; members: TrelloMember[]; fetchedAt: string };

/** Credenciales con formato seguro para ir en una cabecera (sin comillas, espacios ni saltos de línea). */
const KEY_RE = /^[A-Za-z0-9]{16,64}$/;
const TOKEN_RE = /^[!-~]{20,400}$/;

export function createTrelloClient(creds: TrelloCredentials, fetchImpl: FetchLike = fetch, policy: CallPolicy = {}) {
  if (!KEY_RE.test(creds.apiKey) || !TOKEN_RE.test(creds.token) || creds.token.includes('"')) {
    throw new ConnectorError("validation", "Las credenciales de Trello no tienen un formato válido.");
  }
  const headers = { Authorization: `OAuth oauth_consumer_key="${creds.apiKey}", oauth_token="${creds.token}"`, Accept: "application/json" };

  async function get<T>(path: string, schema: z.ZodType<T>): Promise<T> {
    const body = await withRetry(async () => {
      await policy.limiter?.take();
      return getJson(fetchImpl, `${API}${path}`, { app: "Trello", headers });
    }, { retries: 0, ...policy.retry });
    const parsed = schema.safeParse(body);
    if (!parsed.success) throw new ConnectorError("validation", "Trello devolvió datos con un formato inesperado (¿cambio de versión de la API?).");
    return parsed.data;
  }

  return {
    /** Comprobación de solo lectura de las credenciales. */
    me: () => get("/members/me?fields=fullName", z.object({ id: ID, fullName: z.string() })),
    boards: () => get("/members/me/boards?fields=name,closed&filter=open", z.array(z.object({ id: ID, name: z.string(), closed: z.boolean() }))),
    /** Todo lo necesario de un tablero en 4 peticiones (límite documentado: 100 peticiones/10 s por token). */
    async board(boardId: string): Promise<BoardSnapshot> {
      const id = ID.safeParse(boardId);
      if (!id.success) throw new ConnectorError("validation", "El identificador del tablero de Trello no es válido.");
      const [lists, cards, customFields, members] = await Promise.all([
        get(`/boards/${id.data}/lists?filter=open&fields=name,closed,pos`, z.array(TrelloList)),
        get(`/boards/${id.data}/cards?filter=open&customFieldItems=true&fields=name,idList,closed,due,dateLastActivity,idMembers,labels,shortUrl`, z.array(TrelloCard)),
        get(`/boards/${id.data}/customFields`, z.array(TrelloCustomField)),
        get(`/boards/${id.data}/members?fields=fullName`, z.array(TrelloMember)),
      ]);
      return { lists, cards, customFields, members, fetchedAt: new Date().toISOString() };
    },
  };
}
