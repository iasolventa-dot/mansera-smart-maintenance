/**
 * Spike de Trello (S-12, S-15, S-16) · SOLO LECTURA.
 * Muestra la ESTRUCTURA de los tableros (nombres de tablero, listas y campos personalizados con su tipo) para
 * configurar el mapeo a ofertas, y recuentos. No muestra tarjetas. Credenciales solo por variables de entorno.
 * Ojo: los nombres de tableros/listas pueden incluir nombres de clientes: no pegues la salida en el repositorio.
 *   $env:TRELLO_KEY="..."; $env:TRELLO_TOKEN="..."; pnpm --filter @msm/connectors spike:trello
 *   (opcional) $env:TRELLO_BOARD="<id del tablero de ofertas>" para ver sus listas y campos.
 */
import { ConnectorError, createTrelloClient } from "../src";

const apiKey = process.env.TRELLO_KEY ?? "";
const token = process.env.TRELLO_TOKEN ?? "";
if (!apiKey || !token) {
  console.error("Faltan TRELLO_KEY y TRELLO_TOKEN.");
  process.exit(1);
}

async function main() {
  const c = createTrelloClient({ apiKey, token });
  const t0 = Date.now();
  await c.me();
  console.log(`✔ Credenciales válidas (cabecera OAuth) · ${Date.now() - t0} ms`);
  const boards = await c.boards();
  console.log(`✔ Tableros abiertos (${boards.length}):`);
  for (const b of boards) console.log(`   ${b.id}  ${b.name}`);

  const boardId = process.env.TRELLO_BOARD;
  if (!boardId) return console.log("\nRepite con TRELLO_BOARD=<id> para ver listas y campos del tablero de ofertas.");
  const s = await c.board(boardId);
  console.log(`\n✔ Tablero ${boardId}: ${s.cards.length} tarjetas abiertas · ${s.members.length} miembros`);
  console.log("  Listas (→ etapa comercial):");
  for (const l of s.lists) console.log(`   ${l.id}  ${l.name}  (${s.cards.filter((x) => x.idList === l.id).length} tarjetas)`);
  console.log("  Campos personalizados (→ importe, cliente, probabilidad):");
  for (const f of s.customFields) console.log(`   ${f.id}  ${f.name}  [${f.type}]  usado en ${s.cards.filter((x) => x.customFieldItems?.some((i) => i.idCustomField === f.id)).length} tarjetas`);
  if (!s.customFields.length) console.log("   (ninguno: importe/cliente/probabilidad no están en campos personalizados → S-15 refutado)");
  console.log("\nCon esto se rellena TrelloOfferMapping (listas → etapas y campos) y se anota S-15/S-16 en memory/SUPUESTOS.md.");
}

main().catch((e: unknown) => {
  console.error(e instanceof ConnectorError ? `✘ ${e.kind}: ${e.message}` : "✘ Error inesperado (sin detalles para no exponer datos).");
  process.exit(2);
});
