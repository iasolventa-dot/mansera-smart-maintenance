import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ACTION_SECTION, canAccess, canPerform, type ActionId } from "./access";
import { Role } from "./schemas";

describe("permisos de las acciones del servidor", () => {
  it("cada acción exige el permiso de su sección", () => {
    for (const role of Role.options) for (const [action, section] of Object.entries(ACTION_SECTION)) {
      expect(canPerform(role, action as ActionId), `${role}/${action}`).toBe(canAccess(role, section));
    }
  });

  it("el técnico de campo no puede aprobar propuestas ni crear órdenes", () => {
    expect(canPerform("campo", "decidirPropuesta")).toBe(false);
    expect(canPerform("campo", "crearOrden")).toBe(false);
    expect(canPerform("campo", "usarCopiloto")).toBe(true); // el campo sí tiene Copiloto en su menú
  });

  it("solo Dirección, TI, Oficina técnica y Administración deciden propuestas", () => {
    expect(Role.options.filter((r) => canPerform(r, "decidirPropuesta")).sort()).toEqual(["administracion", "direccion", "oficina_tecnica", "ti"]);
  });

  it("TODA server action con efecto comprueba el permiso en el servidor", () => {
    const src = readFileSync(join(__dirname, "../../../apps/web/src/app/actions.ts"), "utf8");
    const guarded: Record<string, ActionId> = { decideProposal: "decidirPropuesta", createWorkOrder: "crearOrden", askCopilot: "usarCopiloto" };
    for (const [fn, action] of Object.entries(guarded)) {
      const start = src.indexOf(`export async function ${fn}(`);
      expect(start, `no encuentro ${fn}`).toBeGreaterThan(-1);
      const body = src.slice(start, src.indexOf("\nexport async function", start + 10) === -1 ? undefined : src.indexOf("\nexport async function", start + 10));
      expect(body, `${fn} debe llamar a canPerform(..., "${action}")`).toContain(`canPerform(session.role, "${action}")`);
    }
  });
});
