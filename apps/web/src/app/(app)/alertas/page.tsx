import type { Metadata } from "next";
import { AlertsView } from "@/components/alerts-view";
import { PageHeader } from "@/components/page-header";
import { getProvider } from "@/lib/data";
import { requireAccess } from "@/lib/session";

export const metadata: Metadata = { title: "Alertas" };

/** Cada rol ve solo los tipos de alerta de su departamento. */
const KINDS = {
  direccion: null,
  oficina_tecnica: ["anomalia", "preventivo", "contrato"],
  administracion: ["facturacion", "contrato"],
  compras: ["stock"],
  rrhh: ["prl"],
  ti: ["sistema"],
  campo: [],
} as const;

export default async function AlertasPage() {
  const session = await requireAccess("alertas");
  const all = await getProvider().listAlerts();
  const allowed = KINDS[session.role];
  const alerts = allowed ? all.filter((a) => (allowed as readonly string[]).includes(a.kind)) : all;
  return (
    <>
      <PageHeader title="Alertas" subtitle="Reglas y estadística, explicadas con su evidencia. Una anomalía no es una predicción" />
      <AlertsView alerts={alerts} />
    </>
  );
}
