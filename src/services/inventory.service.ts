import { Lot, Movement, ID, Product } from '../types';
import { id } from '../utils/id';

export function getAvailableStock(product: Product, lots: Lot[]): number {
  // stock del producto se mantiene sincronizado con lotes habilitados
  return product.stock;
}

/** Selecciona lotes FEFO (vencimiento más próximo primero) */
export function pickFEFO(lots: Lot[], productId: ID, qty: number) {
  const candidates = lots
    .filter(l => l.productId === productId && l.enabled && l.quantity > 0)
    .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

  const picked: { lot: Lot; take: number }[] = [];
  let remaining = qty;
  for (const lot of candidates) {
    if (remaining <= 0) break;
    const take = Math.min(lot.quantity, remaining);
    picked.push({ lot, take });
    remaining -= take;
  }
  if (remaining > 0) throw new Error('Stock insuficiente en lotes habilitados (FEFO)');
  return picked;
}

export function applySaleToLots(lots: Lot[], picked: { lot: Lot; take: number }[]): Lot[] {
  const map = new Map(lots.map(l => [l.id, { ...l }]));
  for (const { lot, take } of picked) {
    const cur = map.get(lot.id)!;
    cur.quantity -= take;
    if (cur.quantity < 0) throw new Error('Inventario negativo bloqueado');
  }
  return [...map.values()];
}

export function makeMovement(p: Partial<Movement> & Pick<Movement,'productId'|'type'|'quantity'>): Movement {
  return {
    id: id(),
    createdAt: new Date().toISOString(),
    ...p,
  } as Movement;
}