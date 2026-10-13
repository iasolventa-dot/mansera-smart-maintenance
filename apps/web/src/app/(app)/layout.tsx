import { NAV_GROUP, NAV_HREF, NAV_LABEL, ROLE_ACCESS, ROLE_ORDER, navFor } from "@msm/core";
import { AppShell } from "@/components/app-shell";
import { getProvider } from "@/lib/data";
import { requireSession } from "@/lib/session";
import { createWorkOrder, searchAll, signOut, switchRole } from "../actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const provider = getProvider();
  const access = ROLE_ACCESS[session.role];
  const nav = navFor(session.role).map((id) => ({ id, label: NAV_LABEL[id], href: NAV_HREF[id], group: NAV_GROUP[id] }));
  const roles = ROLE_ORDER.map((r) => ({ value: r, label: ROLE_ACCESS[r].label, current: r === session.role }));
  const [notifications, clients, assets] = await Promise.all([
    provider.listNotifications(session.role),
    provider.listClients(),
    provider.listAssets(),
  ]);

  return (
    <AppShell
      nav={nav}
      user={{ name: session.name, roleLabel: access.label }}
      roles={roles}
      notifications={notifications}
      demo={provider.mode === "demo"}
      canPreview={session.canPreview}
      quick={{ clients: clients.map((c) => c.name), assets: assets.map((a) => ({ name: a.name, client: a.client })) }}
      switchRole={switchRole}
      signOut={signOut}
      createWorkOrder={createWorkOrder}
      searchAll={searchAll}
    >
      {children}
    </AppShell>
  );
}
