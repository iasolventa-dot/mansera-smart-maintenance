import type { DataProvider } from "../provider";
import {
  Asset,
  AssetDetail,
  Connection,
  CopilotAnswer,
  Dashboard,
  Proposal,
  Report,
  WorkOrder,
  type Kpi,
  type Provenance,
  type Role,
} from "../schemas";
import { ASSETS, ASSET_DETAILS, CONNECTIONS, PROPOSALS, REPORTS, WORK_ORDERS } from "./fixtures";

const prov = (p: Omit<Provenance, "fetchedAt">): Provenance => ({ ...p, fetchedAt: new Date().toISOString() });
const PERIOD = "septiembre de 2026";

function kpisFor(role: Role): Kpi[] {
  const ordenes: Kpi = {
    id: "ot-abiertas", label: "Órdenes abiertas", value: 128, unit: "", decimals: 0, status: "ok",
    trend: { delta: -9, unit: "%", label: "vs. mes anterior", goodWhen: "down" },
    provenance: prov({ source: "pgmwin", entity: "Órdenes de trabajo abiertas", period: "a fecha de hoy", calc: "Recuento de OT en estado abierta, en curso o esperando material" }),
  };
  const preventivo: Kpi = {
    id: "cumpl-prev", label: "Cumplimiento preventivo", value: 94.2, unit: "%", decimals: 1, status: "ok",
    trend: { delta: 2.1, unit: " puntos", label: "vs. mes anterior", goodWhen: "up" },
    provenance: prov({ source: "pgmwin", entity: "Planes preventivos", period: PERIOD, calc: "Preventivos ejecutados en plazo / preventivos programados" }),
  };
  const respuesta: Kpi = {
    id: "t-resp", label: "Tiempo medio de respuesta", value: 3.4, unit: "h", decimals: 1, status: "warn",
    trend: { delta: -0.6, unit: " h", label: "vs. mes anterior", goodWhen: "down" },
    note: "Objetivo de contrato: 3 h",
    provenance: prov({ source: "pgmwin", entity: "OT correctivas", period: PERIOD, calc: "Media de (inicio de intervención − aviso)" }),
  };
  const coste: Kpi = {
    id: "coste", label: "Coste de mantenimiento", value: 48320, unit: "€", decimals: 0, status: "warn",
    trend: { delta: 3.1, unit: "%", label: "vs. mes anterior", goodWhen: "down" },
    provenance: prov({ source: "pgmwin", entity: "Costes imputados a OT", period: PERIOD, calc: "Mano de obra + repuestos imputados a OT cerradas" }),
  };
  const prl: Kpi = {
    id: "prl", label: "PRL por vencer", value: 17, unit: "", decimals: 0, status: "bad",
    note: "acreditaciones en 30 días",
    provenance: prov({ source: "sesame", entity: "Formación PRL del personal", period: "próximos 30 días", calc: "Acreditaciones con vencimiento ≤ 30 días" }),
  };
  const pendFact: Kpi = {
    id: "pend-fact", label: "Albaranes sin facturar", value: 23, unit: "", decimals: 0, status: "warn",
    note: "por valor de 31.480 €",
    provenance: prov({ source: "a3erp", entity: "Albaranes pendientes de facturar", period: "a fecha de hoy", calc: "Albaranes cerrados sin factura asociada" }),
  };
  const ots: Record<Role, Kpi[]> = {
    direccion: [ordenes, preventivo, respuesta, coste, prl],
    oficina_tecnica: [ordenes, preventivo, respuesta, { ...coste, id: "coste-ot" }],
    administracion: [pendFact, { ...coste, id: "coste-adm" }, { ...ordenes, label: "OT cerradas sin albarán", value: 14, id: "ot-sin-albaran", status: "warn", trend: undefined }],
    ti: [
      { id: "conx", label: "Conexiones activas", value: 3, unit: "", decimals: 0, status: "warn", note: "de 4 configuradas", provenance: prov({ source: "msm", entity: "Salud de conectores", calc: "Conectores con health() correcto" }) },
      { id: "prop-pend", label: "Propuestas pendientes", value: 2, unit: "", decimals: 0, status: "warn", provenance: prov({ source: "msm", entity: "sync_proposals", calc: "Propuestas en estado pendiente" }) },
    ],
    campo: [],
  };
  return ots[role];
}

function dashboardFor(role: Role): Dashboard {
  const alerts: Dashboard["alerts"] = [
    { id: "al-1", severity: "alta", kind: "anomalia", text: "Bomba B-14 · Embotelladora Sur: 4 averías en 60 días, el doble que máquinas similares.", actionLabel: "Ver causa probable", href: "/activos/A-0142", provenance: prov({ source: "pgmwin", entity: "OT correctivas · Bomba B-14", period: "últimos 60 días" }) },
    { id: "al-2", severity: "media", kind: "contrato", text: "Contrato marco Logística Norte: horas consumidas al 92 % del presupuesto anual.", actionLabel: "Ver desglose de horas", href: "/informes", provenance: prov({ source: "pgmwin", entity: "Horas imputadas · contrato marco", period: "2026" }) },
    { id: "al-3", severity: "media", kind: "prl", text: "5 técnicos con formación PRL que vence en 30 días; sin renovarla no podrán entrar en 3 centros.", actionLabel: "Ver acreditaciones", href: "/panel", provenance: prov({ source: "sesame", entity: "Formación PRL", period: "próximos 30 días" }) },
  ];
  const quick: Dashboard["quickActions"] = [
    { id: "qa-ot", label: "Nueva orden de trabajo", href: "/propuestas", kind: "propuesta" },
    { id: "qa-fact", label: "Facturar albarán", href: "/propuestas", kind: "propuesta" },
    { id: "qa-inf", label: "Generar informe", href: "/informes", kind: "enlace" },
  ];
  const titles: Record<Role, string> = {
    direccion: "Panel de dirección", oficina_tecnica: "Panel técnico", administracion: "Panel de administración",
    ti: "Estado del sistema", campo: "Mi día",
  };
  const byRole: Record<Role, { overall: Dashboard["overall"]; text: string; alerts: Dashboard["alerts"] }> = {
    direccion: { overall: "warn", text: "3 asuntos requieren tu atención", alerts },
    oficina_tecnica: { overall: "warn", text: "1 anomalía y 1 preventivo por vencer", alerts: alerts.slice(0, 1) },
    administracion: { overall: "warn", text: "23 albaranes pendientes de facturar", alerts: alerts.slice(1, 2) },
    ti: { overall: "warn", text: "A3ERP responde lento · PGMWin pendiente de confirmar", alerts: [{ id: "al-s1", severity: "media", kind: "sistema", text: "A3ERP: latencia del gateway superior a 1 s. Los datos pueden tener hasta 12 min.", actionLabel: "Ver conexiones", href: "/conexiones", provenance: prov({ source: "msm", entity: "Salud de conectores" }) }] },
    campo: { overall: "ok", text: "Todo en orden", alerts: [] },
  };
  const r = byRole[role];
  return {
    role, title: titles[role], periodLabel: PERIOD, overall: r.overall, overallText: r.text,
    kpis: kpisFor(role),
    failuresByMonth: [
      ["oct", 35], ["nov", 41], ["dic", 38], ["ene", 45], ["feb", 52], ["mar", 47],
      ["abr", 39], ["may", 36], ["jun", 42], ["jul", 33], ["ago", 29], ["sep", 31],
    ].map(([label, value]) => ({ label: label as string, value: value as number })),
    costByClient: [
      { label: "Embotelladora Sur", value: 12400 }, { label: "Logística Norte", value: 9800 },
      { label: "Planta Agroalimentaria", value: 7600 }, { label: "Centro Comercial Este", value: 5900 },
      { label: "Hospital Regional", value: 4100 },
    ],
    ordersByState: [
      { label: "Abiertas", value: 128, tone: "primary" }, { label: "En curso", value: 64, tone: "cyan" },
      { label: "Esperando material", value: 21, tone: "warn" }, { label: "Cerradas", value: 312, tone: "ok" },
    ],
    alerts: r.alerts,
    quickActions: role === "ti" ? [{ id: "qa-con", label: "Ver conexiones", href: "/conexiones", kind: "enlace" }] : quick,
  };
}

/** Estado mutable en memoria, solo para la demostración (se reinicia con el servidor). */
const proposals: Proposal[] = structuredClone(PROPOSALS);

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function answer(q: string): CopilotAnswer {
  const t = q.toLowerCase();
  const fetchedAt = new Date().toISOString();
  if (/(fallad|aver|rota|rompe)/.test(t)) {
    return CopilotAnswer.parse({
      answer: "Las máquinas con más averías este mes son la **bomba B-14** (4 averías, Embotelladora Sur) y el **compresor C-02** (3 averías, Planta Agroalimentaria). La B-14 duplica la media de activos similares.",
      confidence: "alta",
      sources: [{ source: "pgmwin", entity: "Órdenes de trabajo correctivas cerradas", period: "2026-09-01 a 2026-09-30", fetchedAt, calc: "Recuento por activo, orden descendente" }],
    });
  }
  if (/(coste|gasto|cuesta|€)/.test(t)) {
    return CopilotAnswer.parse({
      answer: "El coste de mantenimiento de septiembre fue de **48.320 €** (+3,1 % frente a agosto). **Embotelladora Sur** concentra el 26 % (12.400 €).",
      confidence: "alta",
      sources: [
        { source: "pgmwin", entity: "Costes imputados a OT", period: "septiembre de 2026", fetchedAt, calc: "Suma de mano de obra y repuestos de OT cerradas" },
        { source: "a3erp", entity: "Clientes", fetchedAt, calc: "Asignación de cliente por código enlazado" },
      ],
    });
  }
  if (/(prl|formaci|acredit)/.test(t)) {
    return CopilotAnswer.parse({
      answer: "Hay **17 acreditaciones PRL** que vencen en los próximos 30 días. 5 de ellas afectan a técnicos con acceso a 3 centros de cliente.",
      confidence: "media",
      sources: [{ source: "sesame", entity: "Formación PRL del personal", period: "próximos 30 días", fetchedAt, calc: "Vencimiento ≤ 30 días" }],
    });
  }
  return CopilotAnswer.parse({
    answer: "No tengo datos verificables para responder a eso. Puedo ayudarte con averías, costes por cliente, contratos y acreditaciones PRL.",
    confidence: "baja", sources: [], noData: true,
  });
}

/**
 * Implementación de demostración del contrato `DataProvider`.
 * Valida con Zod lo que devuelve, igual que lo haría una implementación real
 * ante la respuesta de una API externa.
 */
export class DemoDataProvider implements DataProvider {
  readonly mode = "demo" as const;

  async getDashboard(role: Role) { await delay(60); return Dashboard.parse(dashboardFor(role)); }
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
    return AssetDetail.parse({
      ...base, serial: "—", installedYear: 2020, links: [{ source: "pgmwin", externalId: `ACT-${id.slice(2)}`, label: "Ficha del activo" }],
      timeline: [], costByMonth: [],
    });
  }
  async listProposals() { return proposals.map((p) => Proposal.parse(p)); }
  async decideProposal(id: string, decision: "aprobada" | "rechazada", userName: string) {
    const p = proposals.find((x) => x.id === id);
    if (!p) throw new Error(`Propuesta no encontrada: ${id}`);
    if (p.status !== "pendiente") return Proposal.parse(p);
    p.status = decision;
    p.summary += ` · ${decision === "aprobada" ? "Aprobada" : "Rechazada"} por ${userName}.`;
    return Proposal.parse(p);
  }
  async getConnections() { return CONNECTIONS.map((c) => Connection.parse(c)); }
  async listReports() { return REPORTS.map((r) => Report.parse(r)); }
  // El rol se usará para heredar permisos cuando el copiloto sea real (ADR-0006).
  async askCopilot(question: string, _role: Role) { await delay(700); return answer(question); }
}
