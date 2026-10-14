# Índice maestro de documentación

Lee solo lo que necesite la tarea. Orden recomendado para entender el proyecto desde cero: 01 → 02 → 03 → 11.

| Doc | Contenido | Léelo cuando… |
|---|---|---|
| `01-contexto-negocio.md` | Quién es MANSERA, sistemas, dolores, presupuesto, restricciones | Empiezas el proyecto o dudas del "porqué" |
| `02-vision-producto.md` | Producto, módulos, usuarios, MVP, qué NO hacemos | Defines alcance o una funcionalidad |
| `03-arquitectura.md` | Arquitectura, política de acceso a datos, gateway on-prem, tiempo real | Diseñas o tocas infraestructura |
| `integraciones/00-contrato-conectores.md` | Interfaz común de conectores, errores, reintentos, límites | Escribes/modificas un conector |
| `integraciones/01-pgmwin.md` | PGMWin: hechos, incógnitas, plan de spike | Trabajas con GMAO |
| `integraciones/02-a3erp.md` | A3ERP: Link API, incógnitas, plan | Trabajas con ERP |
| `integraciones/03-trello.md` | Trello REST + webhooks, límites | Trabajas con Trello |
| `integraciones/04-sesame.md` | Sésame HR API (Add On) | Trabajas con personal/fichajes |
| `integraciones/06-a3innuva-nomina.md` | a3innuva Nómina (Wolters Kluwer): OAuth WKA, encaje en el flujo, privacidad | Trabajas con nómina, costes de personal o IT |
| `integraciones/05-scada-iot.md` | SCADA/PLC/IoT (alcance futuro) | Piensas en datos industriales |
| `05-modelo-datos.md` | Tablas propias de Supabase, enlaces entre entidades, RLS | Migraciones o consultas |
| `06-seguridad-rgpd.md` | Amenazas, controles, RGPD, IA y privacidad | Cualquier cambio con datos/credenciales |
| `07-ui-ux-design-system.md` | Sistema de diseño premium, animación, móvil, accesibilidad | Cualquier pantalla |
| `08-ia-copiloto.md` | Copiloto trazable, anomalías, informes, RAG, evaluación | Funciones de IA |
| `09-testing-calidad.md` | Estrategia de pruebas, DoD, revisión | Antes de dar algo por terminado |
| `10-entornos-despliegue.md` | Entornos, CI/CD, secretos, Vercel/Supabase/n8n/gateway | Despliegue y operación |
| `11-roadmap.md` | **Hitos M0–M10, criterios de aceptación, puertas de revisión** | Siempre: es el plan de trabajo |
| `12-preguntas-abiertas.md` | Lo que falta saber de MANSERA y quién lo responde | Antes de asumir nada |
| `13-glosario.md` | Términos | Dudas de vocabulario |

## Memoria viva (`/memory`)
`ESTADO.md` (dónde estamos) · `DECISIONES.md` + `adr/` (por qué) · `SUPUESTOS.md` (hecho/hipótesis/verificado) · `RIESGOS.md` · `DIARIO.md` (bitácora).

## Convenciones de estos documentos
- Cada afirmación sobre una app lleva etiqueta: **[HECHO]** verificado con fuente · **[HIPÓTESIS]** por confirmar · **[DECISIÓN]** tomada.
- Al cambiar algo, actualiza el doc en la misma sesión y anota fecha en `memory/DIARIO.md`.
