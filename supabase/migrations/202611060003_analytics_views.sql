-- Droguería · Fase 3 · Sprint 7
-- Vistas de analítica. Usan security_invoker para respetar RLS.

create or replace view public.v_sales_daily
with (security_invoker = true)
as
with line_costs as (
  select
    si.sale_id,
    sum(si.unit_cost * si.quantity) as total_cost,
    sum(coalesce(si.discount, 0)) as line_discounts
  from public.sale_items si
  group by si.sale_id
)
select
  s.store_id,
  (s.created_at at time zone 'America/Bogota')::date as day,
  count(*)::int as sales_count,
  coalesce(sum(s.subtotal), 0) as subtotal,
  coalesce(sum(s.discount), 0) + coalesce(sum(lc.line_discounts), 0) as total_discounts,
  coalesce(sum(s.total), 0) as total_sales,
  coalesce(sum(lc.total_cost), 0) as total_cost,
  coalesce(sum(s.total), 0) - coalesce(sum(lc.total_cost), 0) as gross_profit,
  case
    when count(*) > 0 then round(sum(s.total) / count(*), 2)
    else 0
  end as average_ticket
from public.sales s
left join line_costs lc on lc.sale_id = s.id
group by s.store_id, (s.created_at at time zone 'America/Bogota')::date
order by day desc;

create or replace view public.v_product_performance
with (security_invoker = true)
as
with lines as (
  select
    s.store_id,
    si.sale_id,
    si.product_id,
    si.product_name,
    p.category,
    si.quantity,
    greatest(si.unit_price * si.quantity - coalesce(si.discount, 0), 0) as line_revenue,
    si.unit_cost * si.quantity as line_cost
  from public.sale_items si
  join public.sales s on s.id = si.sale_id
  left join public.products p on p.id = si.product_id
),
totals as (
  select sale_id, sum(line_revenue) as total_line_revenue
  from lines
  group by sale_id
),
allocated as (
  select
    l.*,
    case
      when t.total_line_revenue > 0
        then (s.discount * l.line_revenue / t.total_line_revenue)
      else 0
    end as global_discount_share
  from lines l
  join totals t on t.sale_id = l.sale_id
  join public.sales s on s.id = l.sale_id
)
select
  store_id,
  product_id,
  product_name,
  coalesce(category, 'Sin categoría') as category,
  sum(quantity)::int as quantity,
  round(sum(line_revenue - global_discount_share), 2) as revenue,
  round(sum(line_cost), 2) as cost,
  round(sum(line_revenue - global_discount_share - line_cost), 2) as profit
from allocated
group by store_id, product_id, product_name, category
order by profit desc;

create or replace view public.v_category_performance
with (security_invoker = true)
as
select
  store_id,
  category,
  sum(quantity)::int as quantity,
  round(sum(revenue), 2) as revenue,
  round(sum(cost), 2) as cost,
  round(sum(profit), 2) as profit
from public.v_product_performance
group by store_id, category
order by profit desc;

create or replace view public.v_payment_mix
with (security_invoker = true)
as
select
  s.store_id,
  p.method,
  count(distinct s.id)::int as sales_count,
  round(sum(p.amount), 2) as total
from public.payments p
join public.sales s on s.id = p.sale_id
group by s.store_id, p.method
order by total desc;

create or replace view public.v_customer_summary
with (security_invoker = true)
as
select
  c.store_id,
  c.id as customer_id,
  c.name,
  c.phone,
  count(s.id)::int as sales_count,
  coalesce(round(sum(s.total), 2), 0) as total_spent,
  max(s.created_at) as last_purchase_at
from public.customers c
left join public.sales s on s.customer_id = c.id
group by c.store_id, c.id, c.name, c.phone
order by total_spent desc;

create or replace view public.v_inventory_risk
with (security_invoker = true)
as
select
  p.store_id,
  p.id as product_id,
  p.commercial_name,
  p.category,
  p.stock,
  p.min_stock,
  coalesce(sum(
    case
      when l.enabled and l.quantity > 0
        and l.expiry_date <= current_date + 30
        and l.expiry_date > current_date
      then l.quantity else 0
    end
  ), 0)::int as expiring_30d,
  coalesce(sum(
    case
      when l.enabled and l.quantity > 0 and l.expiry_date <= current_date
      then l.quantity else 0
    end
  ), 0)::int as expired_units,
  min(case when l.enabled and l.quantity > 0 then l.expiry_date end) as next_expiry
from public.products p
left join public.lots l on l.product_id = p.id
where p.active
group by p.store_id, p.id, p.commercial_name, p.category, p.stock, p.min_stock
order by expired_units desc, expiring_30d desc, p.stock asc;

create or replace view public.v_cash_summary
with (security_invoker = true)
as
with sales_cash as (
  select
    cs.id as session_id,
    coalesce(sum(p.amount), 0) as cash_sales
  from public.cash_sessions cs
  left join public.sales s
    on s.store_id = cs.store_id
   and s.created_at >= cs.opened_at
   and (cs.closed_at is null or s.created_at <= cs.closed_at)
  left join public.payments p
    on p.sale_id = s.id
   and p.method = 'CASH'
  group by cs.id
),
expenses_cash as (
  select
    cs.id as session_id,
    coalesce(sum(e.amount), 0) as cash_expenses
  from public.cash_sessions cs
  left join public.expenses e
    on e.store_id = cs.store_id
   and e.payment_method = 'EFECTIVO'
   and e.date >= (cs.opened_at at time zone 'America/Bogota')::date
   and (cs.closed_at is null or e.date <= (cs.closed_at at time zone 'America/Bogota')::date)
  group by cs.id
)
select
  cs.store_id,
  cs.id as session_id,
  cs.status,
  cs.opened_at,
  cs.closed_at,
  cs.initial_amount,
  cs.counted_amount,
  cs.expected_amount,
  cs.difference_amount,
  sc.cash_sales,
  ec.cash_expenses
from public.cash_sessions cs
left join sales_cash sc on sc.session_id = cs.id
left join expenses_cash ec on ec.session_id = cs.id
order by cs.opened_at desc;
