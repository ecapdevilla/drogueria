import { AdjustmentReason, DBShape, ID, Lot, Movement, MovementType, Product } from '../types';
import { id } from '../utils/id';

/** Días a partir de los cuales un lote se considera próximo a vencer. */
export const EXPIRY_CRITICAL_DAYS = 30;
export const EXPIRY_WARNING_DAYS = 90;

export type ExpiryStatus = 'EXPIRED' | 'CRITICAL' | 'WARNING' | 'OK';

/** Días completos que faltan para el vencimiento (negativo si ya venció). */
export function daysUntilExpiry(expiryDate: string, now: Date = new Date()): number {
  const expiry = new Date(expiryDate);
  if (Number.isNaN(expiry.getTime())) return Number.POSITIVE_INFINITY;
  return Math.ceil((expiry.getTime() - now.getTime()) / 86400000);
}

/** Semáforo de vencimiento: vencido, ≤30 días, ≤90 días o vigente. */
export function expiryStatus(expiryDate: string, now: Date = new Date()): ExpiryStatus {
  const days = daysUntilExpiry(expiryDate, now);
  if (days <= 0) return 'EXPIRED';
  if (days <= EXPIRY_CRITICAL_DAYS) return 'CRITICAL';
  if (days <= EXPIRY_WARNING_DAYS) return 'WARNING';
  return 'OK';
}

export function isLotExpired(lot: Lot, now: Date = new Date()): boolean {
  return expiryStatus(lot.expiryDate, now) === 'EXPIRED';
}

export function getAvailableStock(product: Product, _lots: Lot[]): number {
  // stock del producto se mantiene sincronizado con lotes habilitados
  return product.stock;
}

/** Unidades vendibles: lotes habilitados, con existencias y sin vencer. */
export function availableStock(lots: Lot[], productId: ID, now: Date = new Date()): number {
  return lots
    .filter(
      lot =>
        lot.productId === productId && lot.enabled && lot.quantity > 0 && !isLotExpired(lot, now),
    )
    .reduce((sum, lot) => sum + lot.quantity, 0);
}

/** Unidades que están en lotes vencidos (no deberían venderse). */
export function expiredStock(lots: Lot[], productId: ID, now: Date = new Date()): number {
  return lots
    .filter(
      lot =>
        lot.productId === productId && lot.enabled && lot.quantity > 0 && isLotExpired(lot, now),
    )
    .reduce((sum, lot) => sum + lot.quantity, 0);
}

/** Selecciona lotes FEFO (vencimiento más próximo primero), omitiendo los vencidos. */
export function pickFEFO(
  lots: Lot[],
  productId: ID,
  qty: number,
  options: { now?: Date; includeExpired?: boolean } = {},
) {
  const now = options.now ?? new Date();
  const candidates = lots
    .filter(l => l.productId === productId && l.enabled && l.quantity > 0)
    .filter(l => options.includeExpired || !isLotExpired(l, now))
    .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

  const picked: { lot: Lot; take: number }[] = [];
  let remaining = qty;
  for (const lot of candidates) {
    if (remaining <= 0) break;
    const take = Math.min(lot.quantity, remaining);
    picked.push({ lot, take });
    remaining -= take;
  }
  if (remaining > 0) throw new Error('Stock insuficiente en lotes vigentes (FEFO)');
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

export function makeMovement(
  p: Partial<Movement> & Pick<Movement, 'productId' | 'type' | 'quantity'>,
): Movement {
  return {
    id: id(),
    createdAt: new Date().toISOString(),
    ...p,
  } as Movement;
}

/* --------------------------------- Ajustes --------------------------------- */

export interface AdjustmentDraft {
  lotId: string;
  /** Cantidad real que queda en el lote después del ajuste. */
  newQuantity: number;
  reason: AdjustmentReason;
  note?: string;
}

/**
 * Ajusta un lote a la cantidad real contada.
 * Genera un movimiento trazable (ADJUSTMENT o EXPIRED) y mantiene el stock
 * del producto sincronizado con la suma de lotes.
 */
export function adjustLot(db: DBShape, draft: AdjustmentDraft): DBShape {
  const lot = db.lots.find(l => l.id === draft.lotId);
  if (!lot) throw new Error('Lote no encontrado');

  const product = db.products.find(p => p.id === lot.productId);
  if (!product) throw new Error('Producto no encontrado');

  if (!Number.isInteger(draft.newQuantity) || draft.newQuantity < 0) {
    throw new Error('La cantidad debe ser un número entero mayor o igual a 0');
  }

  const delta = draft.newQuantity - lot.quantity;
  if (delta === 0) throw new Error('La cantidad del lote no cambió');

  const nextStock = product.stock + delta;
  if (nextStock < 0) throw new Error('El ajuste dejaría el inventario en negativo');

  const type: MovementType = draft.reason === 'EXPIRED' ? 'EXPIRED' : 'ADJUSTMENT';
  const movement: Movement = {
    id: id(),
    productId: product.id,
    lotId: lot.id,
    type,
    quantity: delta,
    reason: draft.reason,
    note: draft.note,
    createdAt: new Date().toISOString(),
  };

  return {
    ...db,
    lots: db.lots.map(l =>
      l.id === lot.id
        ? {
            ...l,
            quantity: draft.newQuantity,
            // Un lote vencido que se descarga por completo deja de estar habilitado.
            ...(type === 'EXPIRED' && draft.newQuantity === 0 ? { enabled: false } : {}),
          }
        : l,
    ),
    products: db.products.map(p => (p.id === product.id ? { ...p, stock: nextStock } : p)),
    movements: [...db.movements, movement],
  };
}
