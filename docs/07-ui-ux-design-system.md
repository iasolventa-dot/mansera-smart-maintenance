# 07 · UI/UX y sistema de diseño

## Objetivo
Que se sienta una **aplicación nativa premium**, no una web: fluida, grande, legible, con micro-interacciones cuidadas y navegación de app. Referencia de calidad: apps móviles modernas de gestión (densidad baja, jerarquía clara, movimiento con propósito).

## Principios
1. **Móvil primero**, escritorio como expansión (no al revés). PWA instalable, a pantalla completa, con `safe-area`.
2. **Grande y legible:** texto base ≥ 16 px (móvil 17), objetivos táctiles ≥ 48 px, contraste WCAG AA (AAA en texto crítico), interlineado generoso.
3. **Una acción principal por pantalla.** Jerarquía: estado → qué requiere mi atención → detalle.
4. **Semáforo con redundancia:** rojo/naranja/verde **+ icono + texto** (nunca solo color).
5. **El movimiento comunica**, no decora; siempre respetando `prefers-reduced-motion`.
6. **Estados completos:** cargando (skeleton), vacío (ilustración + acción), error (qué pasó + qué hacer), sin conexión, dato antiguo ("hace 3 min").
7. **Confianza:** toda cifra de la IA con su fuente a un toque.

## Identidad (de los mock-ups aprobados)
| Token | Valor |
|---|---|
| Azul profundo (marca/hero) | `#1F3F6E` |
| Azul primario (acciones) | `#4673AF` |
| Azul medio / cian | `#3E97D0` / `#61BDE4` |
| Fondo | `#F3F6FA` · superficie `#FFFFFF` · borde `#DDE5EE` |
| Texto | `#1B2A41` · secundario `#55667C` |
| Tipografía | **Manrope** (500/600/700/800), cifras tabulares en KPIs |
| Radios | 10 px controles · 16 px tarjetas · 24 px hojas/sheets |
Logo MANSERA en cabecera/login. "Desarrollado por SOLVENTA" discreto en pie. Semáforo: verde `#1E9E6A`, naranja `#E98A15`, rojo `#D64545` (validar contraste). **Modo oscuro** completo con tokens propios.

## Navegación tipo app
- **Móvil:** barra inferior (4–5 destinos: Inicio · Trabajo · Buscar · Copiloto · Más), hojas modales (*bottom sheets*) arrastrables, gestos (deslizar para acciones, *pull-to-refresh*), cabecera que se contrae al hacer scroll.
- **Escritorio:** barra lateral colapsable, **paleta de comandos ⌘K / Ctrl+K**, paneles divididos (lista + detalle), atajos de teclado.
- Transiciones entre pantallas (View Transitions / Motion `layoutId`) para continuidad espacial.

## Animación y efectos (con presupuesto de rendimiento)
- Librería: **Motion** (ex Framer Motion) con *springs* consistentes (tokens `duration`/`ease`/`spring`).
- Entradas escalonadas (*stagger*) de tarjetas; **contadores animados** en KPIs; anillos y barras de progreso animados; transición suave del semáforo al cambiar de estado.
- Micro-interacciones: *press scale* en botones, *ripple* sutil, *haptics* en móvil donde se pueda (`navigator.vibrate`), toasts con muelle, confeti discreto solo en hitos reales (p. ej. "propuesta ejecutada").
- Efectos visuales: degradados de marca, *glass* sutil en barras/hojas, sombras en capas, fondos con ruido/malla suave en la zona hero. **Nada que tape lectura ni cueste > 16 ms/frame.**
- Presupuesto: animar solo `transform`/`opacity`; LCP < 2,5 s en 4G medio; INP < 200 ms; CLS < 0,1; 60 fps en móvil de gama media. Si un efecto no cabe en presupuesto, se elimina.
- `prefers-reduced-motion`: sustituir movimiento por fundidos.

## Componentes base (en `packages/ui`)
Button · IconButton · Card/StatCard (KPI con tendencia) · StatusPill (semáforo) · DataList (virtualizada) · Sheet · Dialog · Command palette · Tabs · Segmented · Toast · Skeleton · EmptyState · ErrorState · Avatar · Timeline (historial de activo) · Chart (ver skill `dataviz`) · SourceChip (cita de IA) · ConnectionBadge (salud de conectores) · ActionButton (acciones rápidas con confirmación).

## Pantallas clave (M3–M7)
1. **Login** (hero de marca + formulario limpio, ya prototipado).
2. **Inicio/Panel** por rol: saludo, semáforo global, "requiere tu atención", KPIs, acciones rápidas, estado de conexiones.
3. **Vista 360 de cliente** y **ficha de activo** (línea de tiempo, averías, costes, documentos).
4. **Cola de propuestas** (diff antes/después, aprobar/rechazar).
5. **Copiloto** (chat a pantalla completa, respuestas con tarjetas, tablas, gráficos y chips de fuente).
6. **Informes** (vista previa → enviar/descargar).
7. **Administración** (conexiones, usuarios, auditoría).
8. **Modo campo** (móvil): mis OT, grande, una mano, voz y foto.

## Accesibilidad (innegociable)
Teclado completo, foco visible, etiquetas ARIA, lectores de pantalla, tamaño de texto escalable, no depender del color, `lang="es"`. Pruebas con axe + revisión manual.

## Calidad de diseño: proceso
Antes de codificar una pantalla: boceto/ref (mock-ups de `/design` si existen) → construir con tokens → revisar en 3 tamaños (360, 768, 1440) y claro/oscuro → capturas (Playwright) → `/revision`. Usar las skills `premium-ui` y `frontend-design`; gráficos con `dataviz`.
