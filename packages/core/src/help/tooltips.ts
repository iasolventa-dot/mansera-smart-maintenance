import type { NavId } from "../access";

/**
 * Textos de ayuda contextual (al pasar el ratón): qué es el elemento y para qué sirve.
 * Centralizados aquí, no repartidos por los componentes. `tooltips.test.ts` comprueba que
 * cada sección del menú tiene el suyo y que ningún texto es demasiado largo.
 * Estilo: título corto (qué es) + una frase de utilidad. Solo describen lo que la aplicación hace hoy.
 */
export type Hint = { title: string; text: string };

export const NAV_HINT: Record<NavId, Hint> = {
  campo: { title: "Mi día", text: "Tus órdenes de trabajo de hoy, empezando por la siguiente que te toca." },
  panel: { title: "Panel general", text: "Resumen del estado de tu departamento: semáforo, indicadores y avisos que requieren tu atención." },
  alertas: { title: "Alertas", text: "Anomalías y avisos detectados, con su evidencia y su cálculo, para actuar antes de que crezcan." },
  ordenes: { title: "Órdenes de trabajo", text: "Averías y preventivos en curso con su estado, prioridad y responsable. Los datos vienen de PGMWin." },
  mantenimiento: { title: "Mantenimiento", text: "Plan de preventivos ordenado por fecha: qué está vencido, qué toca pronto y qué está al día." },
  activos: { title: "Activos", text: "Máquinas y equipos con su historial de averías, costes y dónde están registrados." },
  clientes: { title: "Clientes", text: "Ficha 360 de cada cliente: contrato, horas consumidas, costes, órdenes y ofertas." },
  comercial: { title: "Comercial", text: "Ofertas y proyectos de Trello por etapas, con importe y probabilidad de cierre." },
  facturacion: { title: "Facturación", text: "Albaranes sin facturar, y facturas emitidas, vencidas y cobradas de A3ERP." },
  compras: { title: "Compras y almacén", text: "Pedidos a proveedores y existencias de repuestos frente a su mínimo." },
  personal: { title: "Personal", text: "Plantilla, fichajes y ausencias de Sésame HR, y dónde está cada técnico." },
  prl: { title: "PRL y CAE", text: "Acreditaciones de prevención y documentación para entrar en los centros de cliente." },
  propuestas: { title: "Propuestas", text: "Cambios pendientes de aprobar antes de escribirse en PGMWin o A3ERP. Nada se escribe sin una persona." },
  informes: { title: "Informes", text: "Informes mensuales de cliente: borrador, revisado o emitido." },
  copiloto: { title: "Copiloto de IA", text: "Pregunta a tus datos en lenguaje natural. Solo lee y cada respuesta cita su fuente." },
  conexiones: { title: "Conexiones", text: "Estado, credenciales, última sincronización y latencia de PGMWin, A3ERP, a3innuva Nómina, Trello y Sésame." },
  usuarios: { title: "Usuarios y auditoría", text: "Quién tiene acceso a qué, y el registro inmutable de quién hizo qué." },
  manual: { title: "Manual de usuario", text: "Guía paso a paso de cada tarea, con buscador." },
};

/** Elementos de la interfaz que no son secciones del menú. */
export const HINT = {
  status: {
    ok: { title: "Correcto", text: "Dentro de lo normal: no requiere acción." },
    warn: { title: "Atención", text: "Conviene revisarlo pronto antes de que empeore." },
    bad: { title: "Crítico", text: "Requiere actuar ya o puede causar un problema." },
  },
  overall: {
    ok: { title: "Estado general: todo en orden", text: "Ningún indicador de tu departamento necesita atención ahora mismo." },
    warn: { title: "Estado general: requiere atención", text: "Hay indicadores o avisos que conviene revisar. Mira «Requiere tu atención» más abajo." },
    bad: { title: "Estado general: acción urgente", text: "Hay algo crítico. Empieza por los avisos de prioridad alta." },
  },
  severity: {
    alta: { title: "Prioridad alta", text: "Afecta a una máquina, contrato o acceso importante. Atiéndelo primero." },
    media: { title: "Prioridad media", text: "Conviene tratarlo esta semana." },
    baja: { title: "Prioridad baja", text: "Informativo: sin urgencia." },
  },
  demo: { title: "Demostración", text: "Los datos son de ejemplo (ficticios) salvo en las secciones que indiquen «Datos reales de …» con la hora de lectura." },
  search: { title: "Buscar o ir a… (Ctrl+K)", text: "Busca clientes, activos, órdenes, ofertas y personas, o salta a cualquier sección." },
  bell: { title: "Notificaciones", text: "Avisos recientes de tu departamento. Púlsalos para ir directamente al detalle." },
  helpHere: { title: "Ayuda de esta pantalla", text: "Abre el manual justo en la tarea de la pantalla en la que estás." },
  theme: { title: "Tema claro u oscuro", text: "Cambia la apariencia. Se recuerda en este navegador." },
  user: { title: "Tu perfil", text: "Tu nombre y el departamento cuyo panel y secciones ves." },
  roleSwitch: { title: "Vista previa como", text: "Mira la aplicación como otro departamento. Solo con datos de ejemplo y para Dirección o TI." },
  signOut: { title: "Cerrar sesión", text: "Termina tu sesión en este dispositivo." },
  helpFab: { title: "Asistente de ayuda", text: "Pregunta con tus palabras cómo hacer cualquier cosa en la aplicación." },
  quick: {
    nuevaOrden: { title: "Nueva orden de trabajo", text: "Crea una propuesta de orden en PGMWin. No se escribe nada hasta que alguien la apruebe." },
    facturar: { title: "Facturar albarán", text: "Lleva a los albaranes sin facturar para proponer su factura en A3ERP." },
    informe: { title: "Generar informe", text: "Abre los informes mensuales de cliente." },
  },
  source: { title: "Fuente del dato", text: "Aplicación y entidad de donde sale esta cifra. El programa de origen siempre tiene la razón." },
  anomaly: { title: "Anomalía", text: "Algo que se aparta de lo normal con datos que lo demuestran. No es una predicción de que algo vaya a fallar." },
  approve: { title: "Aprobar", text: "Autoriza el cambio de la tabla Antes/Después. Se ejecuta en el entorno indicado y queda en la auditoría." },
  reject: { title: "Rechazar", text: "Descarta la propuesta. No se escribe nada en el programa de destino." },
  environment: { title: "Entorno de pruebas", text: "El cambio se ejecutará primero en un entorno de pruebas, no en producción." },
  viewCalc: { title: "Ver cálculo", text: "Muestra cómo se ha obtenido la respuesta: qué datos y qué operación." },
  sendQuestion: { title: "Enviar pregunta", text: "Envía tu pregunta (también con Intro)." },
  newChat: { title: "Nueva conversación", text: "Borra la conversación actual para empezar de cero." },
  trendGood: { title: "Tendencia favorable", text: "Mejor que el periodo anterior." },
  trendBad: { title: "Tendencia desfavorable", text: "Peor que el periodo anterior." },
  contractBar: { title: "Horas del contrato", text: "Horas consumidas frente a las contratadas. En rojo, más del 90 %." },
  stockBar: { title: "Existencias frente al mínimo", text: "Cuánto hay en almacén respecto al stock mínimo. En rojo o naranja, toca reponer." },
} as const;

/** Descripción de un indicador (tarjeta del panel): qué mide y de dónde sale. */
export function kpiHint(k: { label: string; note?: string | null; provenance: { source: string; entity: string; period?: string; calc?: string } }, sourceLabel: string): Hint {
  const where = `${sourceLabel} · ${k.provenance.entity}${k.provenance.period ? ` (${k.provenance.period})` : ""}`;
  return { title: k.label, text: `${k.provenance.calc ? k.provenance.calc + ". " : ""}Fuente: ${where}.` };
}
