import type { Asset, AssetDetail, Connection, Proposal, Report, WorkOrder } from "../schemas";

/**
 * Datos FICTICIOS para demostraciones comerciales. No proceden de ningún sistema de MANSERA.
 * Nombres de clientes inventados a propósito.
 */

export const CLIENTS = [
  "Embotelladora Sur",
  "Logística Norte",
  "Planta Agroalimentaria",
  "Centro Comercial Este",
  "Hospital Regional",
] as const;

export const ASSETS: Asset[] = [
  { id: "A-0142", name: "Bomba B-14", client: "Embotelladora Sur", site: "Línea 2 · Sala de bombeo", category: "Bombeo", status: "bad", failures12m: 9, nextPreventive: "2026-10-21" },
  { id: "A-0087", name: "Compresor C-02", client: "Planta Agroalimentaria", site: "Sala de compresores", category: "Aire comprimido", status: "warn", failures12m: 5, nextPreventive: "2026-10-30" },
  { id: "A-0231", name: "Enfriadora E-05", client: "Centro Comercial Este", site: "Cubierta norte", category: "Climatización", status: "ok", failures12m: 1, nextPreventive: "2026-11-12" },
  { id: "A-0310", name: "Cinta transportadora T-11", client: "Logística Norte", site: "Muelle 3", category: "Manutención", status: "warn", failures12m: 4, nextPreventive: "2026-10-18" },
  { id: "A-0455", name: "Grupo electrógeno G-01", client: "Hospital Regional", site: "Sótano -1", category: "Energía", status: "ok", failures12m: 0, nextPreventive: "2026-11-02" },
  { id: "A-0098", name: "Llenadora LL-03", client: "Embotelladora Sur", site: "Línea 1", category: "Envasado", status: "ok", failures12m: 2, nextPreventive: "2026-11-05" },
];

const T = "2026-10-13T08:00:00.000Z";

export const WORK_ORDERS: WorkOrder[] = [
  { id: "ot-1", externalId: "OT-26-3318", source: "pgmwin", title: "Fuga en sello mecánico", client: "Embotelladora Sur", assetId: "A-0142", assetName: "Bomba B-14", status: "en_curso", priority: "urgente", type: "correctivo", dueDate: "2026-10-13", assignee: "Marcos Ruiz", site: "Línea 2 · Sala de bombeo", mine: true, fetchedAt: T },
  { id: "ot-2", externalId: "OT-26-3321", source: "pgmwin", title: "Revisión trimestral compresor", client: "Planta Agroalimentaria", assetId: "A-0087", assetName: "Compresor C-02", status: "abierta", priority: "normal", type: "preventivo", dueDate: "2026-10-13", assignee: "Marcos Ruiz", site: "Sala de compresores", mine: true, fetchedAt: T },
  { id: "ot-3", externalId: "OT-26-3322", source: "pgmwin", title: "Ajuste de tensión de cinta", client: "Logística Norte", assetId: "A-0310", assetName: "Cinta transportadora T-11", status: "abierta", priority: "alta", type: "correctivo", dueDate: "2026-10-14", assignee: "Marcos Ruiz", site: "Muelle 3", mine: true, fetchedAt: T },
  { id: "ot-4", externalId: "OT-26-3302", source: "pgmwin", title: "Sustitución de rodamientos", client: "Embotelladora Sur", assetId: "A-0098", assetName: "Llenadora LL-03", status: "esperando_material", priority: "alta", type: "correctivo", dueDate: "2026-10-16", assignee: "Lucía Prieto", site: "Línea 1", fetchedAt: T, mine: false },
  { id: "ot-5", externalId: "OT-26-3290", source: "pgmwin", title: "Mantenimiento semestral enfriadora", client: "Centro Comercial Este", assetId: "A-0231", assetName: "Enfriadora E-05", status: "abierta", priority: "normal", type: "preventivo", dueDate: "2026-10-19", assignee: "Lucía Prieto", site: "Cubierta norte", fetchedAt: T, mine: false },
  { id: "ot-6", externalId: "OT-26-3277", source: "pgmwin", title: "Prueba en carga grupo electrógeno", client: "Hospital Regional", assetId: "A-0455", assetName: "Grupo electrógeno G-01", status: "en_curso", priority: "alta", type: "preventivo", dueDate: "2026-10-15", assignee: "Andrés Gil", site: "Sótano -1", fetchedAt: T, mine: false },
  { id: "ot-7", externalId: "OT-26-3251", source: "pgmwin", title: "Cambio de filtros de aire", client: "Planta Agroalimentaria", assetId: "A-0087", assetName: "Compresor C-02", status: "cerrada", priority: "normal", type: "preventivo", dueDate: "2026-10-08", assignee: "Andrés Gil", site: "Sala de compresores", fetchedAt: T, mine: false },
];

export const ASSET_DETAILS: Record<string, AssetDetail> = {
  "A-0142": {
    ...ASSETS[0]!,
    serial: "BP-2019-44871",
    installedYear: 2019,
    links: [
      { source: "pgmwin", externalId: "ACT-0142", label: "Ficha del activo" },
      { source: "a3erp", externalId: "4501", label: "Cliente Embotelladora Sur" },
      { source: "trello", externalId: "tablero-embotelladora", label: "Tablero de proyectos" },
    ],
    costByMonth: [
      { label: "may", value: 420 }, { label: "jun", value: 380 }, { label: "jul", value: 1250 },
      { label: "ago", value: 640 }, { label: "sep", value: 2310 }, { label: "oct", value: 880 },
    ],
    timeline: [
      { id: "e1", date: "2026-10-12", kind: "averia", title: "Fuga en sello mecánico", detail: "Aviso del cliente. Se abre OT-26-3318.", source: "pgmwin", costEur: 880 },
      { id: "e2", date: "2026-09-24", kind: "averia", title: "Vibración anómala", detail: "Sustitución de acoplamiento. 3,5 h de técnico.", source: "pgmwin", costEur: 2310 },
      { id: "e3", date: "2026-09-02", kind: "repuesto", title: "Pedido de sello mecánico", detail: "Albarán recibido en almacén.", source: "a3erp", costEur: 540 },
      { id: "e4", date: "2026-08-19", kind: "preventivo", title: "Preventivo trimestral", detail: "Sin incidencias. Se recomienda revisar alineación.", source: "pgmwin" },
      { id: "e5", date: "2026-07-30", kind: "averia", title: "Parada por sobrecalentamiento", detail: "Limpieza de intercambiador.", source: "pgmwin", costEur: 1250 },
    ],
    insight: {
      text: "4 averías en 60 días, el doble que las máquinas similares de la misma planta. Patrón compatible con desalineación.",
      provenance: { source: "pgmwin", entity: "Órdenes de trabajo correctivas · Bomba B-14", period: "2026-08-14 a 2026-10-13", fetchedAt: T, calc: "Recuento de OT correctivas cerradas en 60 días frente a la mediana de activos de la misma categoría" },
    },
  },
};

export const PROPOSALS: Proposal[] = [
  {
    id: "p-1", title: "Crear OT en PGMWin desde la oferta ganada «Revisión líneas 1 y 2»", from: "trello", to: "pgmwin",
    summary: "La oferta pasó a «Ganada» en Trello. Se propone abrir la orden de trabajo correspondiente.",
    createdBy: "Sistema (regla: oferta ganada)", createdAt: "2026-10-13T07:42:00.000Z", status: "pendiente", environment: "pruebas",
    diff: [
      { field: "Cliente", before: null, after: "Embotelladora Sur (PGMWin CL-122)" },
      { field: "Descripción", before: null, after: "Revisión líneas 1 y 2 · según oferta O-2026-0417" },
      { field: "Prioridad", before: null, after: "Normal" },
      { field: "Fecha prevista", before: null, after: "2026-11-03" },
    ],
  },
  {
    id: "p-2", title: "Generar factura en A3 desde el albarán AL-26-1190", from: "pgmwin", to: "a3erp",
    summary: "Albarán cerrado y conformado por el cliente. Se propone emitir la factura con las líneas del parte.",
    createdBy: "Carmen Vidal", createdAt: "2026-10-12T16:10:00.000Z", status: "pendiente", environment: "pruebas",
    diff: [
      { field: "Cliente", before: null, after: "Logística Norte (A3 4518)" },
      { field: "Líneas", before: null, after: "Mano de obra 6,5 h · Repuestos 3 uds" },
      { field: "Base imponible", before: null, after: "1.284,50 €" },
      { field: "Vencimiento", before: null, after: "60 días" },
    ],
  },
  {
    id: "p-3", title: "Alta de cliente nuevo en PGMWin desde A3", from: "a3erp", to: "pgmwin",
    summary: "Cliente creado ayer en A3. Evita teclear de nuevo los datos maestros.",
    createdBy: "Sistema (regla: cliente nuevo)", createdAt: "2026-10-11T09:00:00.000Z", status: "aprobada", environment: "pruebas",
    diff: [
      { field: "Razón social", before: null, after: "Frigoríficos del Guadalquivir S.L." },
      { field: "NIF", before: null, after: "B00000000 (ficticio)" },
    ],
  },
];

export const CONNECTIONS: Connection[] = [
  { source: "trello", name: "Trello", health: "conectado", transport: "directo", lastSyncAt: "2026-10-13T08:44:00.000Z", latencyMs: 182, note: "Webhooks activos. Reconciliación cada 15 min.", capabilities: [{ name: "Leer tableros y tarjetas", state: "verified" }, { name: "Webhooks", state: "verified" }, { name: "Crear tarjetas", state: "assumed" }] },
  { source: "sesame", name: "Sésame HR", health: "conectado", transport: "directo", lastSyncAt: "2026-10-13T08:41:00.000Z", latencyMs: 241, capabilities: [{ name: "Leer empleados y fichajes", state: "assumed" }, { name: "Ausencias", state: "assumed" }] },
  { source: "a3erp", name: "A3ERP", health: "degradado", transport: "gateway", lastSyncAt: "2026-10-13T08:32:00.000Z", latencyMs: 1420, note: "Gateway responde lento. Datos con hasta 12 min de antigüedad.", capabilities: [{ name: "Leer clientes y facturas", state: "assumed" }, { name: "Crear facturas (Link API)", state: "assumed" }] },
  { source: "pgmwin", name: "PGMWin", health: "pendiente", transport: "gateway", note: "Pendiente de confirmar vía de integración con el proveedor.", capabilities: [{ name: "Leer OT y activos", state: "assumed" }, { name: "Escribir OT", state: "no-go" }] },
];

export const REPORTS: Report[] = [
  {
    id: "r-1", title: "Informe mensual de servicio · Septiembre 2026", client: "Embotelladora Sur", period: "2026-09", status: "revisado",
    kpis: [{ label: "OT cerradas", value: "42" }, { label: "Cumplimiento preventivo", value: "96,1 %" }, { label: "Tiempo medio de respuesta", value: "2,9 h" }, { label: "Coste de mantenimiento", value: "12.400 €" }],
    summary: "Mes estable. La bomba B-14 concentra el 31 % del coste correctivo y se recomienda revisar su alineación. Cumplimiento preventivo por encima del objetivo del contrato.",
  },
  {
    id: "r-2", title: "Informe mensual de servicio · Septiembre 2026", client: "Logística Norte", period: "2026-09", status: "borrador",
    kpis: [{ label: "OT cerradas", value: "31" }, { label: "Cumplimiento preventivo", value: "91,4 %" }, { label: "Tiempo medio de respuesta", value: "3,8 h" }, { label: "Coste de mantenimiento", value: "9.800 €" }],
    summary: "Horas consumidas al 92 % del presupuesto anual del contrato marco. Pendiente de revisión humana antes de emitir.",
  },
  {
    id: "r-3", title: "Informe mensual de servicio · Agosto 2026", client: "Hospital Regional", period: "2026-08", status: "emitido",
    kpis: [{ label: "OT cerradas", value: "18" }, { label: "Cumplimiento preventivo", value: "100 %" }, { label: "Tiempo medio de respuesta", value: "1,6 h" }, { label: "Coste de mantenimiento", value: "4.100 €" }],
    summary: "Sin incidencias críticas. Pruebas en carga del grupo electrógeno realizadas conforme al plan.",
  },
];
