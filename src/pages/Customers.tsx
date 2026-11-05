import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Table } from '../components/ui/Table';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';

export default function Customers() {
  const db = useAppStore(s => s.db);
  const addCustomer = useAppStore(s => s.addCustomer);
  const searchCustomers = useAppStore(s => s.searchCustomers);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ name: '', phone: '', identification: '' });

  const filtered = q ? searchCustomers(q) : db.customers;

  const handleSubmit = () => {
    if (!draft.name) return;
    addCustomer(draft);
    setOpen(false);
    setDraft({ name: '', phone: '', identification: '' });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">Customers</h2>
        <Button onClick={() => setOpen(true)}>+ Nuevo</Button>
      </div>

      <Input
        placeholder=" Buscar cliente..."
        value={q}
        onChange={e => setQ(e.target.value)}
      />

      {db.customers.length === 0 ? (
        <EmptyState title="Sin clientes" description="Agrega tus primeros clientes" />
      ) : (
        <Table
          data={filtered}
          columns={[
            { key: 'name', header: 'Nombre' },
            { key: 'phone', header: 'Teléfono' },
            { key: 'identification', header: 'Identificación' },
          ]}
        />
      )}

      <Modal
        open={open}
        title="Nuevo Cliente"
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!draft.name}>Guardar</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input label="Nombre" value={draft.name}
            onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} />
          <Input label="Teléfono" value={draft.phone}
            onChange={e => setDraft(d => ({ ...d, phone: e.target.value }))} />
          <Input label="Identificación" value={draft.identification}
            onChange={e => setDraft(d => ({ ...d, identification: e.target.value }))} />
        </div>
      </Modal>
    </div>
  );
}