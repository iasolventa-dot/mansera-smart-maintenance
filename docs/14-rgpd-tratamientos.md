# 14 · RGPD: registro de tratamientos y análisis de riesgos (BORRADOR)

> **Borrador técnico** preparado por SOLVENTA IA el 2026-10-14 para revisar con la asesoría legal / DPD de MANSERA. No es asesoramiento jurídico. Describe lo que la plataforma **hace hoy** (verificado en el código) y lo que hará al conectar los sistemas.

## 1. Roles
- **Responsable del tratamiento:** MANSERA (Mantenimientos y Servicios Aguilar, S.L.).
- **Encargado del tratamiento:** SOLVENTA IA (desarrollo y operación de la plataforma). **Pendiente:** contrato de encargo (art. 28 RGPD) y NDA.
- **Subencargados:**

| Proveedor | Para qué | Ubicación (verificada) | Nota |
|---|---|---|---|
| Supabase | Base de datos, autenticación, Vault de credenciales, caché | eu-central-1 (Frankfurt) | Proyecto `synwtbopxwvggicrfjjj` |
| Vercel | Servidor web y funciones | **fra1 (Frankfurt) desde 2026-10-14, verificado en producción** (antes iad1, EE. UU.: medido en las cabeceras `x-vercel-id`) | Ajuste en `vercel.json`. La CDN de estáticos es global |
| Anthropic | Asistente de ayuda (solo si se activa `ANTHROPIC_API_KEY`) | EE. UU. | Solo recibe la pregunta y el manual. **Nunca** datos de personal ni de nómina (ADR-0009, R-21) |
| GitHub | Código fuente e integración continua | EE. UU. | Sin datos personales de MANSERA (datos de ejemplo inventados) |

## 2. Registro de actividades de tratamiento (propuesta)
| Tratamiento | Interesados | Datos | Origen | Finalidad | Base jurídica (a confirmar) | Conservación en la plataforma |
|---|---|---|---|---|---|---|
| Acceso a la plataforma | Usuarios de MANSERA | Email, nombre, rol, organización | Alta por TI | Autenticar y aplicar permisos | Ejecución del contrato laboral / interés legítimo | Mientras sea usuario |
| Auditoría | Usuarios | Quién hizo qué y cuándo (sin valores secretos) | Plataforma | Seguridad y trazabilidad (principio 4) | Interés legítimo / obligación de seguridad (art. 32) | Larga (a definir; inmutable salvo anonimizar el autor al darlo de baja) |
| Personal y presencia | Empleados | Nombre, puesto, departamento, estado de hoy (trabajando, ausente, **baja**, vacaciones), hora de entrada, centro, horas del mes | Sésame HR | Planificar técnicos y presencia | Ejecución del contrato / obligación legal de registro horario | **Caché de 5 min**, sin histórico (ADR-0014) |
| Coste de personal e IT (futuro) | Empleados | Costes **agregados**; tipo de IT | a3innuva Nómina | Rentabilidad por OT/cliente; ausencias oficiales | Interés legítimo (agregados) / obligación legal | Agregados; detalle individual solo RR. HH. (ADR-0013) |
| Comercial | Contactos de clientes, comerciales | Nombre del responsable de la oferta, cliente | Trello | Seguimiento de ofertas | Interés legítimo | Caché de 10 min |
| Facturación (futuro) | Clientes (autónomos = persona física) | Código y nombre del cliente, importes | A3ERP vía gateway | Facturación y cobros | Ejecución de contrato / obligación legal | Lectura bajo demanda; **sin NIF** |
| Credenciales de integración | Cuentas de servicio | Tokens, claves, refresh tokens | TI de MANSERA | Conectar los sistemas | Interés legítimo | Cifradas en Vault hasta su borrado; A3ERP/PGMWin solo en el gateway (ADR-0012) |

## 3. Medidas técnicas ya implantadas (verificadas en código y pruebas)
- **Minimización en el origen:** el conector de Sésame descarta DNI, nº de la Seguridad Social, IBAN, salario, fecha de nacimiento, dirección y email personal **al recibir** la respuesta (prueba dedicada). A3ERP: sin NIF ni líneas. Nómina: solo agregados (diseño).
- **Control de acceso:** RLS en todas las tablas (41 pruebas), permisos por rol también en el servidor, solo TI gestiona credenciales y la configuración de los conectores.
- **Cifrado:** credenciales en Supabase Vault (verificado en real); TLS en todas las conexiones; la clave de servicio solo existe en el servidor.
- **Trazabilidad:** auditoría inmutable de credenciales, autorizaciones (también las fallidas) y configuración, **sin valores secretos**.
- **Ubicación UE:** base de datos y funciones en Frankfurt.
- **IA:** el asistente no ve datos; el copiloto, cuando use datos reales, trabajará solo con agregados y fuentes citadas (ADR-0006).

## 4. ¿Hace falta una Evaluación de Impacto (EIPD)?
**Recomendación técnica: sí, antes de conectar la nómina.** Coinciden varios criterios de la lista de la AEPD:
- **datos de empleados**, que son interesados vulnerables por la relación de dependencia;
- **datos relacionados con la salud**: el tipo de incapacidad temporal, aunque no se lea la causa médica;
- **combinación de fuentes** (Sésame + nómina + PGMWin) para calcular el coste por técnico.

Para Sésame solo (presencia), la necesidad es menor, pero conviene incluirlo en la misma EIPD.

## 5. Derechos de los interesados
- **Acceso / rectificación:** los datos de personal se rectifican en su sistema de origen (Sésame o nómina). La plataforma no es dueña de esos datos y los refresca en minutos.
- **Supresión:** borrar un usuario de la plataforma anonimiza su autoría en la auditoría (probado). Los datos de personal desaparecen de la caché en el siguiente refresco tras borrarlos en el origen.
- **Pendiente:** procedimiento escrito, con plazos y quién responde, y aviso de privacidad para los empleados sobre este tratamiento.

## 6. Pendiente (para MANSERA / asesoría)
1. Contrato de encargo (art. 28) SOLVENTA–MANSERA y registro formal de subencargados (DPA de Supabase, Vercel y Anthropic).
2. EIPD antes de conectar a3innuva Nómina.
3. Plazos de conservación de la auditoría y de las conversaciones del asistente.
4. Información a los empleados (art. 13) sobre el uso de sus datos de presencia en la plataforma.
5. Confirmar que no se activará `ANTHROPIC_API_KEY` sin revisar la transferencia a EE. UU. (hoy el asistente no envía datos personales).
