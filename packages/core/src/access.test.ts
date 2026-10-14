import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ACTION_SECTION, canAccess, canPerform, canSeeSickLeave, canUseRealData, type ActionId } from "./access";
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
    const src = readFileSync(join(fileURLToPath(new URL(".", import.meta.url)), "../../../apps/web/src/app/actions.ts"), "utf8");
    const guarded: Record<string, ActionId> = { decideProposal: "decidirPropuesta", createWorkOrder: "crearOrden", askCopilot: "usarCopiloto", saveConnection: "configurarConexiones", deleteConnection: "configurarConexiones", loadTrelloStructure: "configurarConexiones", saveTrelloMapping: "configurarConexiones" };
    for (const [fn, action] of Object.entries(guarded)) {
      const start = src.indexOf(`export async function ${fn}(`);
      expect(start, `no encuentro ${fn}`).toBeGreaterThan(-1);
      const body = src.slice(start, src.indexOf("\nexport async function", start + 10) === -1 ? undefined : src.indexOf("\nexport async function", start + 10));
      expect(body, `${fn} debe llamar a canPerform(..., "${action}")`).toContain(`canPerform(session.role, "${action}")`);
    }
  });
});

describe("vista previa y datos reales", () => {
  it("la vista previa nunca abre datos reales, aunque el perfil previsualizado tenga la sección", () => {
    expect(canUseRealData("rrhh", "ti", "personal")).toBe(false); // TI previsualizando RR. HH.
    expect(canUseRealData("oficina_tecnica", "ti", "comercial")).toBe(false);
    expect(canUseRealData("ti", "direccion", "conexiones")).toBe(false);
  });
  it("sin vista previa, decide el permiso del perfil real", () => {
    expect(canUseRealData("rrhh", "rrhh", "personal")).toBe(true);
    expect(canUseRealData("campo", "campo", "personal")).toBe(canAccess("campo", "personal"));
  });
  it("toda acción con efecto exige también el permiso del perfil REAL", () => {
    const src = readFileSync(join(fileURLToPath(new URL(".", import.meta.url)), "../../../apps/web/src/app/actions.ts"), "utf8");
    for (const action of ["decidirPropuesta", "crearOrden", "usarCopiloto", "configurarConexiones"]) {
      expect(src, action).toContain(`canPerform(session.realRole, "${action}")`);
    }
  });
});

describe("datos de salud", () => {
  it("solo RR. HH. ve la baja individual", () => {
    expect(Role.options.filter(canSeeSickLeave)).toEqual(["rrhh"]);
  });
});
