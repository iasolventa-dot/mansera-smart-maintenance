import type { Metadata } from "next";
import Link from "next/link";
import { Camera, ChevronRight, Mic, Navigation } from "lucide-react";
import { Badge, Button, Card, Item, Stagger } from "@msm/ui";
import { PageHeader } from "@/components/page-header";
import { PRIORITY_TONE, STATUS_LABEL, STATUS_TONE } from "@/components/labels";
import { getProvider } from "@/lib/data";
import { requireAccess } from "@/lib/session";

export const metadata: Metadata = { title: "Mi día" };

export default async function CampoPage() {
  const session = await requireAccess("campo");
  const orders = await getProvider().listWorkOrders({ onlyMine: true });
  const first = orders[0];

  return (
    <>
      <PageHeader title={`Buenos días, ${session.name.split(" ")[0]}`} subtitle={`Tienes ${orders.length} órdenes asignadas hoy`} />

      {first ? (
        <Card className="mesh-hero mb-6 !border-0 !p-6 text-white">
          <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-cyan">Siguiente · {first.externalId}</p>
          <h2 className="mt-2 text-[26px] font-extrabold leading-tight">{first.title}</h2>
          <p className="mt-1 text-[17px] text-white/85">{first.assetName} · {first.client}</p>
          <p className="mt-1 flex items-center gap-1.5 text-white/75"><Navigation className="size-4" aria-hidden="true" />{first.site}</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Button size="lg" className="!bg-white !text-brand !shadow-none"><Mic className="size-5" aria-hidden="true" />Dictar parte</Button>
            <Button size="lg" className="!border !border-white/40 !bg-white/10 !text-white !shadow-none"><Camera className="size-5" aria-hidden="true" />Foto</Button>
          </div>
        </Card>
      ) : null}

      <h2 className="mb-3 text-lg font-extrabold">Mis órdenes de hoy</h2>
      <Stagger className="grid gap-3">
        {orders.map((o) => (
          <Item key={o.id}>
            <Link href={`/activos/${o.assetId}`} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 active:scale-[0.99]">
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex flex-wrap gap-2">
                  <Badge tone={STATUS_TONE[o.status]}>{STATUS_LABEL[o.status]}</Badge>
                  {o.priority !== "normal" ? <Badge tone={PRIORITY_TONE[o.priority]}>{o.priority === "urgente" ? "Urgente" : "Alta"}</Badge> : null}
                </div>
                <p className="text-[19px] font-extrabold leading-snug">{o.title}</p>
                <p className="text-[16px] text-muted">{o.assetName} · {o.site}</p>
              </div>
              <ChevronRight className="size-6 text-muted" aria-hidden="true" />
            </Link>
          </Item>
        ))}
      </Stagger>
    </>
  );
}
