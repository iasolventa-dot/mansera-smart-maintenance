# 02 · Visión de producto

## Propuesta de valor (una frase)
**Un solo acceso, con IA, a lo que ya tienes repartido en PGMWin, A3, Trello y Sésame — sin cambiar de programas, sin teclear dos veces.**

## Qué NO es
No es un GMAO nuevo, ni un ERP, ni un "chatbot". No sustituye PGMWin/A3. No automatiza decisiones críticas sin validación humana. No predice averías con IA generativa (anomalía ≠ predicción).

## Usuarios y paneles
| Rol | Necesita | Panel |
|---|---|---|
| Gerencia | Visión global, rentabilidad, alertas críticas | Dirección |
| TI | Estado de conexiones, auditoría, usuarios | Administración |
| Oficina técnica | OT, activos, preventivos, ofertas | Técnico |
| Compras | Pedidos, repuestos, proveedores | Compras |
| Administración/Facturación | Albaranes→facturas, cobros, clientes | Administración financiera |
| RR. HH. | Personal, fichajes, PRL/CAE | Personas |
| Técnico de campo (móvil) | Mis OT hoy, ficha del activo, parte, voz/foto | App móvil (PWA) |

Cada usuario ve **solo** los datos de su departamento (RLS + permisos por conector).

## Módulos
1. **Núcleo:** login, roles, panel unificado semáforo, búsqueda global (⌘K), vista 360 de cliente y de activo, notificaciones.
2. **Conexiones:** estado/salud de cada app, credenciales, mapeo de entidades, cola de propuestas.
3. **Acciones rápidas (botones propios):** solo para tareas frecuentes que cruzan programas (p. ej. "Crear OT desde oferta Trello"). Para el resto, **enlaces directos** a cada programa. La lista definitiva sale de la *auditoría de funciones* (Plantilla v2, hoja Funciones; umbral de partida 8 h/mes, a calibrar).
4. **Copiloto** (lenguaje natural, trazable).
5. **Alertas y anomalías** (reglas + estadística; explicadas con IA).
6. **Informes automáticos** a cliente y dirección.
7. **Packs** (post-MVP): Mi PRL/CAE · Asistente técnico RAG · Planificador inteligente · App técnicos con voz/imagen · Generador de ofertas.

## Modelo de operación híbrido
- **Botón propio** → acción frecuente, entre programas, API fiable, riesgo bajo/medio.
- **Enlace directo** → función especializada del programa; abrir el programa en contexto (deep link si existe).
- **Lectura integrada** → mostrar datos de varias apps en una pantalla.
Regla: se decide con datos de uso real, no por intuición.

## MVP (hipótesis a validar en M3–M7; no es compromiso de alcance)
**Menos tiempo + mejor información + mejor decisión.** Candidatos en orden de riesgo/valor:
1. Panel semáforo unificado + vista 360 (lectura).
2. 2–3 acciones rápidas con propuesta validable (p. ej. oferta→OT; albarán→factura).
3. Copiloto de consulta trazable sobre datos reales.
4. Informe mensual automático de cliente.
Fuera del MVP: predictivo, RAG de manuales, planificador, voz/imagen, Mi PRL (se trata como pack posterior).

## Criterios de éxito (medibles)
Tiempo de tareas clave antes/después · nº de duplicados de datos maestros evitados · % de consultas del copiloto con cita verificable (objetivo ≥ 95 %) · adopción semanal por usuario · incidencias de sincronización por semana · satisfacción (≥ 4/5 en piloto).

## Productización (futuro, sin dar por hecho)
Multi-tenant desde el diseño (ADR-0004). Conectores como producto: PGMWin, otros GMAO/ERP detrás de la misma interfaz. Modelo SaaS: implantación + cuota mensual. Decisión comercial posterior a validar valor en MANSERA.
