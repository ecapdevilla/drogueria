import { describe, expect, it } from 'vitest';
import { buildCloudData } from './cloud-migration.service';
import {
  makeCashSession,
  makeDB,
  makeExpense,
  makeLot,
  makeProduct,
  makeSale,
  makeSupplier,
} from '../test/fixtures';
import { Customer, Movement, Purchase, Return } from '../types';

const context = { organizationId: 'org-1', storeId: 'store-1', userId: 'user-1' };

const purchase: Purchase = {
  id: 'purchase-1',
  supplierId: 'sup-1',
  invoiceRef: 'FAC-1',
  total: 2700,
  items: [
    {
      productId: 'p1',
      quantity: 3,
      unitCost: 900,
      lotCode: 'L-1',
      expiryDate: '2030-12-31T00:00:00.000Z',
    },
  ],
  date: '2026-01-02T00:00:00.000Z',
  createdAt: '2026-01-02T00:00:00.000Z',
};

const customer: Customer = {
  id: 'customer-1',
  name: 'Ana Pérez',
  phone: '3001234567',
  identification: '123',
  createdAt: '2026-01-01T00:00:00.000Z',
};

const movement: Movement = {
  id: 'movement-1',
  productId: 'p1',
  lotId: 'lot-1',
  type: 'SALE',
  quantity: -1,
  refId: 's1',
  createdAt: '2026-01-02T10:00:00.000Z',
};

const returned: Return = {
  id: 'return-1',
  saleId: 's1',
  reason: 'Producto defectuoso',
  restock: true,
  items: [{ productId: 'p1', quantity: 1 }],
  createdAt: '2026-01-03T10:00:00.000Z',
};

function makeCloudDB() {
  return makeDB({
    suppliers: [makeSupplier({ id: 'sup-1' })],
    products: [makeProduct({ id: 'p1', mainSupplierId: 'sup-1', genericName: 'Acetaminofén' })],
    lots: [makeLot('p1', { id: 'lot-1', expiryDate: '2030-12-31T00:00:00.000Z' })],
    customers: [customer],
    sales: [
      makeSale({
        id: 's1',
        customerId: 'customer-1',
        createdAt: '2026-01-02T10:00:00.000Z',
        items: [
          {
            productId: 'p1',
            productName: 'Acetaminofén 500 mg',
            quantity: 2,
            unitPrice: 1500,
            unitCost: 800,
            lotId: 'lot-1',
          },
        ],
        payments: [
          { method: 'CASH', amount: 1000 },
          { method: 'CARD', amount: 2000 },
        ],
        cashReceived: 5000,
        change: 4000,
      }),
    ],
    purchases: [purchase],
    cashSessions: [makeCashSession({ id: 'cash-1', status: 'CLOSED', countedAmount: 12000 })],
    expenses: [makeExpense({ id: 'exp-1', notes: 'Pago' })],
    returns: [returned],
    movements: [movement],
  });
}

describe('buildCloudData', () => {
  it('mapea las entidades y el contexto de organización/tienda/usuario', () => {
    const data = buildCloudData(makeCloudDB(), context);

    expect(data.suppliers[0]).toMatchObject({
      id: 'sup-1',
      organization_id: 'org-1',
      active: true,
    });
    expect(data.products[0]).toMatchObject({
      id: 'p1',
      organization_id: 'org-1',
      store_id: 'store-1',
      main_supplier_id: 'sup-1',
      barcode: '7700000000001',
    });
    expect(data.lots[0]).toMatchObject({ store_id: 'store-1', expiry_date: '2030-12-31' });
    expect(data.customers[0]).toMatchObject({ organization_id: 'org-1', phone: '3001234567' });
    expect(data.sales[0]).toMatchObject({
      organization_id: 'org-1',
      store_id: 'store-1',
      created_by: 'user-1',
      change_amount: 4000,
    });
    expect(data.cashSessions[0]).toMatchObject({
      opened_by: 'user-1',
      closed_by: 'user-1',
      difference_amount: null,
    });
    expect(data.expenses[0]).toMatchObject({ store_id: 'store-1', date: '2026-01-02' });
    expect(data.movements[0]).toMatchObject({ ref_id: 's1', store_id: 'store-1' });
    expect(data.settings).toMatchObject({ store_id: 'store-1', backup_reminder_days: 7 });
  });

  it('genera los hijos de ventas, compras y devoluciones', () => {
    const data = buildCloudData(makeCloudDB(), context);

    expect(data.saleItems).toHaveLength(1);
    expect(data.saleItems[0]).toMatchObject({
      sale_id: 's1',
      product_id: 'p1',
      quantity: 2,
    });
    expect(data.payments).toEqual([
      { sale_id: 's1', method: 'CASH', amount: 1000 },
      { sale_id: 's1', method: 'CARD', amount: 2000 },
    ]);
    expect(data.purchaseItems[0]).toMatchObject({
      purchase_id: 'purchase-1',
      expiry_date: '2030-12-31',
    });
    expect(data.returnItems[0]).toMatchObject({ return_id: 'return-1', quantity: 1 });
  });

  it('sintetiza el pago de ventas antiguas sin desglose', () => {
    const sale = makeSale({ id: 'old-sale', total: 3000, paymentMethod: 'CASH' });
    const data = buildCloudData(makeDB({ sales: [sale] }), context);

    expect(data.payments).toEqual([{ sale_id: 'old-sale', method: 'CASH', amount: 3000 }]);
  });
});
