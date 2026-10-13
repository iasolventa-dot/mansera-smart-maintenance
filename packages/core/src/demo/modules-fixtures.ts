import type {
  AlertItem, AuditEvent, ClientDetail, Employee, FinanceDoc, Offer, PreventiveTask, PurchaseOrder, StockItem,
  SystemUser, Accreditation, CenterAccess,
} from "../modules";
import { ASSETS } from "./fixtures";

/** DATOS FICTICIOS para demostraciones. Fechas relativas a hoy para que la demo siempre parezca viva. */
const DAY = 86_400_000;
export const dayIso = (offset: number): string => new Date(Date.now() + offset * DAY).toISOString().slice(0, 10);
export const agoIso = (minutes: number): string => new Date(Date.now() - minutes * 60_000).toISOString();
const MONTHS = ["may", "jun", "jul", "ago", "sep", "oct"];
const series = (values: number[], labels = MONTHS) => values.map((value, i) => ({ label: labels[i] ?? String(i), value }));

/* ───────── Clientes ───────── */
type ClientSeed = {
  id: string; name: string; sector: string; status: "ok" | "warn" | "bad"; openOrders: number; annual: number;
  contract: { type: string; budget: number; used: number; renewal: string } | null; a3: string; pgm: string;
  contact: [string, string]; sites: string[]; costs: number[]; insight?: string;
};
const CLIENT_SEEDS: ClientSeed[] = [
  { id: "cl-1", name: "Embotelladora Sur", sector: "Alimentación y bebidas", status: "bad", openOrders: 31, annual: 148_800, contract: { type: "Contrato marco anual", budget: 2400, used: 1980, renewal: dayIso(140) }, a3: "4501", pgm: "CL-122", contact: ["Rosa Nieto", "Jefa de mantenimiento"], sites: ["Línea 1", "Línea 2", "Sala de bombeo"], costs: [9800, 10200, 14100, 11300, 13900, 12400], insight: "La bomba B-14 concentra el 31 % del coste correctivo del cliente." },
  { id: "cl-2", name: "Logística Norte", sector: "Logística", status: "warn", openOrders: 22, annual: 117_600, contract: { type: "Contrato marco anual", budget: 1800, used: 1656, renewal: dayIso(95) }, a3: "4518", pgm: "CL-131", contact: ["Pablo Serrano", "Director de operaciones"], sites: ["Muelle 1", "Muelle 3", "Almacén automático"], costs: [8200, 9100, 9700, 9400, 10100, 9800], insight: "Horas consumidas al 92 % del presupuesto anual con 3 meses por delante." },
  { id: "cl-3", name: "Planta Agroalimentaria", sector: "Agroalimentario", status: "warn", openOrders: 18, annual: 91_200, contract: { type: "Contrato por horas", budget: 1200, used: 790, renewal: dayIso(210) }, a3: "4522", pgm: "CL-140", contact: ["Marta Cuesta", "Responsable de planta"], sites: ["Sala de compresores", "Cámaras frigoríficas"], costs: [6900, 7200, 7500, 7300, 7900, 7600] },
  { id: "cl-4", name: "Centro Comercial Este", sector: "Retail", status: "ok", openOrders: 9, annual: 70_800, contract: { type: "Contrato marco anual", budget: 900, used: 520, renewal: dayIso(260) }, a3: "4530", pgm: "CL-155", contact: ["Íñigo Parra", "Facility manager"], sites: ["Cubierta norte", "Sala técnica"], costs: [5600, 5900, 6100, 5800, 6000, 5900] },
  { id: "cl-5", name: "Hospital Regional", sector: "Sanitario", status: "ok", openOrders: 12, annual: 49_200, contract: { type: "Contrato crítico 24 h", budget: 700, used: 410, renewal: dayIso(330) }, a3: "4544", pgm: "CL-160", contact: ["Dra. Lola Vera", "Dirección de servicios generales"], sites: ["Sótano -1", "Planta técnica"], costs: [3900, 4100, 4000, 4200, 4100, 4100] },
  { id: "cl-6", name: "Frigoríficos del Guadalquivir", sector: "Agroalimentario", status: "ok", openOrders: 4, annual: 22_400, contract: null, a3: "4551", pgm: "CL-171", contact: ["Álvaro Mena", "Gerente"], sites: ["Nave 1"], costs: [1500, 1700, 1800, 2100, 2000, 2200] },
];

export const CLIENT_DETAILS: ClientDetail[] = CLIENT_SEEDS.map((c) => ({
  id: c.id, name: c.name, sector: c.sector, status: c.status, openOrders: c.openOrders, annualCostEur: c.annual,
  contractHoursUsedPct: c.contract ? Math.round((c.contract.used / c.contract.budget) * 100) : null,
  contract: c.contract ? { type: c.contract.type, hoursBudget: c.contract.budget, hoursUsed: c.contract.used, renewal: c.contract.renewal } : null,
  links: [
    { source: "a3erp", externalId: c.a3, label: "Cliente en A3ERP" },
    { source: "pgmwin", externalId: c.pgm, label: "Cliente en PGMWin" },
    { source: "trello", externalId: `tablero-${c.id}`, label: "Tablero de proyectos" },
  ],
  sites: c.sites, contact: { name: c.contact[0], role: c.contact[1] }, costByMonth: series(c.costs),
  assets: ASSETS.filter((a) => a.client === c.name).map((a) => ({ id: a.id, name: a.name, status: a.status })),
  recentOrders: [
    { id: `OT-26-${3300 + c.openOrders}`, title: "Revisión programada", status: "En curso", date: dayIso(-2) },
    { id: `OT-26-${3280 + c.openOrders}`, title: "Intervención correctiva", status: "Cerrada", date: dayIso(-9) },
    { id: `OT-26-${3260 + c.openOrders}`, title: "Cambio de consumibles", status: "Cerrada", date: dayIso(-16) },
  ],
  offers: [{ id: `O-2026-${400 + c.openOrders}`, title: `Mejora de instalación · ${c.sites[0] ?? ""}`, amountEur: 4800 + c.openOrders * 310, stage: "Enviada" }],
  insight: c.insight ? { text: c.insight, provenance: { source: "pgmwin", entity: `Órdenes e imputaciones · ${c.name}`, period: "últimos 12 meses", fetchedAt: agoIso(6), calc: "Horas imputadas / horas del contrato; coste correctivo por activo" } } : undefined,
}));

/* ───────── Comercial (Trello) ───────── */
export const OFFERS: Offer[] = [
  { id: "O-2026-0417", title: "Revisión líneas 1 y 2", client: "Embotelladora Sur", amountEur: 18_400, stage: "ganada", probability: 100, owner: "Elena Marín", dueDate: dayIso(-3), source: "trello" },
  { id: "O-2026-0421", title: "Sustitución de grupo de bombeo", client: "Embotelladora Sur", amountEur: 36_900, stage: "negociacion", probability: 65, owner: "Elena Marín", dueDate: dayIso(9), source: "trello" },
  { id: "O-2026-0423", title: "Plan preventivo muelles 1-3", client: "Logística Norte", amountEur: 12_700, stage: "enviada", probability: 50, owner: "Iván Soler", dueDate: dayIso(14), source: "trello" },
  { id: "O-2026-0425", title: "Renovación de cuadros eléctricos", client: "Planta Agroalimentaria", amountEur: 27_300, stage: "enviada", probability: 40, owner: "Iván Soler", dueDate: dayIso(21), source: "trello" },
  { id: "O-2026-0428", title: "Ampliación de climatización", client: "Centro Comercial Este", amountEur: 54_000, stage: "negociacion", probability: 55, owner: "Elena Marín", dueDate: dayIso(12), source: "trello" },
  { id: "O-2026-0430", title: "Auditoría energética", client: "Hospital Regional", amountEur: 8_900, stage: "borrador", probability: 30, owner: "Elena Marín", dueDate: dayIso(6), source: "trello" },
  { id: "O-2026-0431", title: "Mantenimiento cámaras frigoríficas", client: "Frigoríficos del Guadalquivir", amountEur: 9_600, stage: "borrador", probability: 30, owner: "Iván Soler", dueDate: dayIso(8), source: "trello" },
  { id: "O-2026-0409", title: "Instalación de variadores", client: "Logística Norte", amountEur: 15_200, stage: "ganada", probability: 100, owner: "Iván Soler", dueDate: dayIso(-18), source: "trello" },
  { id: "O-2026-0402", title: "Cambio de compresor C-01", client: "Planta Agroalimentaria", amountEur: 21_000, stage: "perdida", probability: 0, owner: "Elena Marín", dueDate: dayIso(-30), source: "trello" },
];

/* ───────── Facturación (A3) ───────── */
export const FINANCE_DOCS: FinanceDoc[] = [
  { id: "AL-26-1190", kind: "albaran", client: "Logística Norte", amountEur: 1284.5, status: "pendiente_facturar", date: dayIso(-2), dueDate: null, workOrder: "OT-26-3302", source: "pgmwin" },
  { id: "AL-26-1188", kind: "albaran", client: "Embotelladora Sur", amountEur: 3920, status: "pendiente_facturar", date: dayIso(-3), dueDate: null, workOrder: "OT-26-3318", source: "pgmwin" },
  { id: "AL-26-1181", kind: "albaran", client: "Planta Agroalimentaria", amountEur: 2210.8, status: "pendiente_facturar", date: dayIso(-6), dueDate: null, workOrder: "OT-26-3290", source: "pgmwin" },
  { id: "AL-26-1175", kind: "albaran", client: "Hospital Regional", amountEur: 880, status: "pendiente_facturar", date: dayIso(-9), dueDate: null, workOrder: "OT-26-3277", source: "pgmwin" },
  { id: "F-26-0931", kind: "factura", client: "Embotelladora Sur", amountEur: 12_400, status: "emitida", date: dayIso(-12), dueDate: dayIso(48), workOrder: null, source: "a3erp" },
  { id: "F-26-0927", kind: "factura", client: "Logística Norte", amountEur: 9_800, status: "emitida", date: dayIso(-15), dueDate: dayIso(45), workOrder: null, source: "a3erp" },
  { id: "F-26-0902", kind: "factura", client: "Centro Comercial Este", amountEur: 5_900, status: "vencida", date: dayIso(-75), dueDate: dayIso(-15), workOrder: null, source: "a3erp" },
  { id: "F-26-0898", kind: "factura", client: "Planta Agroalimentaria", amountEur: 7_600, status: "cobrada", date: dayIso(-48), dueDate: dayIso(12), workOrder: null, source: "a3erp" },
  { id: "F-26-0889", kind: "factura", client: "Hospital Regional", amountEur: 4_100, status: "cobrada", date: dayIso(-55), dueDate: dayIso(5), workOrder: null, source: "a3erp" },
  { id: "F-26-0871", kind: "factura", client: "Frigoríficos del Guadalquivir", amountEur: 2_200, status: "vencida", date: dayIso(-70), dueDate: dayIso(-10), workOrder: null, source: "a3erp" },
];
export const BILLED_BY_MONTH = series([41200, 44800, 47300, 43900, 51200, 48320]);
export const PENDING_BY_CLIENT = [
  { label: "Embotelladora Sur", value: 3920 }, { label: "Planta Agroalimentaria", value: 2210.8 },
  { label: "Logística Norte", value: 1284.5 }, { label: "Hospital Regional", value: 880 },
];

/* ───────── Compras y almacén ───────── */
export const PURCHASE_ORDERS: PurchaseOrder[] = [
  { id: "PC-26-0612", supplier: "Rodamientos Béticos", summary: "Rodamientos 6309 ×6 · sellos mecánicos ×2", amountEur: 842, status: "retrasado", eta: dayIso(-2), forOrder: "OT-26-3302" },
  { id: "PC-26-0618", supplier: "Hidráulica Andaluza", summary: "Sello mecánico bomba B-14", amountEur: 540, status: "recibido", eta: dayIso(-6), forOrder: "OT-26-3318" },
  { id: "PC-26-0621", supplier: "Suministros Eléctricos del Sur", summary: "Contactores y térmicos para cuadro línea 2", amountEur: 1_260, status: "enviado", eta: dayIso(2), forOrder: null },
  { id: "PC-26-0624", supplier: "Filtros y Aire S.L.", summary: "Filtros compresor C-02 ×12", amountEur: 396, status: "enviado", eta: dayIso(3), forOrder: "OT-26-3321" },
  { id: "PC-26-0627", supplier: "Rodamientos Béticos", summary: "Correas dentadas T-11 ×4", amountEur: 188, status: "pendiente", eta: dayIso(5), forOrder: "OT-26-3322" },
  { id: "PC-26-0630", supplier: "Lubricantes Mediterráneo", summary: "Aceite sintético 20 L ×6", amountEur: 612, status: "pendiente", eta: dayIso(7), forOrder: null },
];
export const STOCK: StockItem[] = [
  { ref: "RP-6309", name: "Rodamiento 6309-2RS", stock: 2, min: 6, location: "Estantería A2", supplier: "Rodamientos Béticos", status: "bad" },
  { ref: "RP-SM14", name: "Sello mecánico serie B", stock: 3, min: 4, location: "Estantería B1", supplier: "Hidráulica Andaluza", status: "warn" },
  { ref: "RP-FA02", name: "Filtro de aire compresor", stock: 5, min: 6, location: "Estantería C3", supplier: "Filtros y Aire S.L.", status: "warn" },
  { ref: "RP-CT25", name: "Contactor 25 A", stock: 14, min: 6, location: "Estantería D1", supplier: "Suministros Eléctricos del Sur", status: "ok" },
  { ref: "RP-CD08", name: "Correa dentada T-11", stock: 7, min: 4, location: "Estantería A4", supplier: "Rodamientos Béticos", status: "ok" },
  { ref: "RP-AC20", name: "Aceite sintético 20 L", stock: 9, min: 4, location: "Almacén líquidos", supplier: "Lubricantes Mediterráneo", status: "ok" },
  { ref: "RP-VF11", name: "Variador de frecuencia 11 kW", stock: 1, min: 1, location: "Estantería E2", supplier: "Suministros Eléctricos del Sur", status: "ok" },
];
export const SPEND_BY_SUPPLIER = [
  { label: "Rodamientos Béticos", value: 4_120 }, { label: "Suministros Eléctricos del Sur", value: 3_880 },
  { label: "Hidráulica Andaluza", value: 2_460 }, { label: "Filtros y Aire S.L.", value: 1_520 }, { label: "Lubricantes Mediterráneo", value: 980 },
];

/* ───────── Personal (Sésame) ───────── */
export const EMPLOYEES: Employee[] = [
  { id: "e1", name: "Marcos Ruiz", position: "Técnico de mantenimiento", department: "Campo", today: "trabajando", clockIn: "07:58", site: "Embotelladora Sur", hoursMonth: 104 },
  { id: "e2", name: "Lucía Prieto", position: "Técnica electricista", department: "Campo", today: "trabajando", clockIn: "08:03", site: "Centro Comercial Este", hoursMonth: 111 },
  { id: "e3", name: "Andrés Gil", position: "Técnico frigorista", department: "Campo", today: "trabajando", clockIn: "07:45", site: "Hospital Regional", hoursMonth: 98 },
  { id: "e4", name: "Sergio Blanco", position: "Técnico mecánico", department: "Campo", today: "vacaciones", clockIn: null, site: null, hoursMonth: 72 },
  { id: "e5", name: "Noelia Ortega", position: "Técnica de mantenimiento", department: "Campo", today: "baja", clockIn: null, site: null, hoursMonth: 40 },
  { id: "e6", name: "Elena Marín", position: "Ingeniera · oficina técnica", department: "Oficina técnica", today: "trabajando", clockIn: "08:30", site: "Oficina", hoursMonth: 96 },
  { id: "e7", name: "Iván Soler", position: "Ingeniero · oficina técnica", department: "Oficina técnica", today: "trabajando", clockIn: "08:41", site: "Oficina", hoursMonth: 94 },
  { id: "e8", name: "Carmen Vidal", position: "Administración y facturación", department: "Administración", today: "trabajando", clockIn: "08:15", site: "Oficina", hoursMonth: 92 },
  { id: "e9", name: "Raúl Campos", position: "Compras y almacén", department: "Compras", today: "trabajando", clockIn: "08:00", site: "Almacén", hoursMonth: 95 },
  { id: "e10", name: "Beatriz Lara", position: "Recursos humanos", department: "Personas", today: "ausente", clockIn: null, site: null, hoursMonth: 88 },
  { id: "e11", name: "Tomás Rivas", position: "Técnico mecánico", department: "Campo", today: "libra", clockIn: null, site: null, hoursMonth: 101 },
  { id: "e12", name: "Paula Ferrer", position: "Técnica de mantenimiento", department: "Campo", today: "trabajando", clockIn: "07:52", site: "Logística Norte", hoursMonth: 107 },
];
export const ABSENCE_BY_MONTH = series([3.1, 2.8, 4.6, 5.2, 3.4, 3.9]);
export const HOURS_BY_DEPT = [
  { label: "Campo", value: 633 }, { label: "Oficina técnica", value: 190 }, { label: "Administración", value: 92 },
  { label: "Compras", value: 95 }, { label: "Personas", value: 88 },
];

/* ───────── PRL y CAE ───────── */
export const ACCREDITATIONS: Accreditation[] = [
  { id: "a1", employee: "Marcos Ruiz", course: "PRL 60 h metal", expires: dayIso(9), status: "bad", centers: ["Embotelladora Sur", "Planta Agroalimentaria"] },
  { id: "a2", employee: "Lucía Prieto", course: "Trabajos en altura", expires: dayIso(14), status: "bad", centers: ["Centro Comercial Este"] },
  { id: "a3", employee: "Andrés Gil", course: "Manipulación de gases fluorados", expires: dayIso(22), status: "warn", centers: ["Hospital Regional"] },
  { id: "a4", employee: "Paula Ferrer", course: "Riesgo eléctrico RD 614", expires: dayIso(27), status: "warn", centers: ["Logística Norte", "Embotelladora Sur"] },
  { id: "a5", employee: "Tomás Rivas", course: "Espacios confinados", expires: dayIso(41), status: "warn", centers: ["Planta Agroalimentaria"] },
  { id: "a6", employee: "Sergio Blanco", course: "PRL 60 h metal", expires: dayIso(120), status: "ok", centers: ["Logística Norte"] },
  { id: "a7", employee: "Marcos Ruiz", course: "Primeros auxilios", expires: dayIso(210), status: "ok", centers: ["Hospital Regional"] },
  { id: "a8", employee: "Noelia Ortega", course: "Trabajos en altura", expires: dayIso(160), status: "ok", centers: ["Embotelladora Sur"] },
];
export const CENTERS: CenterAccess[] = [
  { id: "c1", center: "Planta Línea 2 · Embotelladora Sur", client: "Embotelladora Sur", platform: "Plataforma CAE del cliente", docsOk: 18, docsTotal: 20, nextDeadline: dayIso(5), status: "warn" },
  { id: "c2", center: "Muelle 3 · Logística Norte", client: "Logística Norte", platform: "Plataforma CAE de terceros", docsOk: 14, docsTotal: 14, nextDeadline: dayIso(31), status: "ok" },
  { id: "c3", center: "Cubierta · Centro Comercial Este", client: "Centro Comercial Este", platform: "Plataforma CAE del cliente", docsOk: 9, docsTotal: 12, nextDeadline: dayIso(3), status: "bad" },
  { id: "c4", center: "Sótano -1 · Hospital Regional", client: "Hospital Regional", platform: "Acceso con acreditación física", docsOk: 11, docsTotal: 11, nextDeadline: dayIso(44), status: "ok" },
  { id: "c5", center: "Sala de compresores · Planta Agro.", client: "Planta Agroalimentaria", platform: "Plataforma CAE de terceros", docsOk: 12, docsTotal: 15, nextDeadline: dayIso(8), status: "warn" },
];
export const EXPIRING_BY_MONTH = series([5, 7, 3, 4, 2, 6], ["nov", "dic", "ene", "feb", "mar", "abr"]);

/* ───────── Mantenimiento preventivo ───────── */
export const PREVENTIVE: PreventiveTask[] = [
  { id: "pv1", assetId: "A-0310", assetName: "Cinta transportadora T-11", client: "Logística Norte", task: "Revisión de tensado y rodillos", frequency: "Mensual", dueDate: dayIso(-3), status: "vencido", assignee: "Paula Ferrer" },
  { id: "pv2", assetId: "A-0142", assetName: "Bomba B-14", client: "Embotelladora Sur", task: "Alineación y revisión de sellos", frequency: "Trimestral", dueDate: dayIso(8), status: "proximo", assignee: "Marcos Ruiz" },
  { id: "pv3", assetId: "A-0087", assetName: "Compresor C-02", client: "Planta Agroalimentaria", task: "Cambio de filtros y aceite", frequency: "Trimestral", dueDate: dayIso(0), status: "proximo", assignee: "Marcos Ruiz" },
  { id: "pv4", assetId: "A-0455", assetName: "Grupo electrógeno G-01", client: "Hospital Regional", task: "Prueba en carga", frequency: "Mensual", dueDate: dayIso(2), status: "proximo", assignee: "Andrés Gil" },
  { id: "pv5", assetId: "A-0231", assetName: "Enfriadora E-05", client: "Centro Comercial Este", task: "Mantenimiento semestral", frequency: "Semestral", dueDate: dayIso(6), status: "proximo", assignee: "Lucía Prieto" },
  { id: "pv6", assetId: "A-0098", assetName: "Llenadora LL-03", client: "Embotelladora Sur", task: "Engrase y verificación de sensores", frequency: "Mensual", dueDate: dayIso(15), status: "al_dia", assignee: "Tomás Rivas" },
  { id: "pv7", assetId: "A-0231", assetName: "Enfriadora E-05", client: "Centro Comercial Este", task: "Limpieza de condensadores", frequency: "Anual", dueDate: dayIso(34), status: "al_dia", assignee: "Lucía Prieto" },
  { id: "pv8", assetId: "A-0455", assetName: "Grupo electrógeno G-01", client: "Hospital Regional", task: "Revisión de baterías y combustible", frequency: "Trimestral", dueDate: dayIso(40), status: "al_dia", assignee: "Andrés Gil" },
];
export const COMPLIANCE = series([92.1, 90.4, 91.8, 93.0, 92.1, 94.2]);

/* ───────── Alertas ───────── */
const evidence = (v: number[]) => series(v, ["−5", "−4", "−3", "−2", "−1", "hoy"]);
const P = (source: AlertItem["provenance"]["source"], entity: string, calc: string): AlertItem["provenance"] => ({ source, entity, fetchedAt: agoIso(7), calc });
export const ALERTS: AlertItem[] = [
  { id: "al-1", severity: "alta", kind: "anomalia", title: "Bomba B-14: frecuencia de averías anómala", explanation: "4 averías en 60 días, el doble que las máquinas similares de la planta. El patrón es compatible con desalineación del acoplamiento.", entity: "Bomba B-14 · Embotelladora Sur", href: "/activos/A-0142", status: "nueva", raisedAt: agoIso(35), evidence: evidence([0, 1, 0, 1, 1, 1]), provenance: P("pgmwin", "OT correctivas · Bomba B-14", "Averías en 60 días frente a la mediana de activos de su categoría (z = 2,4)") },
  { id: "al-2", severity: "alta", kind: "prl", title: "3 centros con acreditaciones a punto de caducar", explanation: "5 técnicos pierden la formación PRL en menos de 30 días. Sin renovarla no podrán acceder a 3 centros de cliente.", entity: "PRL y CAE", href: "/prl", status: "en_revision", raisedAt: agoIso(180), evidence: evidence([2, 2, 3, 3, 4, 5]), provenance: P("sesame", "Formación PRL del personal", "Acreditaciones con vencimiento ≤ 30 días") },
  { id: "al-3", severity: "media", kind: "contrato", title: "Contrato marco de Logística Norte al 92 % de las horas", explanation: "Se han consumido 1.656 de 1.800 horas con 3 meses por delante. Al ritmo actual se superará el presupuesto en 6 semanas.", entity: "Logística Norte", href: "/clientes/cl-2", status: "nueva", raisedAt: agoIso(60 * 20), evidence: evidence([71, 76, 81, 85, 89, 92]), provenance: P("pgmwin", "Horas imputadas · contrato marco", "Horas imputadas / horas contratadas, serie semanal") },
  { id: "al-4", severity: "media", kind: "preventivo", title: "Preventivo vencido: cinta T-11", explanation: "La revisión mensual de tensado lleva 3 días de retraso. Hay una avería abierta sobre el mismo activo.", entity: "Cinta transportadora T-11", href: "/mantenimiento", status: "nueva", raisedAt: agoIso(60 * 26), evidence: evidence([0, 0, 0, 1, 2, 3]), provenance: P("pgmwin", "Planes preventivos", "Días desde la fecha prevista sin OT cerrada") },
  { id: "al-5", severity: "media", kind: "facturacion", title: "2 facturas vencidas por 8.100 €", explanation: "Centro Comercial Este (15 días) y Frigoríficos del Guadalquivir (10 días). Pendiente de gestión de cobro.", entity: "Facturación", href: "/facturacion", status: "nueva", raisedAt: agoIso(60 * 30), evidence: evidence([3200, 3200, 5900, 5900, 8100, 8100]), provenance: P("a3erp", "Facturas emitidas", "Facturas con vencimiento anterior a hoy y sin cobro") },
  { id: "al-6", severity: "media", kind: "stock", title: "Rodamiento 6309 por debajo del mínimo", explanation: "Quedan 2 uds. (mínimo 6) y el pedido PC-26-0612 lleva 2 días de retraso. Bloquea la OT-26-3302.", entity: "Almacén", href: "/compras", status: "en_revision", raisedAt: agoIso(60 * 8), evidence: evidence([8, 7, 6, 5, 3, 2]), provenance: P("a3erp", "Existencias y pedidos de compra", "Stock actual frente a stock mínimo; pedido abierto con ETA vencida") },
  { id: "al-7", severity: "baja", kind: "sistema", title: "A3ERP responde con latencia alta", explanation: "El gateway tarda más de 1 s por consulta. Los datos de facturación pueden tener hasta 12 minutos.", entity: "Conexiones", href: "/conexiones", status: "en_revision", raisedAt: agoIso(95), evidence: evidence([310, 340, 560, 900, 1250, 1420]), provenance: P("msm", "Salud de conectores", "Latencia p95 por conector, ventana de 15 min") },
  { id: "al-8", severity: "baja", kind: "anomalia", title: "Compresor C-02: consumo de aceite al alza", explanation: "Las 3 últimas revisiones muestran reposición creciente. No es una predicción de avería: conviene revisar juntas en el próximo preventivo.", entity: "Compresor C-02 · Planta Agroalimentaria", href: "/activos/A-0087", status: "nueva", raisedAt: agoIso(60 * 50), evidence: evidence([1.0, 1.1, 1.3, 1.4, 1.7, 1.9]), provenance: P("pgmwin", "Partes de preventivo · C-02", "Litros repuestos por revisión, tendencia lineal") },
  { id: "al-9", severity: "baja", kind: "contrato", title: "Renovación de contrato en 95 días: Logística Norte", explanation: "Buen momento para preparar el informe de resultados del año y la propuesta de renovación.", entity: "Logística Norte", href: "/clientes/cl-2", status: "resuelta", raisedAt: agoIso(60 * 90), evidence: [], provenance: P("a3erp", "Contratos", "Fecha de renovación − hoy ≤ 120 días") },
];

/* ───────── Sistema ───────── */
export const SYSTEM_USERS: SystemUser[] = [
  { id: "u1", name: "Javier Aguilar", email: "j.aguilar@mansera.example", role: "Dirección", lastSeen: agoIso(25), active: true },
  { id: "u2", name: "Cristina Durán", email: "c.duran@mansera.example", role: "TI", lastSeen: agoIso(5), active: true },
  { id: "u3", name: "Elena Marín", email: "e.marin@mansera.example", role: "Oficina técnica", lastSeen: agoIso(70), active: true },
  { id: "u4", name: "Carmen Vidal", email: "c.vidal@mansera.example", role: "Administración y facturación", lastSeen: agoIso(140), active: true },
  { id: "u5", name: "Raúl Campos", email: "r.campos@mansera.example", role: "Compras y almacén", lastSeen: agoIso(60 * 6), active: true },
  { id: "u6", name: "Beatriz Lara", email: "b.lara@mansera.example", role: "RR. HH. y personas", lastSeen: agoIso(60 * 30), active: true },
  { id: "u7", name: "Marcos Ruiz", email: "m.ruiz@mansera.example", role: "Técnico de campo", lastSeen: agoIso(12), active: true },
  { id: "u8", name: "Noelia Ortega", email: "n.ortega@mansera.example", role: "Técnico de campo", lastSeen: null, active: false },
];
export const AUDIT: AuditEvent[] = [
  { id: "au1", at: agoIso(6), actor: "Carmen Vidal", app: "msm", action: "Propuesta creada", entity: "AL-26-1190", detail: "Factura desde albarán (A3ERP), entorno de pruebas" },
  { id: "au2", at: agoIso(48), actor: "Sistema", app: "trello", action: "Webhook recibido", entity: "O-2026-0417", detail: "Oferta movida a «Ganada» → propuesta de OT" },
  { id: "au3", at: agoIso(75), actor: "Elena Marín", app: "msm", action: "Informe revisado", entity: "Embotelladora Sur · sep 2026", detail: "Pasa a «listo para emitir»" },
  { id: "au4", at: agoIso(120), actor: "Cristina Durán", app: "msm", action: "Conexión probada", entity: "A3ERP", detail: "health() correcto · 1.420 ms" },
  { id: "au5", at: agoIso(180), actor: "Javier Aguilar", app: "msm", action: "Propuesta aprobada", entity: "Alta de cliente", detail: "Frigoríficos del Guadalquivir → PGMWin (pruebas)" },
  { id: "au6", at: agoIso(60 * 5), actor: "Cristina Durán", app: "msm", action: "Rol modificado", entity: "Raúl Campos", detail: "Sin rol → Compras y almacén" },
  { id: "au7", at: agoIso(60 * 7), actor: "Marcos Ruiz", app: "pgmwin", action: "Consulta de activo", entity: "Bomba B-14", detail: "Lectura de ficha y averías" },
  { id: "au8", at: agoIso(60 * 9), actor: "Sistema", app: "sesame", action: "Sincronización de fichajes", entity: "Personal", detail: "12 empleados actualizados" },
  { id: "au9", at: agoIso(60 * 22), actor: "Copiloto de IA", app: "msm", action: "Consulta respondida", entity: "Usuario: Javier Aguilar", detail: "3 fuentes citadas (PGMWin, A3ERP)" },
  { id: "au10", at: agoIso(60 * 26), actor: "Cristina Durán", app: "msm", action: "Usuario desactivado", entity: "Noelia Ortega", detail: "Baja médica" },
];
