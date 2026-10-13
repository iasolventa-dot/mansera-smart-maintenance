import type { Metadata } from "next";
import { Card, CardTitle, LineChart, Stagger, StatCard } from "@msm/ui";
import { MaintenanceView } from "@/components/maintenance-view";
import { PageHeader } from "@/components/page-header";
import { getProvider } from "@/lib/data";
import { requireAccess } from "@/lib/session";

export const metadata: Metadata = { title: "Mantenimiento" };

export default async function MantenimientoPage() {
  await requireAccess("mantenimiento");
  const m = await getProvider().getMaintenance();
  const count = (s: string) => m.tasks.filter((t) => t.status === s).length;
  const last = m.compliance[m.compliance.length - 1]?.value ?? 0;
  return (
    <>
      <PageHeader title="Mantenimiento preventivo" subtitle="Plan de preventivos de todos los activos, ordenado por fecha" />
      <Stagger className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(min(100%,205px),1fr))] gap-4">
        <StatCard label="Cumplimiento" value={last} unit="%" decimals={1} trend={{ delta: 2.1, unit: " puntos", label: "vs. mes anterior", goodWhen: "up" }} />
        <StatCard label="Vencidos" value={count("vencido")} status={count("vencido") ? "bad" : undefined} note="requieren acción hoy" />
        <StatCard label="Próximos 10 días" value={count("proximo")} status="warn" note="planificar técnicos" />
        <StatCard label="Al día" value={count("al_dia")} />
      </Stagger>
      <Card className="mb-6"><CardTitle>Cumplimiento por mes (%)</CardTitle><LineChart data={m.compliance} title="Cumplimiento del preventivo por mes" height={180} /></Card>
      <MaintenanceView tasks={m.tasks} />
    </>
  );
}
