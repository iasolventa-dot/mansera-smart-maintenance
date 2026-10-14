# ADR 0013 · a3innuva Nómina en el ecosistema
- **Fecha:** 2026-10-14 · **Estado:** propuesto (MANSERA confirma que usa a3innuva Nómina; falta confirmar el reparto de dueños y la contratación de Conectia)
## Contexto
MANSERA usa a3innuva Nómina (Wolters Kluwer, en la nube) además de A3ERP, PGMWin, Trello y Sésame. Su API (a3developers) usa OAuth 2.0 Authorization Code con inicio de sesión interactivo (WKA), refresh token de 30 días y una clave de suscripción Conectia. Contiene los datos personales más sensibles del proyecto.
## Decisión
1. **Sistema propio en el catálogo** (`a3nomina`). Conexión **directa desde la nube**, sin gateway. Credenciales en **Vault**, como Trello y Sésame (ADR-0010): client_id visible; client_secret y clave de suscripción cifrados. El refresh token se añadirá al mismo secreto.
2. **Dueño de los datos** (propuesta): nómina = contrato, IT oficial, coste de personal y formación; Sésame = presencia y fichajes. Las discrepancias se avisan a RR. HH., no se corrigen solas.
3. **Solo lectura.** Ninguna escritura en la nómina sin un ADR propio y una propuesta validada (principio 4).
4. **Minimización y agregación.** El conector solo declara los campos usados. Dirección y Administración ven costes agregados. El detalle individual es solo para RR. HH. Nada de nómina va al LLM.
5. **Flujo OAuth:** TI guarda las credenciales → un usuario de MANSERA con WKA pulsa «Conectar con Wolters Kluwer» → la plataforma redirige a WKA con `state` y `nonce` → la ruta de retorno valida el `state`, canjea el código en el servidor y guarda el refresh token en Vault. Cada renovación guarda el refresh token devuelto. Si pasan 30 días sin uso, se pide reconectar.
6. **Requisito nuevo:** la ruta de retorno y los conectores del servidor necesitan **`SUPABASE_SERVICE_ROLE_KEY`** (solo servidor, variable de entorno en Vercel) para leer el client_secret y escribir el refresh token. Hasta que el usuario la configure, el paso «Conectar» no se construye.
## Alternativas
- **Que TI pegue un access token a mano:** caduca en 60 min, así que no sirve.
- **Pasar por un tercero** (Kombo, Factorial…): añade otro encargado del tratamiento para datos de nómina. Descartado salvo que no haya otra vía.
- **Guardar el refresh token fuera del Vault:** descartado (mismo nivel de protección que el resto de secretos).
## Consecuencias
- El cruce coste de nómina × horas de Sésame × horas por OT de PGMWin hace posible la **rentabilidad real por OT y por cliente**.
- Hay que vigilar la caducidad del refresh token (30 días) y avisar a TI antes.
- Riesgos nuevos: R-21 (datos de nómina), R-22 (dependencia de una autorización interactiva).
