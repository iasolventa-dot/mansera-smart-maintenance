---
name: premium-ui
description: Úsala al crear o modificar cualquier pantalla o componente. Define cómo lograr una interfaz premium tipo app nativa (móvil primero, animaciones, tamaños grandes, accesibilidad) con Next.js, Tailwind, shadcn y Motion.
---
# UI premium tipo app

Lee `docs/07-ui-ux-design-system.md` y, si trabajas en diseño visual, apóyate también en la skill `frontend-design`; para gráficos, `dataviz`.

## Método (por pantalla)
1. **Jerarquía:** ¿cuál es la acción principal? ¿qué requiere atención ya? Diseña eso primero, grande.
2. **Móvil primero (360 px):** barra inferior, hojas modales, objetivos ≥ 48 px, texto ≥ 16–17 px, una mano. Luego 768 y 1440 (barra lateral, ⌘K, paneles divididos).
3. **Tokens, no valores sueltos:** colores, radios, sombras, tipografía (Manrope), espaciado, movimiento (`duration`, `ease`, `spring`) en un único fichero de tokens; modo oscuro desde el inicio.
4. **Estados completos:** skeleton, vacío con acción, error útil, offline, dato antiguo ("hace 3 min"), éxito.
5. **Movimiento con propósito (Motion):** entrada escalonada, `layoutId` para continuidad, contadores animados en KPIs, muelles en toasts/hojas, *press feedback*. Solo `transform`/`opacity`. Respetar `prefers-reduced-motion`.
6. **Efectos premium sin coste:** degradados de marca, vidrio sutil en barras, sombras por capas, fondos de malla suaves. Medir: sin caídas de fps ni CLS.
7. **Semáforo:** color + icono + texto; contraste AA; probado en daltonismo.
8. **Confianza:** cifras de IA con `SourceChip`.
9. **PWA:** manifest, iconos maskable, `safe-area-inset`, `theme-color`, instalación, estado sin conexión.

## Verificación (obligatoria)
- Capturas Playwright en 360/768/1440 × claro/oscuro; revisar visualmente.
- axe sin críticos · teclado completo · foco visible.
- Lighthouse móvil: Rendimiento ≥ 85, Accesibilidad ≥ 95, LCP < 2,5 s, CLS < 0,1.

## Evitar
Tablas densas en móvil (usar tarjetas/listas) · modales para todo · animar propiedades de layout costosas · texto pequeño gris sobre gris · "web de escritorio encogida" · efectos que tapan datos.
