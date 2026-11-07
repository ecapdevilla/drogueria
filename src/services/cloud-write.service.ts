import { supabase } from '../lib/supabase';
import { Sale } from '../types';
import { SaleDraft } from './sale.service';

export interface CloudContext {
  organizationId: string;
  storeId: string;
  userId: string;
}

/**
 * Crea una venta en Supabase mediante la RPC transaccional.
 * El servidor valida stock FEFO, precios, descuentos, pagos y movimientos.
 */
export async function createSaleInCloud(draft: SaleDraft, context: CloudContext): Promise<Sale> {
  if (!supabase) throw new Error('Supabase no está configurado');

  const { data, error } = await supabase.rpc('create_sale', {
    p_store_id: context.storeId,
    p_items: draft.items.map(item => ({
      product_id: item.productId,
      quantity: item.quantity,
      discount: item.discount ?? 0,
    })),
    p_payments: (draft.payments ?? []).map(payment => ({
      method: payment.method,
      amount: payment.amount,
    })),
    p_discount: draft.discount,
    p_customer_id: draft.customerId ?? null,
    p_cash_received: draft.cashReceived ?? null,
    p_idempotency_key: crypto.randomUUID(),
  });

  if (error) throw new Error(error.message);
  return data as Sale;
}
