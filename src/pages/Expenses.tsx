import React, { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Download, Plus, Receipt, Search, Trash2, TrendingDown } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import { Table } from '../components/ui/Table';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { PageHeader } from '../components/layout/PageHeader';
import { ExpenseInput, expenseSchema } from '../domain/schemas';
import { Expense } from '../types';
import { cop } from '../utils/money';
import { formatDate } from '../utils/date';
import { downloadCSV, toCSV } from '../utils/csv';
import { useHotkeys } from '../hooks/useHotkeys';

const CATEGORIES = ['Combustible', 'Mantenimiento', 'Sueldos', 'Servicios', 'Materiales', 'Otro'];

const EMPTY_EXPENSE: ExpenseInput = {
  category: 'Servicios',
  description: '',
  amount: 0,
  paymentMethod: 'EFECTIVO',
  notes: '',
};

const asNumber = (value: unknown) => (value === '' || value === null ? 0 : Number(value));

export default function Expenses() {
  const db = useAppStore(s => s.db);
  const addExpense = useAppStore(s => s.addExpense);
  const deleteExpense = useAppStore(s => s.deleteExpense);
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ExpenseInput>({
    resolver: zodResolver(expenseSchema),
    defaultValues: EMPTY_EXPENSE,
  });

  const onSubmit = (values: ExpenseInput) => {
    addExpense(values);
    setOpen(false);
    reset(EMPTY_EXPENSE);
  };

  const total = db.expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const term = q.trim().toLowerCase();
  const filtered = term
    ? db.expenses.filter(expense =>
        [expense.category, expense.description, expense.paymentMethod, expense.notes ?? '']
          .join(' ')
          .toLowerCase()
          .includes(term),
      )
    : db.expenses;

  const exportExpenses = () => {
    downloadCSV(
      'gastos.csv',
      toCSV(
        filtered.map(expense => ({
          fecha: expense.date,
          categoria: expense.category,
          descripcion: expense.description,
          monto: expense.amount,
          metodo: expense.paymentMethod,
          notas: expense.notes ?? '',
        })),
      ),
    );
  };

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  useHotkeys(
    [
      { key: 'F2', allowInInput: true, handler: () => searchRef.current?.focus() },
      { key: 'n', handler: () => setOpen(true) },
      { key: 'n', alt: true, allowInInput: true, handler: () => setOpen(true) },
      { key: 'e', handler: exportExpenses },
      { key: 'e', alt: true, allowInInput: true, handler: exportExpenses },
      {
        key: 'Enter',
        ctrl: true,
        allowInInput: true,
        handler: () => {
          if (open) void handleSubmit(onSubmit)();
        },
      },
    ],
    [open, handleSubmit, onSubmit, exportExpenses],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gastos"
        subtitle="Registra y controla los gastos operativos del negocio"
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            Nuevo gasto
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Total de gastos
            </p>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <TrendingDown className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-2 font-display text-2xl font-bold tracking-tight text-slate-900">
            {cop(total)}
          </p>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Registros
            </p>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Receipt className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-2 font-display text-2xl font-bold tracking-tight text-slate-900">
            {db.expenses.length}
          </p>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Promedio
            </p>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Receipt className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-2 font-display text-2xl font-bold tracking-tight text-slate-900">
            {cop(db.expenses.length ? total / db.expenses.length : 0)}
          </p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="section-title">Historial de gastos</h2>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                ref={searchRef}
                placeholder="Buscar por descripción, categoría o método..."
                value={q}
                onChange={event => setQ(event.target.value)}
                className="pl-9"
                aria-label="Buscar gastos"
              />
            </div>
            <Button variant="secondary" size="sm" onClick={exportExpenses}>
              <Download className="h-4 w-4" />
              Gastos CSV
            </Button>
          </div>
        </div>
        {db.expenses.length === 0 ? (
          <EmptyState
            icon={<Receipt className="h-7 w-7" />}
            title="Sin gastos"
            description="Registra tus gastos operativos para verlos aquí."
            action={<Button onClick={() => setOpen(true)}>Registrar gasto</Button>}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Search className="h-7 w-7" />}
            title="Sin resultados"
            description={`No hay gastos que coincidan con «${q}».`}
          />
        ) : (
          <Table
            bare
            data={filtered}
            columns={[
              { key: 'date', header: 'Fecha', render: (e: Expense) => formatDate(e.date) },
              { key: 'category', header: 'Categoría' },
              { key: 'description', header: 'Descripción' },
              {
                key: 'amount',
                header: 'Monto',
                render: (e: Expense) => (
                  <span className="font-semibold text-slate-800">{cop(e.amount)}</span>
                ),
              },
              { key: 'paymentMethod', header: 'Método' },
              {
                key: 'id',
                header: '',
                render: (e: Expense) => (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDeleteId(e.id)}
                    aria-label={`Eliminar gasto ${e.description}`}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                ),
              },
            ]}
          />
        )}
      </div>

      <Modal
        open={open}
        title="Nuevo gasto"
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="expense-form">
              Guardar gasto
            </Button>
          </>
        }
      >
        <form id="expense-form" className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Select label="Categoría" error={errors.category?.message} {...register('category')}>
            {CATEGORIES.map(category => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </Select>

          <Input
            label="Descripción"
            placeholder="Ej. Recibo de energía"
            error={errors.description?.message}
            {...register('description')}
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Monto (COP)"
              type="number"
              min={0}
              step="1"
              error={errors.amount?.message}
              {...register('amount', { setValueAs: asNumber })}
            />
            <Select
              label="Método de pago"
              error={errors.paymentMethod?.message}
              {...register('paymentMethod')}
            >
              <option value="EFECTIVO">Efectivo</option>
              <option value="TRANSFERENCIA">Transferencia</option>
              <option value="TARJETA">Tarjeta</option>
              <option value="OTRO">Otro</option>
            </Select>
          </div>

          <Textarea
            label="Notas (opcional)"
            placeholder="Detalles adicionales del gasto"
            error={errors.notes?.message}
            {...register('notes')}
          />
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        title="Eliminar gasto"
        message="¿Estás seguro de eliminar este gasto? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={() => {
          if (deleteId) deleteExpense(deleteId);
          setDeleteId(null);
        }}
        onClose={() => setDeleteId(null)}
      />
    </div>
  );
}
