import type { Metadata } from "next";
import { Card, CardTitle, BarList, LineChart, Stagger, StatCard } from "@msm/ui";
import { FinanceView } from "@/components/finance-view";
import { PageHeader } from "@/components/page-header";
import { getProvider } from "@/lib/data";
import { requireAccess } from "@/lib/session";

export const metadata: Metadata = { title: "Facturación" };

export default async function FacturacionPage() {
  await requireAccess("facturacion");
  const f = await getProvider().getFinance();
  const sum = (s: string) => f.docs.filter((d) => d.status === s).reduce((t, d) => t + d.amountEur, 0);
  const cnt = (s: string) => f.docs.filter((d) => d.status === s).length;
  return (
    <>
      <PageHeader title="Facturación" subtitle="Del albarán de PGMWin a la factura de A3ERP, sin teclear dos veces" />
      <Stagger className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(min(100%,205px),1fr))] gap-4">
        <StatCard label="Sin facturar" value={sum("pendiente_facturar")} unit="€" status="warn" note={`${cnt("pendiente_facturar")} albaranes`} />
        <StatCard label="Facturado este mes" value={f.billedByMonth.at(-1)?.value ?? 0} unit="€" trend={{ delta: 5.8, unit: "%", label: "vs. mes anterior", goodWhen: "up" }} />
        <StatCard label="Vencido" value={sum("vencida")} unit="€" status="bad" note={`${cnt("vencida")} facturas`} />
        <StatCard label="Pendiente de cobro" value={sum("emitida")} unit="€" note={`${cnt("emitida")} facturas en plazo`} />
      </Stagger>
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card><CardTitle>Facturación por mes (€)</CardTitle><LineChart data={f.billedByMonth} title="Facturación por mes" height={190} /></Card>
        <Card><CardTitle>Pendiente de facturar por cliente</CardTitle><BarList data={f.pendingByClient} unit="eur" /></Card>
      </div>
      <FinanceView docs={f.docs} />
    </>
  );
}
