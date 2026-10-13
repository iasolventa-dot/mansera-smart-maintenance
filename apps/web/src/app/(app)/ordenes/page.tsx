import type { Metadata } from "next";
import { OrdersList } from "@/components/orders-list";
import { PageHeader } from "@/components/page-header";
import { getProvider } from "@/lib/data";
import { requireAccess } from "@/lib/session";

export const metadata: Metadata = { title: "Órdenes de trabajo" };

export default async function OrdenesPage() {
  await requireAccess("ordenes");
  const orders = await getProvider().listWorkOrders();
  return (
    <>
      <PageHeader title="Órdenes de trabajo" subtitle={`${orders.length} órdenes · origen PGMWin, siempre el dato vigente`} />
      <OrdersList orders={orders} />
    </>
  );
}
