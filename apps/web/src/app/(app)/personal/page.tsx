import type { Metadata } from "next";
import { Clock, MapPin } from "lucide-react";
import type { Employee } from "@msm/core";
import { Avatar, Badge, BarList, Card, CardTitle, Item, LineChart, Stagger, StatCard } from "@msm/ui";
import { PageHeader } from "@/components/page-header";
import { getProvider } from "@/lib/data";
import { requireAccess } from "@/lib/session";

export const metadata: Metadata = { title: "Personal" };

const TODAY: Record<Employee["today"], { label: string; tone: "ok" | "info" | "warn" | "bad" | "neutral" }> = {
  trabajando: { label: "Trabajando", tone: "ok" }, libra: { label: "Libra", tone: "neutral" }, vacaciones: { label: "Vacaciones", tone: "info" },
  baja: { label: "Baja", tone: "bad" }, ausente: { label: "Ausente", tone: "warn" },
};

export default async function PersonalPage() {
  await requireAccess("personal");
  const p = await getProvider().getPeople();
  const working = p.employees.filter((e) => e.today === "trabajando").length;
  const away = p.employees.filter((e) => ["ausente", "vacaciones", "baja"].includes(e.today)).length;
  return (
    <>
      <PageHeader title="Personal" subtitle="Fichajes y ausencias de Sésame HR, junto a dónde está cada técnico" />
      <Stagger className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(min(100%,205px),1fr))] gap-4">
        <StatCard label="Presentes hoy" value={working} note={`de ${p.employees.length} en plantilla`} />
        <StatCard label="Ausentes" value={away} status={away > 2 ? "warn" : undefined} note="vacaciones, bajas y permisos" />
        <StatCard label="Horas del mes" value={p.employees.reduce((t, e) => t + e.hoursMonth, 0)} unit="h" />
        <StatCard label="Absentismo" value={p.absenceByMonth.at(-1)?.value ?? 0} unit="%" decimals={1} trend={{ delta: 0.5, unit: " puntos", label: "vs. mes anterior", goodWhen: "down" }} />
      </Stagger>
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card><CardTitle>Absentismo por mes (%)</CardTitle><LineChart data={p.absenceByMonth} title="Absentismo por mes" height={180} /></Card>
        <Card><CardTitle>Horas por departamento (mes)</CardTitle><BarList data={p.hoursByDept} unit="num" /></Card>
      </div>
      <Stagger className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {p.employees.map((e) => {
          const t = TODAY[e.today];
          return (
            <Item key={e.id}>
              <article className="flex h-full gap-4 rounded-2xl border border-border bg-surface p-4">
                <Avatar name={e.name} className="size-12 text-base" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-[17px] font-extrabold">{e.name}</h3><Badge tone={t.tone}>{t.label}</Badge></div>
                  <p className="text-[14.5px] text-muted">{e.position}</p>
                  <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13.5px] text-muted">
                    {e.clockIn ? <span className="flex items-center gap-1.5"><Clock className="size-4" aria-hidden="true" />Entrada {e.clockIn}</span> : null}
                    {e.site ? <span className="flex items-center gap-1.5"><MapPin className="size-4" aria-hidden="true" />{e.site}</span> : null}
                    <span className="tabular-nums">{e.hoursMonth} h este mes</span>
                  </p>
                </div>
              </article>
            </Item>
          );
        })}
      </Stagger>
    </>
  );
}
