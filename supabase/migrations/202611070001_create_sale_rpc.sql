-- Droguería · Fase 3 · Sprint 8
-- Venta transaccional en Supabase. Ejecutar en el SQL Editor.

alter table public.sales
  add column if not exists idempotency_key text;

alter table public.sale_items
  add column if not exists line_no integer;

create unique index if not exists sales_store_idempotency_unique
  on public.sales (store_id, idempotency_key)
  where idempotency_key is not null;

-- Serializa una venta completa para el frontend.
create or replace function public.sale_to_json(p_sale_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', s.id,
    'saleNumber', s.sale_number,
    'items', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'productId', si.product_id,
            'productName', si.product_name,
            'quantity', si.quantity,
            'unitPrice', si.unit_price,
            'unitCost', si.unit_cost,
            'lotId', si.lot_id,
            'discount', nullif(si.discount, 0)
          )
          order by si.line_no nulls last, si.created_at, si.id
        )
        from public.sale_items si
        where si.sale_id = s.id
      ),
      '[]'::jsonb
    ),
    'subtotal', s.subtotal,
    'discount', s.discount,
    'total', s.total,
    'paymentMethod', s.payment_method,
    'payments', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object('method', p.method, 'amount', p.amount)
          order by p.created_at, p.id
        )
        from public.payments p
        where p.sale_id = s.id
      ),
      '[]'::jsonb
    ),
    'cashReceived', s.cash_received,
    'change', s.change_amount,
    'customerId', s.customer_id,
    'createdAt', s.created_at,
    'returned', s.returned
  )
  from public.sales s
  where s.id = p_sale_id;
$$;

revoke all on function public.sale_to_json(uuid) from public, anon, authenticated;

create or replace function public.create_sale(
  p_store_id uuid,
  p_items jsonb,
  p_payments jsonb,
  p_discount numeric default 0,
  p_customer_id uuid default null,
  p_cash_received numeric default null,
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_org uuid;
  v_store uuid;
  v_role public.app_role;
  v_existing uuid;
  v_item record;
  v_product public.products%rowtype;
  v_lot_id uuid;
  v_lot_ids uuid[];
  v_lot_qty integer;
  v_lot_cost numeric;
  v_remaining integer;
  v_take integer;
  v_first_lot uuid;
  v_cost_total numeric;
  v_unit_cost numeric;
  v_line_subtotal numeric;
  v_line_discount numeric;
  v_subtotal numeric := 0;
  v_line_discounts numeric := 0;
  v_global_discount numeric := 0;
  v_total numeric := 0;
  v_payment record;
  v_paid numeric := 0;
  v_cash numeric := 0;
  v_cash_received numeric;
  v_change numeric;
  v_main_method public.payment_method;
  v_items jsonb := '[]'::jsonb;
  v_movements jsonb := '[]'::jsonb;
  v_sale_id uuid;
begin
  if v_uid is null then
    raise exception 'Sesión no válida';
  end if;

  select organization_id, store_id, role
    into v_org, v_store, v_role
    from public.profiles
   where id = v_uid
     and active;

  if v_org is null then
    raise exception 'Perfil no configurado';
  end if;
  if v_store is distinct from p_store_id then
    raise exception 'Sucursal no válida';
  end if;
  if v_role <> 'admin' and v_role <> 'cashier' then
    raise exception 'No tienes permiso para vender';
  end if;

  if p_idempotency_key is not null and length(p_idempotency_key) > 0 then
    select id into v_existing
      from public.sales
     where store_id = p_store_id
       and idempotency_key = p_idempotency_key
     limit 1;

    if v_existing is not null then
      return public.sale_to_json(v_existing);
    end if;
  end if;

  if p_items is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'Agrega al menos un producto';
  end if;

  if p_payments is null
     or jsonb_typeof(p_payments) <> 'array'
     or jsonb_array_length(p_payments) = 0 then
    raise exception 'Agrega al menos un pago';
  end if;

  if p_customer_id is not null then
    if not exists (
      select 1 from public.customers
       where id = p_customer_id
         and store_id = p_store_id
    ) then
      raise exception 'Cliente no encontrado';
    end if;
  end if;

  for v_item in
    select *
      from jsonb_to_recordset(p_items)
        as x(product_id uuid, quantity integer, discount numeric)
  loop
    if v_item.quantity is null or v_item.quantity <= 0 then
      raise exception 'Cantidad inválida';
    end if;

    select *
      into v_product
      from public.products
     where id = v_item.product_id
       and store_id = p_store_id
       and active
     for update;

    if not found then
      raise exception 'Producto no encontrado';
    end if;
    if v_product.stock < v_item.quantity then
      raise exception 'Stock insuficiente de %', v_product.commercial_name;
    end if;

    v_remaining := v_item.quantity;
    v_first_lot := null;
    v_cost_total := 0;

    select array_agg(id)
      into v_lot_ids
      from (
        select id
          from public.lots
         where product_id = v_product.id
           and store_id = p_store_id
           and enabled
           and quantity > 0
           and expiry_date > current_date
         order by expiry_date asc, created_at asc
         for update
      ) locked_lots;

    foreach v_lot_id in array coalesce(v_lot_ids, '{}'::uuid[]) loop
      exit when v_remaining <= 0;

      select quantity, purchase_cost
        into v_lot_qty, v_lot_cost
        from public.lots
       where id = v_lot_id
       for update;

      if not found then
        continue;
      end if;

      v_take := least(v_lot_qty, v_remaining);
      if v_take <= 0 then
        continue;
      end if;

      update public.lots
         set quantity = quantity - v_take
       where id = v_lot_id;

      if v_first_lot is null then
        v_first_lot := v_lot_id;
      end if;

      v_remaining := v_remaining - v_take;
      v_cost_total := v_cost_total + (v_take * v_lot_cost);

      v_movements := v_movements || jsonb_build_array(
        jsonb_build_object(
          'product_id', v_product.id,
          'lot_id', v_lot_id,
          'quantity', -v_take
        )
      );
    end loop;

    if v_remaining > 0 then
      raise exception 'Stock vigente insuficiente de %', v_product.commercial_name;
    end if;

    v_unit_cost := round(v_cost_total / v_item.quantity, 2);
    v_line_subtotal := round(v_product.sale_price * v_item.quantity, 2);
    v_line_discount := round(coalesce(v_item.discount, 0), 2);

    if v_line_discount < 0 then
      raise exception 'El descuento de la línea no puede ser negativo';
    end if;
    if v_line_discount > v_line_subtotal then
      raise exception 'El descuento de la línea supera el valor';
    end if;

    v_subtotal := v_subtotal + v_line_subtotal;
    v_line_discounts := v_line_discounts + v_line_discount;

    v_items := v_items || jsonb_build_array(
      jsonb_build_object(
        'product_id', v_product.id,
        'product_name', v_product.commercial_name,
        'quantity', v_item.quantity,
        'unit_price', v_product.sale_price,
        'unit_cost', v_unit_cost,
        'discount', v_line_discount,
        'lot_id', v_first_lot
      )
    );

    update public.products
       set stock = stock - v_item.quantity
     where id = v_product.id;
  end loop;

  v_global_discount := round(coalesce(p_discount, 0), 2);
  if v_global_discount < 0 then
    raise exception 'El descuento no puede ser negativo';
  end if;
  v_global_discount := least(v_global_discount, greatest(v_subtotal - v_line_discounts, 0));
  v_total := greatest(v_subtotal - v_line_discounts - v_global_discount, 0);

  for v_payment in
    select *
      from jsonb_to_recordset(p_payments) as x(method text, amount numeric)
  loop
    if v_payment.method not in ('CASH', 'TRANSFER', 'CARD', 'OTHER') then
      raise exception 'Método de pago inválido';
    end if;
    if v_payment.amount is null or v_payment.amount < 0 then
      raise exception 'Monto de pago inválido';
    end if;

    if round(v_payment.amount, 2) > 0 then
      v_paid := v_paid + round(v_payment.amount, 2);
      if v_payment.method = 'CASH' then
        v_cash := v_cash + round(v_payment.amount, 2);
      end if;
    end if;
  end loop;

  if v_paid <> v_total then
    raise exception 'Los pagos deben sumar exactamente el total de la venta';
  end if;

  if v_cash > 0 then
    v_cash_received := round(coalesce(p_cash_received, v_cash), 2);
    if v_cash_received < v_cash then
      raise exception 'El efectivo recibido no cubre la parte en efectivo';
    end if;
    v_change := v_cash_received - v_cash;
  elsif p_cash_received is not null and p_cash_received > 0 then
    raise exception 'No hay un pago en efectivo para calcular vueltas';
  end if;

  select x.method::public.payment_method
    into v_main_method
    from jsonb_to_recordset(p_payments) as x(method text, amount numeric)
   where round(x.amount, 2) > 0
   order by round(x.amount, 2) desc, x.method asc
   limit 1;

  if v_main_method is null then
    v_main_method := 'CASH';
  end if;

  insert into public.sales (
    organization_id,
    store_id,
    customer_id,
    subtotal,
    discount,
    total,
    payment_method,
    cash_received,
    change_amount,
    returned,
    created_by,
    idempotency_key
  ) values (
    v_org,
    p_store_id,
    p_customer_id,
    v_subtotal,
    v_global_discount,
    v_total,
    v_main_method,
    v_cash_received,
    v_change,
    false,
    v_uid,
    nullif(p_idempotency_key, '')
  )
  returning id into v_sale_id;

  insert into public.sale_items (
    sale_id,
    product_id,
    product_name,
    quantity,
    unit_price,
    unit_cost,
    discount,
    lot_id,
    line_no
  )
  select
    v_sale_id,
    (x.value ->> 'product_id')::uuid,
    x.value ->> 'product_name',
    (x.value ->> 'quantity')::integer,
    (x.value ->> 'unit_price')::numeric,
    (x.value ->> 'unit_cost')::numeric,
    coalesce((x.value ->> 'discount')::numeric, 0),
    nullif(x.value ->> 'lot_id', '')::uuid,
    x.ordinality::integer
  from jsonb_array_elements(v_items) with ordinality as x(value, ordinality);

  insert into public.payments (sale_id, method, amount)
  select
    v_sale_id,
    x.method::public.payment_method,
    round(x.amount, 2)
  from jsonb_to_recordset(p_payments) as x(method text, amount numeric)
  where round(x.amount, 2) > 0;

  insert into public.movements (
    product_id,
    lot_id,
    store_id,
    type,
    quantity,
    ref_id,
    created_by
  )
  select
    (x.value ->> 'product_id')::uuid,
    nullif(x.value ->> 'lot_id', '')::uuid,
    p_store_id,
    'SALE',
    (x.value ->> 'quantity')::integer,
    v_sale_id::text,
    v_uid
  from jsonb_array_elements(v_movements) as x(value);

  return public.sale_to_json(v_sale_id);
end;
$$;

revoke all on function public.create_sale(uuid, jsonb, jsonb, numeric, uuid, numeric, text)
  from public, anon;
grant execute on function public.create_sale(uuid, jsonb, jsonb, numeric, uuid, numeric, text)
  to authenticated;
