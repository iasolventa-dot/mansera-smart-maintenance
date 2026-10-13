import { NAV_HREF, NAV_LABEL, ROLE_ACCESS, Role } from "@msm/core";
import { AppShell } from "@/components/app-shell";
import { getProvider } from "@/lib/data";
import { requireSession } from "@/lib/session";
import { signOut, switchRole } from "../actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const access = ROLE_ACCESS[session.role];
  const nav = access.nav.map((id) => ({ id, label: NAV_LABEL[id], href: NAV_HREF[id] }));
  const roles = Role.options.map((r) => ({ value: r, label: ROLE_ACCESS[r].label, current: r === session.role }));

  return (
    <AppShell nav={nav} user={{ name: session.name, roleLabel: access.label }} roles={roles} demo={getProvider().mode === "demo"} canPreview={session.canPreview} switchRole={switchRole} signOut={signOut}>
      {children}
    </AppShell>
  );
}
