// Spike S-12 (Trello) · SOLO LECTURA. Salida sin valores secretos.
const { TRELLO_KEY: key, TRELLO_TOKEN: token } = process.env;
if (!key || !token) { console.error("Faltan TRELLO_KEY y TRELLO_TOKEN"); process.exit(1); }
const get = async (path) => {
  const t0 = Date.now();
  const res = await fetch(`https://api.trello.com/1${path}${path.includes("?") ? "&" : "?"}key=${encodeURIComponent(key)}&token=${encodeURIComponent(token)}`, { redirect: "error" });
  const body = res.ok ? await res.json() : null;
  return { status: res.status, ms: Date.now() - t0, rate: res.headers.get("x-rate-limit-api-token-remaining"), body };
};
const me = await get("/members/me?fields=username");
console.log("members/me:", me.status, `${me.ms} ms`, "límite restante (token):", me.rate);
if (me.status === 200) {
  const boards = await get("/members/me/boards?fields=name,closed");
  console.log("tableros:", boards.status, Array.isArray(boards.body) ? `${boards.body.length} tableros` : "");
  const first = boards.body?.find((b) => !b.closed);
  if (first) {
    const lists = await get(`/boards/${first.id}/lists?fields=name`);
    console.log("listas del primer tablero abierto:", Array.isArray(lists.body) ? lists.body.map((l) => l.name) : lists.status);
  }
}
