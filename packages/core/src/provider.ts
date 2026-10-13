import type {
  Asset,
  AssetDetail,
  Connection,
  CopilotAnswer,
  Dashboard,
  Proposal,
  Report,
  Role,
  WorkOrder,
} from "./schemas";
import type {
  AlertItem,
  AuditEvent,
  ClientDetail,
  ClientSummary,
  FinanceOverview,
  MaintenanceOverview,
  NewWorkOrderInput,
  Notification,
  Offer,
  PeopleOverview,
  PrlOverview,
  PurchasingOverview,
  SearchHit,
  SystemUser,
} from "./modules";

export type WorkOrderFilter = { onlyMine?: boolean };

/**
 * Contrato de acceso a datos de la aplicación (ADR-0001: API-first).
 * La UI solo conoce esta interfaz. Hoy la implementa `DemoDataProvider`;
 * más adelante, una implementación sobre `packages/connectors` + Supabase
 * sin tocar ninguna pantalla.
 */
export interface DataProvider {
  /** `demo` muestra el distintivo "Datos de ejemplo" en toda la UI. */
  readonly mode: "demo" | "live";

  getDashboard(role: Role): Promise<Dashboard>;

  // Operación
  listWorkOrders(filter?: WorkOrderFilter): Promise<WorkOrder[]>;
  listAssets(): Promise<Asset[]>;
  getAsset(id: string): Promise<AssetDetail | null>;
  getMaintenance(): Promise<MaintenanceOverview>;
  listAlerts(): Promise<AlertItem[]>;

  // Negocio
  listClients(): Promise<ClientSummary[]>;
  getClient(id: string): Promise<ClientDetail | null>;
  listOffers(): Promise<Offer[]>;
  getFinance(): Promise<FinanceOverview>;
  getPurchasing(): Promise<PurchasingOverview>;

  // Personas
  getPeople(): Promise<PeopleOverview>;
  getPrl(): Promise<PrlOverview>;

  // Propuestas (escrituras con aprobación humana, ADR-0005)
  listProposals(): Promise<Proposal[]>;
  /** Crea una propuesta; nunca ejecuta nada en el sistema destino. */
  createWorkOrderProposal(input: NewWorkOrderInput, userName: string): Promise<Proposal>;
  decideProposal(id: string, decision: "aprobada" | "rechazada", userName: string): Promise<Proposal>;

  // Inteligencia
  listReports(): Promise<Report[]>;
  askCopilot(question: string, role: Role): Promise<CopilotAnswer>;

  // Sistema
  getConnections(): Promise<Connection[]>;
  listUsers(): Promise<SystemUser[]>;
  listAudit(): Promise<AuditEvent[]>;

  // Transversal
  listNotifications(role: Role): Promise<Notification[]>;
  search(query: string, role: Role): Promise<SearchHit[]>;
}
