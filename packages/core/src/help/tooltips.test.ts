import { describe, expect, it } from "vitest";
import { NAV_LABEL, NAV_ORDER } from "../access";
import { HINT, NAV_HINT, kpiHint, type Hint } from "./tooltips";

const all: [string, Hint][] = [
  ...Object.entries(NAV_HINT),
  ...Object.entries(HINT.status), ...Object.entries(HINT.overall), ...Object.entries(HINT.severity), ...Object.entries(HINT.quick),
  ...(["demo", "search", "bell", "helpHere", "theme", "user", "roleSwitch", "signOut", "helpFab", "source", "anomaly", "approve", "reject", "environment", "viewCalc", "sendQuestion", "newChat", "trendGood", "trendBad", "contractBar", "stockBar"] as const).map((k) => [k, HINT[k]] as [string, Hint]),
];

describe("textos de ayuda contextual", () => {
  it("TODA sección del menú tiene su tooltip", () => {
    for (const id of NAV_ORDER) expect(NAV_HINT[id], id).toBeDefined();
  });
  it("el título del tooltip de una sección coincide con su nombre en el menú", () => {
    for (const id of NAV_ORDER) expect(NAV_HINT[id].title).toBe(NAV_LABEL[id]);
  });
  it("cada texto tiene título y una frase útil, ni vacía ni excesiva", () => {
    for (const [k, h] of all) {
      expect(h.title.length, k).toBeGreaterThan(2);
      expect(h.text.length, k).toBeGreaterThan(20);
      expect(h.text.length, k).toBeLessThanOrEqual(150);
      expect(h.title.length, k).toBeLessThanOrEqual(45);
    }
  });
  it("el tooltip de un indicador explica el cálculo y cita la fuente", () => {
    const h = kpiHint({ label: "Órdenes abiertas", provenance: { source: "pgmwin", entity: "Órdenes de trabajo abiertas", period: "a fecha de hoy", calc: "Recuento de OT abiertas" } }, "PGMWin");
    expect(h.title).toBe("Órdenes abiertas");
    expect(h.text).toContain("Recuento de OT abiertas");
    expect(h.text).toContain("Fuente: PGMWin");
  });
  it("no promete funciones inexistentes", () => {
    for (const [k, h] of all) expect(`${h.title} ${h.text}`, k).not.toMatch(/(descargar pdf|dictar|subida automática)/i);
  });
});
