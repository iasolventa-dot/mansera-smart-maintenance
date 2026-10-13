import type { Metadata } from "next";
import { MANUAL, NAV_HREF, NAV_LABEL, ROLE_ACCESS, availabilityLabel, canAccess } from "@msm/core";
import { ManualView, type ManualChapterView } from "@/components/manual-view";
import { PageHeader } from "@/components/page-header";
import { requireAccess } from "@/lib/session";

export const metadata: Metadata = { title: "Manual de usuario" };

export default async function ManualPage() {
  const session = await requireAccess("manual");
  const chapters: ManualChapterView[] = MANUAL.map((c) => ({
    id: c.id,
    title: c.title,
    intro: c.intro,
    tasks: c.tasks.map((t) => {
      const allowed = !t.panel || canAccess(session.role, t.panel);
      return {
        id: t.id,
        title: t.title,
        steps: t.steps,
        keywords: t.keywords,
        notes: t.notes ?? [],
        availability: availabilityLabel(t.panel),
        goto: t.panel && t.panel !== "manual" && allowed ? { href: NAV_HREF[t.panel], label: NAV_LABEL[t.panel] } : null,
        locked: !allowed,
      };
    }),
  }));
  return (
    <>
      <PageHeader title="Manual de usuario" subtitle="Cómo hacer cada tarea, paso a paso. Busca por palabras o explora el índice" />
      <ManualView chapters={chapters} roleLabel={ROLE_ACCESS[session.role].label} />
    </>
  );
}
