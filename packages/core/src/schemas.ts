import { z } from "zod";

/** Aplicación de origen de un dato. `msm` = datos propios de la plataforma. */
export const SourceApp = z.enum(["pgmwin", "a3erp", "trello", "sesame", "msm"]);
export type SourceApp = z.infer<typeof SourceApp>;

/** Semáforo: siempre se muestra con color + icono + texto. */
export const Semaforo = z.enum(["ok", "warn", "bad"]);
export type Semaforo = z.infer<typeof Semaforo>;

export const Role = z.enum(["direccion", "ti", "oficina_tecnica", "administracion", "compras", "rrhh", "campo"]);
export type Role = z.infer<typeof Role>;

/** Trazabilidad: de dónde sale una cifra (principio 5 de CLAUDE.md). */
export const Provenance = z.object({
  source: SourceApp,
  entity: z.string(),
  period: z.string().optional(),
  fetchedAt: z.string(),
  url: z.string().optional(),
  calc: z.string().optional(),
});
export type Provenance = z.infer<typeof Provenance>;

export const Kpi = z.object({
  id: z.string(),
  label: z.string(),
  value: z.number(),
  unit: z.enum(["", "€", "%", "h"]).default(""),
  decimals: z.number().int().min(0).max(2).default(0),
  trend: z
    .object({ delta: z.number(), unit: z.string(), label: z.string(), goodWhen: z.enum(["up", "down"]) })
    .optional(),
  status: Semaforo,
  note: z.string().optional(),
  provenance: Provenance,
});
export type Kpi = z.infer<typeof Kpi>;

export const Alert = z.object({
  id: z.string(),
  severity: z.enum(["alta", "media", "baja"]),
  kind: z.enum(["anomalia", "contrato", "prl", "preventivo", "sistema", "facturacion", "stock"]),
  text: z.string(),
  actionLabel: z.string(),
  href: z.string(),
  provenance: Provenance,
});
export type Alert = z.infer<typeof Alert>;

export const Series = z.object({ label: z.string(), value: z.number() });
export type Series = z.infer<typeof Series>;

export const QuickAction = z.object({
  id: z.string(),
  label: z.string(),
  href: z.string(),
  /** `propuesta` = escribe en un sistema de registro mediante propuesta validable (ADR-0005). */
  kind: z.enum(["propuesta", "enlace"]),
});
export type QuickAction = z.infer<typeof QuickAction>;

/** Gráficos genéricos: cada rol decide el título y los datos (misma pieza de UI). */
export const TrendChart = z.object({ title: z.string(), data: z.array(Series) });
export const RankingChart = z.object({ title: z.string(), unit: z.enum(["eur", "keur", "num"]), data: z.array(Series) });
export const BreakdownChart = z.object({
  title: z.string(),
  centerLabel: z.string(),
  data: z.array(z.object({ label: z.string(), value: z.number(), tone: z.enum(["primary", "cyan", "warn", "ok"]) })),
});

export const Dashboard = z.object({
  role: Role,
  title: z.string(),
  periodLabel: z.string(),
  overall: Semaforo,
  overallText: z.string(),
  kpis: z.array(Kpi),
  trend: TrendChart.optional(),
  ranking: RankingChart.optional(),
  breakdown: BreakdownChart.optional(),
  alerts: z.array(Alert),
  quickActions: z.array(QuickAction),
});
export type Dashboard = z.infer<typeof Dashboard>;

export const WorkOrderStatus = z.enum(["abierta", "en_curso", "esperando_material", "cerrada"]);
export type WorkOrderStatus = z.infer<typeof WorkOrderStatus>;

export const WorkOrder = z.object({
  id: z.string(),
  externalId: z.string(),
  source: SourceApp,
  title: z.string(),
  client: z.string(),
  assetId: z.string(),
  assetName: z.string(),
  status: WorkOrderStatus,
  priority: z.enum(["urgente", "alta", "normal"]),
  type: z.enum(["correctivo", "preventivo"]),
  dueDate: z.string(),
  assignee: z.string().optional(),
  site: z.string(),
  mine: z.boolean().default(false),
  fetchedAt: z.string(),
});
export type WorkOrder = z.infer<typeof WorkOrder>;

export const Asset = z.object({
  id: z.string(),
  name: z.string(),
  client: z.string(),
  site: z.string(),
  category: z.string(),
  status: Semaforo,
  failures12m: z.number(),
  nextPreventive: z.string(),
});
export type Asset = z.infer<typeof Asset>;

export const TimelineEvent = z.object({
  id: z.string(),
  date: z.string(),
  kind: z.enum(["averia", "preventivo", "repuesto", "oferta", "factura"]),
  title: z.string(),
  detail: z.string(),
  source: SourceApp,
  costEur: z.number().optional(),
});
export type TimelineEvent = z.infer<typeof TimelineEvent>;

export const AssetDetail = Asset.extend({
  serial: z.string(),
  installedYear: z.number(),
  links: z.array(z.object({ source: SourceApp, externalId: z.string(), label: z.string() })),
  timeline: z.array(TimelineEvent),
  costByMonth: z.array(Series),
  insight: z.object({ text: z.string(), provenance: Provenance }).optional(),
});
export type AssetDetail = z.infer<typeof AssetDetail>;

export const ProposalStatus = z.enum(["pendiente", "aprobada", "rechazada"]);
export type ProposalStatus = z.infer<typeof ProposalStatus>;

export const Proposal = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  from: SourceApp,
  to: SourceApp,
  createdBy: z.string(),
  createdAt: z.string(),
  status: ProposalStatus,
  environment: z.enum(["pruebas", "produccion"]),
  /** Diff campo a campo (ADR-0005): lo que cambiará en el sistema destino. */
  diff: z.array(z.object({ field: z.string(), before: z.string().nullable(), after: z.string() })),
});
export type Proposal = z.infer<typeof Proposal>;

export const ConnectionHealth = z.enum(["conectado", "degradado", "caido", "pendiente"]);
export type ConnectionHealth = z.infer<typeof ConnectionHealth>;

export const Connection = z.object({
  source: SourceApp,
  name: z.string(),
  health: ConnectionHealth,
  transport: z.enum(["directo", "gateway"]),
  lastSyncAt: z.string().optional(),
  latencyMs: z.number().optional(),
  capabilities: z.array(z.object({ name: z.string(), state: z.enum(["verified", "assumed", "no-go"]) })),
  note: z.string().optional(),
});
export type Connection = z.infer<typeof Connection>;

export const Report = z.object({
  id: z.string(),
  title: z.string(),
  client: z.string(),
  period: z.string(),
  status: z.enum(["borrador", "revisado", "emitido"]),
  kpis: z.array(z.object({ label: z.string(), value: z.string() })),
  summary: z.string(),
});
export type Report = z.infer<typeof Report>;

/** Sin fuente no hay respuesta (ADR-0006): o hay `sources` o `noData`. */
export const CopilotAnswer = z
  .object({
    answer: z.string(),
    confidence: z.enum(["alta", "media", "baja"]),
    sources: z.array(Provenance),
    noData: z.boolean().default(false),
  })
  .refine((a) => a.noData || a.sources.length > 0, {
    message: "Toda respuesta con datos necesita al menos una fuente",
  });
export type CopilotAnswer = z.infer<typeof CopilotAnswer>;
