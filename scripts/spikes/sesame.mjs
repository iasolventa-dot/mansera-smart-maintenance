// Spike S-12/S-14 (Sésame HR) · SOLO LECTURA. Salida sin valores secretos ni datos personales.
const { SESAME_REGION: region, SESAME_TOKEN: token } = process.env;
if (!region || !token || !/^[a-z0-9-]{2,20}$/.test(region)) { console.error("Faltan SESAME_REGION (válida) y SESAME_TOKEN"); process.exit(1); }
const t0 = Date.now();
const res = await fetch(`https://api-${region}.sesametime.com/core/v3/info`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }, redirect: "error" });
console.log("core/v3/info:", res.status, `${Date.now() - t0} ms`);
console.log("cabeceras de límite:", [...res.headers].filter(([k]) => /rate|limit|retry/i.test(k)).map(([k, v]) => `${k}=${v}`));
if (res.ok) { const j = await res.json(); console.log("campos de la respuesta:", Object.keys(j.data ?? j)); }
