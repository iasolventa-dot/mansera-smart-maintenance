-- Contador diario de preguntas al asistente de ayuda (límite de gasto de la IA).
-- NO guarda el texto de las preguntas ni de las respuestas: solo cuántas hizo cada usuario hoy.
-- A diferencia de un contador con service_role, la función cuenta SOLO al usuario autenticado
-- (auth.uid()), así que el servidor no necesita ninguna clave privilegiada.

create table public.assistant_usage (
  user_id    uuid not null references auth.users (id) on delete cascade,
  day        date not null default current_date,
  questions  integer not null default 0 check (questions >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

alter table public.assistant_usage enable row level security;

-- Cada usuario puede ver su propio contador; nadie escribe directamente.
create policy assistant_usage_select_own on public.assistant_usage
  for select to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.assistant_usage from anon, authenticated;
grant select on public.assistant_usage to authenticated;
grant all on public.assistant_usage to service_role;

-- Suma una pregunta al usuario autenticado y devuelve el total de hoy (atómico).
create function public.assistant_log_use()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_n    integer;
begin
  if v_user is null then
    raise exception 'sesión no válida' using errcode = '42501';
  end if;
  insert into public.assistant_usage as u (user_id, day, questions)
  values (v_user, current_date, 1)
  on conflict (user_id, day) do update set questions = u.questions + 1, updated_at = now()
  returning u.questions into v_n;
  return v_n;
end;
$$;

revoke all on function public.assistant_log_use() from public, anon;
grant execute on function public.assistant_log_use() to authenticated, service_role;
