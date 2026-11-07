import { describe, expect, it } from 'vitest';
import { addPurchase } from './purchase.service';
import { makeDB, makeProduct, makeSupplier } from '../test/fixtures';

const baseDraft = (supplierId: string, productId: string) => ({
  supplierId,
  invoiceRef: 'FAC-001',
  items: [
    {
      productId,
      quantity: 5,
      unitCost: 900,
      lotCode: 'L-9',
      expiryDate: '2027-01-01',
    },
  ],
});

describe('purchase.service', () => {
  it('aumenta el stock y crea lote, movimiento y compra', () => {
    const product = makeProduct({ stock: 10 });
    const supplier = makeSupplier();
    const db = makeDB({ products: [product], suppliers: [supplier] });

    const result = addPurchase(db, baseDraft(supplier.id, product.id));

    expect(result.products[0].stock).toBe(15);
    expect(result.lots).toHaveLength(1);
    expect(result.lots[0].productId).toBe(product.id);
    expect(result.lots[0].quantity).toBe(5);
    expect(result.movements).toHaveLength(1);
    expect(result.movements[0].type).toBe('PURCHASE');
    expect(result.movements[0].quantity).toBe(5);
    expect(result.purchases).toHaveLength(1);
    expect(result.purchases[0].total).toBe(4500);
  });

  it('actualiza el costo de compra y el proveedor principal', () => {
    const product = makeProduct({ purchasePrice: 800, mainSupplierId: undefined });
    const supplier = makeSupplier();
    const db = makeDB({ products: [product], suppliers: [supplier] });

    const result = addPurchase(db, {
      ...baseDraft(supplier.id, product.id),
      items: [{ productId: product.id, quantity: 2, unitCost: 1250 }],
    });

    expect(result.products[0].purchasePrice).toBe(1250);
    expect(result.products[0].mainSupplierId).toBe(supplier.id);
  });

  it('rechaza un proveedor inexistente', () => {
    const product = makeProduct();
    const db = makeDB({ products: [product], suppliers: [] });

    expect(() => addPurchase(db, baseDraft('no-existe', product.id))).toThrow(
      'Proveedor no encontrado',
    );
  });

  it('rechaza un proveedor inactivo', () => {
    const product = makeProduct();
    const supplier = makeSupplier({ active: false });
    const db = makeDB({ products: [product], suppliers: [supplier] });

    expect(() => addPurchase(db, baseDraft(supplier.id, product.id))).toThrow(
      'El proveedor está inactivo',
    );
  });

  it('rechaza un producto inexistente', () => {
    const supplier = makeSupplier();
    const db = makeDB({ products: [], suppliers: [supplier] });

    expect(() => addPurchase(db, baseDraft(supplier.id, 'no-existe'))).toThrow(
      'Producto no encontrado',
    );
  });

  it('no modifica productos que no forman parte de la compra', () => {
    const included = makeProduct({ stock: 10 });
    const untouched = makeProduct({ stock: 7, purchasePrice: 500 });
    const supplier = makeSupplier();
    const db = makeDB({ products: [included, untouched], suppliers: [supplier] });

    const result = addPurchase(db, baseDraft(supplier.id, included.id));

    expect(result.products[1].stock).toBe(7);
    expect(result.products[1].purchasePrice).toBe(500);
  });
});
