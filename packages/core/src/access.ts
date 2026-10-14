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
  | "usuarios"
  | "manual";

export type NavGroup = "Mi día" | "Operación" | "Negocio" | "Personas" | "Inteligencia" | "Sistema" | "Ayuda";

/** Orden maestro del menú; cada rol ve el subconjunto que le corresponde. */
export const NAV_ORDER: NavId[] = [
  "campo", "panel", "alertas", "ordenes", "mantenimiento", "activos",
  "clientes", "comercial", "facturacion", "compras",
  "personal", "prl",
  "propuestas", "informes", "copiloto",
  "conexiones", "usuarios",
  "manual",
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
  manual: "Manual de usuario",
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
  manual: "/manual",
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
  manual: "Ayuda",
};

/**
 * Qué secciones ve cada rol. Es la capa de presentación del permiso;
 * la barrera real son RLS + permisos por conector (docs/06).
 */
const ACCESS: Record<Role, { label: string; description: string; nav: NavId[] }> = {
  direccion: {
    label: "Dirección",
    description: "Visión global, rentabilidad y alertas críticas",
    nav: ["panel", "alertas", "ordenes", "mantenimiento", "activos", "clientes", "comercial", "facturacion", "compras", "personal", "prl", "propuestas", "informes", "copiloto", "manual"],
  },
  ti: {
    label: "TI · Administración del sistema",
    description: "Conexiones, auditoría y usuarios",
    nav: ["panel", "alertas", "propuestas", "copiloto", "conexiones", "usuarios", "manual"],
  },
  oficina_tecnica: {
    label: "Oficina técnica",
    description: "OT, activos, preventivos y ofertas",
    nav: ["panel", "alertas", "ordenes", "mantenimiento", "activos", "clientes", "comercial", "propuestas", "informes", "copiloto", "manual"],
  },
  administracion: {
    label: "Administración y facturación",
    description: "Albaranes, facturas y clientes",
    nav: ["panel", "alertas", "ordenes", "clientes", "facturacion", "propuestas", "informes", "copiloto", "manual"],
  },
  compras: {
    label: "Compras y almacén",
    description: "Pedidos, repuestos y proveedores",
    nav: ["panel", "alertas", "ordenes", "activos", "compras", "copiloto", "manual"],
  },
  rrhh: {
    label: "RR. HH. y personas",
    description: "Personal, fichajes, PRL y CAE",
    nav: ["panel", "alertas", "personal", "prl", "copiloto", "manual"],
  },
  campo: {
    label: "Técnico de campo",
    description: "Mis OT de hoy, ficha del activo, parte",
    nav: ["campo", "activos", "copiloto", "manual"],
  },
};

export const ROLE_ACCESS = ACCESS;
export const ROLE_ORDER: Role[] = ["direccion", "ti", "oficina_tecnica", "administracion", "compras", "rrhh", "campo"];

export const homeFor = (role: Role): string => (role === "campo" ? "/campo" : "/panel");
export const canAccess = (role: Role, id: NavId): boolean => ACCESS[role].nav.includes(id);
/** Secciones del rol, en el orden maestro del menú. */
export const navFor = (role: Role): NavId[] => NAV_ORDER.filter((id) => canAccess(role, id));

/**
 * Acciones del servidor (escrituras y consultas con efecto) y la sección cuyo permiso exigen.
 * La interfaz oculta lo que no se puede hacer, pero la barrera real está aquí y en el servidor:
 * toda server action debe llamar a `canPerform` (lo recuerda un test).
 */
export type ActionId = "decidirPropuesta" | "crearOrden" | "usarCopiloto" | "configurarConexiones";
export const ACTION_SECTION: Record<ActionId, NavId> = {
  decidirPropuesta: "propuestas",
  crearOrden: "ordenes",
  usarCopiloto: "copiloto",
  configurarConexiones: "conexiones",
};
export const canPerform = (role: Role, action: ActionId): boolean => canAccess(role, ACTION_SECTION[action]);

/**
 * Datos REALES de un sistema (Sésame, Trello…): solo con el perfil real y sin vista previa.
 * La «vista previa como» otro perfil existe para enseñar la aplicación con datos de ejemplo; nunca debe abrir datos
 * reales que el perfil real no puede ver (revisión completa 2026-10-14, bloqueante).
 */
export const canUseRealData = (role: Role, realRole: Role, section: NavId): boolean => role === realRole && canAccess(realRole, section);

/**
 * Dato de salud (art. 9 RGPD): saber que una persona concreta está «de baja» solo lo ve RR. HH.
 * Para el resto de perfiles se muestra como «ausente» (ADR-0013 / R-21: agregados o sin detalle fuera de RR. HH.).
 */
export const canSeeSickLeave = (realRole: Role): boolean => realRole === "rrhh";
