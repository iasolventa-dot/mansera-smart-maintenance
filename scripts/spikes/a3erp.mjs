// Spike S-11 (A3ERP) · SOLO LECTURA. Ejecutar dentro de la red de MANSERA.
const { A3_URL: base, A3_USER: user, A3_PASS: pass } = process.env;
if (!base || !user || !pass) { console.error("Faltan A3_URL, A3_USER y A3_PASS"); process.exit(1); }
const root = await fetch(`${base}/api`).catch((e) => ({ status: `error de red (${e.cause?.code ?? e.name})` }));
console.log("GET /api (debe dar 401 si está bien instalada):", root.status);
const t0 = Date.now();
const res = await fetch(`${base}/api/login`, { method: "POST", headers: { Authorization: `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}` } });
console.log("POST /api/login:", res.status, `${Date.now() - t0} ms`);
if (res.ok) {
  const j = await res.json().catch(() => null);
  console.log("campos de la respuesta (sin valores):", j && typeof j === "object" ? Object.keys(j) : typeof j);
  console.log("TODO: leer /api/maestro.md y /api/documento.md de la documentación para elegir endpoints de lectura.");
}
