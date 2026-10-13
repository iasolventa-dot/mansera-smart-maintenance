import type { Metadata } from "next";
import { Download, Send } from "lucide-react";
import { Badge, Button, Card, Item, Stagger } from "@msm/ui";
import { PageHeader } from "@/components/page-header";
import { getProvider } from "@/lib/data";
import { requireAccess } from "@/lib/session";

export const metadata: Metadata = { title: "Informes" };
const TONE = { borrador: "warn", revisado: "info", emitido: "ok" } as const;
const LABEL = { borrador: "Borrador · pendiente de revisión", revisado: "Revisado · listo para emitir", emitido: "Emitido" } as const;

export default async function InformesPage() {
  await requireAccess("informes");
  const reports = await getProvider().listReports();
  return (
    <>
      <PageHeader title="Informes de cliente" subtitle="Las cifras las calcula el sistema; el texto lo redacta la IA y lo revisa una persona antes de emitir" />
      <Stagger className="grid gap-4 xl:grid-cols-2">
        {reports.map((r) => (
          <Item key={r.id}>
            <Card className="h-full">
              <Badge tone={TONE[r.status]}>{LABEL[r.status]}</Badge>
              <h2 className="mt-3 text-[20px] font-extrabold leading-snug">{r.client}</h2>
              <p className="text-muted">{r.title}</p>
              <dl className="mt-4 grid grid-cols-2 gap-3">
                {r.kpis.map((k) => (
                  <div key={k.label} className="rounded-xl bg-bg p-3.5">
                    <dt className="text-[13px] font-semibold text-muted">{k.label}</dt>
                    <dd className="mt-0.5 text-[22px] font-extrabold tabular-nums">{k.value}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 text-[16px] leading-relaxed">{r.summary}</p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <Button variant="secondary"><Download className="size-4" aria-hidden="true" />Descargar PDF</Button>
                <Button disabled={r.status === "borrador"}><Send className="size-4" aria-hidden="true" />{r.status === "emitido" ? "Reenviar" : "Emitir"}</Button>
              </div>
            </Card>
          </Item>
        ))}
      </Stagger>
    </>
  );
}
