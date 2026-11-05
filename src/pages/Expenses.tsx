import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Table } from '../components/ui/Table';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { cop } from '../utils/money';
import { formatDate } from '../utils/date';

const CATEGORIES = ['Combustible', 'Mantenimiento', 'Sueldos', 'Servicios', 'Materiales', 'Otro'];

export default function Expenses() {
  const db = useAppStore(s => s.db);
  const addExpense = useAppStore(s => s.addExpense);
  const deleteExpense = useAppStore(s => s.deleteExpense);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ category: 'Servicios', description: '', amount: 0, paymentMethod: 'EFECTIVO', notes: '' });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleSubmit = () => {
    if (!draft.description || draft.amount <= 0) return;
    addExpense(draft);
    setOpen(false);
    setDraft({ category: 'Servicios', description: '', amount: 0, paymentMethod: 'EFECTIVO', notes: '' });
  };

  const total = db.expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">Gastos</h2>
        <Button onClick={() => setOpen(true)}>+ Nuevo</Button>
      </div>

      <div className="bg-white rounded-lg shadow p-4 border border-slate-200 flex justify-between items-center">
        <span className="text-sm text-slate-600">Total de gastos:</span>
        <span className="font-bold text-red-600">{cop(total)}</span>
      </div>

      {db.expenses.length === 0 ? (
        <EmptyState title="Sin gastos" description="Registra tus gastos operativos" />
      ) : (
        <Table
          data={db.expenses}
          columns={[
            { key: 'date', header: 'Fecha', render: e => formatDate(e.date) },
            { key: 'category', header: 'Categoría' },
            { key: 'description', header: 'Descripción' },
            { key: 'amount', header: 'Monto', render: e => cop(e.amount) },
            { key: 'paymentMethod', header: 'Método' },
            {
              key: 'id', header: '',
              render: e => <Button size="sm" variant="danger" onClick={() => setDeleteId(e.id)}>Eliminar</Button>,
            },
          ]}
        />
      )}

      <Modal
        open={open}
        title="Nuevo Gasto"
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!draft.description || draft.amount <= 0}>Guardar</Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-600">Categoría</label>
            <select
              value={draft.category}
              onChange={e => setDraft(d => ({ ...d, category: e.target.value }))}
              className="w-full mt-1 px-3 py-2 text-sm border border-slate-300 rounded"
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <Input label="Descripción" value={draft.description}
            onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} />
          <Input label="Monto" type="number" value={draft.amount}
            onChange={e => setDraft(d => ({ ...d, amount: +e.target.value }))} />
          <Input label="Método de pago" value={draft.paymentMethod}
            onChange={e => setDraft(d => ({ ...d, paymentMethod: e.target.value }))} />
          <Input label="Notas" value={draft.notes}
            onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))} />
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        title="Eliminar gasto"
        message="¿Estás seguro de Eliminar este gasto?"
        onConfirm={() => { if (deleteId) deleteExpense(deleteId); setDeleteId(null); }}
        onClose={() => setDeleteId(null)}
      />
    </div>
  );
}