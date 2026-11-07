import { describe, expect, it } from 'vitest';
import { buildSale, grossProfit } from './sale.service';
import { makeDB, makeLot, makeProduct, makeSale } from '../test/fixtures';

const DAY = 86400000;
const inDays = (n: number) => new Date(Date.now() + n * DAY).toISOString();

describe('buildSale', () => {
  it('descuenta stock del producto y de los lotes usando FEFO', () => {
    const product = makeProduct({ id: 'prod-1', stock: 10, salePrice: 1500 });
    const firstLot = makeLot('prod-1', {
      id: 'lot-1',
      quantity: 5,
      expiryDate: inDays(30),
    });
    const secondLot = makeLot('prod-1', {
      id: 'lot-2',
      quantity: 10,
      expiryDate: inDays(365),
    });
    const db = makeDB({ products: [product], lots: [firstLot, secondLot] });

    const { sale, dbPatch } = buildSale(
      { items: [{ productId: 'prod-1', quantity: 7 }], discount: 0, paymentMethod: 'CASH' },
      db,
    );

    expect(sale.total).toBe(10500);
    expect(sale.items[0].quantity).toBe(7);
    expect(sale.items[0].unitCost).toBe(800);
    expect(dbPatch.products?.[0].stock).toBe(3);
    expect(dbPatch.lots?.find(lot => lot.id === 'lot-1')?.quantity).toBe(0);
    expect(dbPatch.lots?.find(lot => lot.id === 'lot-2')?.quantity).toBe(8);
    expect(dbPatch.movements).toHaveLength(2);
  });

  it('aplica el descuento al total', () => {
    const product = makeProduct({ id: 'prod-1', stock: 10, salePrice: 1500 });
    const lot = makeLot('prod-1', { quantity: 10 });
    const db = makeDB({ products: [product], lots: [lot] });

    const { sale } = buildSale(
      { items: [{ productId: 'prod-1', quantity: 2 }], discount: 500, paymentMethod: 'CASH' },
      db,
    );

    expect(sale.subtotal).toBe(3000);
    expect(sale.total).toBe(2500);
  });

  it('aplica descuentos por línea y global', () => {
    const product = makeProduct({ id: 'prod-1', stock: 10, salePrice: 1500 });
    const lot = makeLot('prod-1', { quantity: 10 });
    const db = makeDB({ products: [product], lots: [lot] });

    const { sale } = buildSale(
      {
        items: [{ productId: 'prod-1', quantity: 2, discount: 200 }],
        discount: 100,
        paymentMethod: 'CASH',
      },
      db,
    );

    expect(sale.subtotal).toBe(3000);
    expect(sale.items[0].discount).toBe(200);
    expect(sale.discount).toBe(100);
    expect(sale.total).toBe(2700);
  });

  it('limita el descuento global a lo que queda después de las líneas', () => {
    const product = makeProduct({ id: 'prod-1', stock: 10, salePrice: 1500 });
    const lot = makeLot('prod-1', { quantity: 10 });
    const db = makeDB({ products: [product], lots: [lot] });

    const { sale } = buildSale(
      {
        items: [{ productId: 'prod-1', quantity: 2, discount: 500 }],
        discount: 5000,
        paymentMethod: 'CASH',
      },
      db,
    );

    expect(sale.discount).toBe(2500);
    expect(sale.total).toBe(0);
  });

  it('rechaza un descuento de línea mayor al valor de la línea', () => {
    const product = makeProduct({ id: 'prod-1', stock: 10, salePrice: 1500 });
    const db = makeDB({ products: [product], lots: [makeLot('prod-1', { quantity: 10 })] });

    expect(() =>
      buildSale(
        {
          items: [{ productId: 'prod-1', quantity: 1, discount: 2000 }],
          discount: 0,
          paymentMethod: 'CASH',
        },
        db,
      ),
    ).toThrow(/supera el valor/);
  });

  it('registra un pago mixto, el efectivo recibido y las vueltas', () => {
    const product = makeProduct({ id: 'prod-1', stock: 10, salePrice: 1500 });
    const db = makeDB({ products: [product], lots: [makeLot('prod-1', { quantity: 10 })] });

    const { sale } = buildSale(
      {
        items: [{ productId: 'prod-1', quantity: 2 }],
        discount: 0,
        paymentMethod: 'CASH',
        payments: [
          { method: 'CASH', amount: 1000 },
          { method: 'CARD', amount: 2000 },
        ],
        cashReceived: 5000,
      },
      db,
    );

    expect(sale.payments).toEqual([
      { method: 'CASH', amount: 1000 },
      { method: 'CARD', amount: 2000 },
    ]);
    expect(sale.paymentMethod).toBe('CARD');
    expect(sale.cashReceived).toBe(5000);
    expect(sale.change).toBe(4000);
  });

  it('crea un pago único cuando no se envía el desglose', () => {
    const product = makeProduct({ id: 'prod-1', stock: 10, salePrice: 1500 });
    const db = makeDB({ products: [product], lots: [makeLot('prod-1', { quantity: 10 })] });

    const { sale } = buildSale(
      { items: [{ productId: 'prod-1', quantity: 1 }], discount: 0, paymentMethod: 'TRANSFER' },
      db,
    );

    expect(sale.payments).toEqual([{ method: 'TRANSFER', amount: 1500 }]);
    expect(sale.paymentMethod).toBe('TRANSFER');
    expect(sale.cashReceived).toBeUndefined();
    expect(sale.change).toBeUndefined();
  });

  it('rechaza pagos que no suman el total', () => {
    const product = makeProduct({ id: 'prod-1', stock: 10, salePrice: 1500 });
    const db = makeDB({ products: [product], lots: [makeLot('prod-1', { quantity: 10 })] });

    expect(() =>
      buildSale(
        {
          items: [{ productId: 'prod-1', quantity: 2 }],
          discount: 0,
          paymentMethod: 'CASH',
          payments: [{ method: 'CASH', amount: 1000 }],
        },
        db,
      ),
    ).toThrow(/sumar exactamente/);
  });

  it('rechaza un efectivo recibido que no cubre la parte en efectivo', () => {
    const product = makeProduct({ id: 'prod-1', stock: 10, salePrice: 1500 });
    const db = makeDB({ products: [product], lots: [makeLot('prod-1', { quantity: 10 })] });

    expect(() =>
      buildSale(
        {
          items: [{ productId: 'prod-1', quantity: 2 }],
          discount: 0,
          paymentMethod: 'CASH',
          payments: [{ method: 'CASH', amount: 3000 }],
          cashReceived: 2000,
        },
        db,
      ),
    ).toThrow(/efectivo recibido/);
  });

  it('no permite vender por encima del stock del producto', () => {
    const product = makeProduct({ id: 'prod-1', stock: 1 });
    const lot = makeLot('prod-1', { quantity: 10 });
    const db = makeDB({ products: [product], lots: [lot] });

    expect(() =>
      buildSale(
        { items: [{ productId: 'prod-1', quantity: 2 }], discount: 0, paymentMethod: 'CASH' },
        db,
      ),
    ).toThrow(/Sin stock/);
  });

  it('no vende lotes vencidos aunque el producto tenga stock', () => {
    const product = makeProduct({ id: 'prod-1', stock: 10 });
    const expired = makeLot('prod-1', {
      id: 'lot-1',
      quantity: 10,
      expiryDate: inDays(-1),
    });
    const db = makeDB({ products: [product], lots: [expired] });

    expect(() =>
      buildSale(
        { items: [{ productId: 'prod-1', quantity: 1 }], discount: 0, paymentMethod: 'CASH' },
        db,
      ),
    ).toThrow(/vencidas/);
  });

  it('descuenta solo unidades vigentes y deja intactos los lotes vencidos', () => {
    const product = makeProduct({ id: 'prod-1', stock: 10, salePrice: 1500 });
    const expired = makeLot('prod-1', {
      id: 'old',
      quantity: 4,
      expiryDate: inDays(-2),
    });
    const valid = makeLot('prod-1', {
      id: 'new',
      quantity: 6,
      expiryDate: inDays(120),
    });
    const db = makeDB({ products: [product], lots: [expired, valid] });

    const { dbPatch } = buildSale(
      { items: [{ productId: 'prod-1', quantity: 6 }], discount: 0, paymentMethod: 'CASH' },
      db,
    );

    expect(dbPatch.lots?.find(lot => lot.id === 'old')?.quantity).toBe(4);
    expect(dbPatch.lots?.find(lot => lot.id === 'new')?.quantity).toBe(0);
    expect(dbPatch.products?.[0].stock).toBe(4);
  });

  it('no permite vender un producto inexistente', () => {
    expect(() =>
      buildSale(
        { items: [{ productId: 'missing', quantity: 1 }], discount: 0, paymentMethod: 'CASH' },
        makeDB(),
      ),
    ).toThrow(/no encontrado/);
  });

  it('no permite cantidades inválidas', () => {
    const product = makeProduct({ id: 'prod-1' });
    const db = makeDB({ products: [product], lots: [makeLot('prod-1')] });

    expect(() =>
      buildSale(
        { items: [{ productId: 'prod-1', quantity: 0 }], discount: 0, paymentMethod: 'CASH' },
        db,
      ),
    ).toThrow(/Cantidad inválida/);
  });
});

describe('grossProfit', () => {
  it('calcula la utilidad bruta descontando costos y descuentos', () => {
    const sale = makeSale({ discount: 100, total: 2900 });
    expect(grossProfit([sale])).toBe(1300);
  });

  it('descuenta también los descuentos por línea', () => {
    const sale = makeSale({
      discount: 100,
      total: 2700,
      items: [
        {
          productId: 'product-1',
          productName: 'Acetaminofén 500 mg',
          quantity: 2,
          unitPrice: 1500,
          unitCost: 800,
          discount: 200,
        },
      ],
    });

    expect(grossProfit([sale])).toBe(1100);
  });

  it('retorna cero sin ventas', () => {
    expect(grossProfit([])).toBe(0);
  });
});
