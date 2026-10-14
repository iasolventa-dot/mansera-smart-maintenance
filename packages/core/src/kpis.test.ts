import { describe, expect, it } from "vitest";
import { lastWithDelta, pipelineKpis, plural } from "./kpis";
import type { Offer } from "./modules";

const o = (stage: Offer["stage"], amountEur: number, probability = 50): Offer =>
  ({ id: stage + amountEur, title: "x", client: "c", amountEur, stage, probability, owner: "o", dueDate: "2026-11-01", source: "trello" });

describe("indicadores comerciales", () => {
  it("abierto, ponderado, ganado y tasa de éxito", () => {
    const k = pipelineKpis([o("enviada", 1000, 50), o("negociacion", 2000, 25), o("ganada", 500), o("perdida", 700)]);
    expect(k).toEqual({ openCount: 2, openAmount: 3000, weighted: 1000, wonAmount: 500, won: 1, lost: 1, winRate: 50 });
  });
  it("sin ofertas cerradas, la tasa de éxito es «sin dato» (null), no 0 %", () => {
    expect(pipelineKpis([o("enviada", 100)]).winRate).toBeNull();
    expect(pipelineKpis([]).winRate).toBeNull();
  });
});

describe("serie con variación", () => {
  it("último valor y diferencia con el anterior", () => {
    expect(lastWithDelta([{ label: "a", value: 3.2 }, { label: "b", value: 3.7 }])).toEqual({ value: 3.7, delta: 0.5 });
  });
  it("sin datos o con uno solo: null donde falte", () => {
    expect(lastWithDelta([])).toEqual({ value: null, delta: null });
    expect(lastWithDelta([{ label: "a", value: 2 }])).toEqual({ value: 2, delta: null });
  });
  it("plural", () => {
    expect(plural(1, "perdida", "perdidas")).toBe("1 perdida");
    expect(plural(3, "perdida", "perdidas")).toBe("3 perdidas");
  });
});
