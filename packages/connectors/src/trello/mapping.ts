import { z } from "zod";
import { Offer, OfferStage } from "@msm/core";
import type { BoardSnapshot, TrelloCard } from "./client";

/**
 * Mapeo Trello → ofertas (función pura, sin red). NO supone cómo organiza MANSERA sus tableros:
 * qué lista es cada etapa y qué campos personalizados guardan importe/cliente/probabilidad es CONFIGURACIÓN
 * que se levantará con MANSERA (pregunta E del cuestionario). Si falta un dato, la tarjeta se devuelve como
 * «incompleta» con el motivo; nunca se rellena con valores inventados (principio 5: IA/datos trazables).
 */
const ID = z.string().regex(/^[0-9a-f]{24}$/);
export const TrelloOfferMapping = z.object({
  boardId: ID,
  /** Lista de Trello → etapa comercial. Las listas no mapeadas se ignoran (y se informan). */
  stageByList: z.record(ID, OfferStage),
  /** Campos personalizados de Trello que contienen cada dato. */
  fields: z.object({ amount: ID.optional(), client: ID.optional(), probability: ID.optional() }).default({}),
});
export type TrelloOfferMapping = z.infer<typeof TrelloOfferMapping>;

export type IncompleteCard = { cardId: string; title: string; url: string; missing: string[] };
export type OffersResult = { offers: Offer[]; incomplete: IncompleteCard[]; unmappedLists: string[]; fetchedAt: string };

function fieldValue(card: TrelloCard, fieldId: string | undefined, snap: BoardSnapshot): string | null {
  if (!fieldId) return null;
  const item = card.customFieldItems?.find((i) => i.idCustomField === fieldId);
  if (!item) return null;
  if (item.idValue) {
    // Campo de tipo lista: el valor es el texto de la opción elegida.
    const def = snap.customFields.find((f) => f.id === fieldId);
    return def?.options?.find((o) => o.id === item.idValue)?.value.text ?? null;
  }
  const v = item.value;
  return v?.number ?? v?.text ?? v?.date ?? null;
}

/**
 * Número de un campo personalizado de tipo «number» (Trello lo envía como texto con punto decimal, documentado).
 * Un campo de texto NO se interpreta: «12.500» podría ser 12,5 o 12.500 €, y no se adivina.
 */
function numberField(card: TrelloCard, fieldId: string | undefined, snap: BoardSnapshot): number | "no_numerico" | null {
  if (!fieldId) return null;
  const def = snap.customFields.find((f) => f.id === fieldId);
  if (def && def.type !== "number") return "no_numerico";
  const raw = card.customFieldItems?.find((i) => i.idCustomField === fieldId)?.value?.number;
  if (raw == null || raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** Fecha (AAAA-MM-DD) en hora peninsular española: un vencimiento a las 00:30 del día 20 en Madrid es el día 20. */
const madridDate = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date(iso));

export function mapOffers(snap: BoardSnapshot, mapping: TrelloOfferMapping): OffersResult {
  const offers: Offer[] = [];
  const incomplete: IncompleteCard[] = [];
  const mapped = new Set(Object.keys(mapping.stageByList));
  const unmappedLists = snap.lists.filter((l) => !mapped.has(l.id)).map((l) => l.name);
  const members = new Map(snap.members.map((m) => [m.id, m.fullName]));

  for (const card of snap.cards) {
    const stage = mapping.stageByList[card.idList];
    if (!stage || card.closed) continue;
    const missing: string[] = [];
    const amountRaw = numberField(card, mapping.fields.amount, snap);
    const probRaw = numberField(card, mapping.fields.probability, snap);
    const amount = typeof amountRaw === "number" ? amountRaw : null;
    const probability = typeof probRaw === "number" ? probRaw : null;
    const client = fieldValue(card, mapping.fields.client, snap)?.trim() || null;
    const owner = card.idMembers.map((id) => members.get(id)).find(Boolean) ?? null;
    if (amountRaw === "no_numerico") missing.push("importe (el campo de Trello debe ser de tipo número)");
    else if (amount === null || amount < 0) missing.push(mapping.fields.amount ? "importe" : "importe (campo sin configurar)");
    if (!client) missing.push(mapping.fields.client ? "cliente" : "cliente (campo sin configurar)");
    if (probRaw === "no_numerico") missing.push("probabilidad (el campo de Trello debe ser de tipo número)");
    else if (probability === null || probability < 0 || probability > 100) missing.push(mapping.fields.probability ? "probabilidad (0-100)" : "probabilidad (campo sin configurar)");
    if (!owner) missing.push("responsable (miembro de la tarjeta)");
    if (!card.due) missing.push("fecha límite");
    if (missing.length) {
      incomplete.push({ cardId: card.id, title: card.name, url: card.shortUrl, missing });
      continue;
    }
    offers.push(Offer.parse({ id: card.id, title: card.name, client, amountEur: amount, stage, probability, owner, dueDate: madridDate(card.due!), source: "trello", url: card.shortUrl }));
  }
  return { offers, incomplete, unmappedLists, fetchedAt: snap.fetchedAt };
}
