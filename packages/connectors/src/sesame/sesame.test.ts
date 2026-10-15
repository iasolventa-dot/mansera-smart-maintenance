import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { ConnectorError } from "../errors";
import { createSesameClient } from "./client";
import { mapPeople } from "./mapping";

// Respuestas de ejemplo INVENTADAS (formato de la especificación oficial); no son datos de MANSERA.
const R = JSON.parse(readFileSync(fileURLToPath(new URL("../../fixtures/sesame/responses.sample.json", import.meta.url)), "utf8"));
const TOKEN = "t".repeat(64); // relleno, no es un token real
const creds = { region: "eu1", token: TOKEN };

/** Servidor simulado: responde según la ruta pedida. */
function fakeSesame(over: Partial<Record<string, unknown>> = {}) {
  return vi.fn(async (url: string, _init?: RequestInit) => {
    const u = new URL(url);
    const routes: Record<string, unknown> = {
      "/core/v3/info": R.info, "/core/v3/employees": R.employees, "/core/v3/employee-department-assignations": R.departments,
      "/schedule/v1/absence-day-off": R.absences, "/schedule/v1/absence-types": R.absenceTypes, "/core/v3/departments": { data: [{ id: "d1", name: "Campo" }], meta: { currentPage: 1, lastPage: 1 } }, "/schedule/v1/vacation-day-off": R.vacations, "/schedule/v1/work-entries": R.workEntries,
      "/core/v3/offices": R.offices, "/schedule/v1/reports/worked-hours": R.workedHours, ...over,
    };
    const body = routes[u.pathname];
    return body === undefined ? new Response("{}", { status: 404, headers: { "content-type": "application/json" } }) : new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
  });
}

describe("cliente de Sésame HR (solo lectura)", () => {
  it("usa Bearer, el host de la región y nunca pone el token en la URL", async () => {
    const f = fakeSesame();
    expect(await createSesameClient(creds, f).info()).toEqual({ id: expect.any(String), name: "Empresa Ejemplo S.L." });
    const [url, init] = f.mock.calls[0]!;
    expect(url).toBe("https://api-eu1.sesametime.com/core/v3/info");
    expect(url).not.toContain(TOKEN);
    expect((init!.headers as Record<string, string>).Authorization).toBe(`Bearer ${TOKEN}`);
    expect(init!.method).toBe("GET");
  });
  it("con política: reintenta un 503 pasajero y respeta el cupo", async () => {
    let n = 0;
    const flaky = vi.fn(async (_u: string, _i?: RequestInit) => (++n === 1 ? new Response("{}", { status: 503 }) : new Response(JSON.stringify(R.info), { status: 200, headers: { "content-type": "application/json" } })));
    const slept: number[] = [];
    const clock = { now: () => 0, sleep: async (ms: number) => { slept.push(ms); } };
    let taken = 0;
    const limiter = { take: async () => { taken++; } } as unknown as import("../policy").RateLimiter;
    const r = await createSesameClient(creds, flaky, { limiter, retry: { retries: 2, clock, random: () => 1 } }).info();
    expect(r.name).toBe("Empresa Ejemplo S.L.");
    expect(n).toBe(2);
    expect(taken).toBe(2); // cada intento consume cupo
    expect(slept).toHaveLength(1);
  });
  it("el token de Sésame no se puede limitar a lectura: el cliente SOLO hace peticiones GET", async () => {
    const f = fakeSesame();
    const c = createSesameClient(creds, f);
    await c.info();
    await c.snapshot(R.date);
    await c.absenceTypes();
    await c.departments();
    expect(f.mock.calls.length).toBeGreaterThan(5);
    for (const [, init] of f.mock.calls) expect(init?.method ?? "GET").toBe("GET");
  });
  it("una región maliciosa se rechaza antes de llamar a nadie", () => {
    for (const region of ["eu1.evil.com", "eu1/x", "-eu1", "EU1"]) {
      expect(() => createSesameClient({ region, token: TOKEN }, fakeSesame()), region).toThrow(ConnectorError);
    }
  });
  it("MINIMIZACIÓN: los datos personales sensibles se descartan al recibirlos", async () => {
    const snap = await createSesameClient(creds, fakeSesame()).snapshot(R.date);
    const dump = JSON.stringify(snap);
    for (const k of ["FICTICIO-NID", "FICTICIO-SSN", "FICTICIO-IBAN", "FICTICIO-SALARIO", "1900-01-01", "FICTICIO-DIRECCION", "ficticio", "FICTICIO-TEL", "@example.invalid"]) {
      expect(dump, k).not.toContain(k);
    }
  });
  it("si la API ignora «page» se detiene en vez de duplicar datos", async () => {
    const stuck = vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify({ data: [], meta: { currentPage: 1, lastPage: 3 } }), { status: 200, headers: { "content-type": "application/json" } }));
    await expect(createSesameClient(creds, stuck).departments()).rejects.toMatchObject({ kind: "validation", message: expect.stringContaining("paginación") });
  });
  it("un fichaje con fecha mal formada es un error de formato controlado, no un fallo del mapeo", async () => {
    const bad = { ...R.workEntries, data: [{ ...R.workEntries.data[0], workEntryIn: { date: "ayer por la mañana" } }] };
    await expect(createSesameClient(creds, fakeSesame({ "/schedule/v1/work-entries": bad })).snapshot(R.date)).rejects.toMatchObject({ kind: "validation" });
  });
  it("recorre todas las páginas que indica meta.lastPage", async () => {
    const pagesSeen: number[] = [];
    const f = vi.fn(async (url: string, _init?: RequestInit) => {
      const u = new URL(url);
      if (u.pathname !== "/core/v3/employees") return fakeSesame()(url);
      const p = Number(u.searchParams.get("page"));
      pagesSeen.push(p);
      const e = R.employees.data[p - 1];
      return new Response(JSON.stringify({ data: [e], meta: { currentPage: p, lastPage: 3 } }), { status: 200, headers: { "content-type": "application/json" } });
    });
    const snap = await createSesameClient(creds, f).snapshot(R.date);
    expect(pagesSeen).toEqual([1, 2, 3]);
    expect(snap.employees).toHaveLength(3);
  });
  it("se detiene si hay demasiadas páginas", async () => {
    const endless = vi.fn(async (url: string, _init?: RequestInit) => {
      const p = Number(new URL(url).searchParams.get("page"));
      return new Response(JSON.stringify({ data: [], meta: { currentPage: p, lastPage: 9999 } }), { status: 200, headers: { "content-type": "application/json" } });
    });
    await expect(createSesameClient(creds, endless).snapshot("2026-10-14")).rejects.toMatchObject({ kind: "validation", message: expect.stringContaining("páginas") });
  });
  it("región inexistente (200 con HTML, comprobado en real) = error claro, no datos", async () => {
    const html = vi.fn(async (_u: string, _i?: RequestInit) => new Response("<!DOCTYPE html>", { status: 200, headers: { "content-type": "text/html" } }));
    await expect(createSesameClient({ region: "zz9", token: TOKEN }, html).info()).rejects.toMatchObject({ kind: "unavailable", message: expect.stringContaining("región") });
  });
  it("una fecha mal formada o imposible no llega a la red", async () => {
    const f = fakeSesame();
    await expect(createSesameClient(creds, f).snapshot("2026-10-14&limit=99999")).rejects.toMatchObject({ kind: "validation" });
    await expect(createSesameClient(creds, f).snapshot("2026-13-45")).rejects.toMatchObject({ kind: "validation" });
    await expect(createSesameClient(creds, f).snapshot("2026-02-30")).rejects.toMatchObject({ kind: "validation" });
    expect(f).not.toHaveBeenCalled();
  });
  it("errores tipados según la documentación (401, 403, 429, 503)", async () => {
    const st = (s: number, h: Record<string, string> = {}) => vi.fn(async (_u: string, _i?: RequestInit) => new Response("{}", { status: s, headers: h }));
    await expect(createSesameClient(creds, st(401)).info()).rejects.toMatchObject({ kind: "auth" });
    await expect(createSesameClient(creds, st(403)).info()).rejects.toMatchObject({ kind: "auth" });
    await expect(createSesameClient(creds, st(429, { "retry-after": "30" })).info()).rejects.toMatchObject({ kind: "rate_limited", retryAfterSec: 30 });
    await expect(createSesameClient(creds, st(503)).info()).rejects.toMatchObject({ kind: "transient", retryable: true });
  });
});

describe("mapeo Sésame → Personal (datos de ejemplo)", () => {
  it("estado de hoy, puesto, departamento, entrada, centro y horas sin inventar", async () => {
    const snap = await createSesameClient(creds, fakeSesame()).snapshot(R.date);
    const p = mapPeople(snap);
    const by = Object.fromEntries(p.employees.map((e) => [e.name, e]));
    expect(by["Persona Ejemplo Uno"]).toMatchObject({ today: "trabajando", position: "Técnico de mantenimiento", department: "Campo", clockIn: "07:58", site: "Centro Ejemplo Norte", hoursMonth: 104 });
    expect(by["Persona Ejemplo Dos"]).toMatchObject({ today: "sin_fichar", clockIn: null, hoursMonth: 98.5 });
    expect(by["Persona Ejemplo Tres"]).toMatchObject({ today: "ausente", position: "Sin puesto en Sésame", department: "Sin departamento en Sésame", hoursMonth: null });
    expect(by["Persona Ejemplo Seis"]).toMatchObject({ today: "baja" }); // tipo con categoría documentada sick_leave
    expect(by["Persona Ejemplo Siete"]).toMatchObject({ today: "trabajando" }); // 2 h de médico, pero ha fichado: no es «ausente»
    expect(by["Persona Ejemplo Cuatro"]).toMatchObject({ today: "vacaciones", department: "Oficina" });
    expect(by["Persona Ejemplo Cinco"]).toMatchObject({ today: "trabajando", clockIn: "08:15", site: null });
  });
  it("«baja» solo por la categoría oficial del tipo; nunca «libra»; avisa de quién no tiene horas", async () => {
    const p = mapPeople(await createSesameClient(creds, fakeSesame()).snapshot(R.date));
    expect(p.employees.filter((e) => e.today === "baja").map((e) => e.name)).toEqual(["Persona Ejemplo Seis"]);
    expect(p.employees.some((e) => e.today === "libra")).toBe(false);
    expect(p.missingHours).toEqual(["00000000-0000-4000-8000-000000000003", "00000000-0000-4000-8000-000000000006", "00000000-0000-4000-8000-000000000007"]);
  });
  it("horas por departamento a partir del informe de Sésame", async () => {
    const p = mapPeople(await createSesameClient(creds, fakeSesame()).snapshot(R.date));
    // Solo horas conocidas: «Sin departamento» no aparece con un 0 inventado.
    expect(p.hoursByDept).toEqual([{ label: "Campo", value: 293 }, { label: "Oficina", value: 60 }]);
  });
});
