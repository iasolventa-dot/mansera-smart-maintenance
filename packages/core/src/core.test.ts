import { describe, expect, it } from "vitest";
import { DemoDataProvider } from "./demo";
import { NAV_HREF, NAV_ORDER, ROLE_ACCESS, canAccess, homeFor, navFor } from "./access";
import { CopilotAnswer, Role } from "./schemas";

const provider = new DemoDataProvider();

describe("contrato DataProvider (demo)", () => {
  it("devuelve un panel válido para cada rol", async () => {
    for (const role of Role.options) {
      const d = await provider.getDashboard(role);
      expect(d.role).toBe(role);
    }
  });

  it("toda cifra del panel lleva su procedencia", async () => {
    for (const role of Role.options) {
      for (const k of (await provider.getDashboard(role)).kpis) expect(k.provenance.entity).not.toBe("");
    }
  });

  it("el técnico de campo solo ve sus órdenes", async () => {
    const mine = await provider.listWorkOrders({ onlyMine: true });
    expect(mine.length).toBeGreaterThan(0);
    expect(mine.every((o) => o.mine)).toBe(true);
  });

  it("decidir una propuesta devuelve el nuevo estado y no modifica el original", async () => {
    const [first] = (await provider.listProposals()).filter((p) => p.status === "pendiente");
    expect(first).toBeDefined();
    const a = await provider.decideProposal(first!.id, "aprobada", "Test");
    expect(a.status).toBe("aprobada");
    const again = (await provider.listProposals()).find((p) => p.id === first!.id);
    expect(again?.status).toBe("pendiente");
  });

  it("crear una orden genera una propuesta pendiente con diff, nunca escribe", async () => {
    const p = await provider.createWorkOrderProposal(
      { client: "Embotelladora Sur", asset: "Bomba B-14", description: "Ruido anómalo en el sello", priority: "alta" }, "Test");
    expect(p.status).toBe("pendiente");
    expect(p.diff.length).toBeGreaterThan(0);
    expect(p.diff.every((d) => d.before === null)).toBe(true);
  });

  it("rechaza entradas inválidas de una acción rápida", async () => {
    await expect(provider.createWorkOrderProposal(
      { client: "", asset: "x", description: "ab", priority: "normal" }, "Test")).rejects.toThrow();
  });

  it("un activo o cliente inexistente devuelve null", async () => {
    expect(await provider.getAsset("NO-EXISTE")).toBeNull();
    expect(await provider.getClient("NO-EXISTE")).toBeNull();
  });

  it("los módulos devuelven datos coherentes con sus esquemas", async () => {
    expect((await provider.listClients()).length).toBeGreaterThan(3);
    expect((await provider.listOffers()).some((o) => o.stage === "ganada")).toBe(true);
    expect((await provider.getFinance()).docs.length).toBeGreaterThan(5);
    expect((await provider.getPurchasing()).stock.length).toBeGreaterThan(3);
    expect((await provider.getPeople()).employees.length).toBeGreaterThan(5);
    expect((await provider.getPrl()).accreditations.length).toBeGreaterThan(3);
    expect((await provider.getMaintenance()).tasks.length).toBeGreaterThan(3);
    expect((await provider.listAlerts()).length).toBeGreaterThan(5);
  });

  it("toda alerta con anomalía lleva evidencia y procedencia", async () => {
    for (const a of (await provider.listAlerts()).filter((x) => x.kind === "anomalia")) {
      expect(a.evidence.length).toBeGreaterThan(0);
      expect(a.provenance.calc).toBeTruthy();
    }
  });
});

describe("búsqueda y notificaciones respetan el rol", () => {
  it("la búsqueda no devuelve secciones que el rol no puede ver", async () => {
    const campo = await provider.search("Embotelladora", "campo");
    expect(campo.every((h) => h.kind === "activo")).toBe(true);
    const dir = await provider.search("Embotelladora", "direccion");
    expect(dir.some((h) => h.kind === "cliente")).toBe(true);
  });

  it("ignora consultas demasiado cortas", async () => {
    expect(await provider.search("a", "direccion")).toEqual([]);
  });

  it("cada rol recibe sus notificaciones", async () => {
    expect((await provider.listNotifications("campo")).length).toBeGreaterThan(0);
    for (const n of await provider.listNotifications("ti")) expect(n.href.startsWith("/")).toBe(true);
  });
});

describe("IA trazable (ADR-0006)", () => {
  it("el copiloto cita fuentes cuando responde con datos", async () => {
    for (const q of ["¿Qué máquinas han fallado más?", "¿Cómo va el contrato de horas?", "¿Qué hay sin facturar?", "stock de repuestos"]) {
      const r = await provider.askCopilot(q, "direccion");
      expect(r.noData).toBe(false);
      expect(r.sources.length).toBeGreaterThan(0);
    }
  });

  it("sin datos lo dice, no inventa", async () => {
    const r = await provider.askCopilot("¿Cuál es la capital de Francia?", "direccion");
    expect(r.noData).toBe(true);
    expect(r.sources).toHaveLength(0);
  });

  it("el esquema rechaza una respuesta con datos y sin fuente", () => {
    const bad = CopilotAnswer.safeParse({ answer: "Hay 5 averías", confidence: "alta", sources: [] });
    expect(bad.success).toBe(false);
  });
});

describe("permisos por rol", () => {
  it("el técnico de campo no accede al panel de dirección ni a conexiones", () => {
    expect(canAccess("campo", "panel")).toBe(false);
    expect(canAccess("campo", "conexiones")).toBe(false);
  });

  it("solo TI ve conexiones y usuarios", () => {
    expect(Role.options.filter((r) => canAccess(r, "conexiones"))).toEqual(["ti"]);
    expect(Role.options.filter((r) => canAccess(r, "usuarios"))).toEqual(["ti"]);
  });

  it("facturación solo para dirección y administración; personal solo dirección y RR. HH.", () => {
    expect(Role.options.filter((r) => canAccess(r, "facturacion")).sort()).toEqual(["administracion", "direccion"]);
    expect(Role.options.filter((r) => canAccess(r, "personal")).sort()).toEqual(["direccion", "rrhh"]);
  });

  it("cada rol tiene un inicio al que sí puede acceder", () => {
    for (const role of Role.options) {
      const id = homeFor(role) === "/campo" ? "campo" : "panel";
      expect(ROLE_ACCESS[role].nav).toContain(id);
    }
  });

  it("todas las secciones tienen ruta y aparecen en el orden maestro sin duplicados", () => {
    expect(new Set(NAV_ORDER).size).toBe(NAV_ORDER.length);
    for (const id of NAV_ORDER) expect(NAV_HREF[id].startsWith("/")).toBe(true);
    for (const role of Role.options) for (const id of navFor(role)) expect(NAV_ORDER).toContain(id);
  });
});
