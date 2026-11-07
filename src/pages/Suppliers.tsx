import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, Mail, Pencil, Phone, Plus, Power, PowerOff, Search } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Table } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { PageHeader } from '../components/layout/PageHeader';
import { SupplierInput, supplierSchema } from '../domain/schemas';
import { Supplier } from '../types';

const EMPTY_SUPPLIER: SupplierInput = {
  name: '',
  taxId: '',
  contact: '',
  phone: '',
  email: '',
  address: '',
};

const isActive = (supplier: Supplier) => supplier.active !== false;

export default function Suppliers() {
  const db = useAppStore(s => s.db);
  const addSupplier = useAppStore(s => s.addSupplier);
  const updateSupplier = useAppStore(s => s.updateSupplier);
  const setSupplierActive = useAppStore(s => s.setSupplierActive);
  const searchSuppliers = useAppStore(s => s.searchSuppliers);

  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<Supplier | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SupplierInput>({
    resolver: zodResolver(supplierSchema),
    defaultValues: EMPTY_SUPPLIER,
  });

  const activeCount = db.suppliers.filter(isActive).length;
  const filtered = q ? searchSuppliers(q) : db.suppliers;
  const rows = [...filtered].sort((a, b) => a.name.localeCompare(b.name, 'es'));

  const openNew = () => {
    setEditing(null);
    reset(EMPTY_SUPPLIER);
    setOpen(true);
  };

  const openEdit = (supplier: Supplier) => {
    setEditing(supplier);
    reset({
      name: supplier.name,
      taxId: supplier.taxId ?? '',
      contact: supplier.contact ?? '',
      phone: supplier.phone ?? '',
      email: supplier.email ?? '',
      address: supplier.address ?? '',
    });
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    setEditing(null);
    reset(EMPTY_SUPPLIER);
  };

  const onSubmit = (values: SupplierInput) => {
    if (editing) {
      updateSupplier(editing.id, values);
    } else {
      addSupplier(values);
    }
    closeModal();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Proveedores"
        subtitle={`${activeCount} activo${activeCount === 1 ? '' : 's'} de ${db.suppliers.length} registrados`}
        actions={
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" />
            Nuevo proveedor
          </Button>
        }
      />

      <div className="card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Buscar por nombre, NIT, contacto o correo..."
              value={q}
              onChange={event => setQ(event.target.value)}
              className="pl-9"
              aria-label="Buscar proveedores"
            />
          </div>
          <p className="text-xs font-medium text-slate-500">
            {rows.length} resultado{rows.length === 1 ? '' : 's'}
          </p>
        </div>

        {db.suppliers.length === 0 ? (
          <EmptyState
            icon={<Building2 className="h-7 w-7" />}
            title="Sin proveedores"
            description="Registra tus proveedores para asociarlos a las compras y al catálogo."
            action={<Button onClick={openNew}>Agregar proveedor</Button>}
          />
        ) : (
          <Table
            bare
            data={rows}
            emptyMessage="Sin resultados para la búsqueda"
            columns={[
              {
                key: 'name',
                header: 'Proveedor',
                render: (supplier: Supplier) => (
                  <div>
                    <span className="font-medium text-slate-800">{supplier.name}</span>
                    {supplier.taxId && (
                      <span className="block text-xs text-slate-400">NIT {supplier.taxId}</span>
                    )}
                  </div>
                ),
              },
              {
                key: 'contact',
                header: 'Contacto',
                render: (supplier: Supplier) =>
                  supplier.contact || <span className="text-slate-400">—</span>,
              },
              {
                key: 'phone',
                header: 'Teléfono',
                render: (supplier: Supplier) =>
                  supplier.phone ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      {supplier.phone}
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  ),
              },
              {
                key: 'email',
                header: 'Correo',
                render: (supplier: Supplier) =>
                  supplier.email ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-slate-400" />
                      <span className="max-w-[220px] truncate">{supplier.email}</span>
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  ),
              },
              {
                key: 'products',
                header: 'Productos',
                render: (supplier: Supplier) =>
                  db.products.filter(product => product.mainSupplierId === supplier.id).length,
              },
              {
                key: 'active',
                header: 'Estado',
                render: (supplier: Supplier) =>
                  isActive(supplier) ? (
                    <Badge variant="success">Activo</Badge>
                  ) : (
                    <Badge variant="default">Inactivo</Badge>
                  ),
              },
              {
                key: 'actions',
                header: '',
                render: (supplier: Supplier) => (
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(supplier)}
                      aria-label={`Editar ${supplier.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {isActive(supplier) ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => setDeactivateTarget(supplier)}
                        aria-label={`Desactivar ${supplier.name}`}
                      >
                        <PowerOff className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-emerald-700 hover:bg-emerald-50 hover:text-emerald-700"
                        onClick={() => setSupplierActive(supplier.id, true)}
                        aria-label={`Activar ${supplier.name}`}
                      >
                        <Power className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ),
              },
            ]}
          />
        )}
      </div>

      <Modal
        open={open}
        title={editing ? 'Editar proveedor' : 'Nuevo proveedor'}
        onClose={closeModal}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>
              Cancelar
            </Button>
            <Button type="submit" form="supplier-form">
              {editing ? 'Guardar cambios' : 'Agregar proveedor'}
            </Button>
          </>
        }
      >
        <form id="supplier-form" className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Input
            label="Nombre o razón social"
            placeholder="Ej. Distribuciones Andinas SAS"
            error={errors.name?.message}
            {...register('name')}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="NIT / identificación (opcional)"
              placeholder="900.123.456-7"
              error={errors.taxId?.message}
              {...register('taxId')}
            />
            <Input
              label="Persona de contacto (opcional)"
              placeholder="Ej. Laura Gómez"
              error={errors.contact?.message}
              {...register('contact')}
            />
            <Input
              label="Teléfono (opcional)"
              placeholder="300 000 0000"
              error={errors.phone?.message}
              {...register('phone')}
            />
            <Input
              label="Correo (opcional)"
              type="email"
              placeholder="compras@proveedor.com"
              error={errors.email?.message}
              {...register('email')}
            />
          </div>
          <Textarea
            label="Dirección (opcional)"
            placeholder="Calle 00 #00-00, ciudad"
            error={errors.address?.message}
            {...register('address')}
          />
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deactivateTarget)}
        title="Desactivar proveedor"
        message={`"${deactivateTarget?.name ?? ''}" dejará de aparecer al registrar compras. Podrás reactivarlo cuando quieras.`}
        confirmLabel="Desactivar"
        onConfirm={() => {
          if (deactivateTarget) setSupplierActive(deactivateTarget.id, false);
        }}
        onClose={() => setDeactivateTarget(null)}
      />
    </div>
  );
}
