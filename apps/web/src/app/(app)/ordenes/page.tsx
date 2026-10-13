import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
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
      <PageHeader title="Órdenes de trabajo" subtitle={`${orders.length} órdenes · origen PGMWin, siempre el dato vigente`}
        actions={<Link href="?accion=ot" scroll={false} className="inline-flex min-h-12 items-center gap-2 rounded-[10px] bg-primary px-4 text-[15px] font-bold text-white shadow-[0_6px_16px_-6px_var(--primary)] hover:bg-primary-hover"><Plus className="size-4" aria-hidden="true" />Nueva orden de trabajo</Link>} />
      <OrdersList orders={orders} />
    </>
  );
}
