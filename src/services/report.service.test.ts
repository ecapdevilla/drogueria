import { describe, expect, it } from 'vitest';
import {
  buildReport,
  categoryPerformanceToCSV,
  filterMovementsByRange,
  filterSalesByRange,
  movementsToCSV,
  paymentBreakdownToCSV,
  productPerformanceToCSV,
  salesToCSV,
} from './report.service';
import { makeDB, makeExpense, makeProduct, makeSale } from '../test/fixtures';
import { Movement, Purchase } from '../types';

const purchase: Purchase = {
  id: 'purchase-1',
  supplierId: 'sup-1',
  invoiceRef: 'FAC-1',
  total: 1500,
  items: [],
  date: '2026-01-02T15:00:00.000Z',
  createdAt: '2026-01-02T15:00:00.000Z',
};

function makeReportDB() {
  const productA = makeProduct({
    id: 'p1',
    commercialName: 'Producto A',
    category: 'Analgésicos',
    stock: 5,
    minStock: 2,
  });
  const productB = makeProduct({
    id: 'p2',
    commercialName: 'Producto B',
    category: 'Antiinflamatorios',
    stock: 8,
    minStock: 3,
  });
  const lowProduct = makeProduct({
    id: 'p3',
    commercialName: 'Producto C',
    stock: 1,
    minStock: 2,
  });
  const excludedProduct = makeProduct({
    id: 'p4',
    commercialName: 'Producto D',
    stock: 0,
    minStock: 0,
  });

  const saleA = makeSale({
    id: 's1',
    paymentMethod: 'CASH',
    discount: 100,
    total: 2900,
    items: [
      {
        productId: 'p1',
        productName: 'Producto A',
        quantity: 2,
        unitPrice: 1500,
        unitCost: 800,
      },
    ],
  });
  const saleB = makeSale({
    id: 's2',
    paymentMethod: 'CARD',
    discount: 0,
    total: 2000,
    items: [
      {
        productId: 'p2',
        productName: 'Producto B',
        quantity: 1,
        unitPrice: 2000,
        unitCost: 1200,
      },
    ],
  });

  return makeDB({
    products: [productA, productB, lowProduct, excludedProduct],
    sales: [saleA, saleB],
    purchases: [purchase],
    expenses: [
      makeExpense({ category: 'Servicios', amount: 500, paymentMethod: 'EFECTIVO' }),
      makeExpense({ category: 'Sueldos', amount: 1000, paymentMethod: 'TRANSFERENCIA' }),
    ],
  });
}

describe('buildReport', () => {
  it('calcula los totales del negocio', () => {
    const report = buildReport(makeReportDB());

    expect(report.totalSales).toBe(4900);
    expect(report.totalPurchases).toBe(1500);
    expect(report.totalExpenses).toBe(1500);
    expect(report.grossProfit).toBe(2100);
    expect(report.netProfit).toBe(600);
    expect(report.salesCount).toBe(2);
  });

  it('agrupa ventas por método de pago y gastos por categoría', () => {
    const report = buildReport(makeReportDB());

    expect(report.salesByPayment).toEqual({ CASH: 2900, CARD: 2000 });
    expect(report.expensesByCategory).toEqual({ Servicios: 500, Sueldos: 1000 });
  });

  it('divide el total de una venta con pago mixto entre sus métodos', () => {
    const sale = makeSale({
      id: 's-mixed',
      total: 3000,
      paymentMethod: 'CARD',
      payments: [
        { method: 'CASH', amount: 1000 },
        { method: 'CARD', amount: 2000 },
      ],
    });

    const report = buildReport(makeDB({ sales: [sale] }));

    expect(report.salesByPayment).toEqual({ CASH: 1000, CARD: 2000 });
  });

  it('resta los descuentos por línea de la utilidad bruta', () => {
    const sale = makeSale({
      subtotal: 3000,
      discount: 100,
      total: 2700,
      items: [
        {
          productId: 'p1',
          productName: 'Producto A',
          quantity: 2,
          unitPrice: 1500,
          unitCost: 800,
          discount: 200,
        },
      ],
    });

    const report = buildReport(makeDB({ sales: [sale] }));

    expect(report.grossProfit).toBe(1100);
  });

  it('ordena los productos más vendidos por ingresos netos de descuentos', () => {
    const report = buildReport(makeReportDB());

    expect(report.topProducts[0]).toMatchObject({ name: 'Producto A', qty: 2, revenue: 2900 });
    expect(report.topProducts[1]).toMatchObject({ name: 'Producto B', qty: 1, revenue: 2000 });
  });

  it('calcula el ticket promedio del periodo', () => {
    expect(buildReport(makeReportDB()).averageTicket).toBe(2450);
    expect(buildReport(makeDB()).averageTicket).toBe(0);
  });

  it('calcula la utilidad por producto descontando el descuento global', () => {
    const report = buildReport(makeReportDB());
    const productA = report.productPerformance.find(row => row.productId === 'p1');
    const productB = report.productPerformance.find(row => row.productId === 'p2');

    expect(productA).toMatchObject({
      name: 'Producto A',
      category: 'Analgésicos',
      qty: 2,
      revenue: 2900,
      cost: 1600,
      profit: 1300,
    });
    expect(productB).toMatchObject({
      name: 'Producto B',
      category: 'Antiinflamatorios',
      qty: 1,
      revenue: 2000,
      cost: 1200,
      profit: 800,
    });
  });

  it('reparte el descuento global entre las líneas de forma proporcional', () => {
    const sale = makeSale({
      subtotal: 4000,
      discount: 300,
      total: 3700,
      items: [
        {
          productId: 'p1',
          productName: 'Producto A',
          quantity: 2,
          unitPrice: 1500,
          unitCost: 800,
        },
        {
          productId: 'p2',
          productName: 'Producto B',
          quantity: 1,
          unitPrice: 1000,
          unitCost: 1200,
        },
      ],
    });

    const report = buildReport(
      makeDB({
        products: [
          makeProduct({ id: 'p1', commercialName: 'Producto A', category: 'Analgésicos' }),
          makeProduct({ id: 'p2', commercialName: 'Producto B', category: 'Antiinflamatorios' }),
        ],
        sales: [sale],
      }),
    );

    const productA = report.productPerformance.find(row => row.productId === 'p1');
    const productB = report.productPerformance.find(row => row.productId === 'p2');

    expect(productA).toMatchObject({ revenue: 2775, cost: 1600, profit: 1175 });
    expect(productB).toMatchObject({ revenue: 925, cost: 1200, profit: -275 });
    expect(report.grossProfit).toBe(900);
  });

  it('agrupa la utilidad por categoría', () => {
    const report = buildReport(makeReportDB());
    const analgesicos = report.categoryPerformance.find(row => row.category === 'Analgésicos');
    const antiinflamatorios = report.categoryPerformance.find(
      row => row.category === 'Antiinflamatorios',
    );

    expect(analgesicos).toMatchObject({ qty: 2, revenue: 2900, cost: 1600, profit: 1300 });
    expect(antiinflamatorios).toMatchObject({ qty: 1, revenue: 2000, cost: 1200, profit: 800 });
  });

  it('filtra ventas, compras y gastos por rango de fechas inclusivo', () => {
    const db = makeReportDB();
    const sameDay = buildReport(db, { from: '2026-01-02', to: '2026-01-02' });
    const later = buildReport(db, { from: '2026-01-03' });

    expect(sameDay.totalSales).toBe(4900);
    expect(sameDay.totalPurchases).toBe(1500);
    expect(sameDay.totalExpenses).toBe(1500);
    expect(sameDay.salesCount).toBe(2);

    expect(later.totalSales).toBe(0);
    expect(later.totalPurchases).toBe(0);
    expect(later.totalExpenses).toBe(0);
    expect(later.salesCount).toBe(0);
    expect(later.averageTicket).toBe(0);
  });

  it('detecta solo productos activos con stock bajo y mínimo definido', () => {
    const report = buildReport(makeReportDB());

    expect(report.lowStock.map(product => product.commercialName)).toEqual(['Producto C']);
  });

  it('retorna totales en cero con una base vacía', () => {
    const report = buildReport(makeDB());

    expect(report.totalSales).toBe(0);
    expect(report.netProfit).toBe(0);
    expect(report.topProducts).toEqual([]);
    expect(report.lowStock).toEqual([]);
  });
});

describe('CSV', () => {
  it('exporta ventas con cabecera y detalle de productos', () => {
    const csv = salesToCSV(makeReportDB().sales);
    const [header, firstRow] = csv.split('\n');

    expect(header).toBe(
      'fecha,metodo,subtotal,descuento_lineas,descuento_global,total,pagos,efectivo_recibido,vueltas,items',
    );
    expect(firstRow).toContain('"CASH"');
    expect(firstRow).toContain('"CASH:2900"');
    expect(firstRow).toContain('Producto A x2');
  });

  it('exporta el desglose de pagos, el efectivo recibido y las vueltas', () => {
    const sale = makeSale({
      id: 's-mixed',
      total: 3000,
      paymentMethod: 'CARD',
      cashReceived: 5000,
      change: 4000,
      payments: [
        { method: 'CASH', amount: 1000 },
        { method: 'CARD', amount: 2000 },
      ],
    });

    const csv = salesToCSV([sale]);

    expect(csv).toContain('"CASH:1000; CARD:2000"');
    expect(csv).toContain('"5000"');
    expect(csv).toContain('"4000"');
  });

  it('exporta movimientos con el nombre del producto', () => {
    const product = makeProduct({ id: 'p1', commercialName: 'Producto A' });
    const csv = movementsToCSV(
      [
        {
          id: 'm1',
          productId: 'p1',
          lotId: 'l1',
          type: 'SALE',
          quantity: -2,
          createdAt: '2026-01-02T00:00:00.000Z',
          refId: 's1',
        },
      ],
      [product],
    );

    expect(csv).toContain('"Producto A"');
    expect(csv).toContain('"SALE"');
    expect(csv).toContain('"-2"');
    expect(csv).toContain('"s1"');
  });

  it('exporta la utilidad por producto', () => {
    const report = buildReport(makeReportDB());
    const [header, firstRow] = productPerformanceToCSV(report.productPerformance).split('\n');

    expect(header).toBe('producto,categoria,unidades,ingresos,costo,utilidad');
    expect(firstRow).toContain('"Producto A"');
    expect(firstRow).toContain('"2900"');
    expect(firstRow).toContain('"1300"');
  });

  it('exporta la utilidad por categoría', () => {
    const report = buildReport(makeReportDB());
    const [header, firstRow] = categoryPerformanceToCSV(report.categoryPerformance).split('\n');

    expect(header).toBe('categoria,unidades,ingresos,costo,utilidad');
    expect(firstRow).toContain('"Analgésicos"');
    expect(firstRow).toContain('"1300"');
  });

  it('exporta el desglose de ventas por medio de pago', () => {
    const csv = paymentBreakdownToCSV({ CASH: 2900, CARD: 2000 });
    const [header, firstRow, secondRow] = csv.split('\n');

    expect(header).toBe('metodo,total');
    expect(firstRow).toBe('"CASH","2900"');
    expect(secondRow).toBe('"CARD","2000"');
  });
});

describe('filtros por rango', () => {
  const movement: Movement = {
    id: 'm1',
    productId: 'p1',
    lotId: 'l1',
    type: 'SALE',
    quantity: -1,
    createdAt: '2026-01-02T10:00:00.000Z',
    refId: 's1',
  };
  const laterMovement: Movement = {
    ...movement,
    id: 'm2',
    createdAt: '2026-01-05T10:00:00.000Z',
  };

  it('filtra ventas dentro del rango', () => {
    const db = makeReportDB();

    expect(filterSalesByRange(db.sales, { from: '2026-01-02', to: '2026-01-02' })).toHaveLength(2);
    expect(filterSalesByRange(db.sales, { from: '2026-01-03' })).toHaveLength(0);
  });

  it('filtra movimientos dentro del rango', () => {
    const movements = [movement, laterMovement];

    expect(filterMovementsByRange(movements, { from: '2026-01-02', to: '2026-01-02' })).toEqual([
      movement,
    ]);
    expect(filterMovementsByRange(movements, { to: '2026-01-03' })).toEqual([movement]);
    expect(filterMovementsByRange(movements)).toEqual(movements);
  });
});
