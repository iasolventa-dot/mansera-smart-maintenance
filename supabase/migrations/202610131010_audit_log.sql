-- Auditoría inmutable (ADR-0005): solo inserción. Nadie puede modificar ni borrar,
-- ni siquiera service_role (lo impide un trigger, no solo los permisos).

create table public.audit_log (
  id          bigint generated always as identity primary key,
  org_id      uuid not null references public.orgs (id) on delete restrict,
  actor_id    uuid references auth.users (id) on delete set null,
  app         text not null check (app in ('pgmwin', 'a3erp', 'trello', 'sesame', 'msm')),
  action      text not null check (char_length(action) between 2 and 80),
  entity_type text,
  entity_id   text,
  before      jsonb,
  after       jsonb,
  created_at  timestamptz not null default now()
);
create index audit_log_org_created_idx on public.audit_log (org_id, created_at desc);

create function private.audit_log_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'audit_log es inmutable: no se permite % ', tg_op using errcode = '42501';
end
$$;

create trigger audit_log_no_update_delete
  before update or delete on public.audit_log
  for each row execute function private.audit_log_immutable();

create trigger audit_log_no_truncate
  before truncate on public.audit_log
  for each statement execute function private.audit_log_immutable();

alter table public.audit_log enable row level security;

-- Lectura: dirección y TI de la organización.
create policy audit_log_select on public.audit_log
  for select to authenticated
  using (private.has_role(org_id, array['direccion', 'ti']::public.app_role[]));

-- Inserción: cualquier miembro, solo en su organización y a su nombre.
create policy audit_log_insert on public.audit_log
  for insert to authenticated
  with check (
    actor_id = (select auth.uid())
    and org_id in (select private.user_org_ids())
  );

revoke all on public.audit_log from anon, authenticated;
grant select, insert on public.audit_log to authenticated;
grant select, insert on public.audit_log to service_role;
