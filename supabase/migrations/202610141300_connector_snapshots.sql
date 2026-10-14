-- Caché de lecturas de los conectores por organización (contrato de conectores, regla 4; ADR-0001 caché «opcional y
-- justificada»: Sésame tiene un cupo de 1.000 peticiones/min por EMPRESA y cada vista de Personal necesita ~8 lecturas).
-- Guarda solo datos YA MINIMIZADOS y mapeados (p. ej. la lista de Personal sin DNI ni salarios), se sobrescribe en
-- cada refresco (sin histórico) y solo la usa el servidor con la clave de servicio, después de comprobar permisos.
-- Configuración de los conectores que no es secreta (p. ej. qué tablero de Trello es el de ofertas y cómo se mapea).

create table public.connector_snapshots (
  org_id     uuid not null references public.orgs (id) on delete cascade,
  app        text not null check (app in ('trello', 'sesame', 'a3nomina', 'a3erp', 'pgmwin')),
  kind       text not null check (kind ~ '^[a-z_]{2,40}$'),
  payload    jsonb not null check (pg_column_size(payload) < 5000000),
  fetched_at timestamptz not null default now(),
  primary key (org_id, app, kind)
);
alter table public.connector_snapshots enable row level security;
-- Sin políticas para usuarios: solo el servidor (service_role) lee y escribe.
revoke all on public.connector_snapshots from anon, authenticated;
grant all on public.connector_snapshots to service_role;

create table public.connector_settings (
  org_id     uuid not null references public.orgs (id) on delete cascade,
  app        text not null check (app in ('trello', 'sesame', 'a3nomina')),
  settings   jsonb not null check (jsonb_typeof(settings) = 'object' and pg_column_size(settings) < 20000),
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (org_id, app)
);
alter table public.connector_settings enable row level security;
create policy connector_settings_select on public.connector_settings
  for select to authenticated
  using (private.has_role(org_id, array['ti']::public.app_role[]));
revoke all on public.connector_settings from anon, authenticated;
grant select on public.connector_settings to authenticated;
grant all on public.connector_settings to service_role;

-- Escritura solo TI (el servidor valida antes el formato con Zod; aquí, rol y tamaño) y auditada.
create function public.connector_settings_save(p_org uuid, p_app text, p_settings jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null or not private.has_role(p_org, array['ti']::public.app_role[]) then
    raise exception 'solo TI puede configurar los conectores' using errcode = '42501';
  end if;
  if p_app not in ('trello', 'sesame', 'a3nomina') or p_settings is null or jsonb_typeof(p_settings) <> 'object' or pg_column_size(p_settings) >= 20000 then
    raise exception 'configuración no válida' using errcode = '22023';
  end if;
  insert into public.connector_settings as s (org_id, app, settings, updated_by, updated_at)
  values (p_org, p_app, p_settings, v_user, now())
  on conflict (org_id, app) do update set settings = excluded.settings, updated_by = v_user, updated_at = now();
  -- Al cambiar la configuración, la caché de esa aplicación deja de valer.
  delete from public.connector_snapshots where org_id = p_org and app = p_app;
  insert into public.audit_log (org_id, actor_id, app, action, entity_type, entity_id, after)
  values (p_org, v_user, p_app, 'conector.configurar', 'connector_settings', p_app, p_settings);
end;
$$;
revoke all on function public.connector_settings_save(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.connector_settings_save(uuid, text, jsonb) to authenticated;
