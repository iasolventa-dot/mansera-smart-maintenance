import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ConnectorError } from "../errors";
import { TrelloCard, TrelloCustomField, TrelloList, TrelloMember, createTrelloClient, type BoardSnapshot } from "./client";
import { TrelloOfferMapping, mapOffers } from "./mapping";

// Datos de ejemplo INVENTADOS (formato documentado de Trello); no son de MANSERA.
const sample = JSON.parse(readFileSync(fileURLToPath(new URL("../../fixtures/trello/board.sample.json", import.meta.url)), "utf8"));
const snap: BoardSnapshot = {
  lists: z.array(TrelloList).parse(sample.lists),
  cards: z.array(TrelloCard).parse(sample.cards),
  customFields: z.array(TrelloCustomField).parse(sample.customFields),
  members: z.array(TrelloMember).parse(sample.members),
  fetchedAt: sample.fetchedAt,
};
const id = (n: number) => n.toString(16).padStart(24, "0");
const mapping = TrelloOfferMapping.parse({
  boardId: id(0xb0),
  stageByList: { [id(0xa1)]: "borrador", [id(0xa2)]: "enviada", [id(0xa3)]: "negociacion", [id(0xa4)]: "ganada" },
  fields: { amount: id(0xc1), client: id(0xc2), probability: id(0xc3) },
});
// Relleno generado: no son credenciales reales.
const creds = { apiKey: "k".repeat(32), token: "t".repeat(64) };

describe("mapeo Trello → ofertas (datos de ejemplo)", () => {
  const r = mapOffers(snap, mapping);
  it("las tarjetas completas se convierten en ofertas válidas y trazables", () => {
    expect(r.offers.map((o) => o.title).sort()).toEqual(["Mantenimiento climatización nave 3", "Revisión PCI anual"]);
    const o = r.offers.find((x) => x.title.startsWith("Mantenimiento"))!;
    expect(o).toMatchObject({ amountEur: 12500.5, client: "Cliente Ejemplo A", stage: "enviada", probability: 60, owner: "Persona Ejemplo Uno", dueDate: "2026-11-20", source: "trello" });
  });
  it("nunca inventa datos: lo que falta queda como incompleto con el motivo", () => {
    expect(r.incomplete.find((c) => c.title === "Oferta sin importe")?.missing).toEqual(["importe"]);
    expect(r.incomplete.find((c) => c.title.startsWith("Tarjeta sin responsable"))?.missing).toEqual(["responsable (miembro de la tarjeta)", "fecha límite"]);
  });
  it("las listas no mapeadas se ignoran y se informan", () => {
    expect(r.unmappedLists).toEqual(["Archivo"]);
    expect(JSON.stringify(r)).not.toContain("Tarjeta en lista no mapeada");
  });
  it("sin campos configurados, todo queda incompleto y lo dice", () => {
    const bare = mapOffers(snap, TrelloOfferMapping.parse({ boardId: id(0xb0), stageByList: mapping.stageByList }));
    expect(bare.offers).toEqual([]);
    expect(bare.incomplete[0]?.missing).toContain("importe (campo sin configurar)");
  });
});

describe("cliente de Trello (solo lectura)", () => {
  const ok = (body: unknown) => vi.fn(async (_u: string, _i?: RequestInit) => new Response(JSON.stringify(body), { status: 200 }));
  it("autentica por cabecera, nunca con credenciales en la URL", async () => {
    const f = ok({ id: id(1), fullName: "X" });
    await createTrelloClient(creds, f).me();
    const [url, init] = f.mock.calls[0]!;
    expect(url).not.toContain(creds.token);
    expect(url).not.toContain(creds.apiKey);
    expect((init!.headers as Record<string, string>).Authorization).toBe(`OAuth oauth_consumer_key="${creds.apiKey}", oauth_token="${creds.token}"`);
    expect(init!.method).toBe("GET");
  });
  it("lee un tablero completo y valida el formato", async () => {
    const f = vi.fn(async (u: string, _i?: RequestInit) => {
      const body = u.includes("/lists") ? sample.lists : u.includes("/cards") ? sample.cards : u.includes("/customFields") ? sample.customFields : sample.members;
      return new Response(JSON.stringify(body), { status: 200 });
    });
    const s = await createTrelloClient(creds, f).board(id(0xb0));
    expect(f).toHaveBeenCalledTimes(4);
    expect(mapOffers(s, mapping).offers).toHaveLength(2);
  });
  it("un identificador de tablero manipulado no llega a la red", async () => {
    const f = ok([]);
    await expect(createTrelloClient(creds, f).board("../../members/me")).rejects.toThrow();
    expect(f).not.toHaveBeenCalled();
  });
  it("errores tipados: 401 auth, 429 con Retry-After, 503 indisponible, formato inesperado", async () => {
    const st = (s: number, h: Record<string, string> = {}) => vi.fn(async (_u: string, _i?: RequestInit) => new Response("{}", { status: s, headers: h }));
    await expect(createTrelloClient(creds, st(401)).me()).rejects.toMatchObject({ kind: "auth" });
    await expect(createTrelloClient(creds, st(429, { "retry-after": "7" })).me()).rejects.toMatchObject({ kind: "rate_limited", retryAfterSec: 7, retryable: true });
    await expect(createTrelloClient(creds, st(503)).me()).rejects.toMatchObject({ kind: "unavailable" });
    await expect(createTrelloClient(creds, ok({ inesperado: true })).me()).rejects.toMatchObject({ kind: "validation" });
  });
  it("un fallo de red es transitorio y su mensaje no contiene credenciales", async () => {
    const f = vi.fn(async (_u: string, _i?: RequestInit): Promise<Response> => { throw new TypeError(`fetch failed ${creds.token}`); });
    const err = await createTrelloClient(creds, f).me().catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ConnectorError);
    expect((err as ConnectorError).kind).toBe("transient");
    expect((err as ConnectorError).message).not.toContain(creds.token);
  });
});
