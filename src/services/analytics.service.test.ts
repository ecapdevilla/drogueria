import { describe, expect, it } from 'vitest';
import {
  categoryPerformanceToCSV,
  customerSummaryToCSV,
  inventoryRiskToCSV,
  paymentMixToCSV,
  productPerformanceToCSV,
  salesDailyToCSV,
} from './analytics.service';

describe('CSV de analítica', () => {
  it('exporta ventas diarias', () => {
    const csv = salesDailyToCSV([
      {
        store_id: 'store-1',
        day: '2026-11-06',
        sales_count: 2,
        subtotal: 3000,
        total_discounts: 0,
        total_sales: 3000,
        total_cost: 1600,
        gross_profit: 1400,
        average_ticket: 1500,
      },
    ]);

    expect(csv.split('\n')[0]).toBe('dia,ventas,ventas_totales,ticket_promedio,utilidad');
    expect(csv).toContain('"2026-11-06","2","3000","1500","1400"');
  });

  it('exporta utilidad por producto y categoría', () => {
    const products = productPerformanceToCSV([
      {
        store_id: 'store-1',
        product_id: 'p1',
        product_name: 'Acetaminofén 500mg',
        category: 'Analgésicos',
        quantity: 2,
        revenue: 3000,
        cost: 1600,
        profit: 1400,
      },
    ]);
    const categories = categoryPerformanceToCSV([
      {
        store_id: 'store-1',
        category: 'Analgésicos',
        quantity: 2,
        revenue: 3000,
        cost: 1600,
        profit: 1400,
      },
    ]);

    expect(products).toContain('"Acetaminofén 500mg","Analgésicos","2","3000","1600","1400"');
    expect(categories.split('\n')[0]).toBe('categoria,unidades,ingresos,costo,utilidad');
  });

  it('exporta medios de pago con etiquetas en español', () => {
    const csv = paymentMixToCSV([
      { store_id: 'store-1', method: 'CASH', sales_count: 2, total: 3000 },
    ]);

    expect(csv).toContain('"Efectivo","2","3000"');
  });

  it('exporta clientes e inventario', () => {
    const customers = customerSummaryToCSV([
      {
        store_id: 'store-1',
        customer_id: 'c1',
        name: 'Ana Pérez',
        phone: '3001234567',
        sales_count: 1,
        total_spent: 1500,
        last_purchase_at: '2026-11-06T10:00:00.000Z',
      },
    ]);
    const inventory = inventoryRiskToCSV([
      {
        store_id: 'store-1',
        product_id: 'p1',
        commercial_name: 'Crema dental',
        category: 'Cuidado personal',
        stock: 25,
        min_stock: 8,
        expiring_30d: 0,
        expired_units: 25,
        next_expiry: '2026-10-30',
      },
    ]);

    expect(customers).toContain('"Ana Pérez","3001234567","1","1500"');
    expect(inventory).toContain('"Crema dental","Cuidado personal","25","8","0","25"');
  });
});
