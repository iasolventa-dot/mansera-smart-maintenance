import { describe, expect, it } from "vitest";
import { DemoDataProvider } from "./demo";
import { ROLE_ACCESS, canAccess, homeFor } from "./access";
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
    const d = await provider.getDashboard("direccion");
    expect(d.kpis.length).toBeGreaterThan(0);
    for (const k of d.kpis) expect(k.provenance.entity).not.toBe("");
  });

  it("el técnico de campo solo ve sus órdenes", async () => {
    const mine = await provider.listWorkOrders({ onlyMine: true });
    expect(mine.length).toBeGreaterThan(0);
    expect(mine.every((o) => o.mine)).toBe(true);
  });

  it("una propuesta decidida no se puede volver a decidir", async () => {
    const [first] = (await provider.listProposals()).filter((p) => p.status === "pendiente");
    expect(first).toBeDefined();
    const a = await provider.decideProposal(first!.id, "aprobada", "Test");
    const b = await provider.decideProposal(first!.id, "rechazada", "Test");
    expect(a.status).toBe("aprobada");
    expect(b.status).toBe("aprobada");
  });

  it("un activo inexistente devuelve null", async () => {
    expect(await provider.getAsset("NO-EXISTE")).toBeNull();
  });
});

describe("IA trazable (ADR-0006)", () => {
  it("el copiloto cita fuentes cuando responde con datos", async () => {
    const r = await provider.askCopilot("¿Qué máquinas han fallado más?", "direccion");
    expect(r.noData).toBe(false);
    expect(r.sources.length).toBeGreaterThan(0);
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

  it("solo TI ve conexiones", () => {
    const withConnections = Role.options.filter((r) => canAccess(r, "conexiones"));
    expect(withConnections).toEqual(["ti"]);
  });

  it("cada rol tiene una página de inicio a la que sí puede acceder", () => {
    for (const role of Role.options) {
      const id = homeFor(role) === "/campo" ? "campo" : "panel";
      expect(ROLE_ACCESS[role].nav).toContain(id);
    }
  });
});
