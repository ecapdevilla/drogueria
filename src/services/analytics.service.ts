import { supabase } from '../lib/supabase';

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
