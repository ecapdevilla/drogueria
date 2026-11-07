export const SCHEMA_VERSION = 2;

/** Configuración local de la aplicación (no se sincroniza). */
export interface AppSettings {
  /** Días entre recordatorios de respaldo. */
  backupReminderDays: number;
  /** Última vez que se descargó un respaldo. */
  lastBackupAt?: string;
}

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

/** Motivo de un ajuste manual de inventario. */
export type AdjustmentReason = 'COUNT' | 'DAMAGE' | 'EXPIRED' | 'OTHER';

export interface Movement {
  id: ID;
  productId: ID;
  lotId: ID;
  type: MovementType;
  quantity: number;
  createdAt: string;
  refId?: ID;
  /** Solo en movimientos de tipo ADJUSTMENT / EXPIRED. */
  reason?: AdjustmentReason;
  note?: string;
}

export type PaymentMethod = 'CASH' | 'TRANSFER' | 'CARD' | 'OTHER';

/** Parte de una venta pagada con un método concreto. */
export interface PaymentSplit {
  method: PaymentMethod;
  /** Monto aplicado al total de la venta (no incluye vueltas). */
  amount: number;
}

export interface SaleItem {
  productId: ID;
  productName: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  lotId?: ID;
  /** Descuento aplicado a la línea, en COP. */
  discount?: number;
}

export interface Sale {
  id: ID;
  items: SaleItem[];
  subtotal: number;
  /** Descuento global de la venta, en COP (no incluye los descuentos por línea). */
  discount: number;
  total: number;
  /** Método principal (el de mayor monto) para compatibilidad y reportes. */
  paymentMethod: PaymentMethod;
  /** Desglose de pagos. Las ventas antiguas no lo tienen y se interpretan con `paymentMethod`. */
  payments?: PaymentSplit[];
  /** Efectivo entregado por el cliente cuando hay pago en efectivo. */
  cashReceived?: number;
  /** Vueltas entregadas al cliente. */
  change?: number;
  customerId?: ID;
  createdAt: string;
  returned?: boolean;
}

export interface Supplier {
  id: ID;
  name: string;
  /** NIT / identificación tributaria. */
  taxId?: string;
  contact?: string;
  phone?: string;
  email?: string;
  address?: string;
  /** `undefined` se interpreta como activo (compatibilidad con datos anteriores). */
  active?: boolean;
  createdAt?: string;
}

export interface Purchase {
  id: ID;
  supplierId: ID;
  invoiceRef: string;
  total: number;
  items: {
    productId: ID;
    quantity: number;
    unitCost: number;
    lotCode: string;
    expiryDate: string;
  }[];
  date: string;
  createdAt: string;
}

export interface CashSession {
  id: ID;
  initialAmount: number;
  openedAt: string;
  closedAt?: string;
  countedAmount?: number;
  expectedAmount?: number;
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
  settings: AppSettings;
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
  settings: { backupReminderDays: 7 },
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
