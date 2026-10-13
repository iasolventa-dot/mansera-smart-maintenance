-- ADR-0012: las credenciales de A3ERP (y de PGMWin cuando se documente) viven SOLO en el gateway de la red de MANSERA.
-- La plataforma deja de aceptarlas: solo Trello y Sésame, que son servicios en la nube, se guardan en Vault.
-- No había ninguna fila de A3ERP (comprobado antes de aplicar), así que no hay datos que migrar.

alter table public.connections drop constraint connections_app_check;
alter table public.connections add constraint connections_app_check check (app in ('trello', 'sesame'));

create or replace function private.connection_payload_ok(p_app text, p_config jsonb, p_secrets jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select
    jsonb_typeof(p_config) = 'object' and jsonb_typeof(p_secrets) = 'object'
    and pg_column_size(p_config) < 2000
    -- todas las claves conocidas y todos los valores texto no vacío de tamaño razonable
    and not exists (select 1 from jsonb_each(p_config) e where jsonb_typeof(e.value) <> 'string' or char_length(e.value #>> '{}') not between 1 and 200)
    and not exists (select 1 from jsonb_each(p_secrets) e where jsonb_typeof(e.value) <> 'string' or char_length(e.value #>> '{}') not between 1 and 600)
    and case p_app
      when 'trello' then
        (select coalesce(array_agg(k order by k), '{}') from jsonb_object_keys(p_config) k) = array['apiKey']
        and (select array_agg(k) from jsonb_object_keys(p_secrets) k) <@ array['token', 'apiSecret'] and p_secrets ? 'token'
        and p_config->>'apiKey' ~ '^[A-Za-z0-9]{16,64}$'
      when 'sesame' then
        (select coalesce(array_agg(k order by k), '{}') from jsonb_object_keys(p_config) k) = array['region']
        and (select array_agg(k) from jsonb_object_keys(p_secrets) k) <@ array['token'] and p_secrets ? 'token'
        and p_config->>'region' ~ '^[a-z0-9]([a-z0-9-]{0,18}[a-z0-9])?$'
      else false
    end
$$;

create or replace function public.connection_save(p_org uuid, p_app text, p_config jsonb, p_secrets text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user    uuid := (select auth.uid());
  v_old     uuid;
  v_secret  uuid;
  v_keys    text[];
  v_secrets jsonb;
begin
  if v_user is null or not private.has_role(p_org, array['ti']::public.app_role[]) then
    raise exception 'solo TI puede gestionar conexiones' using errcode = '42501';
  end if;
  if p_app not in ('trello', 'sesame') then
    raise exception 'aplicación no configurable' using errcode = '22023';
  end if;
  -- Error genérico: el detalle de un JSON mal formado podría contener un trozo del secreto y acabar en los logs.
  begin
    if p_secrets is null or char_length(p_secrets) > 4000 then raise exception 'x'; end if;
    v_secrets := p_secrets::jsonb;
  exception when others then
    raise exception 'secretos no válidos' using errcode = '22023';
  end;
  if not private.connection_payload_ok(p_app, coalesce(p_config, '{}'::jsonb), v_secrets) then
    raise exception 'datos de conexión no válidos' using errcode = '22023';
  end if;

  -- Serializa guardados simultáneos de la misma conexión (evita dos secretos para una fila).
  perform pg_advisory_xact_lock(hashtextextended(p_org::text || ':' || p_app, 0));

  select secret_id into v_old from public.connections where org_id = p_org and app = p_app;
  if v_old is null then
    v_secret := vault.create_secret(p_secrets, 'msm:' || p_org::text || ':' || p_app || ':' || gen_random_uuid()::text, 'Credenciales de ' || p_app);
  else
    perform vault.update_secret(v_old, p_secrets);
    v_secret := v_old;
  end if;

  insert into public.connections as c (org_id, app, config, secret_id, status, last_check_at, last_check_message, updated_by, updated_at)
  values (p_org, p_app, p_config, v_secret, 'sin_probar', null, null, v_user, now())
  on conflict (org_id, app) do update
    set config = excluded.config, secret_id = excluded.secret_id, status = 'sin_probar',
        last_check_at = null, last_check_message = null, updated_by = v_user, updated_at = now();

  select array_agg(k order by k) into v_keys from jsonb_object_keys(v_secrets) k;
  insert into public.audit_log (org_id, actor_id, app, action, entity_type, entity_id, after)
  values (p_org, v_user, p_app, 'conexion.guardar', 'connection', p_app,
          jsonb_build_object('config', p_config, 'campos_secretos', to_jsonb(v_keys)));
end;
$$;
