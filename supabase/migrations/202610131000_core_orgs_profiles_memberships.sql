-- Núcleo multi-tenant (ADR-0004): organizaciones, perfiles y pertenencias con rol.
-- Roles alineados con packages/core (Role) y la UI.

create type public.app_role as enum (
  'direccion',
  'ti',
  'oficina_tecnica',
  'administracion',
  'campo'
);

create table public.orgs (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name) between 2 and 120),
  slug       text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  created_at timestamptz not null default now()
);

create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text not null default '' check (char_length(full_name) <= 120),
  avatar_url text,
  ui_prefs   jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.memberships (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.orgs (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       public.app_role not null,
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);
create index memberships_user_idx on public.memberships (user_id);
create index memberships_org_idx  on public.memberships (org_id);

-- ───────── Funciones auxiliares (esquema privado: no se expone por la API) ─────────
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

-- Orgs a las que pertenece el usuario autenticado. SECURITY DEFINER para no
-- provocar recursión de RLS al consultarse desde políticas de `memberships`.
create function private.user_org_ids()
returns setof uuid
language sql stable security definer
set search_path = ''
as $$
  select m.org_id from public.memberships m where m.user_id = (select auth.uid())
$$;

-- Usuarios que comparten organización con el autenticado (incluido él mismo).
create function private.org_peer_ids()
returns setof uuid
language sql stable security definer
set search_path = ''
as $$
  select m.user_id from public.memberships m
  where m.org_id in (select private.user_org_ids())
$$;

create function private.has_role(p_org uuid, p_roles public.app_role[])
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
    where m.user_id = (select auth.uid()) and m.org_id = p_org and m.role = any (p_roles)
  )
$$;

revoke execute on all functions in schema private from public;
grant execute on all functions in schema private to authenticated, service_role;

-- Crea el perfil al registrarse un usuario en Auth. No concede ninguna membresía.
create function private.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ───────── RLS: activada en todas; sin política = sin acceso ─────────
alter table public.orgs        enable row level security;
alter table public.profiles    enable row level security;
alter table public.memberships enable row level security;

-- orgs: lectura de las propias. Altas/cambios solo con service_role (servidor).
create policy orgs_select_member on public.orgs
  for select to authenticated
  using (id in (select private.user_org_ids()));

-- profiles: ver el propio y los de compañeros de organización; editar solo el propio.
create policy profiles_select_same_org on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or id in (select private.org_peer_ids())
  );

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- memberships: cada usuario ve las suyas; dirección y TI ven toda su organización.
create policy memberships_select on public.memberships
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or private.has_role(org_id, array['direccion', 'ti']::public.app_role[])
  );

-- Gestión de miembros: solo TI de esa organización (nadie puede auto-ascenderse).
create policy memberships_insert_ti on public.memberships
  for insert to authenticated
  with check (private.has_role(org_id, array['ti']::public.app_role[]));

create policy memberships_update_ti on public.memberships
  for update to authenticated
  using (private.has_role(org_id, array['ti']::public.app_role[]))
  with check (private.has_role(org_id, array['ti']::public.app_role[]));

create policy memberships_delete_ti on public.memberships
  for delete to authenticated
  using (private.has_role(org_id, array['ti']::public.app_role[]));

-- Privilegios mínimos: anon no accede a nada; authenticated solo lo que cubren las políticas.
revoke all on public.orgs, public.profiles, public.memberships from anon;
revoke all on public.orgs, public.profiles, public.memberships from authenticated;
grant select on public.orgs to authenticated;
grant select, update (full_name, avatar_url, ui_prefs) on public.profiles to authenticated;
grant select, insert, update, delete on public.memberships to authenticated;
grant all on public.orgs, public.profiles, public.memberships to service_role;
