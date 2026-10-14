# ADR 0013 · a3innuva Nómina en el ecosistema
- **Fecha:** 2026-10-14 · **Estado:** propuesto (MANSERA confirma que usa a3innuva Nómina; falta confirmar el reparto de dueños y la contratación de Conectia)
## Contexto
MANSERA usa a3innuva Nómina (Wolters Kluwer, en la nube) además de A3ERP, PGMWin, Trello y Sésame. Su API (a3developers) usa OAuth 2.0 Authorization Code con inicio de sesión interactivo (WKA), refresh token de 30 días y una clave de suscripción Conectia. Contiene los datos personales más sensibles del proyecto.
## Decisión
1. **Sistema propio en el catálogo** (`a3nomina`). Conexión **directa desde la nube**, sin gateway. Credenciales en **Vault**, como Trello y Sésame (ADR-0010): client_id visible; client_secret y clave de suscripción cifrados. El refresh token se añadirá al mismo secreto.
2. **Dueño de los datos** (propuesta): nómina = contrato, IT oficial, coste de personal y formación; Sésame = presencia y fichajes. Las discrepancias se avisan a RR. HH., no se corrigen solas.
3. **Solo lectura.** Ninguna escritura en la nómina sin un ADR propio y una propuesta validada (principio 4).
4. **Minimización y agregación.** El conector solo declara los campos usados. Dirección y Administración ven costes agregados. El detalle individual es solo para RR. HH. Nada de nómina va al LLM.
5. **Flujo OAuth (construido 2026-10-14, revisado en seguridad):**
   - TI guarda las credenciales y **pulsa «Conectar» desde su sesión** (solo TI real; POST con comprobación de origen). En la pantalla de WKA inicia sesión una cuenta de MANSERA con acceso a la nómina.
   - La cookie `__Host-` (10 min) guarda `state`, `nonce` y el **client_id usado**.
   - Al volver, el servidor comprueba el `state` (también ante `error=`), el usuario y la organización; canjea el código; valida el id_token (emisor del dominio WKA, audiencia, caducidad y nonce: OIDC Core §3.1.3.7); y guarda el refresh token **atado al client_id** (si TI cambió las credenciales entre medias, se rechaza).
   - Estado «autorizada» hasta la primera lectura real. Se auditan los éxitos y los fallos.
   - **Pendiente de spike:** emisor exacto, si WKA admite **PKCE** (S256; recomendado por RFC 9700; se activará si lo admite) y si rota el refresh token.
6. **Clave de servicio:** `SUPABASE_SERVICE_ROLE_KEY` (o `SUPABASE_SECRET_KEY`), solo en el servidor; el usuario la configuró en Vercel el 2026-10-14. **Recomendado:** solo en Production (no en Preview) y `APP_URL` con el dominio definitivo.
## Alternativas
- **Que TI pegue un access token a mano:** caduca en 60 min, así que no sirve.
- **Pasar por un tercero** (Kombo, Factorial…): añade otro encargado del tratamiento para datos de nómina. Descartado salvo que no haya otra vía.
- **Guardar el refresh token fuera del Vault:** descartado (mismo nivel de protección que el resto de secretos).
## Consecuencias
- El cruce coste de nómina × horas de Sésame × horas por OT de PGMWin hace posible la **rentabilidad real por OT y por cliente**.
- Hay que vigilar la caducidad del refresh token (30 días) y avisar a TI antes.
- Riesgos nuevos: R-21 (datos de nómina), R-22 (dependencia de una autorización interactiva).
