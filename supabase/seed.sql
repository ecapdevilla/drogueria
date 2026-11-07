-- Droguería · datos iniciales
-- Ejecutar una sola vez después de las migraciones.

insert into public.organizations (id, name)
values ('00000000-0000-0000-0000-000000000001', 'Droguería')
on conflict (id) do nothing;

insert into public.stores (id, organization_id, name, address)
values (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'Sucursal principal',
  null
)
on conflict (id) do nothing;

insert into public.app_settings (store_id, backup_reminder_days)
values ('00000000-0000-0000-0000-000000000002', 7)
on conflict (store_id) do nothing;
