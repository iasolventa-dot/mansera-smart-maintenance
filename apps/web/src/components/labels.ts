import type { SourceApp, WorkOrder } from "@msm/core";

export const SOURCE_LABEL: Record<SourceApp, string> = {
  pgmwin: "PGMWin", a3erp: "A3ERP", a3nomina: "a3innuva Nómina", trello: "Trello", sesame: "Sésame", msm: "MSM",
};

export const STATUS_LABEL: Record<WorkOrder["status"], string> = {
  abierta: "Abierta", en_curso: "En curso", esperando_material: "Esperando material", cerrada: "Cerrada",
};

export const STATUS_TONE: Record<WorkOrder["status"], "info" | "ok" | "warn" | "neutral"> = {
  abierta: "info", en_curso: "info", esperando_material: "warn", cerrada: "ok",
};

export const PRIORITY_TONE = { urgente: "bad", alta: "warn", normal: "neutral" } as const;
