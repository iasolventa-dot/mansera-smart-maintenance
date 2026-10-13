import { canAccess, type NavId } from "../access";
import type { DataProvider } from "../provider";
import {
  AlertItem, ClientDetail, ClientSummary, FinanceOverview, MaintenanceOverview,
  NewWorkOrderInput, Notification, Offer, PeopleOverview, PrlOverview, PurchasingOverview, SearchHit, SystemUser, AuditEvent,
} from "../modules";
import {
  Asset, AssetDetail, Connection, CopilotAnswer, Dashboard, Proposal, Report, WorkOrder,
  type Alert, type Kpi, type Provenance, type Role,
} from "../schemas";
import { ASSETS, ASSET_DETAILS, CONNECTIONS, PROPOSALS, REPORTS, WORK_ORDERS } from "./fixtures";
import {
  ABSENCE_BY_MONTH, ACCREDITATIONS, ALERTS, AUDIT, BILLED_BY_MONTH, CENTERS, CLIENT_DETAILS, COMPLIANCE, EMPLOYEES,
  EXPIRING_BY_MONTH, FINANCE_DOCS, HOURS_BY_DEPT, OFFERS, PENDING_BY_CLIENT, PREVENTIVE, PURCHASE_ORDERS,
  SPEND_BY_SUPPLIER, STOCK, SYSTEM_USERS, agoIso,
} from "./modules-fixtures";

const prov = (p: Omit<Provenance, "fetchedAt">): Provenance => ({ ...p, fetchedAt: new Date().toISOString() });
const PERIOD = "septiembre de 2026";
const eur = (n: number) => new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(n);

type KpiInput = Omit<Kpi, "provenance" | "unit" | "decimals"> & { unit?: Kpi["unit"]; decimals?: number; p: Omit<Provenance, "fetchedAt"> };
const k = ({ p, unit = "", decimals = 0, ...rest }: KpiInput): Kpi => ({ ...rest, unit, decimals, provenance: prov(p) });

const FAILURES = [["oct", 35], ["nov", 41], ["dic", 38], ["ene", 45], ["feb", 52], ["mar", 47], ["abr", 39], ["may", 36], ["jun", 42], ["jul", 33], ["ago", 29], ["sep", 31]]
  .map(([label, value]) => ({ label: label as string, value: value as number }));
const ORDERS_BY_STATE = [
  { label: "Abiertas", value: 128, tone: "primary" as const }, { label: "En curso", value: 64, tone: "cyan" as const },
  { label: "Esperando material", value: 21, tone: "warn" as const }, { label: "Cerradas", value: 312, tone: "ok" as const },
];
const COST_BY_CLIENT = [
  { label: "Embotelladora Sur", value: 12400 }, { label: "Logística Norte", value: 9800 }, { label: "Planta Agroalimentaria", value: 7600 },
  { label: "Centro Comercial Este", value: 5900 }, { label: "Hospital Regional", value: 4100 },
];

/* Alertas visibles en el panel de cada rol */
const ROLE_ALERT_KINDS: Record<Role, AlertItem["kind"][]> = {
  direccion: ["anomalia", "contrato", "prl", "preventivo", "facturacion", "stock", "sistema"],
  oficina_tecnica: ["anomalia", "preventivo", "contrato"],
  administracion: ["facturacion", "contrato"],
  compras: ["stock"],
  rrhh: ["prl"],
  ti: ["sistema"],
  campo: [],
};
const SEV = { alta: 0, media: 1, baja: 2 } as const;
const alertsFor = (role: Role): Alert[] =>
  ALERTS.filter((a) => a.status !== "resuelta" && ROLE_ALERT_KINDS[role].includes(a.kind))
    .sort((a, b) => SEV[a.severity] - SEV[b.severity]).slice(0, 4)
    .map((a) => ({ id: a.id, severity: a.severity, kind: a.kind, text: `${a.entity}: ${a.title}.`, actionLabel: "Ver detalle", href: "/alertas", provenance: a.provenance }));

function dashboardFor(role: Role): Dashboard {
  const ordenes = k({ id: "ot-abiertas", label: "Órdenes abiertas", value: 128, status: "ok", trend: { delta: -9, unit: "%", label: "vs. mes anterior", goodWhen: "down" }, p: { source: "pgmwin", entity: "Órdenes de trabajo abiertas", period: "a fecha de hoy", calc: "Recuento de OT en estado abierta, en curso o esperando material" } });
  const preventivo = k({ id: "cumpl-prev", label: "Cumplimiento preventivo", value: 94.2, unit: "%", decimals: 1, status: "ok", trend: { delta: 2.1, unit: " puntos", label: "vs. mes anterior", goodWhen: "up" }, p: { source: "pgmwin", entity: "Planes preventivos", period: PERIOD, calc: "Preventivos ejecutados en plazo / preventivos programados" } });
  const respuesta = k({ id: "t-resp", label: "Tiempo medio de respuesta", value: 3.4, unit: "h", decimals: 1, status: "warn", note: "Objetivo de contrato: 3 h", trend: { delta: -0.6, unit: " h", label: "vs. mes anterior", goodWhen: "down" }, p: { source: "pgmwin", entity: "OT correctivas", period: PERIOD, calc: "Media de (inicio de intervención − aviso)" } });
  const coste = k({ id: "coste", label: "Coste de mantenimiento", value: 48320, unit: "€", status: "warn", trend: { delta: 3.1, unit: "%", label: "vs. mes anterior", goodWhen: "down" }, p: { source: "pgmwin", entity: "Costes imputados a OT", period: PERIOD, calc: "Mano de obra + repuestos imputados a OT cerradas" } });
  const prl = k({ id: "prl", label: "PRL por vencer", value: ACCREDITATIONS.filter((a) => a.status !== "ok").length, status: "bad", note: "acreditaciones en 45 días", p: { source: "sesame", entity: "Formación PRL del personal", period: "próximos 45 días", calc: "Acreditaciones con vencimiento ≤ 45 días" } });

  const pendDocs = FINANCE_DOCS.filter((d) => d.status === "pendiente_facturar");
  const overdue = FINANCE_DOCS.filter((d) => d.status === "vencida");
  const openPO = PURCHASE_ORDERS.filter((o) => o.status !== "recibido");
  const lowStock = STOCK.filter((s) => s.status !== "ok");
  const present = EMPLOYEES.filter((e) => e.today === "trabajando").length;
  const absent = EMPLOYEES.filter((e) => ["ausente", "vacaciones", "baja"].includes(e.today)).length;

  const base = { role, periodLabel: PERIOD, alerts: alertsFor(role) };
  const quick: Dashboard["quickActions"] = [
    { id: "qa-ot", label: "Nueva orden de trabajo", href: "?accion=ot", kind: "propuesta" },
    { id: "qa-fact", label: "Facturar albarán", href: "/facturacion", kind: "propuesta" },
    { id: "qa-inf", label: "Generar informe", href: "/informes", kind: "enlace" },
  ];

  switch (role) {
    case "direccion":
      return Dashboard.parse({ ...base, title: "Panel de dirección", overall: "warn", overallText: `${base.alerts.length} asuntos requieren tu atención`, kpis: [ordenes, preventivo, respuesta, coste, prl],
        trend: { title: "Averías por mes", data: FAILURES }, ranking: { title: "Coste por cliente", unit: "keur", data: COST_BY_CLIENT }, breakdown: { title: "Órdenes por estado", centerLabel: "órdenes", data: ORDERS_BY_STATE }, quickActions: quick });
    case "oficina_tecnica":
      return Dashboard.parse({ ...base, title: "Panel técnico", overall: "warn", overallText: "1 anomalía y 2 preventivos próximos a vencer",
        kpis: [ordenes, preventivo, respuesta, k({ id: "anom", label: "Anomalías abiertas", value: ALERTS.filter((a) => a.kind === "anomalia" && a.status !== "resuelta").length, status: "warn", note: "con evidencia en cada una", p: { source: "msm", entity: "alerts", calc: "Alertas de tipo anomalía no resueltas" } })],
        trend: { title: "Averías por mes", data: FAILURES }, ranking: { title: "Activos con más averías (12 m)", unit: "num", data: ASSETS.slice().sort((a, b) => b.failures12m - a.failures12m).slice(0, 5).map((a) => ({ label: a.name, value: a.failures12m })) },
        breakdown: { title: "Órdenes por estado", centerLabel: "órdenes", data: ORDERS_BY_STATE }, quickActions: [quick[0]!, { id: "qa-prev", label: "Ver preventivos", href: "/mantenimiento", kind: "enlace" }, quick[2]!] });
    case "administracion":
      return Dashboard.parse({ ...base, title: "Panel de administración", overall: "warn", overallText: `${pendDocs.length} albaranes sin facturar y ${overdue.length} facturas vencidas`,
        kpis: [
          k({ id: "alb", label: "Albaranes sin facturar", value: pendDocs.length, status: "warn", note: `por valor de ${eur(pendDocs.reduce((s, d) => s + d.amountEur, 0))} €`, p: { source: "a3erp", entity: "Albaranes pendientes de facturar", period: "a fecha de hoy", calc: "Albaranes cerrados sin factura asociada" } }),
          k({ id: "fact-mes", label: "Facturado este mes", value: 48320, unit: "€", status: "ok", trend: { delta: 5.8, unit: "%", label: "vs. mes anterior", goodWhen: "up" }, p: { source: "a3erp", entity: "Facturas emitidas", period: PERIOD, calc: "Suma de base imponible de facturas emitidas en el mes" } }),
          k({ id: "venc", label: "Facturas vencidas", value: overdue.length, status: "bad", note: `${eur(overdue.reduce((s, d) => s + d.amountEur, 0))} € pendientes de cobro`, p: { source: "a3erp", entity: "Facturas emitidas", calc: "Facturas con vencimiento anterior a hoy y sin cobro" } }),
          k({ id: "ot-sin-alb", label: "OT cerradas sin albarán", value: 3, status: "warn", p: { source: "pgmwin", entity: "Órdenes de trabajo cerradas", calc: "OT cerradas sin albarán generado" } }),
        ],
        trend: { title: "Facturación por mes (€)", data: BILLED_BY_MONTH }, ranking: { title: "Pendiente de facturar por cliente", unit: "eur", data: PENDING_BY_CLIENT },
        breakdown: { title: "Documentos por estado", centerLabel: "documentos", data: [{ label: "Pendientes de facturar", value: pendDocs.length, tone: "warn" }, { label: "Emitidas", value: FINANCE_DOCS.filter((d) => d.status === "emitida").length, tone: "primary" }, { label: "Vencidas", value: overdue.length, tone: "warn" }, { label: "Cobradas", value: FINANCE_DOCS.filter((d) => d.status === "cobrada").length, tone: "ok" }] },
        quickActions: [quick[1]!, { id: "qa-fac", label: "Ver facturación", href: "/facturacion", kind: "enlace" }, quick[2]!] });
    case "compras":
      return Dashboard.parse({ ...base, title: "Panel de compras", overall: "warn", overallText: "1 pedido retrasado bloquea una orden de trabajo",
        kpis: [
          k({ id: "po", label: "Pedidos abiertos", value: openPO.length, status: "ok", p: { source: "a3erp", entity: "Pedidos de compra", calc: "Pedidos sin recepción completa" } }),
          k({ id: "po-late", label: "Pedidos retrasados", value: PURCHASE_ORDERS.filter((o) => o.status === "retrasado").length, status: "bad", note: "bloquea OT-26-3302", p: { source: "a3erp", entity: "Pedidos de compra", calc: "ETA anterior a hoy y sin recepción" } }),
          k({ id: "stock-low", label: "Repuestos bajo mínimos", value: lowStock.length, status: "warn", note: "revisar reposición", p: { source: "a3erp", entity: "Existencias", calc: "Stock actual < stock mínimo" } }),
          k({ id: "spend", label: "Gasto en repuestos", value: SPEND_BY_SUPPLIER.reduce((s, x) => s + x.value, 0), unit: "€", status: "ok", trend: { delta: -4.2, unit: "%", label: "vs. mes anterior", goodWhen: "down" }, p: { source: "a3erp", entity: "Pedidos de compra recibidos", period: PERIOD, calc: "Suma de pedidos recibidos en el mes" } }),
        ],
        trend: { title: "Gasto en repuestos (€)", data: [{ label: "may", value: 11200 }, { label: "jun", value: 10400 }, { label: "jul", value: 14100 }, { label: "ago", value: 9800 }, { label: "sep", value: 13500 }, { label: "oct", value: 12960 }] },
        ranking: { title: "Gasto por proveedor", unit: "eur", data: SPEND_BY_SUPPLIER },
        breakdown: { title: "Pedidos por estado", centerLabel: "pedidos", data: [{ label: "Pendientes", value: PURCHASE_ORDERS.filter((o) => o.status === "pendiente").length, tone: "primary" }, { label: "Enviados", value: PURCHASE_ORDERS.filter((o) => o.status === "enviado").length, tone: "cyan" }, { label: "Retrasados", value: PURCHASE_ORDERS.filter((o) => o.status === "retrasado").length, tone: "warn" }, { label: "Recibidos", value: PURCHASE_ORDERS.filter((o) => o.status === "recibido").length, tone: "ok" }] },
        quickActions: [{ id: "qa-ped", label: "Ver pedidos", href: "/compras", kind: "enlace" }, { id: "qa-ot2", label: "Órdenes con material pendiente", href: "/ordenes", kind: "enlace" }] });
    case "rrhh":
      return Dashboard.parse({ ...base, title: "Panel de personas", overall: "bad", overallText: "2 acreditaciones vencen en menos de 15 días",
        kpis: [
          k({ id: "plantilla", label: "Presentes hoy", value: present, status: "ok", note: `de ${EMPLOYEES.length} en plantilla`, p: { source: "sesame", entity: "Fichajes de hoy", calc: "Empleados con fichaje de entrada" } }),
          k({ id: "ausentes", label: "Ausentes hoy", value: absent, status: "warn", note: "vacaciones, bajas y permisos", p: { source: "sesame", entity: "Ausencias", calc: "Empleados con ausencia registrada hoy" } }),
          prl,
          k({ id: "absent", label: "Absentismo del mes", value: 3.9, unit: "%", decimals: 1, status: "ok", trend: { delta: 0.5, unit: " puntos", label: "vs. mes anterior", goodWhen: "down" }, p: { source: "sesame", entity: "Ausencias", period: PERIOD, calc: "Horas de ausencia no planificada / horas teóricas" } }),
        ],
        trend: { title: "Absentismo por mes (%)", data: ABSENCE_BY_MONTH }, ranking: { title: "Horas por departamento (mes)", unit: "num", data: HOURS_BY_DEPT },
        breakdown: { title: "Estado de la plantilla hoy", centerLabel: "personas", data: [{ label: "Trabajando", value: present, tone: "ok" }, { label: "Libran", value: EMPLOYEES.filter((e) => e.today === "libra").length, tone: "cyan" }, { label: "Vacaciones", value: EMPLOYEES.filter((e) => e.today === "vacaciones").length, tone: "primary" }, { label: "Baja o ausencia", value: EMPLOYEES.filter((e) => e.today === "baja" || e.today === "ausente").length, tone: "warn" }] },
        quickActions: [{ id: "qa-prl", label: "Ver acreditaciones", href: "/prl", kind: "enlace" }, { id: "qa-per", label: "Ver plantilla", href: "/personal", kind: "enlace" }] });
    case "ti":
      return Dashboard.parse({ ...base, title: "Estado del sistema", overall: "warn", overallText: "A3ERP responde lento · PGMWin pendiente de confirmar",
        kpis: [
          k({ id: "conx", label: "Conexiones activas", value: CONNECTIONS.filter((c) => c.health === "conectado").length, status: "warn", note: `de ${CONNECTIONS.length} configuradas`, p: { source: "msm", entity: "Salud de conectores", calc: "Conectores con health() correcto" } }),
          k({ id: "lat", label: "Latencia media", value: 461, status: "warn", note: "ms · A3ERP la eleva", p: { source: "msm", entity: "connector_runs", period: "últimas 24 h", calc: "Media de latencia por llamada a los conectores" } }),
          k({ id: "prop-pend", label: "Propuestas pendientes", value: PROPOSALS.filter((p) => p.status === "pendiente").length, status: "warn", p: { source: "msm", entity: "sync_proposals", calc: "Propuestas en estado pendiente" } }),
          k({ id: "aud", label: "Eventos de auditoría hoy", value: AUDIT.length * 4, status: "ok", note: "quién hizo qué, siempre registrado", p: { source: "msm", entity: "audit_log", period: "hoy", calc: "Recuento de eventos del día" } }),
        ],
        trend: { title: "Latencia de A3ERP (ms, últimas horas)", data: [{ label: "−5 h", value: 310 }, { label: "−4 h", value: 340 }, { label: "−3 h", value: 560 }, { label: "−2 h", value: 900 }, { label: "−1 h", value: 1250 }, { label: "ahora", value: 1420 }] },
        breakdown: { title: "Estado de las conexiones", centerLabel: "conexiones", data: [{ label: "Conectadas", value: CONNECTIONS.filter((c) => c.health === "conectado").length, tone: "ok" }, { label: "Lentas", value: CONNECTIONS.filter((c) => c.health === "degradado").length, tone: "warn" }, { label: "Pendientes", value: CONNECTIONS.filter((c) => c.health === "pendiente").length, tone: "primary" }] },
        quickActions: [{ id: "qa-con", label: "Ver conexiones", href: "/conexiones", kind: "enlace" }, { id: "qa-aud", label: "Ver auditoría", href: "/usuarios", kind: "enlace" }] });
    case "campo":
      return Dashboard.parse({ ...base, title: "Mi día", overall: "ok", overallText: "Todo en orden", kpis: [], quickActions: [] });
  }
}

const NOTIFICATIONS: (Omit<Notification, "at" | "read"> & { minutes: number; roles: Role[] })[] = [
  { id: "n1", title: "Propuesta pendiente", body: "Crear OT en PGMWin desde la oferta ganada «Revisión líneas 1 y 2».", href: "/propuestas", tone: "info", minutes: 80, roles: ["direccion", "ti", "oficina_tecnica", "administracion"] },
  { id: "n2", title: "Anomalía en la bomba B-14", body: "4 averías en 60 días, el doble que máquinas similares.", href: "/alertas", tone: "bad", minutes: 35, roles: ["direccion", "oficina_tecnica"] },
  { id: "n3", title: "Acreditaciones por vencer", body: "2 técnicos pierden la formación PRL en menos de 15 días.", href: "/prl", tone: "bad", minutes: 180, roles: ["direccion", "rrhh"] },
  { id: "n4", title: "Pedido retrasado", body: "PC-26-0612 lleva 2 días de retraso y bloquea la OT-26-3302.", href: "/compras", tone: "warn", minutes: 480, roles: ["direccion", "compras"] },
  { id: "n5", title: "2 facturas vencidas", body: "8.100 € pendientes de cobro.", href: "/facturacion", tone: "warn", minutes: 1800, roles: ["direccion", "administracion"] },
  { id: "n6", title: "A3ERP responde lento", body: "Los datos pueden tener hasta 12 minutos de antigüedad.", href: "/conexiones", tone: "warn", minutes: 95, roles: ["ti"] },
  { id: "n7", title: "Nueva orden asignada", body: "OT-26-3322 · Ajuste de tensión de cinta (Logística Norte).", href: "/campo", tone: "info", minutes: 25, roles: ["campo"] },
  { id: "n8", title: "Informe listo para emitir", body: "Embotelladora Sur · septiembre 2026.", href: "/informes", tone: "ok", minutes: 75, roles: ["direccion", "oficina_tecnica", "administracion"] },
];

const COPILOT: { match: RegExp; build: (fetchedAt: string) => CopilotAnswer }[] = [
  { match: /(fallad|aver|rota|rompe)/, build: (f) => CopilotAnswer.parse({ answer: "Las máquinas con más averías este mes son la **bomba B-14** (4 averías, Embotelladora Sur) y el **compresor C-02** (3 averías, Planta Agroalimentaria). La B-14 duplica la media de activos similares.", confidence: "alta", sources: [{ source: "pgmwin", entity: "Órdenes de trabajo correctivas cerradas", period: "2026-09-01 a 2026-09-30", fetchedAt: f, calc: "Recuento por activo, orden descendente" }] }) },
  { match: /(contrato|horas)/, build: (f) => CopilotAnswer.parse({ answer: "**Logística Norte** ha consumido **1.656 de 1.800 horas** (92 %) de su contrato marco con 3 meses por delante. Al ritmo actual superará el presupuesto en unas 6 semanas. **Embotelladora Sur** va al 83 %.", confidence: "alta", sources: [{ source: "pgmwin", entity: "Horas imputadas por contrato", period: "2026", fetchedAt: f, calc: "Horas imputadas / horas contratadas" }, { source: "a3erp", entity: "Contratos", fetchedAt: f, calc: "Horas contratadas por cliente" }] }) },
  { match: /(coste|gasto|cuesta|€)/, build: (f) => CopilotAnswer.parse({ answer: "El coste de mantenimiento de septiembre fue de **48.320 €** (+3,1 % frente a agosto). **Embotelladora Sur** concentra el 26 % (12.400 €), seguida de Logística Norte (9.800 €).", confidence: "alta", sources: [{ source: "pgmwin", entity: "Costes imputados a OT", period: "septiembre de 2026", fetchedAt: f, calc: "Suma de mano de obra y repuestos de OT cerradas" }, { source: "a3erp", entity: "Clientes", fetchedAt: f, calc: "Asignación de cliente por código enlazado" }] }) },
  { match: /(prl|formaci|acredit|caduc)/, build: (f) => CopilotAnswer.parse({ answer: "Hay **5 acreditaciones PRL** que vencen en los próximos 45 días; **2 en menos de 15 días** (Marcos Ruiz y Lucía Prieto). Afectan al acceso a 3 centros de cliente.", confidence: "media", sources: [{ source: "sesame", entity: "Formación PRL del personal", period: "próximos 45 días", fetchedAt: f, calc: "Vencimiento ≤ 45 días" }] }) },
  { match: /(factur|cobr|albar)/, build: (f) => CopilotAnswer.parse({ answer: "Hay **4 albaranes sin facturar** por **8.295 €** y **2 facturas vencidas** por **8.100 €** (Centro Comercial Este y Frigoríficos del Guadalquivir).", confidence: "alta", sources: [{ source: "a3erp", entity: "Albaranes y facturas", period: "a fecha de hoy", fetchedAt: f, calc: "Albaranes sin factura asociada; facturas con vencimiento pasado y sin cobro" }] }) },
  { match: /(oferta|comercial|pipeline|vend)/, build: (f) => CopilotAnswer.parse({ answer: "El pipeline abierto suma **149.400 €** en 6 ofertas. Las de mayor valor son **Ampliación de climatización** (54.000 €, 55 %) y **Sustitución de grupo de bombeo** (36.900 €, 65 %).", confidence: "media", sources: [{ source: "trello", entity: "Tarjetas de ofertas", period: "a fecha de hoy", fetchedAt: f, calc: "Suma de importes en estados Borrador, Enviada y Negociación" }] }) },
  { match: /(stock|repuest|almac|pedido)/, build: (f) => CopilotAnswer.parse({ answer: "Hay **3 repuestos bajo mínimos**; el más crítico es el **rodamiento 6309** (2 uds., mínimo 6), con un pedido retrasado que bloquea la OT-26-3302.", confidence: "alta", sources: [{ source: "a3erp", entity: "Existencias y pedidos de compra", period: "a fecha de hoy", fetchedAt: f, calc: "Stock actual frente a stock mínimo" }] }) },
];

/**
 * Implementación de demostración del contrato `DataProvider`.
 * Valida con Zod lo que devuelve, igual que lo haría una implementación real
 * ante la respuesta de una API externa. Es SIN ESTADO: las acciones de
 * escritura devuelven el resultado y quien llama decide dónde guardarlo.
 */
export class DemoDataProvider implements DataProvider {
  readonly mode = "demo" as const;

  async getDashboard(role: Role) { return dashboardFor(role); }

  async listWorkOrders(filter?: { onlyMine?: boolean }) {
    const list = filter?.onlyMine ? WORK_ORDERS.filter((o) => o.mine) : WORK_ORDERS;
    return list.map((o) => WorkOrder.parse(o));
  }
  async listAssets() { return ASSETS.map((a) => Asset.parse(a)); }
  async getAsset(id: string) {
    const detail = ASSET_DETAILS[id];
    if (detail) return AssetDetail.parse(detail);
    const base = ASSETS.find((a) => a.id === id);
    if (!base) return null;
    return AssetDetail.parse({ ...base, serial: "—", installedYear: 2020, links: [{ source: "pgmwin", externalId: `ACT-${id.slice(2)}`, label: "Ficha del activo" }], timeline: [], costByMonth: [] });
  }
  async getMaintenance() { return MaintenanceOverview.parse({ tasks: PREVENTIVE, compliance: COMPLIANCE }); }
  async listAlerts() { return ALERTS.map((a) => AlertItem.parse(a)); }

  async listClients() {
    return CLIENT_DETAILS.map((c) => ClientSummary.parse({ id: c.id, name: c.name, sector: c.sector, status: c.status, openOrders: c.openOrders, annualCostEur: c.annualCostEur, contractHoursUsedPct: c.contractHoursUsedPct }));
  }
  async getClient(id: string) {
    const c = CLIENT_DETAILS.find((x) => x.id === id);
    return c ? ClientDetail.parse(c) : null;
  }
  async listOffers() { return OFFERS.map((o) => Offer.parse(o)); }
  async getFinance() { return FinanceOverview.parse({ docs: FINANCE_DOCS, billedByMonth: BILLED_BY_MONTH, pendingByClient: PENDING_BY_CLIENT }); }
  async getPurchasing() { return PurchasingOverview.parse({ orders: PURCHASE_ORDERS, stock: STOCK, spendBySupplier: SPEND_BY_SUPPLIER }); }
  async getPeople() { return PeopleOverview.parse({ employees: EMPLOYEES, absenceByMonth: ABSENCE_BY_MONTH, hoursByDept: HOURS_BY_DEPT }); }
  async getPrl() { return PrlOverview.parse({ accreditations: ACCREDITATIONS, centers: CENTERS, expiringByMonth: EXPIRING_BY_MONTH }); }

  async listProposals() { return PROPOSALS.map((p) => Proposal.parse(p)); }
  async createWorkOrderProposal(input: NewWorkOrderInput, userName: string) {
    const v = NewWorkOrderInput.parse(input);
    return Proposal.parse({
      id: `p-new-${Date.now().toString(36)}`, title: `Crear OT en PGMWin: ${v.description.slice(0, 60)}`, from: "msm", to: "pgmwin",
      summary: "Orden de trabajo creada desde Acciones rápidas. Pendiente de aprobación antes de escribir en PGMWin.",
      createdBy: userName, createdAt: new Date().toISOString(), status: "pendiente", environment: "pruebas",
      diff: [
        { field: "Cliente", before: null, after: v.client }, { field: "Activo", before: null, after: v.asset },
        { field: "Descripción", before: null, after: v.description }, { field: "Prioridad", before: null, after: v.priority[0]!.toUpperCase() + v.priority.slice(1) },
      ],
    });
  }
  async decideProposal(id: string, decision: "aprobada" | "rechazada", userName: string) {
    const p = PROPOSALS.find((x) => x.id === id);
    if (!p) throw new Error(`Propuesta no encontrada: ${id}`);
    return Proposal.parse({ ...p, status: decision, summary: `${p.summary} · ${decision === "aprobada" ? "Aprobada" : "Rechazada"} por ${userName}.` });
  }

  async listReports() { return REPORTS.map((r) => Report.parse(r)); }
  async askCopilot(question: string, _role: Role) { // el rol heredará permisos cuando el copiloto sea real (ADR-0006)
    await new Promise((r) => setTimeout(r, 700));
    const t = question.toLowerCase();
    const f = new Date().toISOString();
    const hit = COPILOT.find((c) => c.match.test(t));
    if (hit) return hit.build(f);
    return CopilotAnswer.parse({ answer: "No tengo datos verificables para responder a eso. Puedo ayudarte con averías, costes, contratos, facturación, ofertas, stock y acreditaciones PRL.", confidence: "baja", sources: [], noData: true });
  }

  async getConnections() { return CONNECTIONS.map((c) => Connection.parse(c)); }
  async listUsers() { return SYSTEM_USERS.map((u) => SystemUser.parse(u)); }
  async listAudit() { return AUDIT.map((e) => AuditEvent.parse(e)); }

  async listNotifications(role: Role) {
    return NOTIFICATIONS.filter((n) => n.roles.includes(role)).map(({ minutes, roles: _r, ...n }, i) => Notification.parse({ ...n, at: agoIso(minutes), read: i > 2 }));
  }

  async search(query: string, role: Role) {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const has = (s: string) => s.toLowerCase().includes(q);
    const ok = (id: NavId) => canAccess(role, id);
    const hits: SearchHit[] = [];
    if (ok("clientes")) for (const c of CLIENT_DETAILS) if (has(c.name) || has(c.sector)) hits.push({ id: c.id, kind: "cliente", title: c.name, subtitle: `${c.sector} · ${c.openOrders} OT abiertas`, href: `/clientes/${c.id}`, source: "a3erp" });
    if (ok("activos")) for (const a of ASSETS) if (has(a.name) || has(a.client) || has(a.id)) hits.push({ id: a.id, kind: "activo", title: a.name, subtitle: `${a.client} · ${a.category}`, href: `/activos/${a.id}`, source: "pgmwin" });
    if (ok("ordenes")) for (const o of WORK_ORDERS) if (has(o.title) || has(o.externalId) || has(o.client)) hits.push({ id: o.id, kind: "orden", title: `${o.externalId} · ${o.title}`, subtitle: `${o.client} · ${o.assetName}`, href: "/ordenes", source: "pgmwin" });
    if (ok("comercial")) for (const o of OFFERS) if (has(o.title) || has(o.client) || has(o.id)) hits.push({ id: o.id, kind: "oferta", title: `${o.id} · ${o.title}`, subtitle: `${o.client} · ${eur(o.amountEur)} €`, href: "/comercial", source: "trello" });
    if (ok("personal")) for (const e of EMPLOYEES) if (has(e.name) || has(e.position)) hits.push({ id: e.id, kind: "persona", title: e.name, subtitle: e.position, href: "/personal", source: "sesame" });
    return hits.slice(0, 12).map((h) => SearchHit.parse(h));
  }
}
