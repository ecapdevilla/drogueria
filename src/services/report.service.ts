import { DBShape, Sale, Movement, Product } from '../types';
import { copInt } from '../utils/money';
import { salePayments } from '../utils/payments';
import { toCSV } from '../utils/csv';
import { grossProfit as computeGrossProfit } from './sale.service';

/** Rango de fechas inclusivo. Los valores pueden ser `YYYY-MM-DD` o ISO. */
export interface ReportRange {
  from?: string;
  to?: string;
}

export interface ProductPerformance {
  productId: string;
  name: string;
  category: string;
  qty: number;
  revenue: number;
  cost: number;
  profit: number;
}

export interface CategoryPerformance {
  category: string;
  qty: number;
  revenue: number;
  cost: number;
  profit: number;
}

export interface ReportSummary {
  totalSales: number;
  totalPurchases: number;
  grossProfit: number;
  totalExpenses: number;
  netProfit: number;
  salesCount: number;
  averageTicket: number;
  topProducts: { name: string; qty: number; revenue: number }[];
  productPerformance: ProductPerformance[];
  categoryPerformance: CategoryPerformance[];
  salesByPayment: Record<string, number>;
  expensesByCategory: Record<string, number>;
  lowStock: Product[];
}

/** Convierte un límite del rango al inicio o al final del día, en hora local. */
function parseBoundary(value: string | undefined, endOfDay: boolean): Date | undefined {
  if (!value) return undefined;

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    return endOfDay
      ? new Date(Number(year), Number(month) - 1, Number(day), 23, 59, 59, 999)
      : new Date(Number(year), Number(month) - 1, Number(day), 0, 0, 0, 0);
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  if (endOfDay) date.setHours(23, 59, 59, 999);
  else date.setHours(0, 0, 0, 0);
  return date;
}

/** Devuelve un predicado que indica si una fecha ISO cae dentro del rango. */
export function rangeMatcher(range?: ReportRange): (value: string) => boolean {
  const from = parseBoundary(range?.from, false);
  const to = parseBoundary(range?.to, true);

  if (!from && !to) return () => true;

  return (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return false;
    if (from && date.getTime() < from.getTime()) return false;
    if (to && date.getTime() > to.getTime()) return false;
    return true;
  };
}

export function filterSalesByRange(sales: Sale[], range?: ReportRange): Sale[] {
  const match = rangeMatcher(range);
  return sales.filter(sale => match(sale.createdAt));
}

export function filterMovementsByRange(movements: Movement[], range?: ReportRange): Movement[] {
  const match = rangeMatcher(range);
  return movements.filter(movement => match(movement.createdAt));
}

/**
 * Construye el resumen del periodo. Sin rango, analiza todo el historial.
 * El descuento global de cada venta se reparte entre sus líneas de forma
 * proporcional para que la utilidad por producto y por categoría cuadre con
 * la utilidad bruta total.
 */
export function buildReport(db: DBShape, range?: ReportRange): ReportSummary {
  const match = rangeMatcher(range);
  const sales = db.sales.filter(sale => match(sale.createdAt));
  const purchases = db.purchases.filter(purchase => match(purchase.date || purchase.createdAt));
  const expenses = db.expenses.filter(expense => match(expense.date || expense.createdAt));

  const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0);
  const totalPurchases = purchases.reduce((sum, purchase) => sum + purchase.total, 0);
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const grossProfit = computeGrossProfit(sales);

  const salesByPayment = sales.reduce(
    (acc, sale) => {
      for (const payment of salePayments(sale)) {
        acc[payment.method] = (acc[payment.method] ?? 0) + payment.amount;
      }
      return acc;
    },
    {} as Record<string, number>,
  );

  const expensesByCategory = expenses.reduce(
    (acc, expense) => {
      acc[expense.category] = (acc[expense.category] ?? 0) + expense.amount;
      return acc;
    },
    {} as Record<string, number>,
  );

  const productMap = new Map(db.products.map(product => [product.id, product]));
  const productStats = new Map<string, ProductPerformance>();
  const categoryStats = new Map<string, CategoryPerformance>();

  for (const sale of sales) {
    const lineRevenues = sale.items.map(item =>
      Math.max(0, item.unitPrice * item.quantity - (item.discount ?? 0)),
    );
    const linesTotal = lineRevenues.reduce((sum, revenue) => sum + revenue, 0);
    let allocatedDiscount = 0;

    sale.items.forEach((item, index) => {
      const revenue = lineRevenues[index];
      const isLast = index === sale.items.length - 1;
      const proportional = linesTotal > 0 ? Math.round((sale.discount * revenue) / linesTotal) : 0;
      const share =
        linesTotal > 0
          ? Math.min(
              revenue,
              Math.max(0, isLast ? sale.discount - allocatedDiscount : proportional),
            )
          : 0;
      allocatedDiscount += share;

      const netRevenue = revenue - share;
      const cost = item.unitCost * item.quantity;
      const profit = netRevenue - cost;
      const category = productMap.get(item.productId)?.category ?? 'Sin categoría';

      const productStat = productStats.get(item.productId) ?? {
        productId: item.productId,
        name: item.productName,
        category,
        qty: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
      };
      productStat.qty += item.quantity;
      productStat.revenue += netRevenue;
      productStat.cost += cost;
      productStat.profit += profit;
      productStats.set(item.productId, productStat);

      const categoryStat = categoryStats.get(category) ?? {
        category,
        qty: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
      };
      categoryStat.qty += item.quantity;
      categoryStat.revenue += netRevenue;
      categoryStat.cost += cost;
      categoryStat.profit += profit;
      categoryStats.set(category, categoryStat);
    });
  }

  const productPerformance = [...productStats.values()].sort(
    (a, b) => b.profit - a.profit || b.revenue - a.revenue,
  );
  const categoryPerformance = [...categoryStats.values()].sort(
    (a, b) => b.profit - a.profit || b.revenue - a.revenue,
  );

  const topProducts = [...productPerformance]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)
    .map(({ name, qty, revenue }) => ({ name, qty, revenue }));

  const lowStock = db.products.filter(
    product => product.active && product.stock <= product.minStock && product.minStock > 0,
  );

  return {
    totalSales: copInt(totalSales),
    totalPurchases: copInt(totalPurchases),
    grossProfit: copInt(grossProfit),
    totalExpenses: copInt(totalExpenses),
    netProfit: copInt(grossProfit - totalExpenses),
    salesCount: sales.length,
    averageTicket: sales.length ? copInt(totalSales / sales.length) : 0,
    topProducts,
    productPerformance,
    categoryPerformance,
    salesByPayment,
    expensesByCategory,
    lowStock,
  };
}

export function salesToCSV(sales: Sale[]): string {
  const rows = sales.map(s => {
    const itemDiscounts = s.items.reduce((sum, item) => sum + (item.discount ?? 0), 0);
    return {
      fecha: s.createdAt,
      metodo: s.paymentMethod,
      subtotal: s.subtotal,
      descuento_lineas: itemDiscounts,
      descuento_global: s.discount,
      total: s.total,
      pagos: salePayments(s)
        .map(payment => `${payment.method}:${payment.amount}`)
        .join('; '),
      efectivo_recibido: s.cashReceived ?? '',
      vueltas: s.change ?? '',
      items: s.items.map(i => i.productName + ' x' + i.quantity).join('; '),
    };
  });
  return toCSV(rows);
}

export function productPerformanceToCSV(rows: ProductPerformance[]): string {
  return toCSV(
    rows.map(row => ({
      producto: row.name,
      categoria: row.category,
      unidades: row.qty,
      ingresos: row.revenue,
      costo: row.cost,
      utilidad: row.profit,
    })),
  );
}

export function categoryPerformanceToCSV(rows: CategoryPerformance[]): string {
  return toCSV(
    rows.map(row => ({
      categoria: row.category,
      unidades: row.qty,
      ingresos: row.revenue,
      costo: row.cost,
      utilidad: row.profit,
    })),
  );
}

export function paymentBreakdownToCSV(salesByPayment: Record<string, number>): string {
  return toCSV(
    Object.entries(salesByPayment).map(([metodo, total]) => ({
      metodo,
      total,
    })),
  );
}

export function movementsToCSV(movements: Movement[], products: Product[]): string {
  const productMap = new Map(products.map(p => [p.id, p.commercialName]));
  const rows = movements.map(m => ({
    fecha: m.createdAt,
    producto: productMap.get(m.productId) ?? m.productId,
    tipo: m.type,
    cantidad: m.quantity,
    referencia: m.refId ?? '',
    motivo: m.reason ?? '',
    nota: m.note ?? '',
  }));
  return toCSV(rows);
}
