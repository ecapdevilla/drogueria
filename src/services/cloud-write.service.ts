import { supabase } from '../lib/supabase';
import { Sale } from '../types';
import { SaleDraft } from './sale.service';
import { ProductDraft } from './product.service';
import { PurchaseDraft } from './purchase.service';
import { AdjustmentDraft } from './inventory.service';
import { ReturnDraft } from './return.service';
import { ExpenseDraft } from './expense.service';
import { CustomerDraft } from './customer.service';
import { SupplierDraft } from './supplier.service';

export interface CloudContext {
  organizationId: string;
  storeId: string;
  userId: string;
}

type PostgrestError = { message: string; code?: string } | null;

/** Traduce errores de PostgREST a mensajes claros en español. */
function checkError(error: PostgrestError): void {
  if (!error) return;
  if (error.code === '23505') {
    throw new Error('Ya existe un registro con ese código o código de barras');
  }
  if (error.code === '42501') {
    throw new Error('No tienes permiso para esta operación');
  }
  throw new Error(error.message);
}

const now = () => new Date().toISOString();
const today = () => new Date().toISOString().slice(0, 10);
const toDate = (value?: string) => (value ? value.slice(0, 10) : null);

/**
 * Crea una venta en Supabase mediante la RPC transaccional.
 * El servidor valida stock FEFO, precios, descuentos, pagos y movimientos.
 */
export async function createSaleInCloud(
  draft: SaleDraft,
  context: CloudContext,
  idempotencyKey?: string,
): Promise<Sale> {
  if (!supabase) throw new Error('Supabase no está configurado');

  const key = idempotencyKey ?? crypto.randomUUID();

  const { data, error } = await supabase.rpc('create_sale', {
    p_store_id: context.storeId,
    p_items: draft.items.map(item => ({
      product_id: item.productId,
      quantity: item.quantity,
      discount: item.discount ?? 0,
    })),
    p_payments: (draft.payments ?? []).map(payment => ({
      method: payment.method,
      amount: payment.amount,
    })),
    p_discount: draft.discount,
    p_customer_id: draft.customerId || null,
    p_cash_received: draft.cashReceived ?? null,
    p_idempotency_key: key,
  });

  if (error) throw new Error(error.message);
  return data as Sale;
}

/* -------------------------------- Productos -------------------------------- */

export async function createProductInCloud(
  draft: ProductDraft,
  context: CloudContext,
): Promise<string> {
  if (!supabase) throw new Error('Supabase no está configurado');

  const productId = crypto.randomUUID();
  const internalCode = draft.internalCode?.trim() || `P-${Date.now().toString(36).toUpperCase()}`;

  const { error } = await supabase.from('products').insert({
    id: productId,
    organization_id: context.organizationId,
    store_id: context.storeId,
    internal_code: internalCode,
    barcode: draft.barcode?.trim() || null,
    commercial_name: draft.commercialName,
    category: draft.category,
    purchase_price: draft.purchasePrice,
    sale_price: draft.salePrice,
    stock: 0,
    min_stock: draft.minStock ?? 0,
    active: true,
    created_at: now(),
  });

  checkError(error);
  return productId;
}

export async function updateProductInCloud(
  productId: string,
  patch: Partial<ProductDraft> & { active?: boolean },
  context: CloudContext,
): Promise<void> {
  if (!supabase) throw new Error('Supabase no está configurado');

  const row: Record<string, unknown> = {};
  if (patch.internalCode !== undefined) {
    row.internal_code = patch.internalCode?.trim() || `P-${Date.now().toString(36).toUpperCase()}`;
  }
  if (patch.barcode !== undefined) row.barcode = patch.barcode?.trim() || null;
  if (patch.commercialName !== undefined) row.commercial_name = patch.commercialName;
  if (patch.category !== undefined) row.category = patch.category;
  if (patch.purchasePrice !== undefined) row.purchase_price = patch.purchasePrice;
  if (patch.salePrice !== undefined) row.sale_price = patch.salePrice;
  if (patch.minStock !== undefined) row.min_stock = patch.minStock;
  if (patch.active !== undefined) row.active = patch.active;

  if (!Object.keys(row).length) return;

  const { data, error } = await supabase
    .from('products')
    .update(row)
    .eq('id', productId)
    .eq('store_id', context.storeId)
    .select('id');

  checkError(error);
  if (!data?.length) throw new Error('Producto no encontrado');
}

/**
 * En la nube no se borra el producto: se desactiva para conservar
 * ventas, compras, lotes y movimientos históricos.
 */
export async function deactivateProductInCloud(
  productId: string,
  context: CloudContext,
): Promise<void> {
  if (!supabase) throw new Error('Supabase no está configurado');

  const { data, error } = await supabase
    .from('products')
    .update({ active: false })
    .eq('id', productId)
    .eq('store_id', context.storeId)
    .select('id');

  checkError(error);
  if (!data?.length) throw new Error('Producto no encontrado');
}

/* --------------------------------- Compras --------------------------------- */

export async function createPurchaseInCloud(
  draft: PurchaseDraft,
  context: CloudContext,
): Promise<string> {
  if (!supabase) throw new Error('Supabase no está configurado');

  const { data, error } = await supabase.rpc('create_purchase', {
    p_store_id: context.storeId,
    p_supplier_id: draft.supplierId,
    p_invoice_ref: draft.invoiceRef ?? '',
    p_date: toDate(draft.date),
    p_items: draft.items.map(item => ({
      product_id: item.productId,
      quantity: item.quantity,
      unit_cost: item.unitCost,
      lot_code: item.lotCode?.trim() || null,
      expiry_date: toDate(item.expiryDate),
    })),
    p_idempotency_key: crypto.randomUUID(),
  });

  if (error) throw new Error(error.message);
  return String(data);
}

/* -------------------------------- Inventario ------------------------------- */

export async function adjustLotInCloud(
  draft: AdjustmentDraft,
  context: CloudContext,
): Promise<void> {
  if (!supabase) throw new Error('Supabase no está configurado');

  const { error } = await supabase.rpc('adjust_lot', {
    p_lot_id: draft.lotId,
    p_new_quantity: draft.newQuantity,
    p_reason: draft.reason,
    p_note: draft.note?.trim() || null,
  });

  if (error) throw new Error(error.message);
  void context;
}

/* ------------------------------- Devoluciones ------------------------------ */

export async function processReturnInCloud(
  draft: ReturnDraft,
  _context: CloudContext,
): Promise<string> {
  if (!supabase) throw new Error('Supabase no está configurado');

  const { data, error } = await supabase.rpc('process_return', {
    p_sale_id: draft.saleId,
    p_items: draft.items.map(item => ({
      product_id: item.productId,
      quantity: item.quantity,
    })),
    p_reason: draft.reason,
    p_restock: draft.restock,
    p_idempotency_key: crypto.randomUUID(),
  });

  if (error) throw new Error(error.message);
  return String(data);
}

/* ----------------------------------- Caja ---------------------------------- */

export async function openCashInCloud(
  initialAmount: number,
  context: CloudContext,
): Promise<string> {
  if (!supabase) throw new Error('Supabase no está configurado');

  const { data, error } = await supabase.rpc('open_cash', {
    p_store_id: context.storeId,
    p_initial_amount: initialAmount,
  });

  if (error) throw new Error(error.message);
  return String(data);
}

export async function closeCashInCloud(
  sessionId: string,
  counted: number,
  context: CloudContext,
): Promise<void> {
  if (!supabase) throw new Error('Supabase no está configurado');

  const { error } = await supabase.rpc('close_cash', {
    p_session_id: sessionId,
    p_counted_amount: counted,
  });

  if (error) throw new Error(error.message);
  void context;
}

/* ---------------------------------- Gastos --------------------------------- */

export async function createExpenseInCloud(
  draft: ExpenseDraft,
  context: CloudContext,
): Promise<string> {
  if (!supabase) throw new Error('Supabase no está configurado');

  const expenseId = crypto.randomUUID();

  const { error } = await supabase.from('expenses').insert({
    id: expenseId,
    store_id: context.storeId,
    category: draft.category,
    description: draft.description,
    amount: Math.round(draft.amount),
    payment_method: draft.paymentMethod,
    notes: draft.notes?.trim() || null,
    date: toDate(draft.date) ?? today(),
    created_by: context.userId,
    created_at: now(),
  });

  checkError(error);
  return expenseId;
}

export async function deleteExpenseInCloud(
  expenseId: string,
  context: CloudContext,
): Promise<void> {
  if (!supabase) throw new Error('Supabase no está configurado');

  const { data, error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', expenseId)
    .eq('store_id', context.storeId)
    .select('id');

  checkError(error);
  if (!data?.length) throw new Error('Gasto no encontrado');
}

/* --------------------------------- Clientes -------------------------------- */

export async function createCustomerInCloud(
  draft: CustomerDraft,
  context: CloudContext,
): Promise<string> {
  if (!supabase) throw new Error('Supabase no está configurado');

  const customerId = crypto.randomUUID();

  const { error } = await supabase.from('customers').insert({
    id: customerId,
    organization_id: context.organizationId,
    store_id: context.storeId,
    name: draft.name,
    phone: draft.phone?.trim() || null,
    identification: draft.identification?.trim() || null,
    created_at: now(),
  });

  checkError(error);
  return customerId;
}

/* -------------------------------- Proveedores ------------------------------ */

export async function createSupplierInCloud(
  draft: SupplierDraft,
  context: CloudContext,
): Promise<string> {
  if (!supabase) throw new Error('Supabase no está configurado');

  const supplierId = crypto.randomUUID();

  const { error } = await supabase.from('suppliers').insert({
    id: supplierId,
    organization_id: context.organizationId,
    name: draft.name,
    tax_id: draft.taxId?.trim() || null,
    contact: draft.contact?.trim() || null,
    phone: draft.phone?.trim() || null,
    email: draft.email?.trim() || null,
    address: draft.address?.trim() || null,
    active: draft.active ?? true,
    created_at: now(),
  });

  checkError(error);
  return supplierId;
}

export async function updateSupplierInCloud(
  supplierId: string,
  patch: Partial<SupplierDraft>,
  context: CloudContext,
): Promise<void> {
  if (!supabase) throw new Error('Supabase no está configurado');

  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.taxId !== undefined) row.tax_id = patch.taxId?.trim() || null;
  if (patch.contact !== undefined) row.contact = patch.contact?.trim() || null;
  if (patch.phone !== undefined) row.phone = patch.phone?.trim() || null;
  if (patch.email !== undefined) row.email = patch.email?.trim() || null;
  if (patch.address !== undefined) row.address = patch.address?.trim() || null;
  if (patch.active !== undefined) row.active = patch.active;

  if (!Object.keys(row).length) return;

  const { data, error } = await supabase
    .from('suppliers')
    .update(row)
    .eq('id', supplierId)
    .eq('organization_id', context.organizationId)
    .select('id');

  checkError(error);
  if (!data?.length) throw new Error('Proveedor no encontrado');
}
