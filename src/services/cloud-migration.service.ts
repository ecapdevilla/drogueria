import { DBShape, Sale } from '../types';
import { supabase } from '../lib/supabase';

export interface CloudContext {
  organizationId: string;
  storeId: string;
  userId: string;
}

export interface CloudData {
  suppliers: Record<string, unknown>[];
  products: Record<string, unknown>[];
  lots: Record<string, unknown>[];
  customers: Record<string, unknown>[];
  sales: Record<string, unknown>[];
  saleItems: Record<string, unknown>[];
  payments: Record<string, unknown>[];
  purchases: Record<string, unknown>[];
  purchaseItems: Record<string, unknown>[];
  cashSessions: Record<string, unknown>[];
  expenses: Record<string, unknown>[];
  returns: Record<string, unknown>[];
  returnItems: Record<string, unknown>[];
  movements: Record<string, unknown>[];
  settings: Record<string, unknown>;
}

export interface CloudSyncResult {
  suppliers: number;
  products: number;
  lots: number;
  customers: number;
  sales: number;
  purchases: number;
  cashSessions: number;
  expenses: number;
  returns: number;
  movements: number;
}

const dateOnly = (value: string) => value.slice(0, 10);

const salePayments = (sale: Sale) =>
  sale.payments?.length ? sale.payments : [{ method: sale.paymentMethod, amount: sale.total }];

/** Convierte la base local al formato de filas de Supabase. Es puro y testeable. */
export function buildCloudData(db: DBShape, context: CloudContext): CloudData {
  const { organizationId, storeId, userId } = context;
  const productIds = new Set(db.products.map(product => product.id));
  const supplierIds = new Set(db.suppliers.map(supplier => supplier.id));
  const customerIds = new Set(db.customers.map(customer => customer.id));

  const suppliers = db.suppliers.map(supplier => ({
    id: supplier.id,
    organization_id: organizationId,
    name: supplier.name,
    tax_id: supplier.taxId ?? null,
    contact: supplier.contact ?? null,
    phone: supplier.phone ?? null,
    email: supplier.email ?? null,
    address: supplier.address ?? null,
    active: supplier.active !== false,
    created_at: supplier.createdAt ?? new Date().toISOString(),
  }));

  const products = db.products.map(product => ({
    id: product.id,
    organization_id: organizationId,
    store_id: storeId,
    internal_code: product.internalCode,
    barcode: product.barcode || null,
    commercial_name: product.commercialName,
    category: product.category || 'General',
    purchase_price: product.purchasePrice,
    sale_price: product.salePrice,
    stock: product.stock,
    min_stock: product.minStock,
    active: product.active,
    generic_name: product.genericName ?? null,
    active_ingredient: product.activeIngredient ?? null,
    concentration: product.concentration ?? null,
    presentation: product.presentation ?? null,
    pharmaceutical_form: product.pharmaceuticalForm ?? null,
    invima_registry: product.invimaRegistry ?? null,
    main_supplier_id:
      product.mainSupplierId && supplierIds.has(product.mainSupplierId)
        ? product.mainSupplierId
        : null,
    storage_conditions: product.storageConditions ?? null,
    created_at: product.createdAt,
  }));

  const lots = db.lots.map(lot => ({
    id: lot.id,
    product_id: lot.productId,
    store_id: storeId,
    code: lot.code,
    quantity: lot.quantity,
    purchase_cost: lot.purchaseCost,
    expiry_date: dateOnly(lot.expiryDate),
    enabled: lot.enabled,
    created_at: lot.createdAt,
  }));

  const customers = db.customers.map(customer => ({
    id: customer.id,
    organization_id: organizationId,
    store_id: storeId,
    name: customer.name,
    phone: customer.phone ?? null,
    identification: customer.identification ?? null,
    created_at: customer.createdAt,
  }));

  const sales = db.sales.map(sale => ({
    id: sale.id,
    organization_id: organizationId,
    store_id: storeId,
    customer_id: sale.customerId && customerIds.has(sale.customerId) ? sale.customerId : null,
    subtotal: sale.subtotal,
    discount: sale.discount,
    total: sale.total,
    payment_method: sale.paymentMethod,
    cash_received: sale.cashReceived ?? null,
    change_amount: sale.change ?? null,
    returned: sale.returned ?? false,
    created_by: userId,
    created_at: sale.createdAt,
  }));

  const saleItems = db.sales.flatMap(sale =>
    sale.items.map(item => ({
      sale_id: sale.id,
      product_id: productIds.has(item.productId) ? item.productId : null,
      product_name: item.productName,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      unit_cost: item.unitCost,
      discount: item.discount ?? 0,
      lot_id: item.lotId ?? null,
    })),
  );

  const payments = db.sales.flatMap(sale =>
    salePayments(sale).map(payment => ({
      sale_id: sale.id,
      method: payment.method,
      amount: payment.amount,
    })),
  );

  const purchases = db.purchases.map(purchase => ({
    id: purchase.id,
    organization_id: organizationId,
    store_id: storeId,
    supplier_id: supplierIds.has(purchase.supplierId) ? purchase.supplierId : null,
    invoice_ref: purchase.invoiceRef,
    total: purchase.total,
    date: dateOnly(purchase.date),
    created_by: userId,
    created_at: purchase.createdAt,
  }));

  const purchaseItems = db.purchases.flatMap(purchase =>
    purchase.items.map(item => ({
      purchase_id: purchase.id,
      product_id: productIds.has(item.productId) ? item.productId : null,
      quantity: item.quantity,
      unit_cost: item.unitCost,
      lot_code: item.lotCode ?? null,
      expiry_date: item.expiryDate ? dateOnly(item.expiryDate) : null,
    })),
  );

  const cashSessions = db.cashSessions.map(session => ({
    id: session.id,
    store_id: storeId,
    opened_by: userId,
    closed_by: session.status === 'CLOSED' ? userId : null,
    initial_amount: session.initialAmount,
    opened_at: session.openedAt,
    closed_at: session.closedAt ?? null,
    counted_amount: session.countedAmount ?? null,
    expected_amount: session.expectedAmount ?? null,
    difference_amount: session.difference ?? null,
    status: session.status,
  }));

  const expenses = db.expenses.map(expense => ({
    id: expense.id,
    store_id: storeId,
    category: expense.category,
    description: expense.description,
    amount: expense.amount,
    payment_method: expense.paymentMethod,
    notes: expense.notes ?? null,
    date: dateOnly(expense.date),
    created_by: userId,
    created_at: expense.createdAt,
  }));

  const returns = db.returns.map(record => ({
    id: record.id,
    organization_id: organizationId,
    store_id: storeId,
    sale_id: record.saleId,
    reason: record.reason,
    restock: record.restock,
    created_by: userId,
    created_at: record.createdAt,
  }));

  const returnItems = db.returns.flatMap(record =>
    record.items.map(item => ({
      return_id: record.id,
      product_id: productIds.has(item.productId) ? item.productId : null,
      quantity: item.quantity,
    })),
  );

  const movements = db.movements.map(movement => ({
    id: movement.id,
    product_id: movement.productId,
    lot_id: movement.lotId,
    store_id: storeId,
    type: movement.type,
    quantity: movement.quantity,
    ref_id: movement.refId ?? null,
    reason: movement.reason ?? null,
    note: movement.note ?? null,
    created_by: userId,
    created_at: movement.createdAt,
  }));

  const settings = {
    store_id: storeId,
    backup_reminder_days: db.settings.backupReminderDays,
    last_backup_at: db.settings.lastBackupAt ?? null,
  };

  return {
    suppliers,
    products,
    lots,
    customers,
    sales,
    saleItems,
    payments,
    purchases,
    purchaseItems,
    cashSessions,
    expenses,
    returns,
    returnItems,
    movements,
    settings,
  };
}

function chunk<T>(items: T[], size = 400): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

async function upsertRows(table: string, rows: Record<string, unknown>[], onConflict = 'id') {
  for (const group of chunk(rows)) {
    const { error } = await supabase!.from(table).upsert(group, { onConflict });
    if (error) throw new Error(`${table}: ${error.message}`);
  }
}

async function replaceChildren(
  table: string,
  parentColumn: string,
  parentIds: string[],
  rows: Record<string, unknown>[],
) {
  for (const group of chunk(parentIds)) {
    const { error } = await supabase!.from(table).delete().in(parentColumn, group);
    if (error) throw new Error(`${table}: ${error.message}`);
  }
  for (const group of chunk(rows)) {
    const { error } = await supabase!.from(table).insert(group);
    if (error) throw new Error(`${table}: ${error.message}`);
  }
}

/**
 * Sube la base local a Supabase. Pensado para el administrador y para una
 * migración/sincronización inicial; no reemplaza las escrituras del Sprint 8.
 */
export async function syncLocalDataToCloud(
  db: DBShape,
  context: CloudContext,
): Promise<CloudSyncResult> {
  if (!supabase) throw new Error('Supabase no está configurado');

  const data = buildCloudData(db, context);

  await upsertRows('suppliers', data.suppliers);
  await upsertRows('products', data.products);
  await upsertRows('lots', data.lots);
  await upsertRows('customers', data.customers);
  await upsertRows('sales', data.sales);
  await upsertRows('purchases', data.purchases);
  await upsertRows('cash_sessions', data.cashSessions);
  await upsertRows('expenses', data.expenses);
  await upsertRows('returns', data.returns);
  await upsertRows('movements', data.movements);

  await replaceChildren(
    'sale_items',
    'sale_id',
    db.sales.map(sale => sale.id),
    data.saleItems,
  );
  await replaceChildren(
    'payments',
    'sale_id',
    db.sales.map(sale => sale.id),
    data.payments,
  );
  await replaceChildren(
    'purchase_items',
    'purchase_id',
    db.purchases.map(purchase => purchase.id),
    data.purchaseItems,
  );
  await replaceChildren(
    'return_items',
    'return_id',
    db.returns.map(record => record.id),
    data.returnItems,
  );

  await upsertRows('app_settings', [data.settings], 'store_id');

  return {
    suppliers: data.suppliers.length,
    products: data.products.length,
    lots: data.lots.length,
    customers: data.customers.length,
    sales: data.sales.length,
    purchases: data.purchases.length,
    cashSessions: data.cashSessions.length,
    expenses: data.expenses.length,
    returns: data.returns.length,
    movements: data.movements.length,
  };
}
