-- Guardado del refresh token OAuth de a3innuva Nómina (ADR-0013).
-- Solo la ejecuta el SERVIDOR con la clave de servicio (service_role), tras canjear el código de autorización.
-- El token se añade al MISMO secreto cifrado de la conexión (junto a client_secret y clave de suscripción).
-- Como service_role no tiene auth.uid(), el servidor indica qué usuario autorizó y aquí se comprueba que es TI de la organización.

create function public.connection_store_oauth(p_org uuid, p_app text, p_refresh text, p_actor uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret uuid;
  v_value  jsonb;
begin
  if p_app <> 'a3nomina' then
    raise exception 'aplicación sin OAuth' using errcode = '22023';
  end if;
  if p_actor is null or not exists (
    select 1 from public.memberships m where m.org_id = p_org and m.user_id = p_actor and m.role = 'ti'
  ) then
    raise exception 'solo TI puede autorizar conexiones' using errcode = '42501';
  end if;
  if p_refresh is null or char_length(p_refresh) not between 1 and 4000 or p_refresh ~ '\s' then
    raise exception 'token no válido' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_org::text || ':' || p_app, 0));
  select secret_id into v_secret from public.connections where org_id = p_org and app = p_app;
  if v_secret is null then
    raise exception 'la conexión no existe' using errcode = 'P0002';
  end if;

  select s.decrypted_secret::jsonb into v_value from vault.decrypted_secrets s where s.id = v_secret;
  v_value := coalesce(v_value, '{}'::jsonb)
    || jsonb_build_object('refreshToken', p_refresh, 'authorizedAt', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'));
  perform vault.update_secret(v_secret, v_value::text);

  update public.connections
     set status = 'verificada', last_check_at = now(), last_check_message = 'Autorizado con Wolters Kluwer (WKA).', updated_at = now()
   where org_id = p_org and app = p_app;

  insert into public.audit_log (org_id, actor_id, app, action, entity_type, entity_id, after)
  values (p_org, p_actor, p_app, 'conexion.autorizar', 'connection', p_app, jsonb_build_object('campos_secretos', jsonb_build_array('refreshToken')));
end;
$$;

revoke all on function public.connection_store_oauth(uuid, text, text, uuid) from public, anon, authenticated;
grant execute on function public.connection_store_oauth(uuid, text, text, uuid) to service_role;
