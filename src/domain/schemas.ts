import { z } from 'zod';

/** Texto obligatorio, recortado y con longitud máxima. */
const requiredText = (label: string, max = 120) => {
  const requiredMessage = `El campo "${label}" es obligatorio`;
  return z
    .string({ error: requiredMessage })
    .trim()
    .min(1, requiredMessage)
    .max(max, `El campo "${label}" es demasiado largo`);
};

/** Texto opcional: convierte cadenas vacías a undefined sin alterar el tipo de entrada. */
const optionalText = (max: number) =>
  z
    .string({ error: 'El texto ingresado no es válido' })
    .trim()
    .max(max, 'El texto es demasiado largo')
    .transform(value => (value.trim() === '' ? undefined : value))
    .optional();

const nonNegativeNumber = (message: string) =>
  z
    .number({ error: 'Ingresa un número válido' })
    .min(0, message)
    .refine(Number.isFinite, 'Ingresa un número válido');

const positiveNumber = (message: string) =>
  z
    .number({ error: 'Ingresa un número válido' })
    .positive(message)
    .refine(Number.isFinite, 'Ingresa un número válido');

const quantity = z
  .number({ error: 'Ingresa una cantidad válida' })
  .int('La cantidad debe ser un número entero')
  .min(1, 'La cantidad mínima es 1');

/* ---------------------------------- Producto --------------------------------- */

const productBaseSchema = z.object({
  internalCode: optionalText(40),
  barcode: optionalText(60),
  commercialName: requiredText('nombre', 120),
  category: requiredText('categoría', 60),
  purchasePrice: nonNegativeNumber('El costo no puede ser negativo'),
  salePrice: positiveNumber('El precio de venta debe ser mayor a 0'),
  minStock: nonNegativeNumber('El stock mínimo no puede ser negativo').refine(
    value => Number.isInteger(value),
    'El stock mínimo debe ser un número entero',
  ),
  active: z.boolean().optional(),
});

export const productSchema = productBaseSchema.refine(
  data => data.salePrice >= data.purchasePrice,
  { message: 'El precio de venta no puede ser menor al costo', path: ['salePrice'] },
);

export const productPatchSchema = productBaseSchema.partial();

/* ----------------------------------- Compra ---------------------------------- */

const purchaseItemSchema = z.object({
  productId: z.string({ error: 'Selecciona un producto' }).min(1, 'Selecciona un producto'),
  quantity,
  unitCost: nonNegativeNumber('El costo no puede ser negativo'),
  lotCode: optionalText(40),
  expiryDate: optionalText(40),
});

export const purchaseSchema = z.object({
  supplierId: z.string({ error: 'Selecciona un proveedor' }).min(1, 'Selecciona un proveedor'),
  invoiceRef: optionalText(60),
  items: z.array(purchaseItemSchema).min(1, 'Agrega al menos un producto'),
  date: z.string().optional(),
});

/* ------------------------------------ Venta ---------------------------------- */

export const paymentMethodSchema = z.enum(['CASH', 'TRANSFER', 'CARD', 'OTHER'], {
  error: 'Selecciona un método de pago',
});

export const paymentSplitSchema = z.object({
  method: paymentMethodSchema,
  amount: nonNegativeNumber('El monto del pago no puede ser negativo'),
});

const saleItemSchema = z.object({
  productId: z.string({ error: 'Producto inválido' }).min(1, 'Producto inválido'),
  quantity,
  discount: nonNegativeNumber('El descuento de la línea no puede ser negativo').optional(),
});

export const saleSchema = z.object({
  items: z.array(saleItemSchema).min(1, 'Agrega al menos un producto'),
  discount: nonNegativeNumber('El descuento no puede ser negativo'),
  paymentMethod: paymentMethodSchema,
  payments: z.array(paymentSplitSchema).min(1, 'Agrega al menos un pago').optional(),
  cashReceived: nonNegativeNumber('El efectivo recibido no puede ser negativo').optional(),
  customerId: optionalText(60),
});

/**
 * Validación del cobro: los pagos deben sumar el total y el efectivo recibido
 * debe cubrir la parte pagada en efectivo.
 */
export const paymentFormSchema = (total: number) =>
  z
    .object({
      payments: z.array(paymentSplitSchema).min(1, 'Agrega al menos un pago'),
      cashReceived: nonNegativeNumber('El efectivo recibido no puede ser negativo').optional(),
    })
    .superRefine((data, ctx) => {
      const paid = Math.round(data.payments.reduce((sum, payment) => sum + payment.amount, 0));
      if (paid !== Math.round(total)) {
        ctx.addIssue({
          code: 'custom',
          path: ['payments'],
          message: 'Los pagos deben sumar exactamente el total de la venta',
        });
      }

      const cash = data.payments
        .filter(payment => payment.method === 'CASH')
        .reduce((sum, payment) => sum + payment.amount, 0);
      if (cash > 0 && (data.cashReceived ?? 0) < cash) {
        ctx.addIssue({
          code: 'custom',
          path: ['cashReceived'],
          message: 'El efectivo recibido no cubre la parte en efectivo',
        });
      }
    });

/* --------------------------------- Inventario -------------------------------- */

export const adjustmentSchema = z
  .object({
    lotId: z.string({ error: 'Selecciona un lote' }).min(1, 'Selecciona un lote'),
    newQuantity: z
      .number({ error: 'Ingresa una cantidad válida' })
      .int('La cantidad debe ser un número entero')
      .min(0, 'La cantidad no puede ser negativa')
      .refine(Number.isFinite, 'Ingresa una cantidad válida'),
    reason: z.enum(['COUNT', 'DAMAGE', 'EXPIRED', 'OTHER'], {
      error: 'Selecciona un motivo',
    }),
    note: optionalText(200),
  })
  .refine(data => data.reason !== 'OTHER' || Boolean(data.note), {
    message: 'Describe el motivo del ajuste',
    path: ['note'],
  });

/* ----------------------------------- Gasto ----------------------------------- */

export const expenseSchema = z.object({
  category: requiredText('categoría', 60),
  description: requiredText('descripción', 160),
  amount: positiveNumber('El monto debe ser mayor a 0'),
  paymentMethod: z.enum(['EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'OTRO']),
  notes: optionalText(300),
  date: z.string().optional(),
});

/* -------------------------------- Proveedor --------------------------------- */

const optionalEmail = z
  .string({ error: 'Ingresa un correo válido' })
  .trim()
  .max(120, 'El correo es demasiado largo')
  .refine(
    value => value === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    'Ingresa un correo válido',
  )
  .transform(value => (value.trim() === '' ? undefined : value))
  .optional();

const supplierBaseSchema = z.object({
  name: requiredText('nombre', 120),
  taxId: optionalText(30),
  contact: optionalText(120),
  phone: optionalText(30),
  email: optionalEmail,
  address: optionalText(200),
  active: z.boolean().optional(),
});

export const supplierSchema = supplierBaseSchema;
export const supplierPatchSchema = supplierBaseSchema.partial();

/* ---------------------------------- Cliente ---------------------------------- */

export const customerSchema = z.object({
  name: requiredText('nombre', 120),
  phone: optionalText(30),
  identification: optionalText(30),
});

/* --------------------------------- Devolución -------------------------------- */

export const returnSchema = z.object({
  saleId: z.string({ error: 'Selecciona una venta' }).min(1, 'Selecciona una venta'),
  reason: requiredText('razón', 200),
  restock: z.boolean(),
  items: z
    .array(
      z.object({
        productId: z.string({ error: 'Producto inválido' }).min(1, 'Producto inválido'),
        quantity,
      }),
    )
    .min(1, 'Selecciona al menos un producto'),
});

/* ------------------------------------ Caja ----------------------------------- */

export const nonNegativeAmountSchema = nonNegativeNumber('El monto no puede ser negativo');
export const positiveAmountSchema = positiveNumber('El monto debe ser mayor a 0');

/* ----------------------------------- Login ----------------------------------- */

export const loginSchema = z.object({
  email: z
    .string({ error: 'El correo es obligatorio' })
    .trim()
    .min(1, 'El correo es obligatorio')
    .email('Ingresa un correo válido'),
  password: z
    .string({ error: 'La contraseña es obligatoria' })
    .min(1, 'La contraseña es obligatoria')
    .min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export type ProductInput = z.infer<typeof productSchema>;
export type ProductPatchInput = z.infer<typeof productPatchSchema>;
export type PurchaseInput = z.infer<typeof purchaseSchema>;
export type SaleInput = z.infer<typeof saleSchema>;
export type PaymentFormInput = z.infer<ReturnType<typeof paymentFormSchema>>;
export type AdjustmentInput = z.infer<typeof adjustmentSchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;
export type SupplierInput = z.infer<typeof supplierSchema>;
export type SupplierPatchInput = z.infer<typeof supplierPatchSchema>;
export type CustomerInput = z.infer<typeof customerSchema>;
export type ReturnInput = z.infer<typeof returnSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
