import type { NavId } from "../access";

/**
 * MANUAL DE USUARIO: fuente ÚNICA de la ayuda. De aquí salen la página /manual, la búsqueda,
 * el asistente de ayuda (modo guía y modo IA) y los enlaces «Ayuda de esta pantalla».
 *
 * Reglas (las comprueba `help.test.ts`):
 *  - Una tarea por cosa que el usuario hace; `panel` = sección donde se hace (o null si es general).
 *  - Cada sección de la aplicación (NavId) tiene al menos una tarea: si añades una pantalla, documentala.
 *  - Solo se describe lo que la aplicación hace de verdad. Nada de funciones futuras.
 *  - Texto en es-ES, tuteando. `**negrita**` para nombres de botones y apartados.
 */
export type NoteKind = "info" | "importante" | "consejo";
export type ManualTask = {
  id: string;
  title: string;
  /** Sección de la aplicación donde se hace la tarea (define el rol que la ve y el botón «Ir a…»). */
  panel: NavId | null;
  /** Sinónimos y palabras con las que el usuario puede buscarla. */
  keywords: string[];
  steps: string[];
  notes?: { kind: NoteKind; text: string }[];
};
export type ManualChapter = { id: string; title: string; intro: string; tasks: ManualTask[] };

export const MANUAL: ManualChapter[] = [
  {
    id: "primeros-pasos",
    title: "Primeros pasos",
    intro:
      "MANSERA Smart Maintenance reúne en un solo acceso lo que hoy está repartido entre PGMWin, A3ERP, Trello y Sésame HR. No sustituye a esos programas: ellos siguen siendo la fuente de cada dato y aquí se consulta y se enlaza.",
    tasks: [
      {
        id: "entrar",
        title: "Entrar en la aplicación",
        panel: null,
        keywords: ["login", "acceso", "contraseña", "correo", "email", "no puedo entrar", "iniciar sesión", "identificarse"],
        steps: [
          "Abre la dirección de la aplicación en tu navegador (ordenador o móvil).",
          "Escribe tu **correo electrónico** y tu **contraseña** y pulsa **Entrar**.",
          "Llegarás a tu panel: el de tu departamento. El técnico de campo entra directamente en **Mi día**.",
        ],
        notes: [
          { kind: "info", text: "Si ves «tu cuenta todavía no tiene acceso asignado», tu usuario existe pero TI aún no te ha dado un perfil. Pídeselo y vuelve a entrar." },
          { kind: "consejo", text: "Puedes instalarla como una aplicación en el móvil desde el menú de tu navegador («Añadir a pantalla de inicio»)." },
        ],
      },
      {
        id: "moverse",
        title: "Moverte por la aplicación",
        panel: null,
        keywords: ["menú", "navegación", "barra lateral", "secciones", "móvil", "más", "donde está", "encontrar"],
        steps: [
          "En el **ordenador**, el menú está a la izquierda, agrupado en Operación, Negocio, Personas, Inteligencia, Sistema y Ayuda. Solo aparecen las secciones de tu perfil.",
          "En el **móvil**, la barra inferior muestra los cuatro destinos más usados; el resto está en **Más**.",
          "Arriba tienes el buscador, las notificaciones, el cambio de tema y tu nombre con tu perfil.",
        ],
      },
      {
        id: "buscar",
        title: "Buscar cualquier cosa rápidamente",
        panel: null,
        keywords: ["buscador", "ctrl k", "atajo", "buscar", "cliente", "activo", "orden", "oferta", "persona", "ir a"],
        steps: [
          "Pulsa **Ctrl + K** (o el botón **Buscar** de arriba; en el móvil, la lupa).",
          "Escribe al menos dos letras: un cliente, un activo, una orden, una oferta o una persona. También salen las secciones y la acción **Nueva orden de trabajo**.",
          "Muévete con las flechas y pulsa **Intro** para abrir el resultado. **Esc** lo cierra.",
        ],
        notes: [{ kind: "info", text: "La búsqueda solo muestra lo que tu perfil puede ver." }],
      },
      {
        id: "notificaciones",
        title: "Ver las notificaciones",
        panel: null,
        keywords: ["campana", "avisos", "notificación", "sin leer", "novedades"],
        steps: [
          "Pulsa la **campana** de la barra superior. El número rojo indica cuántas no has leído.",
          "Pulsa una notificación para ir directamente a la sección a la que se refiere.",
        ],
      },
      {
        id: "tema",
        title: "Cambiar entre tema claro y oscuro",
        panel: null,
        keywords: ["oscuro", "claro", "modo noche", "tema", "luna", "sol", "apariencia"],
        steps: [
          "Pulsa el botón de la **luna** (o el **sol**) de la barra superior.",
          "Se recuerda en este navegador; por defecto sigue el tema de tu dispositivo.",
        ],
      },
      {
        id: "asistente",
        title: "Pedir ayuda al asistente",
        panel: null,
        keywords: ["asistente", "ayuda", "chat", "ia", "preguntar", "duda", "cómo se hace", "soporte"],
        steps: [
          "Pulsa el botón redondo de **Ayuda** de la esquina inferior derecha.",
          "Escribe tu duda con tus palabras («¿cómo creo una orden de trabajo?») o elige una de las preguntas sugeridas.",
          "Si la respuesta lleva un botón **Ir a…**, púlsalo para abrir directamente la pantalla. Debajo verás de qué apartado del manual sale la respuesta.",
        ],
        notes: [
          { kind: "importante", text: "El asistente explica cómo usar la aplicación; no ve tus datos. Para preguntar por averías, costes o contratos usa el **Copiloto de IA**." },
          { kind: "info", text: "Si no hay IA disponible, o has llegado al límite diario, responde en «modo guía» buscando en este manual. Funciona igual de bien para las dudas habituales." },
        ],
      },
      {
        id: "roles",
        title: "Por qué no veo un apartado del menú",
        panel: null,
        keywords: ["permisos", "rol", "perfil", "no aparece", "no veo", "oculto", "acceso denegado", "falta", "restringido"],
        steps: [
          "Cada persona ve las secciones de su departamento: Dirección, TI, Oficina técnica, Administración, Compras, RR. HH. o Técnico de campo.",
          "En cada tarea de este manual verás para qué perfiles está disponible.",
          "Si necesitas una sección que no tienes, pídeselo a TI. Ellos pueden ver la tabla completa en **Usuarios y auditoría → Permisos por rol**.",
        ],
        notes: [{ kind: "info", text: "La restricción no es solo visual: la base de datos también impide leer lo que tu perfil no permite." }],
      },
      {
        id: "vista-previa",
        title: "Ver la aplicación como otro departamento (vista previa)",
        panel: null,
        keywords: ["vista previa", "demo", "ver como", "cambiar rol", "otro perfil", "demostración", "datos de ejemplo"],
        steps: [
          "Si eres de **Dirección** o **TI**, abajo en el menú lateral (o en **Más**, en el móvil) aparece **Vista previa como**.",
          "Elige un departamento y verás su panel y sus secciones tal y como las ve esa persona.",
        ],
        notes: [{ kind: "importante", text: "Solo existe mientras la aplicación muestre **datos de ejemplo** (distintivo naranja arriba). Con datos reales, cada persona ve únicamente lo suyo." }],
      },
      {
        id: "salir",
        title: "Cerrar sesión",
        panel: null,
        keywords: ["salir", "logout", "cerrar", "desconectar", "sesión caducada"],
        steps: ["En el ordenador, pulsa **Cerrar sesión** abajo en el menú lateral. En el móvil, abre **Más** y pulsa **Cerrar sesión**."],
        notes: [{ kind: "info", text: "Si la aplicación te devuelve a la pantalla de acceso sin que hayas salido, tu sesión ha caducado: vuelve a entrar." }],
      },
      {
        id: "manual",
        title: "Usar este manual",
        panel: "manual",
        keywords: ["manual", "guía", "imprimir", "pdf", "índice", "buscar en el manual", "ayuda de esta pantalla"],
        steps: [
          "Busca por palabras en el cuadro de arriba: se filtran las tareas y se resalta lo que coincide.",
          "Usa el **índice** de la izquierda (en el móvil, el botón **Índice**) para saltar de capítulo.",
          "Pulsa el título de una tarea para abrirla. El icono **?** de la barra superior abre el manual directamente en la tarea de la pantalla en la que estás.",
          "Para imprimirlo, pulsa **Imprimir**: se abren todas las tareas.",
        ],
      },
    ],
  },
  {
    id: "dia-a-dia",
    title: "El día a día",
    intro: "Qué mirar cada mañana y cómo seguir las órdenes, los preventivos y los activos.",
    tasks: [
      {
        id: "panel",
        title: "Saber cómo está todo de un vistazo (Panel general)",
        panel: "panel",
        keywords: ["inicio", "panel", "semáforo", "kpi", "indicadores", "resumen", "cuadro de mando", "tarjetas", "tendencia", "fuente"],
        steps: [
          "Arriba, el **semáforo** resume el estado con color, icono y texto: «Todo en orden», «Requiere atención» o «Acción urgente».",
          "Las **tarjetas** muestran cada indicador con su tendencia (flecha verde si mejora, roja si empeora) y, debajo, **de qué aplicación y entidad sale** la cifra.",
          "Debajo hay gráficos de tendencia, ranking y reparto, propios de tu departamento.",
          "**Requiere tu atención** lista lo más importante; pulsa el enlace de cada aviso para ir a su detalle.",
        ],
        notes: [
          { kind: "consejo", text: "Los botones de arriba a la derecha («Nueva orden de trabajo», «Generar informe»…) son las acciones más frecuentes de tu departamento." },
        ],
      },
      {
        id: "alertas",
        title: "Revisar las alertas",
        panel: "alertas",
        keywords: ["alerta", "aviso", "anomalía", "avería frecuente", "evidencia", "prioridad", "resuelta", "causa probable"],
        steps: [
          "Abre **Alertas**. Por defecto ves las activas; usa los filtros **Prioridad alta**, **Anomalías** o **Resueltas**.",
          "Pulsa una alerta para desplegarla: verás la explicación, un gráfico con la **evidencia**, la fuente y el **cálculo** usado.",
          "Pulsa **Ir al detalle** para abrir la ficha del activo, cliente o sección afectada.",
        ],
        notes: [
          { kind: "importante", text: "Una **anomalía** es algo que se aparta de lo normal con datos que lo demuestran. **No es una predicción** de que algo vaya a fallar." },
          { kind: "info", text: "Cada departamento ve los tipos de alerta que le corresponden." },
        ],
      },
      {
        id: "ordenes",
        title: "Seguir las órdenes de trabajo",
        panel: "ordenes",
        keywords: ["ot", "orden de trabajo", "órdenes", "avería", "correctivo", "urgente", "esperando material", "estado", "técnico asignado"],
        steps: [
          "Abre **Órdenes de trabajo**. Filtra por **Todas**, **Urgentes**, **Preventivas** o **Esperando material**.",
          "Cada tarjeta muestra el código, el estado, la prioridad, si es correctivo o preventivo, el cliente, el activo, el centro, quién la lleva y cuándo vence.",
          "Pulsa una orden para abrir la **ficha del activo** afectado.",
        ],
        notes: [{ kind: "info", text: "Las órdenes se leen de PGMWin: siempre ves el dato vigente, la aplicación no guarda una copia." }],
      },
      {
        id: "mantenimiento",
        title: "Controlar el mantenimiento preventivo",
        panel: "mantenimiento",
        keywords: ["preventivo", "plan", "vencido", "revisión", "calendario", "cumplimiento", "próximo", "frecuencia"],
        steps: [
          "Abre **Mantenimiento**. Arriba ves el cumplimiento y cuántos preventivos están **vencidos**, **próximos** y **al día**.",
          "La lista está ordenada por fecha. Filtra por **Vencidos**, **Próximos** o **Al día**.",
          "Cada fila indica la tarea, el activo, el cliente, la frecuencia, quién la hace y cuándo toca («hoy», «mañana», «hace 3 días»). Púlsala para abrir el activo.",
        ],
        notes: [{ kind: "consejo", text: "Empieza siempre por los **Vencidos**: son los que pueden acabar en avería." }],
      },
      {
        id: "activos",
        title: "Consultar un activo (ficha 360)",
        panel: "activos",
        keywords: ["máquina", "equipo", "ficha", "historial", "averías", "bomba", "compresor", "coste", "línea de tiempo", "vinculado"],
        steps: [
          "Abre **Activos** y pulsa una máquina (el semáforo indica si conviene vigilarla).",
          "Si hay una anomalía, arriba verás el aviso con su fuente y su cálculo.",
          "**Historial** reúne averías, preventivos y repuestos en orden cronológico, cada uno con su fuente. A la derecha: datos del activo, coste mensual y **Vinculado en** (el mismo activo en PGMWin, A3ERP y Trello).",
        ],
      },
      {
        id: "mi-dia",
        title: "Ver mis órdenes de hoy (técnico de campo)",
        panel: "campo",
        keywords: ["mi día", "técnico", "campo", "hoy", "mis órdenes", "siguiente", "móvil"],
        steps: [
          "Al entrar verás **Mi día**: la **siguiente orden** destacada arriba, con su cliente, activo y centro.",
          "Debajo, la lista de tus órdenes de hoy con su estado y prioridad. Púlsalas para abrir la ficha del activo.",
        ],
        notes: [{ kind: "info", text: "Está pensado para el móvil y para una sola mano: textos y botones grandes." }],
      },
    ],
  },
  {
    id: "negocio",
    title: "Clientes, comercial, facturación y compras",
    intro: "Lo que viene de A3ERP, Trello y PGMWin sobre clientes, ofertas, facturas y repuestos, sin tener que abrir cada programa.",
    tasks: [
      {
        id: "clientes",
        title: "Consultar un cliente (vista 360)",
        panel: "clientes",
        keywords: ["cliente", "contrato", "horas", "renovación", "contacto", "centros", "coste anual", "360"],
        steps: [
          "Abre **Clientes**. Cada tarjeta muestra el estado, las órdenes abiertas, el coste anual y las **horas consumidas del contrato**.",
          "Pulsa un cliente para ver su ficha: **contrato** y renovación, coste mensual, últimas órdenes, ofertas abiertas, contacto, centros y activos.",
          "**Vinculado en** muestra el mismo cliente en A3ERP, PGMWin y Trello, enlazado sin copiar datos.",
        ],
        notes: [{ kind: "consejo", text: "Una barra de horas en rojo significa que el contrato supera el 90 % de su presupuesto." }],
      },
      {
        id: "comercial",
        title: "Seguir las ofertas (comercial)",
        panel: "comercial",
        keywords: ["oferta", "presupuesto", "pipeline", "trello", "ganada", "perdida", "negociación", "previsión", "tasa de éxito"],
        steps: [
          "Abre **Comercial**. Arriba: pipeline abierto, previsión ponderada (importe × probabilidad), ofertas ganadas y tasa de éxito.",
          "En el ordenador ves un **tablero por etapas**: Borrador, Enviada, Negociación, Ganada y Perdida, con el importe de cada columna. En el móvil, elige la etapa con los filtros.",
          "Cada oferta indica cliente, importe, probabilidad, responsable y fecha.",
        ],
        notes: [{ kind: "info", text: "Una oferta que pasa a **Ganada** genera una **propuesta** de orden de trabajo en PGMWin, pendiente de tu aprobación." }],
      },
      {
        id: "facturacion",
        title: "Pasar un albarán a factura (facturación)",
        panel: "facturacion",
        keywords: ["factura", "albarán", "facturar", "cobro", "vencida", "pendiente", "a3", "importe", "sin facturar"],
        steps: [
          "Abre **Facturación**. Por defecto ves **Sin facturar**: los albaranes de PGMWin que aún no tienen factura en A3ERP.",
          "Pulsa **Proponer factura** en un albarán: te lleva a **Propuestas**, donde se revisa y aprueba antes de escribir nada en A3ERP.",
          "Los filtros **Vencidas**, **Emitidas** y **Cobradas** muestran el resto de facturas.",
        ],
        notes: [{ kind: "importante", text: "Nunca se crea una factura sin aprobación humana. Mira **Aprobar o rechazar una propuesta**." }],
      },
      {
        id: "compras",
        title: "Controlar pedidos y existencias (compras y almacén)",
        panel: "compras",
        keywords: ["pedido", "repuesto", "stock", "almacén", "proveedor", "retrasado", "mínimo", "existencias", "compra"],
        steps: [
          "Abre **Compras y almacén**. Arriba: pedidos abiertos, retrasados, repuestos bajo mínimos y gasto por proveedor.",
          "En **Pedidos**, cada uno indica su estado, el proveedor, el importe, la fecha de llegada y la orden de trabajo para la que es.",
          "En **Existencias**, la barra compara lo que hay con el mínimo; en rojo, hay que reponer.",
        ],
        notes: [{ kind: "consejo", text: "Un pedido **retrasado** con una orden asociada bloquea esa orden: es lo primero que conviene reclamar." }],
      },
    ],
  },
  {
    id: "personas",
    title: "Personas, PRL y CAE",
    intro: "Plantilla y fichajes de Sésame HR, y las acreditaciones que permiten entrar en los centros de los clientes.",
    tasks: [
      {
        id: "personal",
        title: "Consultar la plantilla y los fichajes",
        panel: "personal",
        keywords: ["empleado", "fichaje", "plantilla", "ausencia", "vacaciones", "baja", "horas", "absentismo", "sésame"],
        steps: [
          "Abre **Personal**. Arriba: presentes hoy, ausentes, horas del mes y absentismo.",
          "Cada tarjeta muestra a la persona, su puesto, su estado de hoy (trabajando, libra, vacaciones, baja…), la hora de entrada, el centro y las horas del mes.",
        ],
      },
      {
        id: "prl",
        title: "Vigilar acreditaciones PRL y accesos a centros",
        panel: "prl",
        keywords: ["prl", "cae", "acreditación", "formación", "caducidad", "centro", "documentación", "plataforma", "nalanda", "dokify", "mi prl"],
        steps: [
          "Abre **PRL y CAE**. Arriba: cuántas acreditaciones caducan en 15 días y en 45, centros con acceso y documentación al día.",
          "**Acreditaciones por caducidad** muestra quién, qué curso y a qué centros afecta, con color e icono (urgente, próxima, vigente).",
          "Más abajo, cada **centro** indica su plataforma CAE, los documentos entregados sobre los exigidos y el próximo plazo.",
        ],
        notes: [{ kind: "info", text: "El módulo **Mi PRL** (subida automática de documentos a plataformas CAE) aparece como próximo módulo; todavía no está activo." }],
      },
    ],
  },
  {
    id: "propuestas-y-acciones",
    title: "Propuestas y acciones rápidas",
    intro: "Para escribir en PGMWin o A3ERP desde aquí, siempre pasa por una propuesta que revisa una persona. Nada se escribe a ciegas.",
    tasks: [
      {
        id: "nueva-orden",
        title: "Crear una orden de trabajo (acción rápida)",
        panel: "ordenes",
        keywords: ["nueva orden", "crear orden", "creo orden", "crea orden", "crear ot", "alta orden", "dar de alta una orden", "acción rápida", "avería nueva", "abrir orden", "abro una orden"],
        steps: [
          "Pulsa **Nueva orden de trabajo** (arriba en el Panel y en **Órdenes de trabajo**, o búscala con **Ctrl + K**).",
          "Elige el **cliente** y el **activo**, cuenta **qué ocurre** (mínimo 3 caracteres) y marca la **prioridad**.",
          "Pulsa **Crear propuesta**. Verás «Propuesta creada» y podrás abrirla con **Ver propuesta**.",
        ],
        notes: [{ kind: "importante", text: "Crear la propuesta **no** crea la orden en PGMWin. Solo la deja pendiente de aprobación." }],
      },
      {
        id: "aprobar-propuesta",
        title: "Aprobar o rechazar una propuesta",
        panel: "propuestas",
        keywords: ["propuesta", "aprobar", "rechazar", "diff", "antes y después", "validar", "entorno de pruebas", "humano"],
        steps: [
          "Abre **Propuestas**. Arriba están las **pendientes de aprobar**.",
          "Cada una indica el origen y el destino (por ejemplo Trello → PGMWin), el entorno y una tabla **Campo / Antes / Después** con exactamente lo que cambiará.",
          "Revísala y pulsa **Aprobar** o **Rechazar**. Pasa a **Resueltas**, con el nombre de quien decidió.",
        ],
        notes: [
          { kind: "importante", text: "Es la regla de la plataforma: ninguna escritura en tus programas ocurre sin que una persona la apruebe, y queda registrada en la auditoría." },
          { kind: "info", text: "«Entorno de pruebas» significa que la acción se ejecutará primero en un entorno de pruebas, no en producción." },
        ],
      },
    ],
  },
  {
    id: "copiloto-e-informes",
    title: "Copiloto de IA e informes",
    intro: "Preguntar a tus datos en lenguaje natural, con la fuente siempre a la vista, y preparar los informes de cliente.",
    tasks: [
      {
        id: "copiloto",
        title: "Preguntar a tus datos con el Copiloto de IA",
        panel: "copiloto",
        keywords: ["copiloto", "ia", "pregunta", "consulta", "datos", "fuente", "cálculo", "certeza", "chat", "cuánto", "qué máquinas"],
        steps: [
          "Abre **Copiloto de IA** y escribe tu pregunta o elige una sugerida («¿Qué máquinas han fallado más este mes?»).",
          "La respuesta incluye las **fuentes** (aplicación, entidad y periodo) y el nivel de **certeza**. Pulsa **Ver cálculo** para ver cómo se ha obtenido.",
          "Si no hay datos verificables, te lo dice en lugar de inventar.",
        ],
        notes: [
          { kind: "importante", text: "El Copiloto solo **lee**: no cambia nada en tus programas. Sin fuente no hay respuesta." },
          { kind: "info", text: "Para dudas sobre **cómo usar la aplicación**, usa el botón de Ayuda, no el Copiloto." },
        ],
      },
      {
        id: "informes",
        title: "Consultar los informes de cliente",
        panel: "informes",
        keywords: ["informe", "mensual", "cliente", "borrador", "revisado", "emitido", "resumen", "reporte"],
        steps: [
          "Abre **Informes**. Cada tarjeta es el informe mensual de un cliente, con su estado: **Borrador**, **Revisado** o **Emitido**.",
          "Verás las cifras clave (órdenes cerradas, cumplimiento, tiempo de respuesta, coste) y un resumen.",
        ],
        notes: [{ kind: "info", text: "Las cifras las calcula el sistema a partir de los datos; el texto lo redacta la IA y una persona lo revisa antes de emitirlo." }],
      },
    ],
  },
  {
    id: "administracion",
    title: "Administración del sistema",
    intro: "Para TI: estado de las conexiones, quién puede ver qué y qué ha pasado.",
    tasks: [
      {
        id: "conexiones",
        title: "Comprobar el estado de las conexiones",
        panel: "conexiones",
        keywords: ["conexión", "conector", "estado", "latencia", "sincronización", "gateway", "pgmwin", "a3", "trello", "sésame", "lento", "caído"],
        steps: [
          "Abre **Conexiones**. Hay una tarjeta por aplicación con su estado: **Conectado**, **Lento**, **Sin conexión** o **Pendiente de configurar**.",
          "Cada tarjeta indica la última sincronización, la latencia y si la conexión es directa o a través del gateway de la red de MANSERA.",
          "Las **capacidades** muestran qué está **verificado**, qué está **por verificar** y qué **no está disponible**.",
        ],
        notes: [{ kind: "info", text: "Si una aplicación cae, el resto sigue funcionando y los datos de la que falla se marcan como antiguos." }],
      },
      {
        id: "usuarios",
        title: "Ver usuarios, permisos y auditoría",
        panel: "usuarios",
        keywords: ["usuario", "permisos", "roles", "auditoría", "quién hizo", "registro", "matriz", "acceso", "inmutable"],
        steps: [
          "Abre **Usuarios y auditoría**. La pestaña **Usuarios** lista a cada persona con su perfil y su último acceso.",
          "**Permisos por rol** es la tabla de qué sección ve cada perfil.",
          "**Auditoría** es el registro de quién hizo qué y cuándo (propuestas, cambios de rol, consultas).",
        ],
        notes: [{ kind: "importante", text: "La auditoría es inmutable: nadie puede modificarla ni borrarla, tampoco un administrador." }],
      },
    ],
  },
  {
    id: "problemas",
    title: "Problemas frecuentes",
    intro: "Si algo no funciona como esperas, empieza por aquí.",
    tasks: [
      {
        id: "dato-antiguo",
        title: "Un dato parece antiguo o no coincide con el programa",
        panel: null,
        keywords: ["dato antiguo", "desactualizado", "no coincide", "no se actualiza", "hace minutos", "lento", "sincronización", "diferente"],
        steps: [
          "Mira en **Conexiones** (si tu perfil lo permite) si la aplicación de origen aparece como **Lenta** o **Sin conexión**: los datos pueden tener unos minutos de retraso.",
          "Recarga la página. Los datos se leen del programa de origen cada vez, no se guardan copias.",
          "Si sigue sin coincidir, avisa a TI indicando la pantalla y el dato.",
        ],
        notes: [{ kind: "info", text: "El programa de origen (PGMWin, A3ERP, Trello o Sésame) siempre tiene la razón: esta aplicación solo lo muestra y lo enlaza." }],
      },
      {
        id: "sin-acceso",
        title: "No me deja entrar a una sección",
        panel: null,
        keywords: ["acceso denegado", "no me deja", "redirige", "vuelve al inicio", "permiso", "sin acceso", "prohibido"],
        steps: [
          "Si abres un enlace de una sección de otro departamento, la aplicación te devuelve a tu inicio.",
          "Mira **Por qué no veo un apartado del menú** y, si lo necesitas, pide a TI que ajuste tu perfil.",
        ],
      },
      {
        id: "asistente-sin-ia",
        title: "El asistente dice que responde en «modo guía»",
        panel: null,
        keywords: ["modo guía", "sin ia", "límite", "asistente no responde", "error ia", "límite diario"],
        steps: [
          "El **modo guía** responde buscando en este manual. Ocurre si la IA no está activada, si has llegado al límite diario de preguntas o si hay un fallo puntual.",
          "Las respuestas son las mismas fichas del manual. Prueba con otras palabras (el nombre de la sección o del botón).",
          "Mañana tendrás de nuevo el límite completo de preguntas con IA.",
        ],
      },
    ],
  },
];

/** Preguntas sugeridas por sección (chips del asistente). Deben poder responderse con el manual. */
export const SUGGESTIONS: Partial<Record<NavId | "_", string[]>> = {
  _: ["¿Cómo creo una orden de trabajo?", "¿Por qué no veo un apartado del menú?", "¿Cómo busco un cliente o un activo?", "¿Qué es una propuesta?"],
  panel: ["¿Qué significa el semáforo?", "¿De dónde sale cada cifra?", "¿Cómo creo una orden de trabajo?"],
  alertas: ["¿Qué es una anomalía?", "¿Cómo veo la evidencia de una alerta?"],
  ordenes: ["¿Cómo creo una orden de trabajo?", "¿Cómo filtro las órdenes urgentes?"],
  mantenimiento: ["¿Qué hago con un preventivo vencido?", "¿Cómo veo los próximos preventivos?"],
  activos: ["¿Qué es la ficha 360 de un activo?", "¿Qué significa «Vinculado en»?"],
  clientes: ["¿Cómo veo las horas del contrato de un cliente?", "¿Qué es la vista 360?"],
  comercial: ["¿Qué es la previsión ponderada?", "¿Qué pasa cuando una oferta pasa a ganada?"],
  facturacion: ["¿Cómo paso un albarán a factura?", "¿Dónde veo las facturas vencidas?"],
  compras: ["¿Qué hago con un pedido retrasado?", "¿Qué significa una barra de stock en rojo?"],
  personal: ["¿Dónde veo quién está de vacaciones?", "¿Qué indica el absentismo?"],
  prl: ["¿Qué acreditaciones caducan pronto?", "¿Qué es el pack Mi PRL?"],
  propuestas: ["¿Cómo apruebo una propuesta?", "¿Qué significa «entorno de pruebas»?"],
  copiloto: ["¿Qué diferencia hay con el asistente de ayuda?", "¿Qué significa «Ver cálculo»?"],
  informes: ["¿Qué estados tiene un informe?", "¿Quién redacta el resumen?"],
  conexiones: ["¿Qué significa «Lento»?", "¿Qué son las capacidades verificadas?"],
  usuarios: ["¿Dónde veo qué ve cada rol?", "¿Se puede borrar la auditoría?"],
  campo: ["¿Cómo veo mi siguiente orden?"],
  manual: ["¿Cómo imprimo el manual?"],
};
