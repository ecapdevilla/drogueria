import { DBShape, Lot, Movement, PaymentMethod, PaymentSplit, Sale, SaleItem } from '../types';
import { id } from '../utils/id';
import { primaryPaymentMethod } from '../utils/payments';
import {
  pickFEFO,
  applySaleToLots,
  makeMovement,
  availableStock,
  expiredStock,
} from './inventory.service';

export interface SaleDraft {
  items: { productId: string; quantity: number; discount?: number }[];
  discount: number;
  paymentMethod: PaymentMethod;
  payments?: PaymentSplit[];
  cashReceived?: number;
  customerId?: string;
}

const money = (value: number) => Math.round(value);

/** Construye el desglose de pagos y valida que cubra exactamente el total. */
function normalizePayments(total: number, draft: SaleDraft): PaymentSplit[] {
  const provided = (draft.payments ?? []).map(payment => {
    if (!Number.isFinite(payment.amount) || payment.amount < 0) {
      throw new Error('Monto de pago inválido');
    }
    return { method: payment.method, amount: money(payment.amount) };
  });

  const payments = provided.filter(payment => payment.amount > 0);
  if (!payments.length) {
    return total > 0 ? [{ method: draft.paymentMethod, amount: total }] : [];
  }

  const paid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  if (paid !== total) {
    throw new Error('Los pagos deben sumar exactamente el total de la venta');
  }
  return payments;
}

export function buildSale(
  draft: SaleDraft,
  db: DBShape,
): { sale: Sale; dbPatch: Partial<DBShape> } {
  const items: SaleItem[] = [];
  let lots = db.lots.map(l => ({ ...l }));
  const movements: Movement[] = [];
  const now = new Date();

  for (const line of draft.items) {
    const product = db.products.find(p => p.id === line.productId);
    if (!product) throw new Error('Producto no encontrado');
    if (!Number.isInteger(line.quantity) || line.quantity <= 0) {
      throw new Error('Cantidad inválida');
    }
    if (product.stock < line.quantity) throw new Error(`Sin stock: ${product.commercialName}`);

    // Nunca se venden lotes vencidos: solo cuenta el stock vigente.
    const sellable = availableStock(lots, product.id, now);
    if (sellable < line.quantity) {
      const expired = expiredStock(lots, product.id, now);
      throw new Error(
        expired > 0
          ? `Stock vigente insuficiente de ${product.commercialName}: ${expired} uds. vencidas`
          : `Sin stock vigente: ${product.commercialName}`,
      );
    }

    const lineSubtotal = money(product.salePrice * line.quantity);
    const lineDiscount = money(line.discount ?? 0);
    if (lineDiscount < 0) throw new Error('El descuento de la línea no puede ser negativo');
    if (lineDiscount > lineSubtotal) {
      throw new Error(`El descuento de ${product.commercialName} supera el valor de la línea`);
    }

    // FEFO
    const picked = pickFEFO(lots, product.id, line.quantity, { now });
    lots = applySaleToLots(lots, picked);
    const unitCost = weightedAvgCost(picked);

    items.push({
      productId: product.id,
      productName: product.commercialName,
      quantity: line.quantity,
      unitPrice: product.salePrice,
      unitCost,
      lotId: picked[0]?.lot.id,
      discount: lineDiscount > 0 ? lineDiscount : undefined,
    });

    for (const p of picked) {
      movements.push(
        makeMovement({
          productId: product.id,
          lotId: p.lot.id,
          type: 'SALE',
          quantity: -p.take,
        }),
      );
    }
  }

  const subtotal = items.reduce((sum, item) => sum + money(item.unitPrice * item.quantity), 0);
  const itemDiscounts = items.reduce((sum, item) => sum + (item.discount ?? 0), 0);
  const requestedDiscount = money(draft.discount);
  if (requestedDiscount < 0) throw new Error('El descuento no puede ser negativo');

  // El descuento global nunca puede superar lo que queda después de las líneas.
  const discount = Math.min(requestedDiscount, Math.max(0, subtotal - itemDiscounts));
  const total = Math.max(0, subtotal - itemDiscounts - discount);

  const payments = normalizePayments(total, draft);
  const cashAmount = payments
    .filter(payment => payment.method === 'CASH')
    .reduce((sum, payment) => sum + payment.amount, 0);

  let cashReceived: number | undefined;
  let change: number | undefined;
  if (cashAmount > 0) {
    if (draft.cashReceived !== undefined && !Number.isFinite(draft.cashReceived)) {
      throw new Error('Efectivo recibido inválido');
    }
    cashReceived = money(draft.cashReceived ?? cashAmount);
    if (cashReceived < cashAmount) {
      throw new Error('El efectivo recibido no cubre la parte en efectivo');
    }
    change = cashReceived - cashAmount;
  } else if (draft.cashReceived !== undefined && draft.cashReceived > 0) {
    throw new Error('No hay un pago en efectivo para calcular vueltas');
  }

  const sale: Sale = {
    id: id(),
    items,
    subtotal,
    discount,
    total,
    paymentMethod: payments.length ? primaryPaymentMethod(payments) : draft.paymentMethod,
    payments: payments.length ? payments : undefined,
    cashReceived,
    change,
    customerId: draft.customerId,
    createdAt: new Date().toISOString(),
  };

  // Actualizar stock de productos
  const products = db.products.map(p => {
    const sold = items.filter(i => i.productId === p.id).reduce((s, i) => s + i.quantity, 0);
    return sold ? { ...p, stock: p.stock - sold } : p;
  });

  return {
    sale,
    dbPatch: {
      sales: [...db.sales, sale],
      lots,
      products,
      movements: [...db.movements, ...movements],
    },
  };
}

function weightedAvgCost(picked: { lot: Lot; take: number }[]): number {
  const totalQty = picked.reduce((s, p) => s + p.take, 0);
  const totalCost = picked.reduce((s, p) => s + p.take * p.lot.purchaseCost, 0);
  return totalQty ? Math.round(totalCost / totalQty) : 0;
}

export function grossProfit(sales: Sale[]): number {
  return sales.reduce(
    (sum, sale) =>
      sum +
      sale.items.reduce(
        (itemSum, item) =>
          itemSum + (item.unitPrice - item.unitCost) * item.quantity - (item.discount ?? 0),
        0,
      ) -
      sale.discount,
    0,
  );
}
