-- Endurecimiento del OAuth de a3innuva Nómina tras la revisión de seguridad del 2026-10-14 (ADR-0013).
-- 1) Estado nuevo «autorizada»: hay token, pero aún no se ha leído nada de la API (no se dice «verificada» sin prueba).
-- 2) El token queda atado al client_id con el que se obtuvo: si TI cambió las credenciales entre medias, se rechaza.
-- 3) Renovación automática (tarea programada del servidor): guarda el refresh token nuevo sin actor humano.

alter table public.connections drop constraint connections_status_check;
alter table public.connections add constraint connections_status_check
  check (status in ('sin_probar', 'autorizada', 'verificada', 'error', 'no_probable'));

drop function public.connection_store_oauth(uuid, text, text, uuid);

-- Mezcla el refresh token en el secreto SI el client_id guardado sigue siendo el usado en la autorización.
create function private.connection_merge_token(p_org uuid, p_app text, p_client_id text, p_refresh text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret uuid;
  v_client text;
  v_value  jsonb;
begin
  if p_app <> 'a3nomina' then
    raise exception 'aplicación sin OAuth' using errcode = '22023';
  end if;
  if p_refresh is null or char_length(p_refresh) not between 1 and 4000 or p_refresh ~ '\s' then
    raise exception 'token no válido' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_org::text || ':' || p_app, 0));
  select secret_id, config->>'clientId' into v_secret, v_client from public.connections where org_id = p_org and app = p_app;
  if v_secret is null then
    raise exception 'la conexión no existe' using errcode = 'P0002';
  end if;
  if v_client is distinct from p_client_id then
    raise exception 'las credenciales han cambiado durante la autorización' using errcode = '40001';
  end if;
  select s.decrypted_secret::jsonb into v_value from vault.decrypted_secrets s where s.id = v_secret;
  v_value := coalesce(v_value, '{}'::jsonb)
    || jsonb_build_object('refreshToken', p_refresh, 'authorizedAt', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'));
  perform vault.update_secret(v_secret, v_value::text);
end;
$$;
revoke all on function private.connection_merge_token(uuid, text, text, text) from public, anon, authenticated;

-- Tras «Conectar con Wolters Kluwer»: solo servidor, en nombre de un TI de la organización.
create function public.connection_store_oauth(p_org uuid, p_app text, p_client_id text, p_refresh text, p_actor uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_actor is null or not exists (
    select 1 from public.memberships m where m.org_id = p_org and m.user_id = p_actor and m.role = 'ti'
  ) then
    raise exception 'solo TI puede autorizar conexiones' using errcode = '42501';
  end if;
  perform private.connection_merge_token(p_org, p_app, p_client_id, p_refresh);
  update public.connections
     set status = 'autorizada', last_check_at = now(),
         last_check_message = 'Autorizado con Wolters Kluwer (WKA). Pendiente de la primera lectura de datos.', updated_at = now()
   where org_id = p_org and app = p_app;
  insert into public.audit_log (org_id, actor_id, app, action, entity_type, entity_id, after)
  values (p_org, p_actor, p_app, 'conexion.autorizar', 'connection', p_app, jsonb_build_object('campos_secretos', jsonb_build_array('refreshToken')));
end;
$$;

-- Renovación programada (sin actor humano): guarda el refresh token devuelto por Wolters Kluwer.
create function public.connection_rotate_oauth(p_org uuid, p_app text, p_client_id text, p_refresh text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.connection_merge_token(p_org, p_app, p_client_id, p_refresh);
  insert into public.audit_log (org_id, actor_id, app, action, entity_type, entity_id, after)
  values (p_org, null, p_app, 'conexion.renovar', 'connection', p_app, jsonb_build_object('campos_secretos', jsonb_build_array('refreshToken')));
end;
$$;

-- Intentos fallidos o cancelados: se auditan (sin detalles del proveedor).
create function public.connection_audit_oauth(p_org uuid, p_app text, p_actor uuid, p_outcome text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_log (org_id, actor_id, app, action, entity_type, entity_id, after)
  select p_org, p_actor, p_app, 'conexion.autorizar_fallida', 'connection', p_app, jsonb_build_object('resultado', left(p_outcome, 40))
  where p_app = 'a3nomina' and exists (select 1 from public.memberships m where m.org_id = p_org and m.user_id = p_actor)
$$;

revoke all on function public.connection_store_oauth(uuid, text, text, text, uuid) from public, anon, authenticated;
revoke all on function public.connection_rotate_oauth(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.connection_audit_oauth(uuid, text, uuid, text) from public, anon, authenticated;
grant execute on function public.connection_store_oauth(uuid, text, text, text, uuid) to service_role;
grant execute on function public.connection_rotate_oauth(uuid, text, text, text) to service_role;
grant execute on function public.connection_audit_oauth(uuid, text, uuid, text) to service_role;
