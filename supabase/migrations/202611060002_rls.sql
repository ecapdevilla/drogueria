-- Droguería · Fase 3
-- Row Level Security y permisos por rol.

-- ---------------------------------------------------------------------------
-- Helpers de sesión (SECURITY DEFINER para evitar recursión en profiles)
-- ---------------------------------------------------------------------------

create or replace function public.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id
    from public.profiles
   where id = auth.uid()
     and active
   limit 1;
$$;

create or replace function public.current_store_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select store_id
    from public.profiles
   where id = auth.uid()
     and active
   limit 1;
$$;

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role
    from public.profiles
   where id = auth.uid()
     and active
   limit 1;
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.profiles
     where id = auth.uid()
       and active
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_app_role() = 'admin', false);
$$;

create or replace function public.can_manage_inventory()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_app_role() in ('admin', 'inventory'), false);
$$;

create or replace function public.can_sell()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_app_role() in ('admin', 'cashier'), false);
$$;

revoke all on function public.current_organization_id() from public, anon;
revoke all on function public.current_store_id() from public, anon;
revoke all on function public.current_app_role() from public, anon;
revoke all on function public.is_staff() from public, anon;
revoke all on function public.is_admin() from public, anon;
revoke all on function public.can_manage_inventory() from public, anon;
revoke all on function public.can_sell() from public, anon;

grant execute on function public.current_organization_id() to authenticated;
grant execute on function public.current_store_id() to authenticated;
grant execute on function public.current_app_role() to authenticated;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.can_manage_inventory() to authenticated;
grant execute on function public.can_sell() to authenticated;

-- Un usuario no puede ascenderse ni cambiar de organización/sucursal.
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (
    public.is_admin()
    or auth.role() = 'service_role'
    or session_user in ('postgres', 'supabase_admin')
  ) then
    new.role := old.role;
    new.organization_id := old.organization_id;
    new.store_id := old.store_id;
    new.active := old.active;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_fields on public.profiles;
create trigger profiles_protect_fields
before update on public.profiles
for each row execute function public.protect_profile_fields();

-- ---------------------------------------------------------------------------
-- Habilitar RLS
-- ---------------------------------------------------------------------------

alter table public.organizations enable row level security;
alter table public.stores enable row level security;
alter table public.profiles enable row level security;
alter table public.suppliers enable row level security;
alter table public.products enable row level security;
alter table public.lots enable row level security;
alter table public.movements enable row level security;
alter table public.customers enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.payments enable row level security;
alter table public.purchases enable row level security;
alter table public.purchase_items enable row level security;
alter table public.cash_sessions enable row level security;
alter table public.expenses enable row level security;
alter table public.returns enable row level security;
alter table public.return_items enable row level security;
alter table public.audit_log enable row level security;
alter table public.app_settings enable row level security;

-- ---------------------------------------------------------------------------
-- Organización y sucursales
-- ---------------------------------------------------------------------------

create policy "organizations_select_own" on public.organizations
  for select to authenticated
  using (id = public.current_organization_id());

create policy "organizations_admin_update" on public.organizations
  for update to authenticated
  using (public.is_admin() and id = public.current_organization_id())
  with check (public.is_admin() and id = public.current_organization_id());

create policy "stores_select_own" on public.stores
  for select to authenticated
  using (organization_id = public.current_organization_id());

create policy "stores_admin_insert" on public.stores
  for insert to authenticated
  with check (public.is_admin() and organization_id = public.current_organization_id());

create policy "stores_admin_update" on public.stores
  for update to authenticated
  using (public.is_admin() and organization_id = public.current_organization_id())
  with check (public.is_admin() and organization_id = public.current_organization_id());

create policy "stores_admin_delete" on public.stores
  for delete to authenticated
  using (public.is_admin() and organization_id = public.current_organization_id());

-- ---------------------------------------------------------------------------
-- Perfiles
-- ---------------------------------------------------------------------------

create policy "profiles_select_self_or_admin" on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or (public.is_admin() and organization_id = public.current_organization_id())
  );

create policy "profiles_admin_insert" on public.profiles
  for insert to authenticated
  with check (public.is_admin() and organization_id = public.current_organization_id());

create policy "profiles_update_self_or_admin" on public.profiles
  for update to authenticated
  using (
    id = auth.uid()
    or (public.is_admin() and organization_id = public.current_organization_id())
  )
  with check (
    id = auth.uid()
    or (public.is_admin() and organization_id = public.current_organization_id())
  );

create policy "profiles_admin_delete" on public.profiles
  for delete to authenticated
  using (public.is_admin() and organization_id = public.current_organization_id());

-- ---------------------------------------------------------------------------
-- Inventario
-- ---------------------------------------------------------------------------

create policy "suppliers_select_org" on public.suppliers
  for select to authenticated
  using (organization_id = public.current_organization_id());

create policy "suppliers_inventory_write" on public.suppliers
  for all to authenticated
  using (public.can_manage_inventory() and organization_id = public.current_organization_id())
  with check (public.can_manage_inventory() and organization_id = public.current_organization_id());

create policy "products_select_store" on public.products
  for select to authenticated
  using (store_id = public.current_store_id());

create policy "products_inventory_write" on public.products
  for all to authenticated
  using (public.can_manage_inventory() and store_id = public.current_store_id())
  with check (public.can_manage_inventory() and store_id = public.current_store_id());

create policy "lots_select_store" on public.lots
  for select to authenticated
  using (store_id = public.current_store_id());

create policy "lots_inventory_write" on public.lots
  for all to authenticated
  using (public.can_manage_inventory() and store_id = public.current_store_id())
  with check (public.can_manage_inventory() and store_id = public.current_store_id());

create policy "movements_select_store" on public.movements
  for select to authenticated
  using (store_id = public.current_store_id());

create policy "movements_staff_insert" on public.movements
  for insert to authenticated
  with check (
    store_id = public.current_store_id()
    and (public.can_sell() or public.can_manage_inventory())
  );

create policy "movements_admin_update" on public.movements
  for update to authenticated
  using (public.is_admin() and store_id = public.current_store_id())
  with check (public.is_admin() and store_id = public.current_store_id());

create policy "movements_admin_delete" on public.movements
  for delete to authenticated
  using (public.is_admin() and store_id = public.current_store_id());

-- ---------------------------------------------------------------------------
-- Clientes y ventas
-- ---------------------------------------------------------------------------

create policy "customers_select_store" on public.customers
  for select to authenticated
  using (store_id = public.current_store_id());

create policy "customers_sell_insert" on public.customers
  for insert to authenticated
  with check (public.can_sell() and store_id = public.current_store_id());

create policy "customers_sell_update" on public.customers
  for update to authenticated
  using (public.can_sell() and store_id = public.current_store_id())
  with check (public.can_sell() and store_id = public.current_store_id());

create policy "customers_admin_delete" on public.customers
  for delete to authenticated
  using (public.is_admin() and store_id = public.current_store_id());

create policy "sales_select_store" on public.sales
  for select to authenticated
  using (store_id = public.current_store_id());

create policy "sales_sell_insert" on public.sales
  for insert to authenticated
  with check (public.can_sell() and store_id = public.current_store_id());

create policy "sales_sell_update" on public.sales
  for update to authenticated
  using (public.can_sell() and store_id = public.current_store_id())
  with check (public.can_sell() and store_id = public.current_store_id());

create policy "sales_admin_delete" on public.sales
  for delete to authenticated
  using (public.is_admin() and store_id = public.current_store_id());

create policy "sale_items_select_sale" on public.sale_items
  for select to authenticated
  using (
    exists (
      select 1 from public.sales s
       where s.id = sale_id
         and s.store_id = public.current_store_id()
    )
  );

create policy "sale_items_sell_write" on public.sale_items
  for all to authenticated
  using (
    public.can_sell()
    and exists (
      select 1 from public.sales s
       where s.id = sale_id
         and s.store_id = public.current_store_id()
    )
  )
  with check (
    public.can_sell()
    and exists (
      select 1 from public.sales s
       where s.id = sale_id
         and s.store_id = public.current_store_id()
    )
  );

create policy "payments_select_sale" on public.payments
  for select to authenticated
  using (
    exists (
      select 1 from public.sales s
       where s.id = sale_id
         and s.store_id = public.current_store_id()
    )
  );

create policy "payments_sell_write" on public.payments
  for all to authenticated
  using (
    public.can_sell()
    and exists (
      select 1 from public.sales s
       where s.id = sale_id
         and s.store_id = public.current_store_id()
    )
  )
  with check (
    public.can_sell()
    and exists (
      select 1 from public.sales s
       where s.id = sale_id
         and s.store_id = public.current_store_id()
    )
  );

-- ---------------------------------------------------------------------------
-- Compras
-- ---------------------------------------------------------------------------

create policy "purchases_select_store" on public.purchases
  for select to authenticated
  using (store_id = public.current_store_id());

create policy "purchases_inventory_write" on public.purchases
  for all to authenticated
  using (public.can_manage_inventory() and store_id = public.current_store_id())
  with check (public.can_manage_inventory() and store_id = public.current_store_id());

create policy "purchase_items_select_purchase" on public.purchase_items
  for select to authenticated
  using (
    exists (
      select 1 from public.purchases p
       where p.id = purchase_id
         and p.store_id = public.current_store_id()
    )
  );

create policy "purchase_items_inventory_write" on public.purchase_items
  for all to authenticated
  using (
    public.can_manage_inventory()
    and exists (
      select 1 from public.purchases p
       where p.id = purchase_id
         and p.store_id = public.current_store_id()
    )
  )
  with check (
    public.can_manage_inventory()
    and exists (
      select 1 from public.purchases p
       where p.id = purchase_id
         and p.store_id = public.current_store_id()
    )
  );

-- ---------------------------------------------------------------------------
-- Caja, gastos y devoluciones
-- ---------------------------------------------------------------------------

create policy "cash_sessions_select_store" on public.cash_sessions
  for select to authenticated
  using (store_id = public.current_store_id());

create policy "cash_sessions_sell_insert" on public.cash_sessions
  for insert to authenticated
  with check (public.can_sell() and store_id = public.current_store_id());

create policy "cash_sessions_sell_update" on public.cash_sessions
  for update to authenticated
  using (public.can_sell() and store_id = public.current_store_id())
  with check (public.can_sell() and store_id = public.current_store_id());

create policy "cash_sessions_admin_delete" on public.cash_sessions
  for delete to authenticated
  using (public.is_admin() and store_id = public.current_store_id());

create policy "expenses_select_store" on public.expenses
  for select to authenticated
  using (store_id = public.current_store_id());

create policy "expenses_sell_insert" on public.expenses
  for insert to authenticated
  with check (public.can_sell() and store_id = public.current_store_id());

create policy "expenses_sell_update" on public.expenses
  for update to authenticated
  using (public.can_sell() and store_id = public.current_store_id())
  with check (public.can_sell() and store_id = public.current_store_id());

create policy "expenses_admin_delete" on public.expenses
  for delete to authenticated
  using (public.is_admin() and store_id = public.current_store_id());

create policy "returns_select_store" on public.returns
  for select to authenticated
  using (store_id = public.current_store_id());

create policy "returns_sell_insert" on public.returns
  for insert to authenticated
  with check (public.can_sell() and store_id = public.current_store_id());

create policy "returns_sell_update" on public.returns
  for update to authenticated
  using (public.can_sell() and store_id = public.current_store_id())
  with check (public.can_sell() and store_id = public.current_store_id());

create policy "returns_admin_delete" on public.returns
  for delete to authenticated
  using (public.is_admin() and store_id = public.current_store_id());

create policy "return_items_select_return" on public.return_items
  for select to authenticated
  using (
    exists (
      select 1 from public.returns r
       where r.id = return_id
         and r.store_id = public.current_store_id()
    )
  );

create policy "return_items_sell_write" on public.return_items
  for all to authenticated
  using (
    public.can_sell()
    and exists (
      select 1 from public.returns r
       where r.id = return_id
         and r.store_id = public.current_store_id()
    )
  )
  with check (
    public.can_sell()
    and exists (
      select 1 from public.returns r
       where r.id = return_id
         and r.store_id = public.current_store_id()
    )
  );

-- ---------------------------------------------------------------------------
-- Auditoría y configuración
-- ---------------------------------------------------------------------------

create policy "audit_log_admin_select" on public.audit_log
  for select to authenticated
  using (public.is_admin() and organization_id = public.current_organization_id());

create policy "app_settings_select_store" on public.app_settings
  for select to authenticated
  using (store_id = public.current_store_id());

create policy "app_settings_admin_insert" on public.app_settings
  for insert to authenticated
  with check (public.is_admin() and store_id = public.current_store_id());

create policy "app_settings_admin_update" on public.app_settings
  for update to authenticated
  using (public.is_admin() and store_id = public.current_store_id())
  with check (public.is_admin() and store_id = public.current_store_id());
