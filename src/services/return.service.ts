import { Return, Sale, Lot, Movement, Product, DBShape } from '../types';
import { id } from '../utils/id';

export interface ReturnDraft {
  saleId: string;
  items: { productId: string; quantity: number }[];
  reason: string;
  restock: boolean;
}

export function processReturn(db: DBShape, draft: ReturnDraft): DBShape {
  const sale = db.sales.find(s => s.id === draft.saleId);
  if (!sale) throw new Error('Venta no encontrada');
  if (sale.returned) throw new Error('Esta venta ya fue devuelta');

  const newMovements: Movement[] = [];
  let products = db.products;
  let lots = db.lots;

  if (draft.restock) {
    for (const item of draft.items) {
      const product = db.products.find(p => p.id === item.productId);
      if (!product) throw new Error('Producto no encontrado');

      // Buscar lote original de la venta
      const saleItem = sale.items.find(i => i.productId === item.productId);
      const lotId = saleItem?.lotId;
      const lot = lotId ? db.lots.find(l => l.id === lotId) : undefined;

      if (lot) {
        lots = lots.map(l =>
          l.id === lot.id ? { ...l, quantity: l.quantity + item.quantity } : l
        );
      } else {
        // Crear lote de devolución sin fecha de vencimiento específica
        const newLot = {
          id: id(),
          productId: product.id,
          code: `RET-${product.internalCode}-${Date.now().toString(36)}`,
          quantity: item.quantity,
          expiryDate: new Date(Date.now() + 365 * 86400000).toISOString(),
          purchaseCost: saleItem?.unitCost ?? product.purchasePrice,
          enabled: true,
          createdAt: new Date().toISOString(),
        };
        lots = [...lots, newLot];
      }

      products = products.map(p =>
        p.id === product.id ? { ...p, stock: p.stock + item.quantity } : p
      );

      newMovements.push({
        id: id(),
        productId: product.id,
        lotId: lotId ?? lots[lots.length - 1].id,
        type: 'RETURN',
        quantity: item.quantity,
        refId: draft.saleId,
        createdAt: new Date().toISOString(),
      });
    }
  }

  const ret: Return = {
    id: id(),
    saleId: draft.saleId,
    items: draft.items,
    reason: draft.reason,
    restock: draft.restock,
    createdAt: new Date().toISOString(),
  };

  return {
    ...db,
    returns: [...db.returns, ret],
    sales: db.sales.map(s => s.id === draft.saleId ? { ...s, returned: true } : s),
    movements: [...db.movements, ...newMovements],
    products,
    lots,
  };
}