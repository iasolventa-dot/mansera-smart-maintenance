-- Roles nuevos para los paneles de Compras y de RR. HH. (alineados con packages/core `Role`).
alter type public.app_role add value if not exists 'compras';
alter type public.app_role add value if not exists 'rrhh';
