import { Purchase, Lot, Movement, DBShape } from '../types';
import { id } from '../utils/id';

export interface PurchaseDraft {
  supplierId: string;
  invoiceRef?: string;
  items: { productId: string; quantity: number; unitCost: number; lotCode?: string; expiryDate?: string }[];
  date?: string;
}

export function addPurchase(db: DBShape, draft: PurchaseDraft): DBShape {
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
    const added = draft.items.filter(i => i.productId === p.id).reduce((s, i) => s + i.quantity, 0);
    return added ? { ...p, stock: p.stock + added } : p;
  });

  return {
    ...db,
    purchases: [...db.purchases, purchase],
    lots: [...db.lots, ...newLots],
    movements: [...db.movements, ...newMovements],
    products,
  };
}