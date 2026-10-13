// Spike S-11 (A3ERP) · SOLO LECTURA. Ejecutar dentro de la red de MANSERA. No imprime credenciales ni el token.
const { A3_URL, A3_USER: user, A3_PASS: pass } = process.env;
if (!A3_URL || !user || !pass) { console.error("Faltan A3_URL, A3_USER y A3_PASS"); process.exit(1); }
const base = new URL(A3_URL).origin; // sin barra final ni ruta
const netError = (e) => `error de red (${e.cause?.code ?? e.name})`;

const root = await fetch(`${base}/api`).catch((e) => ({ status: netError(e) }));
console.log("GET /api (debe dar 401 si está bien instalada):", root.status);

const t0 = Date.now();
const res = await fetch(`${base}/api/login`, { method: "POST", headers: { Authorization: `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}` } })
  .catch((e) => { console.log("POST /api/login:", netError(e)); process.exit(2); });
console.log("POST /api/login:", res.status, `${Date.now() - t0} ms`);
if (res.ok) {
  const j = await res.json().catch(() => null);
  console.log("campos de la respuesta (sin valores):", j && typeof j === "object" ? Object.keys(j) : typeof j);
  console.log("Siguiente paso: leer /api/maestro.md y /api/documento.md de la documentación para elegir endpoints de lectura.");
}
