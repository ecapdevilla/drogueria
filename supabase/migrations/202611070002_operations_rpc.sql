-- Droguería · Fase 3 · Sprint 8 (bloque 2)
-- Compras, ajustes de inventario, devoluciones y caja transaccionales.
-- Ejecutar en el SQL Editor después de 202611070001_create_sale_rpc.sql.

-- ---------------------------------------------------------------------------
-- Idempotencia de compras y devoluciones
-- ---------------------------------------------------------------------------

alter table public.purchases
  add column if not exists idempotency_key text;

alter table public.returns
  add column if not exists idempotency_key text;

create unique index if not exists purchases_store_idempotency_unique
  on public.purchases (store_id, idempotency_key)
  where idempotency_key is not null;

create unique index if not exists returns_store_idempotency_unique
  on public.returns (store_id, idempotency_key)
  where idempotency_key is not null;

-- ---------------------------------------------------------------------------
-- Contexto de sesión y permisos
-- ---------------------------------------------------------------------------

create or replace function public.require_staff(
  p_store_id uuid,
  p_roles public.app_role[]
)
returns table(org_id uuid, store_uuid uuid, user_role public.app_role)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_store uuid;
  v_role public.app_role;
begin
  select p.organization_id, p.store_id, p.role
    into v_org, v_store, v_role
    from public.profiles p
   where p.id = auth.uid()
     and p.active;

  if v_org is null then
    raise exception 'Perfil no configurado';
  end if;
  if v_store is distinct from p_store_id then
    raise exception 'Sucursal no válida';
  end if;
  if not (v_role = any (p_roles)) then
    raise exception 'No tienes permiso para esta operación';
  end if;

  return query select v_org, v_store, v_role;
end;
$$;

revoke all on function public.require_staff(uuid, public.app_role[]) from public, anon;
grant execute on function public.require_staff(uuid, public.app_role[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Compras
-- ---------------------------------------------------------------------------

create or replace function public.create_purchase(
  p_store_id uuid,
  p_supplier_id uuid,
  p_invoice_ref text,
  p_date date,
  p_items jsonb,
  p_idempotency_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ctx record;
  v_existing uuid;
  v_purchase_id uuid := gen_random_uuid();
  v_supplier public.suppliers%rowtype;
  v_item record;
  v_product public.products%rowtype;
  v_lot_id uuid;
  v_lot_code text;
  v_expiry date;
  v_total numeric := 0;
  v_created timestamptz := now();
begin
  select * into v_ctx
    from public.require_staff(p_store_id, array['admin', 'inventory']::public.app_role[]);

  if p_idempotency_key is not null and length(p_idempotency_key) > 0 then
    select id into v_existing
      from public.purchases
     where store_id = p_store_id
       and idempotency_key = p_idempotency_key
     limit 1;

    if v_existing is not null then
      return v_existing;
    end if;
  end if;

  select * into v_supplier
    from public.suppliers
   where id = p_supplier_id
     and organization_id = v_ctx.org_id;

  if not found then
    raise exception 'Proveedor no encontrado';
  end if;
  if not v_supplier.active then
    raise exception 'El proveedor está inactivo';
  end if;

  if p_items is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'Agrega al menos un producto';
  end if;

  insert into public.purchases (
    id,
    organization_id,
    store_id,
    supplier_id,
    invoice_ref,
    total,
    date,
    created_by,
    idempotency_key,
    created_at
  ) values (
    v_purchase_id,
    v_ctx.org_id,
    p_store_id,
    p_supplier_id,
    nullif(trim(p_invoice_ref), ''),
    0,
    coalesce(p_date, current_date),
    auth.uid(),
    nullif(p_idempotency_key, ''),
    v_created
  );

  for v_item in
    select *
      from jsonb_to_recordset(p_items)
        as x(product_id uuid, quantity integer, unit_cost numeric, lot_code text, expiry_date date)
  loop
    if v_item.quantity is null or v_item.quantity <= 0 then
      raise exception 'Cantidad inválida';
    end if;
    if v_item.unit_cost is null or v_item.unit_cost < 0 then
      raise exception 'Costo inválido';
    end if;

    select * into v_product
      from public.products
     where id = v_item.product_id
       and store_id = p_store_id
     for update;

    if not found then
      raise exception 'Producto no encontrado';
    end if;

    v_lot_id := gen_random_uuid();
    v_lot_code := coalesce(
      nullif(trim(v_item.lot_code), ''),
      'L-' || v_product.internal_code || '-' || to_char(clock_timestamp(), 'YYMMDDHH24MISSMS')
    );
    v_expiry := coalesce(v_item.expiry_date, current_date + 365);

    insert into public.lots (
      id,
      product_id,
      store_id,
      code,
      quantity,
      purchase_cost,
      expiry_date,
      enabled,
      created_at
    ) values (
      v_lot_id,
      v_product.id,
      p_store_id,
      v_lot_code,
      v_item.quantity,
      round(v_item.unit_cost, 2),
      v_expiry,
      true,
      v_created
    );

    update public.products
       set stock = stock + v_item.quantity,
           purchase_price = round(v_item.unit_cost, 2),
           main_supplier_id = p_supplier_id
     where id = v_product.id;

    insert into public.purchase_items (
      purchase_id,
      product_id,
      quantity,
      unit_cost,
      lot_code,
      expiry_date
    ) values (
      v_purchase_id,
      v_product.id,
      v_item.quantity,
      round(v_item.unit_cost, 2),
      v_lot_code,
      v_expiry
    );

    insert into public.movements (
      product_id,
      lot_id,
      store_id,
      type,
      quantity,
      ref_id,
      created_by,
      created_at
    ) values (
      v_product.id,
      v_lot_id,
      p_store_id,
      'PURCHASE',
      v_item.quantity,
      v_purchase_id::text,
      auth.uid(),
      v_created
    );

    v_total := v_total + (v_item.quantity * round(v_item.unit_cost, 2));
  end loop;

  update public.purchases
     set total = round(v_total, 2)
   where id = v_purchase_id;

  return v_purchase_id;
end;
$$;

revoke all on function public.create_purchase(uuid, uuid, text, date, jsonb, text)
  from public, anon;
grant execute on function public.create_purchase(uuid, uuid, text, date, jsonb, text)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Ajuste de lote
-- ---------------------------------------------------------------------------

create or replace function public.adjust_lot(
  p_lot_id uuid,
  p_new_quantity integer,
  p_reason public.adjustment_reason,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lot public.lots%rowtype;
  v_product public.products%rowtype;
  v_profile record;
  v_delta integer;
  v_type public.movement_type;
begin
  select * into v_lot
    from public.lots
   where id = p_lot_id
   for update;

  if not found then
    raise exception 'Lote no encontrado';
  end if;

  select * into v_profile
    from public.profiles
   where id = auth.uid()
     and active;

  if not found then
    raise exception 'Perfil no configurado';
  end if;
  if v_profile.store_id is distinct from v_lot.store_id then
    raise exception 'Sucursal no válida';
  end if;
  if v_profile.role not in ('admin', 'inventory') then
    raise exception 'No tienes permiso para ajustar inventario';
  end if;

  if p_new_quantity is null or p_new_quantity < 0 then
    raise exception 'La cantidad no puede ser negativa';
  end if;
  if p_reason is null then
    raise exception 'Selecciona un motivo';
  end if;
  if p_reason = 'OTHER' and coalesce(trim(p_note), '') = '' then
    raise exception 'Describe el motivo del ajuste';
  end if;

  select * into v_product
    from public.products
   where id = v_lot.product_id
   for update;

  if not found then
    raise exception 'Producto no encontrado';
  end if;

  v_delta := p_new_quantity - v_lot.quantity;
  if v_delta = 0 then
    raise exception 'La cantidad del lote no cambió';
  end if;
  if v_product.stock + v_delta < 0 then
    raise exception 'El ajuste dejaría el inventario en negativo';
  end if;

  v_type := case
    when p_reason = 'EXPIRED' then 'EXPIRED'::public.movement_type
    else 'ADJUSTMENT'::public.movement_type
  end;

  update public.lots
     set quantity = p_new_quantity,
         enabled = case
           when v_type = 'EXPIRED' and p_new_quantity = 0 then false
           else enabled
         end
   where id = p_lot_id;

  update public.products
     set stock = stock + v_delta
   where id = v_product.id;

  insert into public.movements (
    product_id,
    lot_id,
    store_id,
    type,
    quantity,
    reason,
    note,
    created_by
  ) values (
    v_product.id,
    p_lot_id,
    v_lot.store_id,
    v_type,
    v_delta,
    p_reason,
    nullif(trim(p_note), ''),
    auth.uid()
  );
end;
$$;

revoke all on function public.adjust_lot(uuid, integer, public.adjustment_reason, text)
  from public, anon;
grant execute on function public.adjust_lot(uuid, integer, public.adjustment_reason, text)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Devoluciones
-- ---------------------------------------------------------------------------

create or replace function public.process_return(
  p_sale_id uuid,
  p_items jsonb,
  p_reason text,
  p_restock boolean,
  p_idempotency_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale public.sales%rowtype;
  v_ctx record;
  v_existing uuid;
  v_return_id uuid := gen_random_uuid();
  v_item record;
  v_sale_item record;
  v_lot public.lots%rowtype;
  v_lot_id uuid;
  v_created timestamptz := now();
begin
  select * into v_sale
    from public.sales
   where id = p_sale_id
   for update;

  if not found then
    raise exception 'Venta no encontrada';
  end if;

  select * into v_ctx
    from public.require_staff(v_sale.store_id, array['admin', 'cashier']::public.app_role[]);

  if v_sale.returned then
    raise exception 'Esta venta ya fue devuelta';
  end if;

  if p_idempotency_key is not null and length(p_idempotency_key) > 0 then
    select id into v_existing
      from public.returns
     where store_id = v_sale.store_id
       and idempotency_key = p_idempotency_key
     limit 1;

    if v_existing is not null then
      return v_existing;
    end if;
  end if;

  if p_reason is null or trim(p_reason) = '' then
    raise exception 'Describe la razón de la devolución';
  end if;
  if p_items is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'Selecciona al menos un producto';
  end if;

  insert into public.returns (
    id,
    organization_id,
    store_id,
    sale_id,
    reason,
    restock,
    created_by,
    idempotency_key,
    created_at
  ) values (
    v_return_id,
    v_ctx.org_id,
    v_sale.store_id,
    p_sale_id,
    trim(p_reason),
    coalesce(p_restock, true),
    auth.uid(),
    nullif(p_idempotency_key, ''),
    v_created
  );

  for v_item in
    select *
      from jsonb_to_recordset(p_items)
        as x(product_id uuid, quantity integer)
  loop
    if v_item.quantity is null or v_item.quantity <= 0 then
      raise exception 'Cantidad inválida';
    end if;

    select * into v_sale_item
      from public.sale_items
     where sale_id = p_sale_id
       and product_id = v_item.product_id
     order by created_at, id
     limit 1;

    if not found then
      raise exception 'El producto no pertenece a la venta';
    end if;
    if v_item.quantity > v_sale_item.quantity then
      raise exception 'La cantidad devuelta supera la vendida';
    end if;

    insert into public.return_items (return_id, product_id, quantity)
    values (v_return_id, v_item.product_id, v_item.quantity);

    if coalesce(p_restock, true) then
      v_lot_id := v_sale_item.lot_id;

      if v_lot_id is not null then
        select * into v_lot
          from public.lots
         where id = v_lot_id
         for update;

        if not found then
          v_lot_id := null;
        end if;
      end if;

      if v_lot_id is null then
        v_lot_id := gen_random_uuid();

        insert into public.lots (
          id,
          product_id,
          store_id,
          code,
          quantity,
          purchase_cost,
          expiry_date,
          enabled,
          created_at
        ) values (
          v_lot_id,
          v_item.product_id,
          v_sale.store_id,
          'RET-' || left(v_item.product_id::text, 8) || '-' ||
            to_char(clock_timestamp(), 'YYMMDDHH24MISSMS'),
          v_item.quantity,
          round(v_sale_item.unit_cost, 2),
          current_date + 365,
          true,
          v_created
        );
      else
        update public.lots
           set quantity = quantity + v_item.quantity
         where id = v_lot_id;
      end if;

      update public.products
         set stock = stock + v_item.quantity
       where id = v_item.product_id;

      insert into public.movements (
        product_id,
        lot_id,
        store_id,
        type,
        quantity,
        ref_id,
        created_by,
        created_at
      ) values (
        v_item.product_id,
        v_lot_id,
        v_sale.store_id,
        'RETURN',
        v_item.quantity,
        p_sale_id::text,
        auth.uid(),
        v_created
      );
    end if;
  end loop;

  update public.sales
     set returned = true
   where id = p_sale_id;

  return v_return_id;
end;
$$;

revoke all on function public.process_return(uuid, jsonb, text, boolean, text)
  from public, anon;
grant execute on function public.process_return(uuid, jsonb, text, boolean, text)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Caja
-- ---------------------------------------------------------------------------

create or replace function public.open_cash(
  p_store_id uuid,
  p_initial_amount numeric
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ctx record;
  v_id uuid;
begin
  select * into v_ctx
    from public.require_staff(p_store_id, array['admin', 'cashier']::public.app_role[]);

  if p_initial_amount is null or p_initial_amount < 0 then
    raise exception 'El monto no puede ser negativo';
  end if;

  if exists (
    select 1
      from public.cash_sessions
     where store_id = p_store_id
       and status = 'OPEN'
  ) then
    raise exception 'Ya existe una caja abierta';
  end if;

  insert into public.cash_sessions (store_id, opened_by, initial_amount, status)
  values (p_store_id, auth.uid(), round(p_initial_amount, 2), 'OPEN')
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.open_cash(uuid, numeric) from public, anon;
grant execute on function public.open_cash(uuid, numeric) to authenticated;

create or replace function public.close_cash(
  p_session_id uuid,
  p_counted_amount numeric
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.cash_sessions%rowtype;
  v_ctx record;
  v_cash_sales numeric := 0;
  v_cash_expenses numeric := 0;
  v_expected numeric;
  v_difference numeric;
begin
  select * into v_session
    from public.cash_sessions
   where id = p_session_id
   for update;

  if not found then
    raise exception 'Sesión inválida';
  end if;

  select * into v_ctx
    from public.require_staff(v_session.store_id, array['admin', 'cashier']::public.app_role[]);

  if v_session.status <> 'OPEN' then
    raise exception 'Sesión inválida';
  end if;
  if p_counted_amount is null or p_counted_amount < 0 then
    raise exception 'El monto no puede ser negativo';
  end if;

  select coalesce(sum(p.amount), 0)
    into v_cash_sales
    from public.sales s
    join public.payments p on p.sale_id = s.id
   where s.store_id = v_session.store_id
     and p.method = 'CASH'
     and s.created_at >= v_session.opened_at;

  select coalesce(sum(e.amount), 0)
    into v_cash_expenses
    from public.expenses e
   where e.store_id = v_session.store_id
     and e.payment_method = 'EFECTIVO'
     and e.date >= v_session.opened_at::date;

  v_expected := round(v_session.initial_amount + v_cash_sales - v_cash_expenses, 2);
  v_difference := round(p_counted_amount, 2) - v_expected;

  update public.cash_sessions
     set status = 'CLOSED',
         closed_at = now(),
         counted_amount = round(p_counted_amount, 2),
         expected_amount = v_expected,
         difference_amount = v_difference
   where id = p_session_id;

  return v_difference;
end;
$$;

revoke all on function public.close_cash(uuid, numeric) from public, anon;
grant execute on function public.close_cash(uuid, numeric) to authenticated;
