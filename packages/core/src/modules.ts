import { z } from "zod";
import { Provenance, Semaforo, Series, SourceApp } from "./schemas";

/* ───────── Clientes (vista 360) ───────── */
export const ClientSummary = z.object({
  id: z.string(),
  name: z.string(),
  sector: z.string(),
  status: Semaforo,
  openOrders: z.number(),
  annualCostEur: z.number(),
  contractHoursUsedPct: z.number().nullable(),
});
export type ClientSummary = z.infer<typeof ClientSummary>;

export const ClientDetail = ClientSummary.extend({
  contract: z.object({ type: z.string(), hoursBudget: z.number(), hoursUsed: z.number(), renewal: z.string() }).nullable(),
  links: z.array(z.object({ source: SourceApp, externalId: z.string(), label: z.string() })),
  sites: z.array(z.string()),
  contact: z.object({ name: z.string(), role: z.string() }),
  costByMonth: z.array(Series),
  assets: z.array(z.object({ id: z.string(), name: z.string(), status: Semaforo })),
  recentOrders: z.array(z.object({ id: z.string(), title: z.string(), status: z.string(), date: z.string() })),
  offers: z.array(z.object({ id: z.string(), title: z.string(), amountEur: z.number(), stage: z.string() })),
  insight: z.object({ text: z.string(), provenance: Provenance }).optional(),
});
export type ClientDetail = z.infer<typeof ClientDetail>;

/* ───────── Comercial (Trello) ───────── */
export const OfferStage = z.enum(["borrador", "enviada", "negociacion", "ganada", "perdida"]);
export type OfferStage = z.infer<typeof OfferStage>;
export const Offer = z.object({
  id: z.string(),
  title: z.string(),
  client: z.string(),
  amountEur: z.number(),
  stage: OfferStage,
  probability: z.number().min(0).max(100),
  owner: z.string(),
  dueDate: z.string(),
  source: SourceApp,
});
export type Offer = z.infer<typeof Offer>;

/* ───────── Facturación (A3) ───────── */
export const FinanceDoc = z.object({
  id: z.string(),
  kind: z.enum(["albaran", "factura"]),
  client: z.string(),
  amountEur: z.number(),
  status: z.enum(["pendiente_facturar", "emitida", "cobrada", "vencida"]),
  date: z.string(),
  dueDate: z.string().nullable(),
  workOrder: z.string().nullable(),
  source: SourceApp,
});
export type FinanceDoc = z.infer<typeof FinanceDoc>;
export const FinanceOverview = z.object({
  docs: z.array(FinanceDoc),
  billedByMonth: z.array(Series),
  pendingByClient: z.array(Series),
});
export type FinanceOverview = z.infer<typeof FinanceOverview>;

/* ───────── Compras y almacén ───────── */
export const PurchaseOrder = z.object({
  id: z.string(),
  supplier: z.string(),
  summary: z.string(),
  amountEur: z.number(),
  status: z.enum(["pendiente", "enviado", "recibido", "retrasado"]),
  eta: z.string(),
  forOrder: z.string().nullable(),
});
export type PurchaseOrder = z.infer<typeof PurchaseOrder>;
export const StockItem = z.object({
  ref: z.string(),
  name: z.string(),
  stock: z.number(),
  min: z.number(),
  location: z.string(),
  supplier: z.string(),
  status: Semaforo,
});
export type StockItem = z.infer<typeof StockItem>;
export const PurchasingOverview = z.object({
  orders: z.array(PurchaseOrder),
  stock: z.array(StockItem),
  spendBySupplier: z.array(Series),
});
export type PurchasingOverview = z.infer<typeof PurchasingOverview>;

/* ───────── Personal (Sésame) ───────── */
export const Employee = z.object({
  id: z.string(),
  name: z.string(),
  position: z.string(),
  department: z.string(),
  today: z.enum(["trabajando", "ausente", "vacaciones", "baja", "libra"]),
  clockIn: z.string().nullable(),
  site: z.string().nullable(),
  hoursMonth: z.number(),
});
export type Employee = z.infer<typeof Employee>;
export const PeopleOverview = z.object({
  employees: z.array(Employee),
  absenceByMonth: z.array(Series),
  hoursByDept: z.array(Series),
});
export type PeopleOverview = z.infer<typeof PeopleOverview>;

/* ───────── PRL y CAE ───────── */
export const Accreditation = z.object({
  id: z.string(),
  employee: z.string(),
  course: z.string(),
  expires: z.string(),
  status: Semaforo,
  centers: z.array(z.string()),
});
export type Accreditation = z.infer<typeof Accreditation>;
export const CenterAccess = z.object({
  id: z.string(),
  center: z.string(),
  client: z.string(),
  platform: z.string(),
  docsOk: z.number(),
  docsTotal: z.number(),
  nextDeadline: z.string(),
  status: Semaforo,
});
export type CenterAccess = z.infer<typeof CenterAccess>;
export const PrlOverview = z.object({
  accreditations: z.array(Accreditation),
  centers: z.array(CenterAccess),
  expiringByMonth: z.array(Series),
});
export type PrlOverview = z.infer<typeof PrlOverview>;

/* ───────── Mantenimiento preventivo ───────── */
export const PreventiveTask = z.object({
  id: z.string(),
  assetId: z.string(),
  assetName: z.string(),
  client: z.string(),
  task: z.string(),
  frequency: z.string(),
  dueDate: z.string(),
  status: z.enum(["al_dia", "proximo", "vencido"]),
  assignee: z.string(),
});
export type PreventiveTask = z.infer<typeof PreventiveTask>;
export const MaintenanceOverview = z.object({
  tasks: z.array(PreventiveTask),
  compliance: z.array(Series),
});
export type MaintenanceOverview = z.infer<typeof MaintenanceOverview>;

/* ───────── Alertas ───────── */
export const AlertItem = z.object({
  id: z.string(),
  severity: z.enum(["alta", "media", "baja"]),
  kind: z.enum(["anomalia", "contrato", "prl", "preventivo", "sistema", "facturacion", "stock"]),
  title: z.string(),
  explanation: z.string(),
  entity: z.string(),
  href: z.string(),
  status: z.enum(["nueva", "en_revision", "resuelta"]),
  raisedAt: z.string(),
  evidence: z.array(Series),
  provenance: Provenance,
});
export type AlertItem = z.infer<typeof AlertItem>;

/* ───────── Sistema: usuarios y auditoría ───────── */
export const SystemUser = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.string(),
  lastSeen: z.string().nullable(),
  active: z.boolean(),
});
export type SystemUser = z.infer<typeof SystemUser>;
export const AuditEvent = z.object({
  id: z.string(),
  at: z.string(),
  actor: z.string(),
  app: SourceApp,
  action: z.string(),
  entity: z.string(),
  detail: z.string(),
});
export type AuditEvent = z.infer<typeof AuditEvent>;

/* ───────── Transversal ───────── */
export const Notification = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  at: z.string(),
  href: z.string(),
  tone: z.enum(["info", "warn", "bad", "ok"]),
  read: z.boolean(),
});
export type Notification = z.infer<typeof Notification>;

export const SearchHit = z.object({
  id: z.string(),
  kind: z.enum(["cliente", "activo", "orden", "oferta", "persona"]),
  title: z.string(),
  subtitle: z.string(),
  href: z.string(),
  source: SourceApp,
});
export type SearchHit = z.infer<typeof SearchHit>;

/** Entrada de una acción rápida (se convierte en propuesta con aprobación humana). */
export const NewWorkOrderInput = z.object({
  client: z.string().min(1).max(120),
  asset: z.string().min(1).max(120),
  description: z.string().min(3).max(400),
  priority: z.enum(["normal", "alta", "urgente"]),
});
export type NewWorkOrderInput = z.infer<typeof NewWorkOrderInput>;
