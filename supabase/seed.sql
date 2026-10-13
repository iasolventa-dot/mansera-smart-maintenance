-- Datos de ejemplo SOLO para desarrollo local (`supabase db reset`). Sin datos reales.
-- Los usuarios se crean desde Auth (panel local o API); después se les da membresía así:
--   insert into public.memberships (org_id, user_id, role)
--   select o.id, '<uuid del usuario>', 'direccion' from public.orgs o where o.slug = 'mansera-demo';
insert into public.orgs (name, slug)
values ('MANSERA (demo)', 'mansera-demo')
on conflict (slug) do nothing;
