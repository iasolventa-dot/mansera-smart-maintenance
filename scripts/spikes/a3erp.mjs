// Spike de A3ERP (Integrador API ERP de Link Soluciones) · SOLO LECTURA. Ejecutar DENTRO de la red de MANSERA.
// Muestra recuentos y nombres de campos, nunca valores de clientes ni la ApiKey.
//   $env:A3_URL="https://servidor:puerto"; $env:A3_APIKEY="..."; node scripts/spikes/a3erp.mjs
const { A3_URL, A3_APIKEY } = process.env;
if (!A3_URL || !A3_APIKEY) { console.error("Faltan A3_URL y A3_APIKEY"); process.exit(1); }
const base = new URL(A3_URL).origin;
const headers = { ApiKey: A3_APIKEY, Accept: "application/json" };
for (const entidad of ["cliente", "facturaVenta", "albaranVenta", "efectoPendiente"]) {
  const t0 = Date.now();
  const r = await fetch(`${base}/api/${entidad}/?$top=1`, { headers }).catch((e) => ({ status: `error de red (${e.cause?.code ?? e.name})` }));
  let detalle = "";
  if (r.ok) {
    const j = await r.json().catch(() => null);
    detalle = j && Array.isArray(j.PageData) ? `total=${j.TotalCount} · campos: ${Object.keys(j.PageData[0] ?? {}).join(", ")}` : "formato inesperado";
  }
  console.log(`${entidad}: ${r.status} ${Date.now() - t0} ms ${detalle}`);
}
console.log("Anota en memory/SUPUESTOS.md (S-32): cómo se elige la empresa, máximo de $top y si los albaranes indican si están facturados.");
