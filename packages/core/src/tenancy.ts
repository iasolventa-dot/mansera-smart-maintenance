import { Role } from "./schemas";

/**
 * Organización activa (multi-empresa, R-14). Un usuario puede pertenecer a varias organizaciones con un rol en cada una.
 * La preferida (cookie) SOLO se acepta si el usuario es miembro de verdad; si no, la más antigua (orden determinista).
 * La base de datos (RLS) sigue siendo la barrera real: esto solo decide qué organización se muestra.
 */
export type MembershipRow = { orgId: string; orgName: string; role: string; createdAt: string };
export type ActiveMembership = { orgId: string; orgName: string; role: Role };

export function pickActiveMembership(rows: MembershipRow[], preferred?: string | null): ActiveMembership | null {
  const valid = rows
    .map((r) => ({ ...r, parsed: Role.safeParse(r.role) }))
    .filter((r) => r.parsed.success)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.orgId.localeCompare(b.orgId));
  const chosen = (preferred && valid.find((r) => r.orgId === preferred)) || valid[0];
  return chosen && chosen.parsed.success ? { orgId: chosen.orgId, orgName: chosen.orgName, role: chosen.parsed.data } : null;
}
