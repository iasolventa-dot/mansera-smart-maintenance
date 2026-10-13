import type { Metadata } from "next";
import { CopilotChat } from "@/components/copilot-chat";
import { PageHeader } from "@/components/page-header";
import { requireAccess } from "@/lib/session";
import { askCopilot } from "../../actions";

export const metadata: Metadata = { title: "Copiloto de IA" };

export default async function CopilotoPage() {
  await requireAccess("copiloto");
  return (
    <>
      <PageHeader title="Copiloto de IA" subtitle="Solo lectura · sin fuente no hay respuesta" />
      <CopilotChat ask={askCopilot} />
    </>
  );
}
