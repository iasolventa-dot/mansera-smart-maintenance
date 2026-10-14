import { describe, expect, it } from "vitest";
import { pickActiveMembership } from "./tenancy";

const rows = [
  { orgId: "o-2", orgName: "Segunda", role: "campo", createdAt: "2026-05-01" },
  { orgId: "o-1", orgName: "Primera", role: "ti", createdAt: "2026-01-01" },
  { orgId: "o-x", orgName: "Rol raro", role: "superadmin", createdAt: "2025-01-01" },
];

describe("organización activa", () => {
  it("sin preferencia: la más antigua con rol válido (determinista)", () => {
    expect(pickActiveMembership(rows)).toEqual({ orgId: "o-1", orgName: "Primera", role: "ti" });
  });
  it("respeta la preferida si el usuario es miembro, con SU rol en esa organización", () => {
    expect(pickActiveMembership(rows, "o-2")).toEqual({ orgId: "o-2", orgName: "Segunda", role: "campo" });
  });
  it("una preferida ajena o con rol no válido se ignora (no da acceso)", () => {
    expect(pickActiveMembership(rows, "o-ajena")?.orgId).toBe("o-1");
    expect(pickActiveMembership(rows, "o-x")?.orgId).toBe("o-1");
  });
  it("sin membresías válidas: null", () => {
    expect(pickActiveMembership([])).toBeNull();
    expect(pickActiveMembership([rows[2]!])).toBeNull();
  });
});
