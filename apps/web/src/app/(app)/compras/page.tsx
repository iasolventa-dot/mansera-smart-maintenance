import type { Metadata } from "next";
import { BarList, Card, CardTitle, Stagger, StatCard } from "@msm/ui";
import { PageHeader } from "@/components/page-header";
import { PurchasingView } from "@/components/purchasing-view";
import { getProvider } from "@/lib/data";
import { requireAccess } from "@/lib/session";

export const metadata: Metadata = { title: "Compras y almacén" };

export default async function ComprasPage() {
  await requireAccess("compras");
  const p = await getProvider().getPurchasing();
  const open = p.orders.filter((o) => o.status !== "recibido");
  const late = p.orders.filter((o) => o.status === "retrasado");
  const low = p.stock.filter((s) => s.status !== "ok");
  return (
    <>
      <PageHeader title="Compras y almacén" subtitle="Pedidos a proveedores y existencias, ligados a las órdenes que las necesitan" />
      <Stagger className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(min(100%,205px),1fr))] gap-4">
        <StatCard label="Pedidos abiertos" value={open.length} note={`${open.reduce((t, o) => t + o.amountEur, 0).toLocaleString("es-ES")} € en curso`} />
        <StatCard label="Retrasados" value={late.length} status={late.length ? "bad" : undefined} note="bloquean órdenes de trabajo" />
        <StatCard label="Bajo mínimos" value={low.length} status={low.length ? "warn" : undefined} note="revisar reposición" />
        <StatCard label="Proveedores activos" value={new Set(p.orders.map((o) => o.supplier)).size} />
      </Stagger>
      <Card className="mb-6"><CardTitle>Gasto por proveedor (mes)</CardTitle><BarList data={p.spendBySupplier} unit="eur" /></Card>
      <PurchasingView orders={p.orders} stock={p.stock} />
    </>
  );
}
