import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Phone, Search, UserPlus, Users } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Table } from '../components/ui/Table';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/layout/PageHeader';
import { CustomerInput, customerSchema } from '../domain/schemas';
import { Customer } from '../types';

const EMPTY_CUSTOMER: CustomerInput = { name: '', phone: '', identification: '' };

export default function Customers() {
  const db = useAppStore(s => s.db);
  const addCustomer = useAppStore(s => s.addCustomer);
  const searchCustomers = useAppStore(s => s.searchCustomers);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CustomerInput>({
    resolver: zodResolver(customerSchema),
    defaultValues: EMPTY_CUSTOMER,
  });

  const filtered = q ? searchCustomers(q) : db.customers;

  const onSubmit = (values: CustomerInput) => {
    addCustomer(values);
    setOpen(false);
    reset(EMPTY_CUSTOMER);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        subtitle={`${db.customers.length} clientes registrados`}
        actions={
          <Button onClick={() => setOpen(true)}>
            <UserPlus className="h-4 w-4" />
            Nuevo cliente
          </Button>
        }
      />

      <div className="card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Buscar por nombre, teléfono o identificación..."
              value={q}
              onChange={event => setQ(event.target.value)}
              className="pl-9"
              aria-label="Buscar clientes"
            />
          </div>
          <p className="text-xs font-medium text-slate-500">
            {filtered.length} resultado{filtered.length === 1 ? '' : 's'}
          </p>
        </div>

        {db.customers.length === 0 ? (
          <EmptyState
            icon={<Users className="h-7 w-7" />}
            title="Sin clientes"
            description="Agrega tus primeros clientes para asociarlos a las ventas."
            action={<Button onClick={() => setOpen(true)}>Agregar cliente</Button>}
          />
        ) : (
          <Table
            bare
            data={filtered}
            emptyMessage="Sin resultados para la búsqueda"
            columns={[
              {
                key: 'name',
                header: 'Nombre',
                render: (c: Customer) => (
                  <span className="font-medium text-slate-800">{c.name}</span>
                ),
              },
              {
                key: 'phone',
                header: 'Teléfono',
                render: (c: Customer) =>
                  c.phone ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      {c.phone}
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  ),
              },
              {
                key: 'identification',
                header: 'Identificación',
                render: (c: Customer) =>
                  c.identification || <span className="text-slate-400">—</span>,
              },
            ]}
          />
        )}
      </div>

      <Modal
        open={open}
        title="Nuevo cliente"
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="customer-form">
              Guardar cliente
            </Button>
          </>
        }
      >
        <form id="customer-form" className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Input
            label="Nombre completo"
            placeholder="Ej. María Rodríguez"
            error={errors.name?.message}
            {...register('name')}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Teléfono (opcional)"
              placeholder="300 000 0000"
              error={errors.phone?.message}
              {...register('phone')}
            />
            <Input
              label="Identificación (opcional)"
              placeholder="CC 1.000.000.000"
              error={errors.identification?.message}
              {...register('identification')}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
