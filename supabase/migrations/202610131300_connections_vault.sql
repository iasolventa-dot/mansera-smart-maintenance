-- Credenciales de las aplicaciones de MANSERA (PGMWin, A3ERP, Trello, Sésame HR). ADR-0010.
-- · La parte NO sensible (URL, región, clave pública de API) vive en `connections.config`.
-- · La parte sensible (tokens, usuario/contraseña) vive CIFRADA en Supabase Vault; la tabla solo guarda el id del secreto.
-- · El navegador nunca puede leer secretos: ni la tabla expone `secret_id` ni existe función de lectura para usuarios.
-- · Escribir = solo TI, mediante funciones definer que además dejan rastro en `audit_log` SIN valores secretos.

create table public.connections (
  org_id             uuid not null references public.orgs (id) on delete cascade,
  app                text not null check (app in ('a3erp', 'trello', 'sesame')),
  config             jsonb not null default '{}'::jsonb,
  secret_id          uuid,
  status             text not null default 'sin_probar' check (status in ('sin_probar', 'verificada', 'error', 'no_probable')),
  last_check_at      timestamptz,
  last_check_message text check (char_length(last_check_message) <= 400),
  updated_by         uuid references auth.users (id) on delete set null,
  updated_at         timestamptz not null default now(),
  primary key (org_id, app)
);

alter table public.connections enable row level security;

create policy connections_select on public.connections
  for select to authenticated
  using (private.has_role(org_id, array['direccion', 'ti']::public.app_role[]));

-- Sin escritura directa: todo pasa por las funciones de abajo. Sin `secret_id` visible.
revoke all on public.connections from anon, authenticated;
grant select (org_id, app, config, status, last_check_at, last_check_message, updated_by, updated_at)
  on public.connections to authenticated;
grant all on public.connections to service_role;

-- Guarda (o reemplaza) las credenciales. `p_secrets` es un JSON con solo los campos sensibles.
create function public.connection_save(p_org uuid, p_app text, p_config jsonb, p_secrets text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user   uuid := (select auth.uid());
  v_old    uuid;
  v_secret uuid;
  v_keys   text[];
begin
  if v_user is null or not private.has_role(p_org, array['ti']::public.app_role[]) then
    raise exception 'solo TI puede gestionar conexiones' using errcode = '42501';
  end if;
  if p_app not in ('a3erp', 'trello', 'sesame') then
    raise exception 'aplicación no configurable' using errcode = '22023';
  end if;
  if p_secrets is null or char_length(p_secrets) > 4000 or jsonb_typeof(p_secrets::jsonb) <> 'object' then
    raise exception 'secretos no válidos' using errcode = '22023';
  end if;

  select secret_id into v_old from public.connections where org_id = p_org and app = p_app;
  if v_old is null then
    v_secret := vault.create_secret(p_secrets, 'msm:' || p_org::text || ':' || p_app, 'Credenciales de ' || p_app);
  else
    perform vault.update_secret(v_old, p_secrets);
    v_secret := v_old;
  end if;

  insert into public.connections as c (org_id, app, config, secret_id, status, last_check_at, last_check_message, updated_by, updated_at)
  values (p_org, p_app, coalesce(p_config, '{}'::jsonb), v_secret, 'sin_probar', null, null, v_user, now())
  on conflict (org_id, app) do update
    set config = excluded.config, secret_id = excluded.secret_id, status = 'sin_probar',
        last_check_at = null, last_check_message = null, updated_by = v_user, updated_at = now();

  select array_agg(k order by k) into v_keys from jsonb_object_keys(p_secrets::jsonb) k;
  insert into public.audit_log (org_id, actor_id, app, action, entity_type, entity_id, after)
  values (p_org, v_user, p_app, 'conexion.guardar', 'connection', p_app,
          jsonb_build_object('config', coalesce(p_config, '{}'::jsonb), 'campos_secretos', to_jsonb(v_keys)));
end;
$$;

create function public.connection_delete(p_org uuid, p_app text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user   uuid := (select auth.uid());
  v_secret uuid;
begin
  if v_user is null or not private.has_role(p_org, array['ti']::public.app_role[]) then
    raise exception 'solo TI puede gestionar conexiones' using errcode = '42501';
  end if;
  select secret_id into v_secret from public.connections where org_id = p_org and app = p_app;
  if not found then
    return;
  end if;
  delete from public.connections where org_id = p_org and app = p_app;
  if v_secret is not null then
    delete from vault.secrets where id = v_secret;
  end if;
  insert into public.audit_log (org_id, actor_id, app, action, entity_type, entity_id)
  values (p_org, v_user, p_app, 'conexion.eliminar', 'connection', p_app);
end;
$$;

-- Anota el resultado de la comprobación (sin credenciales en el mensaje).
create function public.connection_record_test(p_org uuid, p_app text, p_status text, p_message text)
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
  insert into public.audit_log (org_id, actor_id, app, action, entity_type, entity_id, after)
  values (p_org, v_user, p_app, 'conexion.comprobar', 'connection', p_app, jsonb_build_object('estado', p_status));
end;
$$;

-- Lectura de secretos: SOLO el servidor con service_role (conectores, gateway). Nunca el navegador.
create function public.connection_read_secret(p_org uuid, p_app text)
returns text
language sql
security definer
set search_path = ''
as $$
  select s.decrypted_secret
    from public.connections c
    join vault.decrypted_secrets s on s.id = c.secret_id
   where c.org_id = p_org and c.app = p_app
$$;

revoke all on function public.connection_save(uuid, text, jsonb, text) from public, anon, authenticated;
revoke all on function public.connection_delete(uuid, text) from public, anon, authenticated;
revoke all on function public.connection_record_test(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.connection_read_secret(uuid, text) from public, anon, authenticated;
grant execute on function public.connection_save(uuid, text, jsonb, text) to authenticated;
grant execute on function public.connection_delete(uuid, text) to authenticated;
grant execute on function public.connection_record_test(uuid, text, text, text) to authenticated;
grant execute on function public.connection_read_secret(uuid, text) to service_role;
