-- Endurecimiento tras la auditoría independiente del 2026-10-13.

-- 1) Auditoría inmutable, pero compatible con borrar usuarios (baja de un empleado, supresión RGPD):
--    se permite ÚNICAMENTE que `actor_id` pase a NULL (lo hace la FK `on delete set null`). Todo lo demás sigue prohibido.
create or replace function private.audit_log_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and tg_level = 'ROW'
     and new.actor_id is null and old.actor_id is not null
     and (to_jsonb(new) - 'actor_id') = (to_jsonb(old) - 'actor_id') then
    return new;
  end if;
  raise exception 'audit_log es inmutable: no se permite % ', tg_op using errcode = '42501';
end
$$;

-- 2) Mínimo privilegio: la configuración de las conexiones solo la ve TI (Dirección no tiene la sección).
drop policy connections_select on public.connections;
create policy connections_select on public.connections
  for select to authenticated
  using (private.has_role(org_id, array['ti']::public.app_role[]));

-- 3) Las funciones también se pueden llamar directamente por la API: validan por sí mismas, sin fiarse del servidor web.
--    Claves permitidas por aplicación (espejo de packages/core/src/connectors/specs.ts) y límites de tamaño.
create function private.connection_payload_ok(p_app text, p_config jsonb, p_secrets jsonb)
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
      when 'a3erp' then
        (select coalesce(array_agg(k order by k), '{}') from jsonb_object_keys(p_config) k) = array['baseUrl']
        and (select array_agg(k) from jsonb_object_keys(p_secrets) k) <@ array['password', 'username'] and p_secrets ? 'username' and p_secrets ? 'password'
        -- solo esquema://host[:puerto], sin usuario, ruta, parámetros ni barra final
        and p_config->>'baseUrl' ~ '^https?://[A-Za-z0-9.-]+(:[0-9]{1,5})?$'
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
  if p_app not in ('a3erp', 'trello', 'sesame') then
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

-- La comprobación solo se anota sobre una conexión que existe.
create or replace function public.connection_record_test(p_org uuid, p_app text, p_status text, p_message text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null or not private.has_role(p_org, array['ti']::public.app_role[]) then
    raise exception 'solo TI puede gestionar conexiones' using errcode = '42501';
  end if;
  if p_status not in ('verificada', 'error', 'no_probable') then
    raise exception 'estado no válido' using errcode = '22023';
  end if;
  update public.connections
     set status = p_status, last_check_at = now(), last_check_message = left(p_message, 400)
   where org_id = p_org and app = p_app;
  if not found then
    raise exception 'la conexión no existe' using errcode = 'P0002';
  end if;
  insert into public.audit_log (org_id, actor_id, app, action, entity_type, entity_id, after)
  values (p_org, v_user, p_app, 'conexion.comprobar', 'connection', p_app, jsonb_build_object('estado', p_status));
end;
$$;

-- 4) Al borrar una organización, que no queden secretos huérfanos en el Vault.
create function private.connections_drop_secret()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.secret_id is not null then
    delete from vault.secrets where id = old.secret_id;
  end if;
  return old;
end
$$;
create trigger connections_drop_secret
  after delete on public.connections
  for each row execute function private.connections_drop_secret();

revoke all on function private.connection_payload_ok(text, jsonb, jsonb) from public, anon, authenticated;
revoke all on function private.connections_drop_secret() from public, anon, authenticated;
