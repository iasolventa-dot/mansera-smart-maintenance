import type { Role } from "./schemas";

export type NavId =
  | "panel"
  | "ordenes"
  | "activos"
  | "propuestas"
  | "copiloto"
  | "informes"
  | "conexiones"
  | "campo";

/**
 * Qué secciones ve cada rol. Es la capa de presentación del permiso;
 * la barrera real son RLS + permisos por conector (docs/06).
 */
export const ROLE_ACCESS: Record<Role, { label: string; description: string; nav: NavId[] }> = {
  direccion: {
    label: "Dirección",
    description: "Visión global, rentabilidad y alertas críticas",
    nav: ["panel", "ordenes", "activos", "propuestas", "copiloto", "informes"],
  },
  ti: {
    label: "TI · Administración del sistema",
    description: "Conexiones, auditoría y usuarios",
    nav: ["panel", "conexiones", "propuestas", "copiloto"],
  },
  oficina_tecnica: {
    label: "Oficina técnica",
    description: "OT, activos, preventivos y ofertas",
    nav: ["panel", "ordenes", "activos", "propuestas", "copiloto", "informes"],
  },
  administracion: {
    label: "Administración y facturación",
    description: "Albaranes, facturas y clientes",
    nav: ["panel", "ordenes", "propuestas", "informes", "copiloto"],
  },
  campo: {
    label: "Técnico de campo",
    description: "Mis OT de hoy, ficha del activo, parte",
    nav: ["campo", "activos", "copiloto"],
  },
};

export const NAV_LABEL: Record<NavId, string> = {
  panel: "Panel general",
  ordenes: "Órdenes de trabajo",
  activos: "Activos",
  propuestas: "Propuestas",
  copiloto: "Copiloto de IA",
  informes: "Informes",
  conexiones: "Conexiones",
  campo: "Mi día",
};

export const NAV_HREF: Record<NavId, string> = {
  panel: "/panel",
  ordenes: "/ordenes",
  activos: "/activos",
  propuestas: "/propuestas",
  copiloto: "/copiloto",
  informes: "/informes",
  conexiones: "/conexiones",
  campo: "/campo",
};

export const homeFor = (role: Role): string => (role === "campo" ? "/campo" : "/panel");
export const canAccess = (role: Role, id: NavId): boolean => ROLE_ACCESS[role].nav.includes(id);
