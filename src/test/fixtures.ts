import { CashSession, DBShape, Expense, Lot, Product, Sale, Supplier, emptyDB } from '../types';

let sequence = 0;
const nextId = (prefix: string) => `${prefix}-${++sequence}`;
const NOW = '2026-01-01T00:00:00.000Z';

export function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: nextId('product'),
    internalCode: 'P001',
    barcode: '7700000000001',
    commercialName: 'Acetaminofén 500 mg',
    category: 'Analgésicos',
    purchasePrice: 800,
    salePrice: 1500,
    stock: 10,
    minStock: 2,
    active: true,
    createdAt: NOW,
    ...overrides,
  };
}

export function makeLot(productId: string, overrides: Partial<Lot> = {}): Lot {
  return {
    id: nextId('lot'),
    productId,
    code: 'L-001',
    quantity: 10,
    purchaseCost: 800,
    expiryDate: '2030-12-31T00:00:00.000Z',
    enabled: true,
    createdAt: NOW,
    ...overrides,
  };
}

export function makeSupplier(overrides: Partial<Supplier> = {}): Supplier {
  return {
    id: nextId('supplier'),
    name: 'Distribuciones Andinas SAS',
    taxId: '900.123.456-7',
    contact: 'Laura Gómez',
    phone: '310 555 0101',
    email: 'compras@andinas.com',
    address: 'Calle 12 #34-56',
    active: true,
    createdAt: NOW,
    ...overrides,
  };
}

export function makeSale(overrides: Partial<Sale> = {}): Sale {
  return {
    id: nextId('sale'),
    items: [
      {
        productId: 'product-1',
        productName: 'Acetaminofén 500 mg',
        quantity: 2,
        unitPrice: 1500,
        unitCost: 800,
        lotId: 'lot-1',
      },
    ],
    subtotal: 3000,
    discount: 0,
    total: 3000,
    paymentMethod: 'CASH',
    createdAt: '2026-01-02T10:00:00.000Z',
    ...overrides,
  };
}

export function makeExpense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: nextId('expense'),
    category: 'Servicios',
    description: 'Energía',
    amount: 500,
    paymentMethod: 'EFECTIVO',
    date: '2026-01-02T12:00:00.000Z',
    createdAt: '2026-01-02T12:00:00.000Z',
    ...overrides,
  };
}

export function makeCashSession(overrides: Partial<CashSession> = {}): CashSession {
  return {
    id: nextId('cash'),
    initialAmount: 10000,
    openedAt: '2026-01-02T08:00:00.000Z',
    status: 'OPEN',
    ...overrides,
  };
}

export function makeDB(overrides: Partial<DBShape> = {}): DBShape {
  return { ...emptyDB(), ...overrides };
}
