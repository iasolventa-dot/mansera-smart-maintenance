import type { Role } from "./schemas";

export type NavId =
  | "campo"
  | "panel"
  | "alertas"
  | "ordenes"
  | "mantenimiento"
  | "activos"
  | "clientes"
  | "comercial"
  | "facturacion"
  | "compras"
  | "personal"
  | "prl"
  | "propuestas"
  | "informes"
  | "copiloto"
  | "conexiones"
  | "usuarios";

export type NavGroup = "Mi día" | "Operación" | "Negocio" | "Personas" | "Inteligencia" | "Sistema";

/** Orden maestro del menú; cada rol ve el subconjunto que le corresponde. */
export const NAV_ORDER: NavId[] = [
  "campo", "panel", "alertas", "ordenes", "mantenimiento", "activos",
  "clientes", "comercial", "facturacion", "compras",
  "personal", "prl",
  "propuestas", "informes", "copiloto",
  "conexiones", "usuarios",
];

export const NAV_LABEL: Record<NavId, string> = {
  campo: "Mi día",
  panel: "Panel general",
  alertas: "Alertas",
  ordenes: "Órdenes de trabajo",
  mantenimiento: "Mantenimiento",
  activos: "Activos",
  clientes: "Clientes",
  comercial: "Comercial",
  facturacion: "Facturación",
  compras: "Compras y almacén",
  personal: "Personal",
  prl: "PRL y CAE",
  propuestas: "Propuestas",
  informes: "Informes",
  copiloto: "Copiloto de IA",
  conexiones: "Conexiones",
  usuarios: "Usuarios y auditoría",
};

export const NAV_HREF: Record<NavId, string> = {
  campo: "/campo",
  panel: "/panel",
  alertas: "/alertas",
  ordenes: "/ordenes",
  mantenimiento: "/mantenimiento",
  activos: "/activos",
  clientes: "/clientes",
  comercial: "/comercial",
  facturacion: "/facturacion",
  compras: "/compras",
  personal: "/personal",
  prl: "/prl",
  propuestas: "/propuestas",
  informes: "/informes",
  copiloto: "/copiloto",
  conexiones: "/conexiones",
  usuarios: "/usuarios",
};

export const NAV_GROUP: Record<NavId, NavGroup> = {
  campo: "Mi día",
  panel: "Operación",
  alertas: "Operación",
  ordenes: "Operación",
  mantenimiento: "Operación",
  activos: "Operación",
  clientes: "Negocio",
  comercial: "Negocio",
  facturacion: "Negocio",
  compras: "Negocio",
  personal: "Personas",
  prl: "Personas",
  propuestas: "Inteligencia",
  informes: "Inteligencia",
  copiloto: "Inteligencia",
  conexiones: "Sistema",
  usuarios: "Sistema",
};

/**
 * Qué secciones ve cada rol. Es la capa de presentación del permiso;
 * la barrera real son RLS + permisos por conector (docs/06).
 */
const ACCESS: Record<Role, { label: string; description: string; nav: NavId[] }> = {
  direccion: {
    label: "Dirección",
    description: "Visión global, rentabilidad y alertas críticas",
    nav: ["panel", "alertas", "ordenes", "mantenimiento", "activos", "clientes", "comercial", "facturacion", "compras", "personal", "prl", "propuestas", "informes", "copiloto"],
  },
  ti: {
    label: "TI · Administración del sistema",
    description: "Conexiones, auditoría y usuarios",
    nav: ["panel", "alertas", "propuestas", "copiloto", "conexiones", "usuarios"],
  },
  oficina_tecnica: {
    label: "Oficina técnica",
    description: "OT, activos, preventivos y ofertas",
    nav: ["panel", "alertas", "ordenes", "mantenimiento", "activos", "clientes", "comercial", "propuestas", "informes", "copiloto"],
  },
  administracion: {
    label: "Administración y facturación",
    description: "Albaranes, facturas y clientes",
    nav: ["panel", "alertas", "ordenes", "clientes", "facturacion", "propuestas", "informes", "copiloto"],
  },
  compras: {
    label: "Compras y almacén",
    description: "Pedidos, repuestos y proveedores",
    nav: ["panel", "alertas", "ordenes", "activos", "compras", "copiloto"],
  },
  rrhh: {
    label: "RR. HH. y personas",
    description: "Personal, fichajes, PRL y CAE",
    nav: ["panel", "alertas", "personal", "prl", "copiloto"],
  },
  campo: {
    label: "Técnico de campo",
    description: "Mis OT de hoy, ficha del activo, parte",
    nav: ["campo", "activos", "copiloto"],
  },
};

export const ROLE_ACCESS = ACCESS;
export const ROLE_ORDER: Role[] = ["direccion", "ti", "oficina_tecnica", "administracion", "compras", "rrhh", "campo"];

export const homeFor = (role: Role): string => (role === "campo" ? "/campo" : "/panel");
export const canAccess = (role: Role, id: NavId): boolean => ACCESS[role].nav.includes(id);
/** Secciones del rol, en el orden maestro del menú. */
export const navFor = (role: Role): NavId[] => NAV_ORDER.filter((id) => canAccess(role, id));
