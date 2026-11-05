import { Sale, SaleItem, Product, Lot, Movement, DBShape } from '../types';
import { id } from '../utils/id';
import { pickFEFO, applySaleToLots, makeMovement } from './inventory.service';

export interface SaleDraft {
  items: { productId: string; quantity: number }[];
  discount: number;
  paymentMethod: Sale['paymentMethod'];
  customerId?: string;
}

export function buildSale(draft: SaleDraft, db: DBShape): { sale: Sale; dbPatch: Partial<DBShape> } {
  const items: SaleItem[] = [];
  let lots = db.lots.map(l => ({ ...l }));
  const movements: Movement[] = [];

  for (const line of draft.items) {
    const product = db.products.find(p => p.id === line.productId);
    if (!product) throw new Error('Producto no encontrado');
    if (line.quantity <= 0) throw new Error('Cantidad inválida');
    if (product.stock < line.quantity) throw new Error(`Sin stock: ${product.commercialName}`);

    // FEFO
    const picked = pickFEFO(lots, product.id, line.quantity);
    lots = applySaleToLots(lots, picked);
    const unitCost = weightedAvgCost(picked);

    items.push({
      productId: product.id,
      productName: product.commercialName,
      quantity: line.quantity,
      unitPrice: product.salePrice,
      unitCost,
      lotId: picked[0]?.lot.id,
    });

    for (const p of picked) {
      movements.push(makeMovement({
        productId: product.id, lotId: p.lot.id, type: 'SALE', quantity: -p.take,
      }));
    }
  }

  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const total = Math.max(0, subtotal - draft.discount);

  const sale: Sale = {
    id: id(),
    items, subtotal, discount: draft.discount, total,
    paymentMethod: draft.paymentMethod,
    customerId: draft.customerId,
    createdAt: new Date().toISOString(),
  };

  // Actualizar stock de productos
  const products = db.products.map(p => {
    const sold = items.filter(i => i.productId === p.id).reduce((s, i) => s + i.quantity, 0);
    return sold ? { ...p, stock: p.stock - sold } : p;
  });

  return { sale, dbPatch: { sales: [...db.sales, sale], lots, products, movements: [...db.movements, ...movements] } };
}

function weightedAvgCost(picked: { lot: Lot; take: number }[]): number {
  const totalQty = picked.reduce((s, p) => s + p.take, 0);
  const totalCost = picked.reduce((s, p) => s + p.take * p.lot.purchaseCost, 0);
  return totalQty ? Math.round(totalCost / totalQty) : 0;
}

export function grossProfit(sales: Sale[]): number {
  return sales.reduce((sum, s) =>
    sum + s.items.reduce((it, i) => it + (i.unitPrice - i.unitCost) * i.quantity, 0) - s.discount, 0);
}