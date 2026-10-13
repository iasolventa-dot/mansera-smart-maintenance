# 06 · Seguridad, privacidad y RGPD

MANSERA expresó preocupación por seguridad y privacidad con IA, y hay una **auditoría de ciberseguridad externa en curso** cuyo informe puede cambiar decisiones (ver 12). Este documento fija el mínimo; se endurece con ese informe.

## Modelo de amenazas (resumen)
| Amenaza | Control |
|---|---|
| Robo de credenciales de apps | Vault cifrado, rotación, mínimo privilegio, nunca en logs/cliente |
| Acceso indebido entre departamentos/orgs | RLS + permisos por conector + tests de políticas |
| Gateway comprometido o suplantado | Solo salientes, mTLS/firma de trabajos, lista blanca de operaciones, revocación inmediata, actualización controlada |
| Escritura errónea/maliciosa en ERP/GMAO | Propuesta + aprobación humana, idempotencia, auditoría, entorno de pruebas primero |
| **Inyección de prompts** (texto de una OT/correo que intenta dar órdenes al LLM) | Contenido de apps = **dato**, nunca instrucción; herramientas de escritura no invocables por el LLM sin propuesta humana; salida validada con Zod |
| Fuga de datos hacia el proveedor de IA | Minimización, pseudonimización, proveedor con DPA y sin entrenamiento, región UE cuando sea posible, registro de qué se envía |
| Webhook falso | Verificación de firma, rechazo de reenvíos antiguos |
| Dependencias vulnerables | `pnpm audit`/Dependabot, lockfile, revisión de nuevas dependencias |

## Autenticación y autorización
Supabase Auth (email+contraseña, **MFA** para admin/dirección; SSO como opción futura). Sesiones cortas, refresco seguro. Autorización en servidor y RLS; la UI solo oculta, **nunca protege**.

## Secretos
Nunca en el repo (`.gitignore` + `.env.example`). Entornos: variables de Vercel/Supabase/gateway. Credenciales de las apps de MANSERA: Supabase Vault. Si se filtra algo: rotar primero, investigar después. Un gancho `pre-commit` con detector de secretos (gitleaks) se añade en M0.

## RGPD (bases mínimas)
- Roles: MANSERA = responsable; SOLVENTA = encargado → **contrato de encargo (art. 28)**, NDA pendiente, registro de subencargados (Supabase, Vercel, proveedor LLM).
- Minimización y limitación de finalidad; retención definida (logs de conectores corta; auditoría larga; conversaciones IA configurable).
- Datos personales de empleados (Sésame) y de técnicos: acceso por rol, sin enviarlos al LLM salvo necesidad.
- Alojamiento UE (Supabase región UE; Vercel funciones en región UE).
- Derechos (acceso/supresión): proceso documentado.
- Evaluar con asesoría legal: transferencias internacionales a proveedores LLM, evaluación de impacto si procede.

## Controles de IA
Registro de cada llamada (modelo, tokens, fuentes usadas, usuario) · lista de datos que pueden salir al LLM por tipo · modo "sin IA" siempre disponible · presupuesto mensual con corte (`AI_MONTHLY_BUDGET_EUR`).

## Logging seguro
Sin datos personales ni credenciales en logs; `correlationId`; retención limitada.

## Checklist por cambio (resumen; versión completa en la skill `security-gdpr`)
¿Nuevos datos personales? ¿Nuevo permiso? ¿Nueva tabla con RLS y test? ¿Nuevo secreto fuera del repo? ¿Nueva escritura con propuesta+auditoría? ¿Qué sale hacia el LLM?
