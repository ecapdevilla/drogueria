import { describe, expect, it } from 'vitest';
import { processReturn } from './return.service';
import { makeDB, makeLot, makeProduct, makeSale } from '../test/fixtures';

function makeReturnScenario() {
  const product = makeProduct({ id: 'prod-1', stock: 5 });
  const lot = makeLot('prod-1', { id: 'lot-1', quantity: 3 });
  const sale = makeSale({
    id: 'sale-1',
    items: [
      {
        productId: 'prod-1',
        productName: product.commercialName,
        quantity: 2,
        unitPrice: 1500,
        unitCost: 800,
        lotId: lot.id,
      },
    ],
  });
  const db = makeDB({ products: [product], lots: [lot], sales: [sale] });
  return { db, product, lot, sale };
}

describe('processReturn', () => {
  it('registra la devolución, repone stock y marca la venta como devuelta', () => {
    const { db } = makeReturnScenario();

    const result = processReturn(db, {
      saleId: 'sale-1',
      reason: 'Producto defectuoso',
      restock: true,
      items: [{ productId: 'prod-1', quantity: 2 }],
    });

    expect(result.returns).toHaveLength(1);
    expect(result.products[0].stock).toBe(7);
    expect(result.lots.find(lot => lot.id === 'lot-1')?.quantity).toBe(5);
    expect(result.sales[0].returned).toBe(true);
    expect(result.movements).toHaveLength(1);
    expect(result.movements[0].type).toBe('RETURN');
    expect(result.movements[0].quantity).toBe(2);
  });

  it('no repone stock cuando restock es falso', () => {
    const { db } = makeReturnScenario();

    const result = processReturn(db, {
      saleId: 'sale-1',
      reason: 'Cambio de opinión',
      restock: false,
      items: [{ productId: 'prod-1', quantity: 2 }],
    });

    expect(result.products[0].stock).toBe(5);
    expect(result.lots[0].quantity).toBe(3);
    expect(result.movements).toHaveLength(0);
  });

  it('crea un lote nuevo si la venta no tiene lote asociado', () => {
    const product = makeProduct({ id: 'prod-1', stock: 5 });
    const sale = makeSale({
      id: 'sale-1',
      items: [
        {
          productId: 'prod-1',
          productName: product.commercialName,
          quantity: 1,
          unitPrice: 1500,
          unitCost: 800,
        },
      ],
    });
    const db = makeDB({ products: [product], sales: [sale] });

    const result = processReturn(db, {
      saleId: 'sale-1',
      reason: 'Producto vencido',
      restock: true,
      items: [{ productId: 'prod-1', quantity: 1 }],
    });

    expect(result.lots).toHaveLength(1);
    expect(result.lots[0].code).toMatch(/^RET-/);
    expect(result.products[0].stock).toBe(6);
  });

  it('rechaza devolver dos veces la misma venta', () => {
    const { db } = makeReturnScenario();
    const first = processReturn(db, {
      saleId: 'sale-1',
      reason: 'Producto defectuoso',
      restock: true,
      items: [{ productId: 'prod-1', quantity: 2 }],
    });

    expect(() =>
      processReturn(first, {
        saleId: 'sale-1',
        reason: 'Otra vez',
        restock: true,
        items: [{ productId: 'prod-1', quantity: 2 }],
      }),
    ).toThrow(/ya fue devuelta/);
  });

  it('rechaza una venta inexistente', () => {
    expect(() =>
      processReturn(makeDB(), {
        saleId: 'missing',
        reason: 'No existe',
        restock: true,
        items: [],
      }),
    ).toThrow(/no encontrada/);
  });
});
