import { Database, FlaskConical, TriangleAlert } from "lucide-react";
import { cn } from "@msm/ui";
import type { LiveSource } from "@/lib/live";
import { ago } from "./page-header";

const NAME = { sesame: "Sésame HR", trello: "Trello" } as const;

/** Dice SIEMPRE de dónde salen los datos de la pantalla: reales (y cuándo se leyeron) o de ejemplo. */
export function DataSource({ source, demoReason }: { source: LiveSource | null; demoReason?: string }) {
  if (!source) {
    return (
      <p className="mb-4 flex items-start gap-2 rounded-xl border border-border bg-bg p-3 text-[14px] text-muted" data-testid="data-source">
        <FlaskConical className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span><strong className="text-text">Datos de ejemplo.</strong> {demoReason ?? "Se mostrarán los datos reales cuando la conexión esté configurada en Conexiones."}</span>
      </p>
    );
  }
  const Icon = source.stale ? TriangleAlert : Database;
  return (
    <p className={cn("mb-4 flex items-start gap-2 rounded-xl p-3 text-[14px]", source.stale ? "bg-warn-soft text-warn-text" : "bg-ok-soft text-ok-text")} data-testid="data-source">
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>
        <strong>Datos reales de {NAME[source.app]}</strong> · leídos {ago(source.fetchedAt)}.
        {source.stale ? ` No se pudo actualizar (${source.note ?? "error de conexión"}): son los últimos datos disponibles.` : ""}
      </span>
    </p>
  );
}
