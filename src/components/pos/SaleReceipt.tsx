import React from 'react';
import { Sale } from '../../types';
import { cop } from '../../utils/money';
import { paymentLabel, salePayments } from '../../utils/payments';

interface SaleReceiptProps {
  sale: Sale;
  customerName?: string;
}

export function SaleReceipt({ sale, customerName }: SaleReceiptProps) {
  const itemDiscounts = sale.items.reduce((sum, item) => sum + (item.discount ?? 0), 0);
  const payments = salePayments(sale);
  const createdAt = new Date(sale.createdAt);

  return (
    <div
      id="sale-receipt"
      className="mx-auto w-full max-w-[320px] bg-white p-4 font-mono text-[11px] leading-5 text-slate-900"
    >
      <div className="text-center">
        <p className="text-sm font-bold uppercase tracking-[0.16em]">Droguería</p>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wide">Recibo de venta</p>
        <p className="mt-1">No. {sale.id.slice(-8).toUpperCase()}</p>
        <p>
          {createdAt.toLocaleDateString('es-CO', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          })}{' '}
          {createdAt.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      <div className="my-2 border-t border-dashed border-slate-300" />

      <p>
        Cliente: <span className="font-semibold">{customerName || 'Consumidor final'}</span>
      </p>
      <p>Atendido por: Punto de venta</p>

      <div className="my-2 border-t border-dashed border-slate-300" />

      <table className="w-full">
        <thead>
          <tr className="text-left">
            <th className="pb-1 font-semibold">Producto</th>
            <th className="pb-1 text-center font-semibold">Cant.</th>
            <th className="pb-1 text-right font-semibold">Valor</th>
          </tr>
        </thead>
        <tbody>
          {sale.items.map((item, index) => (
            <tr key={`${item.productId}-${index}`} className="align-top">
              <td className="pr-1">
                {item.productName}
                <span className="block text-[10px] text-slate-500">
                  {item.quantity} x {cop(item.unitPrice)}
                  {(item.discount ?? 0) > 0 ? ` · desc. ${cop(item.discount ?? 0)}` : ''}
                </span>
              </td>
              <td className="text-center">{item.quantity}</td>
              <td className="text-right">
                {cop(item.unitPrice * item.quantity - (item.discount ?? 0))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="my-2 border-t border-dashed border-slate-300" />

      <dl className="space-y-0.5">
        <div className="flex justify-between">
          <dt>Subtotal</dt>
          <dd>{cop(sale.subtotal)}</dd>
        </div>
        {itemDiscounts > 0 && (
          <div className="flex justify-between">
            <dt>Desc. líneas</dt>
            <dd>-{cop(itemDiscounts)}</dd>
          </div>
        )}
        {sale.discount > 0 && (
          <div className="flex justify-between">
            <dt>Descuento</dt>
            <dd>-{cop(sale.discount)}</dd>
          </div>
        )}
        <div className="flex justify-between border-t border-slate-300 pt-1 text-sm font-bold">
          <dt>TOTAL</dt>
          <dd>{cop(sale.total)}</dd>
        </div>
      </dl>

      <div className="my-2 border-t border-dashed border-slate-300" />

      <dl className="space-y-0.5">
        {payments.map((payment, index) => (
          <div key={`${payment.method}-${index}`} className="flex justify-between">
            <dt>{paymentLabel(payment.method)}</dt>
            <dd>{cop(payment.amount)}</dd>
          </div>
        ))}
        {sale.cashReceived !== undefined && (
          <div className="flex justify-between">
            <dt>Efectivo recibido</dt>
            <dd>{cop(sale.cashReceived)}</dd>
          </div>
        )}
        {sale.change !== undefined && (
          <div className="flex justify-between font-semibold">
            <dt>Vueltas</dt>
            <dd>{cop(sale.change)}</dd>
          </div>
        )}
      </dl>

      <div className="my-3 border-t border-dashed border-slate-300" />

      <p className="text-center text-[10px]">¡Gracias por su compra!</p>
      <p className="mt-1 text-center text-[9px] text-slate-500">
        Este recibo no es factura electrónica.
      </p>
    </div>
  );
}
