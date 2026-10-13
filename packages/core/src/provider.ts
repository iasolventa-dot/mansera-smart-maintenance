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
  listWorkOrders(filter?: WorkOrderFilter): Promise<WorkOrder[]>;
  listAssets(): Promise<Asset[]>;
  getAsset(id: string): Promise<AssetDetail | null>;
  listProposals(): Promise<Proposal[]>;
  /** Escritura: nunca ejecuta en el sistema destino sin aprobación humana. */
  decideProposal(id: string, decision: "aprobada" | "rechazada", userName: string): Promise<Proposal>;
  getConnections(): Promise<Connection[]>;
  listReports(): Promise<Report[]>;
  askCopilot(question: string, role: Role): Promise<CopilotAnswer>;
}
