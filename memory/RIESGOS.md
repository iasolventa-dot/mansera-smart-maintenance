# Registro de riesgos
Probabilidad/Impacto: B/M/A. Revisar al cierre de cada hito.

| ID | Riesgo | P | I | Mitigación | Estado |
|---|---|---|---|---|---|
| R-01 | Presupuesto remanente (8–9 k€) < propuesta (13,5 k€ + cuotas) | A | A | Fases; Mi PRL como gancho; MVP acotado; decisión del usuario | Abierto |
| R-02 | PGMWin sin API/acceso soportado para lectura-escritura | M | A | Spike S-PGM; plan B por ficheros vía gateway; escritura solo vía enlace directo | Abierto |
| R-03 | Licencias API no contratadas (A3 Link, Sésame Add On) → costes | M | M | Preguntar pronto (Q3, Q4); reflejar en presupuesto | Abierto |
| R-04 | Informe de ciberseguridad impone restricciones (gateway, nube, IA) | M | A | Obtenerlo pronto (Q6); diseño modular de transporte | Abierto |
| R-05 | Escritura errónea en ERP/GMAO | B | A | ADR-0005, entornos de prueba, auditoría | Mitigado por diseño |
| R-06 | Datos maestros sucios impiden enlazar | A | M | M4 con revisión humana e informe de calidad | Abierto |
| R-07 | Alucinaciones del copiloto | M | A | ADR-0006, golden set, citas obligatorias | Mitigado por diseño |
| R-08 | Dependencia de personas clave (Cristina) | M | M | Documentación, runbooks, formación | Abierto |
| R-09 | Competencia/otro proveedor de IA en el cliente | M | M | Valor demostrable rápido (M3); no sustituir sistemas | Abierto |
| R-10 | Sobrecarga de UI/animación degrada rendimiento en móvil | M | M | Presupuesto de rendimiento en `07`; Lighthouse CI | Abierto |
| R-11 | Protección contra contraseñas filtradas desactivada en Supabase Auth (aviso del advisor) | M | M | Activarla en el panel (Authentication → Password security); cuentas demo con contraseña robusta | Abierto |
| R-12 | Función `public.rls_auto_enable()` ejecutable por anon/authenticated (aviso del advisor; la activó el usuario para forzar RLS en tablas nuevas) | B | M | Mantener mientras sirva; si molesta, `revoke execute` a anon/authenticated | Aceptado |
| R-13 | El contador diario del asistente falla «abierto» (si falla la base de datos no bloquea al usuario) y en demo es en memoria | B | B | Decisión consciente; revisar con el modelo real y valorar Haiku por defecto | Aceptado |
| R-14 | Con varios `memberships` por usuario el rol sale del más antiguo; no hay organización activa | M | M | Fijar organización activa antes de M2 (multi-tenant real) | Abierto |
| R-15 | Valor por defecto de Supabase (staging) incrustado en `next.config.mjs`: un entorno de producción apuntaría a staging si falta la variable | M | A | Exigir las variables de entorno en producción y dejar el valor por defecto solo en local, antes del primer despliegue de producción | Abierto |
| R-16 | Credenciales de producción de MANSERA guardadas en Vault antes de verificar el formato contra las APIs reales | M | A | Probar primero con credenciales de solo lectura/sandbox (M1); cuenta de servicio con mínimos permisos; rotación; solo TI | Abierto |
| R-17 | El Vault simulado de los tests no valida el cifrado real; la comprobación (sondeo) está probada solo con respuestas simuladas | B | M | Verificar en Supabase real al subir credenciales de prueba; spike M1 | Abierto |
| R-18 | La API de A3ERP por http en la LAN enviaría usuario y contraseña en claro (Basic) | M | A | Exigir https si el servicio lo admite (Q3); si no, red segmentada y usuario de solo lectura | Abierto |
| R-19 | Dos posibles dueños de las credenciales de A3ERP (Vault en la nube o almacén local del gateway) | M | M | ADR-0012: solo en el gateway; la plataforma y la BD las rechazan | Cerrado |
| R-20 | Sésame retirará progresivamente los endpoints actuales (changelog 2026) | M | M | Conector aislado con validación Zod (falla controlado si cambian); revisar el changelog en cada hito; migrar a v4 cuando cubra lo necesario | Abierto |
| R-21 | Datos de nómina (salarios, IRPF, IBAN, causas de IT) expuestos o enviados a la IA | B | A | Minimización en el conector, agregación para Dirección/Administración, detalle solo RR. HH., nunca al LLM, auditoría (ADR-0013) | Abierto |
| R-22 | La conexión con a3innuva Nómina depende de una autorización interactiva WKA cuyo refresh token caduca a los 30 días sin uso | M | M | Renovar en cada lectura y guardar el token devuelto; aviso a TI antes de caducar; botón «Reconectar» | Abierto |
