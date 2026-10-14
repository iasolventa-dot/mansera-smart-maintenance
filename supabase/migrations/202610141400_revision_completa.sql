-- Correcciones de la revisión completa del 2026-10-14.

-- 1) Auditoría: ningún usuario escribe directamente (antes cualquier miembro podía insertar eventos con texto libre).
--    Solo las funciones del sistema (security definer) y el servidor (service_role) registran eventos.
drop policy audit_log_insert on public.audit_log;
revoke insert on public.audit_log from authenticated;

-- 2) Caché con datos personales: se borra al eliminar la conexión (también en cascada) y caduca a las 24 h.
create or replace function private.connections_drop_secret()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.secret_id is not null then
    delete from vault.secrets where id = old.secret_id;
  end if;
  delete from public.connector_snapshots where org_id = old.org_id and app = old.app;
  return old;
end
$$;

-- Purga de cachés antiguas (la ejecuta la tarea programada diaria con la clave de servicio).
create function public.purge_connector_snapshots(p_max_age_hours integer default 24)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_n integer;
begin
  delete from public.connector_snapshots where fetched_at < now() - make_interval(hours => greatest(p_max_age_hours, 1));
  get diagnostics v_n = row_count;
  return v_n;
end
$$;
revoke all on function public.purge_connector_snapshots(integer) from public, anon, authenticated;
grant execute on function public.purge_connector_snapshots(integer) to service_role;
