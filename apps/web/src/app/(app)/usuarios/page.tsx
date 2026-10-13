import type { Metadata } from "next";
import { NAV_LABEL, NAV_ORDER, ROLE_ACCESS, ROLE_ORDER } from "@msm/core";
import { PageHeader } from "@/components/page-header";
import { SystemView } from "@/components/system-view";
import { getProvider } from "@/lib/data";
import { requireAccess } from "@/lib/session";

export const metadata: Metadata = { title: "Usuarios y auditoría" };

export default async function UsuariosPage() {
  await requireAccess("usuarios");
  const provider = getProvider();
  const [users, audit] = await Promise.all([provider.listUsers(), provider.listAudit()]);
  const matrix = {
    sections: NAV_ORDER.map((id) => ({ id, label: NAV_LABEL[id] })),
    roles: ROLE_ORDER.map((r) => ({ id: r, label: ROLE_ACCESS[r].label.split(" · ")[0]!, allowed: ROLE_ACCESS[r].nav as string[] })),
  };
  return (
    <>
      <PageHeader title="Usuarios y auditoría" subtitle="Quién puede ver qué, y quién hizo qué. Mínimo privilegio por departamento" />
      <SystemView users={users} audit={audit} matrix={matrix} />
    </>
  );
}
