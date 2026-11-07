import { DBShape, Sale } from '../types';
import { emptyDB, SCHEMA_VERSION } from '../types/schema';
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

const isoDate = (value: string | null) =>
  value ? (value.includes('T') ? value : `${value}T00:00:00.000Z`) : '';

async function fetchRows(
  table: string,
  column: string,
  value: string,
): Promise<Record<string, any>[]> {
  const { data, error } = await supabase!.from(table).select('*').eq(column, value);
  if (error) throw new Error(`${table}: ${error.message}`);
  return (data ?? []) as Record<string, any>[];
}

async function fetchAllRows(table: string): Promise<Record<string, any>[]> {
  const { data, error } = await supabase!.from(table).select('*');
  if (error) throw new Error(`${table}: ${error.message}`);
  return (data ?? []) as Record<string, any>[];
}

function groupBy<T>(rows: T[], key: (row: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const value = key(row);
    const list = map.get(value) ?? [];
    list.push(row);
    map.set(value, list);
  }
  return map;
}

/** Lee la base normalizada de Supabase y la convierte al DBShape local. */
export async function loadCloudData(context: CloudContext): Promise<DBShape> {
  if (!supabase) throw new Error('Supabase no está configurado');

  const { organizationId, storeId } = context;

  const [
    suppliersRows,
    productsRows,
    lotsRows,
    customersRows,
    salesRows,
    purchasesRows,
    cashRows,
    expensesRows,
    returnsRows,
    movementsRows,
    saleItemsRows,
    paymentsRows,
    purchaseItemsRows,
    returnItemsRows,
    settingsResult,
  ] = await Promise.all([
    fetchRows('suppliers', 'organization_id', organizationId),
    fetchRows('products', 'store_id', storeId),
    fetchRows('lots', 'store_id', storeId),
    fetchRows('customers', 'store_id', storeId),
    fetchRows('sales', 'store_id', storeId),
    fetchRows('purchases', 'store_id', storeId),
    fetchRows('cash_sessions', 'store_id', storeId),
    fetchRows('expenses', 'store_id', storeId),
    fetchRows('returns', 'store_id', storeId),
    fetchRows('movements', 'store_id', storeId),
    fetchAllRows('sale_items'),
    fetchAllRows('payments'),
    fetchAllRows('purchase_items'),
    fetchAllRows('return_items'),
    supabase.from('app_settings').select('*').eq('store_id', storeId).maybeSingle(),
  ]);

  if (settingsResult.error) throw new Error(`app_settings: ${settingsResult.error.message}`);

  const saleItemsBySale = groupBy(saleItemsRows, row => String(row.sale_id));
  const paymentsBySale = groupBy(paymentsRows, row => String(row.sale_id));
  const purchaseItemsByPurchase = groupBy(purchaseItemsRows, row => String(row.purchase_id));
  const returnItemsByReturn = groupBy(returnItemsRows, row => String(row.return_id));

  const suppliers = suppliersRows.map(row => ({
    id: String(row.id),
    name: String(row.name),
    taxId: row.tax_id ?? undefined,
    contact: row.contact ?? undefined,
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
    address: row.address ?? undefined,
    active: row.active !== false,
    createdAt: row.created_at ?? undefined,
  }));

  const products = productsRows.map(row => ({
    id: String(row.id),
    internalCode: String(row.internal_code ?? ''),
    barcode: String(row.barcode ?? ''),
    commercialName: String(row.commercial_name),
    category: String(row.category ?? 'General'),
    purchasePrice: Number(row.purchase_price ?? 0),
    salePrice: Number(row.sale_price ?? 0),
    stock: Number(row.stock ?? 0),
    minStock: Number(row.min_stock ?? 0),
    active: row.active !== false,
    genericName: row.generic_name ?? undefined,
    activeIngredient: row.active_ingredient ?? undefined,
    concentration: row.concentration ?? undefined,
    presentation: row.presentation ?? undefined,
    pharmaceuticalForm: row.pharmaceutical_form ?? undefined,
    invimaRegistry: row.invima_registry ?? undefined,
    mainSupplierId: row.main_supplier_id ?? undefined,
    storageConditions: row.storage_conditions ?? undefined,
    createdAt: row.created_at,
  }));

  const lots = lotsRows.map(row => ({
    id: String(row.id),
    productId: String(row.product_id),
    code: String(row.code ?? ''),
    quantity: Number(row.quantity ?? 0),
    purchaseCost: Number(row.purchase_cost ?? 0),
    expiryDate: isoDate(row.expiry_date),
    enabled: row.enabled !== false,
    createdAt: row.created_at,
  }));

  const customers = customersRows.map(row => ({
    id: String(row.id),
    name: String(row.name),
    phone: row.phone ?? undefined,
    identification: row.identification ?? undefined,
    createdAt: row.created_at,
  }));

  const sales = salesRows.map(row => {
    const items = (saleItemsBySale.get(String(row.id)) ?? []).map(item => ({
      productId: String(item.product_id ?? 'producto-eliminado'),
      productName: String(item.product_name),
      quantity: Number(item.quantity ?? 0),
      unitPrice: Number(item.unit_price ?? 0),
      unitCost: Number(item.unit_cost ?? 0),
      lotId: item.lot_id ?? undefined,
      discount: Number(item.discount ?? 0) || undefined,
    }));
    const payments = (paymentsBySale.get(String(row.id)) ?? []).map(payment => ({
      method: payment.method,
      amount: Number(payment.amount ?? 0),
    }));

    return {
      id: String(row.id),
      items,
      subtotal: Number(row.subtotal ?? 0),
      discount: Number(row.discount ?? 0),
      total: Number(row.total ?? 0),
      paymentMethod: row.payment_method,
      payments: payments.length ? payments : undefined,
      cashReceived:
        row.cash_received !== null && row.cash_received !== undefined
          ? Number(row.cash_received)
          : undefined,
      change:
        row.change_amount !== null && row.change_amount !== undefined
          ? Number(row.change_amount)
          : undefined,
      customerId: row.customer_id ?? undefined,
      createdAt: row.created_at,
      returned: row.returned || undefined,
    };
  });

  const purchases = purchasesRows.map(row => ({
    id: String(row.id),
    supplierId: String(row.supplier_id ?? 'proveedor-eliminado'),
    invoiceRef: String(row.invoice_ref ?? ''),
    total: Number(row.total ?? 0),
    items: (purchaseItemsByPurchase.get(String(row.id)) ?? []).map(item => ({
      productId: String(item.product_id ?? 'producto-eliminado'),
      quantity: Number(item.quantity ?? 0),
      unitCost: Number(item.unit_cost ?? 0),
      lotCode: String(item.lot_code ?? ''),
      expiryDate: isoDate(item.expiry_date),
    })),
    date: isoDate(row.date),
    createdAt: row.created_at,
  }));

  const cashSessions = cashRows.map(row => ({
    id: String(row.id),
    initialAmount: Number(row.initial_amount ?? 0),
    openedAt: row.opened_at,
    closedAt: row.closed_at ?? undefined,
    countedAmount:
      row.counted_amount !== null && row.counted_amount !== undefined
        ? Number(row.counted_amount)
        : undefined,
    expectedAmount:
      row.expected_amount !== null && row.expected_amount !== undefined
        ? Number(row.expected_amount)
        : undefined,
    difference:
      row.difference_amount !== null && row.difference_amount !== undefined
        ? Number(row.difference_amount)
        : undefined,
    status: row.status,
  }));

  const expenses = expensesRows.map(row => ({
    id: String(row.id),
    category: String(row.category),
    description: String(row.description),
    amount: Number(row.amount ?? 0),
    paymentMethod: row.payment_method,
    notes: row.notes ?? undefined,
    date: isoDate(row.date),
    createdAt: row.created_at,
  }));

  const returns = returnsRows.map(row => ({
    id: String(row.id),
    saleId: String(row.sale_id),
    reason: String(row.reason),
    restock: row.restock !== false,
    items: (returnItemsByReturn.get(String(row.id)) ?? []).map(item => ({
      productId: String(item.product_id ?? 'producto-eliminado'),
      quantity: Number(item.quantity ?? 0),
    })),
    createdAt: row.created_at,
  }));

  const movements = movementsRows.map(row => ({
    id: String(row.id),
    productId: String(row.product_id),
    lotId: String(row.lot_id ?? 'lote-eliminado'),
    type: row.type,
    quantity: Number(row.quantity ?? 0),
    refId: row.ref_id ?? undefined,
    reason: row.reason ?? undefined,
    note: row.note ?? undefined,
    createdAt: row.created_at,
  }));

  const db = emptyDB();
  return {
    ...db,
    version: SCHEMA_VERSION,
    settings: {
      backupReminderDays: settingsResult.data?.backup_reminder_days ?? 7,
      lastBackupAt: settingsResult.data?.last_backup_at ?? undefined,
    },
    suppliers,
    products,
    lots,
    customers,
    sales,
    purchases,
    cashSessions,
    expenses,
    returns,
    movements,
  };
}
