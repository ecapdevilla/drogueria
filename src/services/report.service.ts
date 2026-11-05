import { DBShape, Sale, Expense, Movement, Product } from '../types';
import { copInt } from '../utils/money';
import { toCSV } from '../utils/csv';

export interface ReportSummary {
  totalSales: number;
  totalPurchases: number;
  grossProfit: number;
  totalExpenses: number;
  netProfit: number;
  salesCount: number;
  topProducts: { name: string; qty: number; revenue: number }[];
  salesByPayment: Record<string, number>;
  expensesByCategory: Record<string, number>;
  lowStock: Product[];
}

export function buildReport(db: DBShape): ReportSummary {
  const sales = db.sales;
  const totalSales = sales.reduce((s, sale) => s + sale.total, 0);
  const totalPurchases = db.purchases.reduce((s, p) => s + p.total, 0);
  const totalExpenses = db.expenses.reduce((s, e) => s + e.amount, 0);

  const grossProfit = sales.reduce((sum, sale) =>
    sum + sale.items.reduce((it, i) => it + (i.unitPrice - i.unitCost) * i.quantity, 0) - sale.discount, 0);

  const salesByPayment = sales.reduce((acc, s) => {
    acc[s.paymentMethod] = (acc[s.paymentMethod] ?? 0) + s.total;
    return acc;
  }, {} as Record<string, number>);

  const expensesByCategory = db.expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);

  const productStats = sales.flatMap(s => s.items).reduce((acc, item) => {
    const existing = acc[item.productName] ?? { name: item.productName, qty: 0, revenue: 0 };
    existing.qty += item.quantity;
    existing.revenue += item.unitPrice * item.quantity;
    acc[item.productName] = existing;
    return acc;
  }, {} as Record<string, { name: string; qty: number; revenue: number }>);

  const topProducts = Object.values(productStats)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const lowStock = db.products.filter(p => p.active && p.stock <= p.minStock && p.minStock > 0);

  return {
    totalSales: copInt(totalSales),
    totalPurchases: copInt(totalPurchases),
    grossProfit: copInt(grossProfit),
    totalExpenses: copInt(totalExpenses),
    netProfit: copInt(grossProfit - totalExpenses),
    salesCount: sales.length,
    topProducts,
    salesByPayment,
    expensesByCategory,
    lowStock,
  };
}

export function salesToCSV(sales: Sale[]): string {
  const rows = sales.map(s => ({
    fecha: s.createdAt,
    metodo: s.paymentMethod,
    subtotal: s.subtotal,
    descuento: s.discount,
    total: s.total,
   items: s.items.map(i => i.productName + ' x' + i.quantity).join('; '),
  }));
  return toCSV(rows);
}

export function movementsToCSV(movements: Movement[], products: Product[]): string {
  const productMap = new Map(products.map(p => [p.id, p.commercialName]));
  const rows = movements.map(m => ({
    fecha: m.createdAt,
    producto: productMap.get(m.lotId ? m.lotId : m.productId) ?? m.productId,
    tipo: m.type,
    cantidad: m.quantity,
    referencia: m.refId ?? '',
  }));
  return toCSV(rows);
}