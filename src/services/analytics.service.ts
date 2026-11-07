import { supabase } from '../lib/supabase';
import { toCSV } from '../utils/csv';
import { paymentLabel } from '../utils/payments';

export interface SalesDailyRow {
  store_id: string;
  day: string;
  sales_count: number;
  subtotal: number;
  total_discounts: number;
  total_sales: number;
  total_cost: number;
  gross_profit: number;
  average_ticket: number;
}

export interface ProductPerformanceRow {
  store_id: string;
  product_id: string | null;
  product_name: string;
  category: string;
  quantity: number;
  revenue: number;
  cost: number;
  profit: number;
}

export interface CategoryPerformanceRow {
  store_id: string;
  category: string;
  quantity: number;
  revenue: number;
  cost: number;
  profit: number;
}

export interface PaymentMixRow {
  store_id: string;
  method: 'CASH' | 'TRANSFER' | 'CARD' | 'OTHER';
  sales_count: number;
  total: number;
}

export interface CustomerSummaryRow {
  store_id: string;
  customer_id: string;
  name: string;
  phone: string | null;
  sales_count: number;
  total_spent: number;
  last_purchase_at: string | null;
}

export interface InventoryRiskRow {
  store_id: string;
  product_id: string;
  commercial_name: string;
  category: string;
  stock: number;
  min_stock: number;
  expiring_30d: number;
  expired_units: number;
  next_expiry: string | null;
}

export interface AnalyticsData {
  salesDaily: SalesDailyRow[];
  productPerformance: ProductPerformanceRow[];
  categoryPerformance: CategoryPerformanceRow[];
  paymentMix: PaymentMixRow[];
  customerSummary: CustomerSummaryRow[];
  inventoryRisk: InventoryRiskRow[];
}

export interface AnalyticsFilters {
  storeId: string;
  from?: string;
  to?: string;
}

export function salesDailyToCSV(rows: SalesDailyRow[]): string {
  return toCSV(
    rows.map(row => ({
      dia: row.day,
      ventas: row.sales_count,
      ventas_totales: row.total_sales,
      ticket_promedio: row.average_ticket,
      utilidad: row.gross_profit,
    })),
  );
}

export function productPerformanceToCSV(rows: ProductPerformanceRow[]): string {
  return toCSV(
    rows.map(row => ({
      producto: row.product_name,
      categoria: row.category,
      unidades: row.quantity,
      ingresos: row.revenue,
      costo: row.cost,
      utilidad: row.profit,
    })),
  );
}

export function categoryPerformanceToCSV(rows: CategoryPerformanceRow[]): string {
  return toCSV(
    rows.map(row => ({
      categoria: row.category,
      unidades: row.quantity,
      ingresos: row.revenue,
      costo: row.cost,
      utilidad: row.profit,
    })),
  );
}

export function paymentMixToCSV(rows: PaymentMixRow[]): string {
  return toCSV(
    rows.map(row => ({
      metodo: paymentLabel(row.method),
      ventas: row.sales_count,
      total: row.total,
    })),
  );
}

export function customerSummaryToCSV(rows: CustomerSummaryRow[]): string {
  return toCSV(
    rows.map(row => ({
      cliente: row.name,
      telefono: row.phone ?? '',
      compras: row.sales_count,
      total: row.total_spent,
      ultima_compra: row.last_purchase_at ?? '',
    })),
  );
}

export function inventoryRiskToCSV(rows: InventoryRiskRow[]): string {
  return toCSV(
    rows.map(row => ({
      producto: row.commercial_name,
      categoria: row.category,
      stock: row.stock,
      minimo: row.min_stock,
      proximos_30_dias: row.expiring_30d,
      vencidos: row.expired_units,
      proximo_vencimiento: row.next_expiry ?? '',
    })),
  );
}

function requireClient() {
  if (!supabase) throw new Error('Supabase no está configurado');
  return supabase;
}

async function fetchView<T>(
  view: string,
  filters: AnalyticsFilters,
  options: {
    dateColumn?: string;
    order?: { column: string; ascending?: boolean };
    limit?: number;
  } = {},
): Promise<T[]> {
  const client = requireClient();
  let query = client.from(view).select('*').eq('store_id', filters.storeId);

  if (options.dateColumn && filters.from) {
    query = query.gte(options.dateColumn, filters.from);
  }
  if (options.dateColumn && filters.to) {
    query = query.lte(options.dateColumn, filters.to);
  }
  if (options.order) {
    query = query.order(options.order.column, { ascending: options.order.ascending ?? true });
  }
  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as T[];
}

export async function fetchAnalytics(filters: AnalyticsFilters): Promise<AnalyticsData> {
  const [
    salesDaily,
    productPerformance,
    categoryPerformance,
    paymentMix,
    customerSummary,
    inventoryRisk,
  ] = await Promise.all([
    fetchView<SalesDailyRow>('v_sales_daily', filters, {
      dateColumn: 'day',
      order: { column: 'day', ascending: true },
    }),
    fetchView<ProductPerformanceRow>('v_product_performance', filters, {
      order: { column: 'profit', ascending: false },
      limit: 10,
    }),
    fetchView<CategoryPerformanceRow>('v_category_performance', filters, {
      order: { column: 'profit', ascending: false },
      limit: 10,
    }),
    fetchView<PaymentMixRow>('v_payment_mix', filters, {
      order: { column: 'total', ascending: false },
    }),
    fetchView<CustomerSummaryRow>('v_customer_summary', filters, {
      order: { column: 'total_spent', ascending: false },
      limit: 10,
    }),
    fetchView<InventoryRiskRow>('v_inventory_risk', filters, {
      order: { column: 'expired_units', ascending: false },
      limit: 10,
    }),
  ]);

  return {
    salesDaily,
    productPerformance,
    categoryPerformance,
    paymentMix,
    customerSummary,
    inventoryRisk,
  };
}
