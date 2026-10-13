-- SOLO PARA TESTS. Imita lo mínimo de Supabase que usan las migraciones:
-- esquema `auth`, `auth.uid()`, los roles de la API y los privilegios por defecto.
-- En Supabase real (local o web) todo esto ya existe; este fichero no se despliega.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create schema auth;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb not null default '{}'::jsonb
);

create function auth.uid() returns uuid
language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;

-- Vault (Supabase lo trae instalado; aquí un sustituto SIN cifrado, solo para probar permisos y lógica).
create schema vault;
create table vault.secrets (
  id uuid primary key default gen_random_uuid(),
  name text, description text, secret text,
  created_at timestamptz not null default now()
);
create function vault.create_secret(new_secret text, new_name text default null, new_description text default '')
returns uuid language sql as $$
  insert into vault.secrets (secret, name, description) values (new_secret, new_name, new_description) returning id
$$;
create function vault.update_secret(secret_id uuid, new_secret text default null)
returns void language sql as $$
  update vault.secrets set secret = coalesce(new_secret, secret) where id = secret_id
$$;
create view vault.decrypted_secrets as select id, name, description, secret, secret as decrypted_secret from vault.secrets;
-- El rol de la API NO tiene acceso a vault (igual que en Supabase real).
grant usage on schema vault to service_role;
