import React, { useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Banknote, Plus, Trash2, Wallet } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { cop } from '../../utils/money';
import { PAYMENT_METHODS } from '../../utils/payments';
import { PaymentFormInput, paymentFormSchema } from '../../domain/schemas';
import { PaymentSplit } from '../../types';

interface PaymentModalProps {
  open: boolean;
  total: number;
  onClose: () => void;
  onConfirm: (payments: PaymentSplit[], cashReceived?: number) => void;
}

const defaults = (total: number): PaymentFormInput => ({
  payments: [{ method: 'CASH', amount: total }],
  cashReceived: total,
});

export function PaymentModal({ open, total, onClose, onConfirm }: PaymentModalProps) {
  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PaymentFormInput>({
    resolver: zodResolver(paymentFormSchema(total)),
    defaultValues: defaults(total),
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'payments' });

  useEffect(() => {
    if (open) reset(defaults(total));
  }, [open, total, reset]);

  const payments = watch('payments') ?? [];
  const cashReceivedValue = Number(watch('cashReceived')) || 0;

  const totalPaid = payments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
  const cashAmount = payments
    .filter(payment => payment.method === 'CASH')
    .reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
  const pending = Math.round(total - totalPaid);
  const change = cashReceivedValue - cashAmount;
  const canConfirm = pending === 0 && (cashAmount === 0 || change >= 0);

  const paymentError = errors.payments as
    { root?: { message?: string }; message?: string } | undefined;
  const paymentErrorMessage = paymentError?.root?.message ?? paymentError?.message;

  const submit = handleSubmit(values => {
    const cash = values.payments
      .filter(payment => payment.method === 'CASH')
      .reduce((sum, payment) => sum + payment.amount, 0);

    onConfirm(
      values.payments.map(payment => ({
        method: payment.method,
        amount: Math.round(payment.amount),
      })),
      cash > 0 ? Math.round(values.cashReceived ?? cash) : undefined,
    );
  });

  return (
    <Modal
      open={open}
      title="Cobrar venta"
      onClose={onClose}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="payment-form" disabled={!canConfirm}>
            <Banknote className="h-4 w-4" />
            Confirmar cobro
          </Button>
        </>
      }
    >
      <div className="mb-4 flex items-center justify-between rounded-2xl bg-slate-900 px-4 py-3 text-white">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Total a cobrar
          </p>
          <p className="font-display text-2xl font-bold">{cop(total)}</p>
        </div>
        <Wallet className="h-7 w-7 text-brand-300" />
      </div>

      <form id="payment-form" className="space-y-4" onSubmit={submit} noValidate>
        <div className="space-y-3">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="grid grid-cols-[1fr_1.1fr_auto] items-end gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-2"
            >
              <Select
                label={`Método ${index + 1}`}
                error={errors.payments?.[index]?.method?.message}
                {...register(`payments.${index}.method`)}
              >
                {PAYMENT_METHODS.map(method => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </Select>
              <Input
                label={`Monto ${index + 1}`}
                type="number"
                min={0}
                step="1"
                error={errors.payments?.[index]?.amount?.message}
                {...register(`payments.${index}.amount`, { valueAsNumber: true })}
              />
              <button
                type="button"
                onClick={() => remove(index)}
                disabled={fields.length === 1}
                className="mb-0.5 rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                aria-label={`Quitar pago ${index + 1}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              append({
                method: cashAmount > 0 ? 'CARD' : 'CASH',
                amount: Math.max(0, pending),
              })
            }
            disabled={pending <= 0}
          >
            <Plus className="h-4 w-4" />
            Agregar pago
          </Button>
          <p
            className={`text-sm font-semibold ${
              pending === 0 ? 'text-emerald-700' : 'text-amber-700'
            }`}
          >
            {pending === 0 ? 'Pago completo' : `Pendiente: ${cop(pending)}`}
          </p>
        </div>

        {paymentErrorMessage && (
          <p role="alert" className="text-xs font-medium text-red-600">
            {paymentErrorMessage}
          </p>
        )}

        {cashAmount > 0 && (
          <div className="rounded-xl border border-slate-200 p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <Input
                label="Efectivo recibido"
                type="number"
                min={0}
                step="1"
                error={errors.cashReceived?.message}
                {...register('cashReceived', { valueAsNumber: true })}
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setValue('cashReceived', cashAmount, { shouldValidate: true })}
              >
                Exacto
              </Button>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-slate-500">Vueltas</span>
              <span className={`font-semibold ${change < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                {change < 0 ? `Faltan ${cop(Math.abs(change))}` : cop(change)}
              </span>
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
}
