import { Purchase, Lot, Movement, DBShape } from '../types';
import { id } from '../utils/id';

export interface PurchaseDraft {
  supplierId: string;
  invoiceRef?: string;
  items: {
    productId: string;
    quantity: number;
    unitCost: number;
    lotCode?: string;
    expiryDate?: string;
  }[];
  date?: string;
}

export function addPurchase(db: DBShape, draft: PurchaseDraft): DBShape {
  const supplier = db.suppliers.find(s => s.id === draft.supplierId);
  if (!supplier) throw new Error('Proveedor no encontrado');
  if (supplier.active === false) throw new Error('El proveedor está inactivo');

  const newLots: Lot[] = [];
  const newMovements: Movement[] = [];
  const purchaseDate = draft.date ?? new Date().toISOString();

  const purchaseId = id();

  for (const item of draft.items) {
    const product = db.products.find(p => p.id === item.productId);
    if (!product) throw new Error('Producto no encontrado');

    const lot: Lot = {
      id: id(),
      productId: product.id,
      code: item.lotCode ?? `L-${product.internalCode}-${Date.now().toString(36)}`,
      quantity: item.quantity,
      expiryDate: item.expiryDate ?? new Date(Date.now() + 365 * 86400000).toISOString(),
      purchaseCost: Math.round(item.unitCost),
      enabled: true,
      createdAt: new Date().toISOString(),
    };
    newLots.push(lot);

    newMovements.push({
      id: id(),
      productId: product.id,
      lotId: lot.id,
      type: 'PURCHASE',
      quantity: item.quantity,
      refId: purchaseId,
      createdAt: new Date().toISOString(),
    });
  }

  const purchase: Purchase = {
    id: purchaseId,
    supplierId: draft.supplierId,
    invoiceRef: draft.invoiceRef ?? '',
    items: draft.items.map(i => ({
      productId: i.productId,
      quantity: i.quantity,
      unitCost: i.unitCost,
      lotCode: i.lotCode ?? '',
      expiryDate: i.expiryDate ?? new Date(Date.now() + 365 * 86400000).toISOString(),
    })),
    total: draft.items.reduce((s, i) => s + i.quantity * i.unitCost, 0),
    date: purchaseDate,
    createdAt: new Date().toISOString(),
  };

  const products = db.products.map(p => {
    const lines = draft.items.filter(i => i.productId === p.id);
    if (!lines.length) return p;

    const added = lines.reduce((sum, line) => sum + line.quantity, 0);
    const latestCost = [...lines].reverse().find(line => line.unitCost > 0)?.unitCost;

    return {
      ...p,
      stock: p.stock + added,
      mainSupplierId: draft.supplierId,
      ...(latestCost !== undefined ? { purchasePrice: Math.round(latestCost) } : {}),
    };
  });

  return {
    ...db,
    purchases: [...db.purchases, purchase],
    lots: [...db.lots, ...newLots],
    movements: [...db.movements, ...newMovements],
    products,
  };
}
