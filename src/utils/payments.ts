import { PaymentMethod, PaymentSplit, Sale } from '../types';

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'CASH', label: 'Efectivo' },
  { value: 'TRANSFER', label: 'Transferencia' },
  { value: 'CARD', label: 'Tarjeta' },
  { value: 'OTHER', label: 'Otro' },
];

const LABELS: Record<PaymentMethod, string> = {
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
  CARD: 'Tarjeta',
  OTHER: 'Otro',
};

export function paymentLabel(method: PaymentMethod | string): string {
  return LABELS[method as PaymentMethod] ?? method;
}

/** Desglose de pagos de una venta, con compatibilidad para ventas antiguas. */
export function salePayments(sale: Sale): PaymentSplit[] {
  if (sale.payments?.length) return sale.payments;
  return [{ method: sale.paymentMethod, amount: sale.total }];
}

/** Parte de la venta cobrada en efectivo (base para la caja). */
export function saleCashAmount(sale: Sale): number {
  return salePayments(sale)
    .filter(payment => payment.method === 'CASH')
    .reduce((sum, payment) => sum + payment.amount, 0);
}

/** Método principal: el de mayor monto; en empate, el primero registrado. */
export function primaryPaymentMethod(payments: PaymentSplit[]): PaymentMethod {
  return payments.reduce((best, payment) => (payment.amount > best.amount ? payment : best)).method;
}
