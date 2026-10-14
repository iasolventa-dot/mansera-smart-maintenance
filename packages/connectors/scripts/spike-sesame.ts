/**
 * Spike de Sésame HR (S-12, S-14, S-17, S-18) · SOLO LECTURA.
 * Ejecuta el conector real contra la cuenta y muestra RECUENTOS y nombres de estructura (empresa, departamentos,
 * tipos de ausencia), nunca datos de personas. Credenciales solo por variables de entorno.
 *   $env:SESAME_REGION="eu1"; $env:SESAME_TOKEN="..."; pnpm --filter @msm/connectors spike:sesame
 */
import { ConnectorError, createSesameClient, mapPeople } from "../src";

const region = process.env.SESAME_REGION ?? "";
const token = process.env.SESAME_TOKEN ?? "";
if (!region || !token) {
  console.error("Faltan SESAME_REGION y SESAME_TOKEN.");
  process.exit(1);
}
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());

async function main() {
  const c = createSesameClient({ region, token });
  const t0 = Date.now();
  const company = await c.info();
  console.log(`✔ Token válido · empresa: ${company.name} · ${Date.now() - t0} ms`);

  const [types, depts] = await Promise.all([c.absenceTypes(), c.departments()]);
  console.log(`✔ Tipos de ausencia (${types.length}): ${types.map((x) => x.name).join(" · ")}`);
  console.log(`✔ Departamentos (${depts.length}): ${depts.map((x) => x.name).join(" · ")}`);

  const snap = await c.snapshot(today);
  console.log(`✔ Lectura del ${today}: ${snap.employees.length} empleados activos · ${snap.departments.length} asignaciones de departamento · ${snap.absences.length} ausencias · ${snap.vacations.length} vacaciones · ${snap.workEntries.length} fichajes · ${snap.offices.length} centros · ${snap.workedHoursMonth.length} filas de horas`);

  const p = mapPeople(snap);
  const byState = p.employees.reduce<Record<string, number>>((acc, e) => ({ ...acc, [e.today]: (acc[e.today] ?? 0) + 1 }), {});
  console.log("✔ Estado de hoy:", byState);
  console.log(`  Sin puesto en Sésame: ${p.employees.filter((e) => e.position === "Sin puesto en Sésame").length} · sin departamento: ${p.employees.filter((e) => e.department === "Sin departamento en Sésame").length} · sin horas del mes: ${p.missingHours.length}`);
  console.log("\nAnota en memory/SUPUESTOS.md: fecha, región, si el token tenía permisos para todo (403 = no), y qué tipos de ausencia son «baja».");
}

main().catch((e: unknown) => {
  console.error(e instanceof ConnectorError ? `✘ ${e.kind}: ${e.message}` : "✘ Error inesperado (sin detalles para no exponer datos).");
  process.exit(2);
});
