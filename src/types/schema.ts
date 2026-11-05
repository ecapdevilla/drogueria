export const SCHEMA_VERSION = 1;

export type ID = string;

export interface Product {
  id: ID;
  internalCode: string;
  barcode: string;
  commercialName: string;
  category: string;
  purchasePrice: number;
  salePrice: number;
  stock: number;
  minStock: number;
  active: boolean;
  genericName?: string;
  activeIngredient?: string;
  concentration?: string;
  presentation?: string;
  pharmaceuticalForm?: string;
  invimaRegistry?: string;
  mainSupplierId?: ID;
  storageConditions?: string;
  createdAt: string;
}

export interface Lot {
  id: ID;
  productId: ID;
  code: string;
  quantity: number;
  purchaseCost: number;
  expiryDate: string;
  enabled: boolean;
  createdAt: string;
}

export type MovementType = 'SALE' | 'PURCHASE' | 'RETURN' | 'ADJUSTMENT' | 'EXPIRED';

export interface Movement {
  id: ID;
  productId: ID;
  lotId: ID;
  type: MovementType;
  quantity: number;
  createdAt: string;
  refId?: ID;
}

export interface SaleItem {
  productId: ID;
  productName: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  lotId?: ID;
}

export interface Sale {
  id: ID;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: 'CASH' | 'TRANSFER' | 'CARD' | 'OTHER';
  customerId?: ID;
  createdAt: string;
  returned?: boolean;
}

export interface Supplier {
  id: ID;
  name: string;
  contact?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface Purchase {
  id: ID;
  supplierId: ID;
  invoiceRef: string;
  total: number;
  items: { productId: ID; quantity: number; unitCost: number; lotCode: string; expiryDate: string }[];
  date: string;
  createdAt: string;
}

export interface CashSession {
  id: ID;
  initialAmount: number;
  openedAt: string;
  closedAt?: string;
  countedAmount?: number;
  difference?: number;
  status: 'OPEN' | 'CLOSED';
}

export interface Expense {
  id: ID;
  category: string;
  description: string;
  amount: number;
  paymentMethod: 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA' | 'OTRO';
  notes?: string;
  date: string;
  createdAt: string;
}

export interface Return {
  id: ID;
  saleId: ID;
  reason: string;
  restock: boolean;
  items: { productId: ID; quantity: number }[];
  createdAt: string;
}

export interface Customer {
  id: ID;
  name: string;
  phone?: string;
  identification?: string;
  createdAt: string;
}

export interface DBShape {
  version: number;
  products: Product[];
  lots: Lot[];
  movements: Movement[];
  sales: Sale[];
  suppliers: Supplier[];
  purchases: Purchase[];
  cashSessions: CashSession[];
  expenses: Expense[];
  returns: Return[];
  customers: Customer[];
}

export const emptyDB = (): DBShape => ({
  version: SCHEMA_VERSION,
  products: [],
  lots: [],
  movements: [],
  sales: [],
  suppliers: [],
  purchases: [],
  cashSessions: [],
  expenses: [],
  returns: [],
  customers: [],
});