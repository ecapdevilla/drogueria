-- Droguería · Fase 3
-- Esquema relacional inicial. Ejecutar en el SQL Editor de Supabase.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------

do $$
begin
  create type public.app_role as enum ('admin', 'cashier', 'inventory');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.movement_type as enum ('SALE', 'PURCHASE', 'RETURN', 'ADJUSTMENT', 'EXPIRED');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.adjustment_reason as enum ('COUNT', 'DAMAGE', 'EXPIRED', 'OTHER');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.payment_method as enum ('CASH', 'TRANSFER', 'CARD', 'OTHER');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.cash_status as enum ('OPEN', 'CLOSED');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.expense_payment_method as enum ('EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'OTRO');
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Utilidades
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Organización, sucursal y usuarios
-- ---------------------------------------------------------------------------

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  address text,
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  store_id uuid references public.stores(id) on delete set null,
  full_name text,
  email text,
  role public.app_role not null default 'cashier',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_organization_idx on public.profiles (organization_id);
create index if not exists profiles_store_idx on public.profiles (store_id);

-- Perfil automático al crear un usuario en Supabase Auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  default_org uuid;
  default_store uuid;
begin
  select id into default_org from public.organizations order by created_at limit 1;
  select id into default_store
    from public.stores
   where organization_id = default_org
   order by created_at
   limit 1;

  insert into public.profiles (id, organization_id, store_id, email, full_name, role)
  values (
    new.id,
    default_org,
    default_store,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    'cashier'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Promueve al primer administrador. Ejecutar manualmente desde el SQL Editor.
create or replace function public.bootstrap_admin(user_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid;
begin
  if exists (select 1 from public.profiles where role = 'admin' and active) then
    raise exception 'Ya existe un administrador activo';
  end if;

  select id into target
    from public.profiles
   where lower(email) = lower(user_email)
   limit 1;

  if target is null then
    raise exception 'No existe un perfil con el correo indicado';
  end if;

  update public.profiles set role = 'admin' where id = target;
end;
$$;

revoke all on function public.bootstrap_admin(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Catálogo e inventario
-- ---------------------------------------------------------------------------

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  tax_id text,
  contact text,
  phone text,
  email text,
  address text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  internal_code text not null,
  barcode text,
  commercial_name text not null,
  category text not null default 'General',
  purchase_price numeric(14, 2) not null default 0,
  sale_price numeric(14, 2) not null default 0,
  stock integer not null default 0,
  min_stock integer not null default 0,
  active boolean not null default true,
  generic_name text,
  active_ingredient text,
  concentration text,
  presentation text,
  pharmaceutical_form text,
  invima_registry text,
  main_supplier_id uuid references public.suppliers(id) on delete set null,
  storage_conditions text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, internal_code)
);

create index if not exists products_store_active_idx on public.products (store_id, active);
create index if not exists products_barcode_idx on public.products (store_id, barcode);
create unique index if not exists products_store_barcode_unique
  on public.products (store_id, barcode)
  where barcode is not null and barcode <> '';

create table if not exists public.lots (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  code text not null,
  quantity integer not null default 0,
  purchase_cost numeric(14, 2) not null default 0,
  expiry_date date not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lots_product_expiry_idx on public.lots (product_id, expiry_date);
create index if not exists lots_store_enabled_idx on public.lots (store_id, enabled);

create table if not exists public.movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  lot_id uuid references public.lots(id) on delete set null,
  store_id uuid not null references public.stores(id) on delete cascade,
  type public.movement_type not null,
  quantity integer not null,
  ref_id text,
  reason public.adjustment_reason,
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists movements_store_created_idx on public.movements (store_id, created_at desc);
create index if not exists movements_product_created_idx on public.movements (product_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Clientes y ventas
-- ---------------------------------------------------------------------------

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  phone text,
  identification text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customers_store_name_idx on public.customers (store_id, name);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  sale_number bigint generated always as identity unique,
  subtotal numeric(14, 2) not null default 0,
  discount numeric(14, 2) not null default 0,
  total numeric(14, 2) not null default 0,
  payment_method public.payment_method not null default 'CASH',
  cash_received numeric(14, 2),
  change_amount numeric(14, 2),
  returned boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sales_store_created_idx on public.sales (store_id, created_at desc);
create index if not exists sales_customer_idx on public.sales (customer_id);

create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  quantity integer not null,
  unit_price numeric(14, 2) not null,
  unit_cost numeric(14, 2) not null,
  discount numeric(14, 2) not null default 0,
  lot_id uuid references public.lots(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists sale_items_sale_idx on public.sale_items (sale_id);
create index if not exists sale_items_product_idx on public.sale_items (product_id);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  method public.payment_method not null,
  amount numeric(14, 2) not null,
  created_at timestamptz not null default now()
);

create index if not exists payments_sale_idx on public.payments (sale_id);

-- ---------------------------------------------------------------------------
-- Compras
-- ---------------------------------------------------------------------------

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  supplier_id uuid references public.suppliers(id) on delete set null,
  invoice_ref text,
  total numeric(14, 2) not null default 0,
  date date not null default current_date,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists purchases_store_date_idx on public.purchases (store_id, date desc);

create table if not exists public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  quantity integer not null,
  unit_cost numeric(14, 2) not null,
  lot_code text,
  expiry_date date,
  created_at timestamptz not null default now()
);

create index if not exists purchase_items_purchase_idx on public.purchase_items (purchase_id);

-- ---------------------------------------------------------------------------
-- Caja y gastos
-- ---------------------------------------------------------------------------

create table if not exists public.cash_sessions (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  opened_by uuid references public.profiles(id) on delete set null,
  closed_by uuid references public.profiles(id) on delete set null,
  initial_amount numeric(14, 2) not null default 0,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  counted_amount numeric(14, 2),
  expected_amount numeric(14, 2),
  difference_amount numeric(14, 2),
  status public.cash_status not null default 'OPEN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cash_sessions_store_status_idx on public.cash_sessions (store_id, status);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  category text not null,
  description text not null,
  amount numeric(14, 2) not null,
  payment_method public.expense_payment_method not null default 'EFECTIVO',
  notes text,
  date date not null default current_date,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists expenses_store_date_idx on public.expenses (store_id, date desc);

-- ---------------------------------------------------------------------------
-- Devoluciones
-- ---------------------------------------------------------------------------

create table if not exists public.returns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  sale_id uuid not null references public.sales(id) on delete cascade,
  reason text not null,
  restock boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists returns_sale_idx on public.returns (sale_id);

create table if not exists public.return_items (
  id uuid primary key default gen_random_uuid(),
  return_id uuid not null references public.returns(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  quantity integer not null
);

create index if not exists return_items_return_idx on public.return_items (return_id);

-- ---------------------------------------------------------------------------
-- Auditoría y configuración
-- ---------------------------------------------------------------------------

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  organization_id uuid references public.organizations(id) on delete set null,
  store_id uuid references public.stores(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_store_created_idx on public.audit_log (store_id, created_at desc);

create table if not exists public.app_settings (
  store_id uuid primary key references public.stores(id) on delete cascade,
  backup_reminder_days integer not null default 7,
  last_backup_at timestamptz,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at automático
-- ---------------------------------------------------------------------------

drop trigger if exists organizations_set_updated_at on public.organizations;
create trigger organizations_set_updated_at
before update on public.organizations
for each row execute function public.set_updated_at();

drop trigger if exists stores_set_updated_at on public.stores;
create trigger stores_set_updated_at
before update on public.stores
for each row execute function public.set_updated_at();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists suppliers_set_updated_at on public.suppliers;
create trigger suppliers_set_updated_at
before update on public.suppliers
for each row execute function public.set_updated_at();

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists lots_set_updated_at on public.lots;
create trigger lots_set_updated_at
before update on public.lots
for each row execute function public.set_updated_at();

drop trigger if exists customers_set_updated_at on public.customers;
create trigger customers_set_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

drop trigger if exists sales_set_updated_at on public.sales;
create trigger sales_set_updated_at
before update on public.sales
for each row execute function public.set_updated_at();

drop trigger if exists cash_sessions_set_updated_at on public.cash_sessions;
create trigger cash_sessions_set_updated_at
before update on public.cash_sessions
for each row execute function public.set_updated_at();

drop trigger if exists app_settings_set_updated_at on public.app_settings;
create trigger app_settings_set_updated_at
before update on public.app_settings
for each row execute function public.set_updated_at();
