import { ROLES, routesFor } from "./helpers";

/**
 * El servidor de desarrollo compila cada página la primera vez que se pide: con varias pruebas en paralelo
 * eso provoca esperas y falsos fallos. Se compilan todas las rutas una vez, en serie, antes de empezar.
 */
export default async function globalSetup() {
  const port = process.env.E2E_PORT ?? "3200";
  const seen = new Map<string, string>();
  for (const role of ROLES) for (const route of routesFor(role)) if (!seen.has(route)) seen.set(route, role);
  const started = Date.now();
  for (const [route, role] of seen) {
    const res = await fetch(`http://localhost:${port}${route}`, { headers: { cookie: `msm_demo_session=${role}` }, redirect: "manual" });
    await res.arrayBuffer();
  }
  await (await fetch(`http://localhost:${port}/login`)).arrayBuffer();
  console.log(`Calentamiento: ${seen.size} rutas compiladas en ${Math.round((Date.now() - started) / 1000)} s`);
}
