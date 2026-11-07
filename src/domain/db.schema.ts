import { z } from 'zod';

/**
 * Validación de la base de datos completa (respaldo y `localStorage`).
 * No es un esquema de formulario: aquí se valida la forma final de `DBShape`.
 */

const idSchema = z.string().min(1, 'Identificador inválido');
const textSchema = z.string();

const productSchema = z.object({
  id: idSchema,
  internalCode: textSchema,
  barcode: textSchema,
  commercialName: z.string().min(1, 'El nombre del producto es obligatorio'),
  category: textSchema,
  purchasePrice: z.number(),
  salePrice: z.number(),
  stock: z.number(),
  minStock: z.number(),
  active: z.boolean(),
  genericName: textSchema.optional(),
  activeIngredient: textSchema.optional(),
  concentration: textSchema.optional(),
  presentation: textSchema.optional(),
  pharmaceuticalForm: textSchema.optional(),
  invimaRegistry: textSchema.optional(),
  mainSupplierId: textSchema.optional(),
  storageConditions: textSchema.optional(),
  createdAt: textSchema,
});

const lotSchema = z.object({
  id: idSchema,
  productId: idSchema,
  code: textSchema,
  quantity: z.number(),
  purchaseCost: z.number(),
  expiryDate: textSchema,
  enabled: z.boolean(),
  createdAt: textSchema,
});

const movementSchema = z.object({
  id: idSchema,
  productId: idSchema,
  lotId: idSchema,
  type: z.enum(['SALE', 'PURCHASE', 'RETURN', 'ADJUSTMENT', 'EXPIRED']),
  quantity: z.number(),
  createdAt: textSchema,
  refId: textSchema.optional(),
  reason: z.enum(['COUNT', 'DAMAGE', 'EXPIRED', 'OTHER']).optional(),
  note: textSchema.optional(),
});

const paymentMethodSchema = z.enum(['CASH', 'TRANSFER', 'CARD', 'OTHER']);

const paymentSplitSchema = z.object({
  method: paymentMethodSchema,
  amount: z.number(),
});

const saleItemSchema = z.object({
  productId: idSchema,
  productName: textSchema,
  quantity: z.number(),
  unitPrice: z.number(),
  unitCost: z.number(),
  lotId: textSchema.optional(),
  discount: z.number().optional(),
});

const saleSchema = z.object({
  id: idSchema,
  items: z.array(saleItemSchema),
  subtotal: z.number(),
  discount: z.number(),
  total: z.number(),
  paymentMethod: paymentMethodSchema,
  payments: z.array(paymentSplitSchema).optional(),
  cashReceived: z.number().optional(),
  change: z.number().optional(),
  customerId: textSchema.optional(),
  createdAt: textSchema,
  returned: z.boolean().optional(),
});

const supplierSchema = z.object({
  id: idSchema,
  name: z.string().min(1, 'El nombre del proveedor es obligatorio'),
  taxId: textSchema.optional(),
  contact: textSchema.optional(),
  phone: textSchema.optional(),
  email: textSchema.optional(),
  address: textSchema.optional(),
  active: z.boolean().optional(),
  createdAt: textSchema.optional(),
});

const purchaseItemSchema = z.object({
  productId: idSchema,
  quantity: z.number(),
  unitCost: z.number(),
  lotCode: textSchema,
  expiryDate: textSchema,
});

const purchaseSchema = z.object({
  id: idSchema,
  supplierId: idSchema,
  invoiceRef: textSchema,
  total: z.number(),
  items: z.array(purchaseItemSchema),
  date: textSchema,
  createdAt: textSchema,
});

const cashSessionSchema = z.object({
  id: idSchema,
  initialAmount: z.number(),
  openedAt: textSchema,
  closedAt: textSchema.optional(),
  countedAmount: z.number().optional(),
  expectedAmount: z.number().optional(),
  difference: z.number().optional(),
  status: z.enum(['OPEN', 'CLOSED']),
});

const expenseSchema = z.object({
  id: idSchema,
  category: textSchema,
  description: textSchema,
  amount: z.number(),
  paymentMethod: z.enum(['EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'OTRO']),
  notes: textSchema.optional(),
  date: textSchema,
  createdAt: textSchema,
});

const returnSchema = z.object({
  id: idSchema,
  saleId: idSchema,
  reason: textSchema,
  restock: z.boolean(),
  items: z.array(
    z.object({
      productId: idSchema,
      quantity: z.number(),
    }),
  ),
  createdAt: textSchema,
});

const customerSchema = z.object({
  id: idSchema,
  name: z.string().min(1, 'El nombre del cliente es obligatorio'),
  phone: textSchema.optional(),
  identification: textSchema.optional(),
  createdAt: textSchema,
});

const settingsSchema = z
  .object({
    backupReminderDays: z.number().int().min(1).max(365).default(7),
    lastBackupAt: textSchema.optional(),
  })
  .default({ backupReminderDays: 7 });

export const dbSchema = z.object({
  version: z.number().int().positive(),
  settings: settingsSchema,
  products: z.array(productSchema),
  lots: z.array(lotSchema),
  movements: z.array(movementSchema),
  sales: z.array(saleSchema),
  suppliers: z.array(supplierSchema),
  purchases: z.array(purchaseSchema),
  cashSessions: z.array(cashSessionSchema),
  expenses: z.array(expenseSchema),
  returns: z.array(returnSchema),
  customers: z.array(customerSchema),
});
