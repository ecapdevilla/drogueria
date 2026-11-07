import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, ShoppingBag, Trash2, Truck } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { Table } from '../components/ui/Table';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/layout/PageHeader';
import { PurchaseInput, purchaseSchema } from '../domain/schemas';
import { Purchase } from '../types';
import { cop } from '../utils/money';
import { formatDate } from '../utils/date';

const emptyPurchase = (): PurchaseInput => ({
  supplierId: '',
  invoiceRef: '',
  items: [{ productId: '', quantity: 1, unitCost: 0, lotCode: '', expiryDate: '' }],
});

const asNumber = (value: unknown) => (value === '' || value === null ? 0 : Number(value));

export default function Purchases() {
  const db = useAppStore(s => s.db);
  const addPurchase = useAppStore(s => s.addPurchase);
  const [open, setOpen] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<PurchaseInput>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: emptyPurchase(),
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const items = watch('items');
  const total = (items ?? []).reduce(
    (sum, line) => sum + (Number(line?.quantity) || 0) * (Number(line?.unitCost) || 0),
    0,
  );

  const activeSupplierList = db.suppliers
    .filter(supplier => supplier.active !== false)
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));

  const openNew = () => {
    reset(emptyPurchase());
    setOpen(true);
  };

  const onSubmit = (values: PurchaseInput) => {
    addPurchase(values);
    setOpen(false);
    reset(emptyPurchase());
  };

  const itemsError = errors.items as { message?: string; root?: { message?: string } } | undefined;
  const itemsMessage = itemsError?.root?.message ?? itemsError?.message;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compras"
        subtitle="Registra entradas de inventario y costos de proveedores"
        actions={
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" />
            Nueva compra
          </Button>
        }
      />

      <div className="card overflow-hidden">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="section-title">Historial de compras</h2>
        </div>

        {db.purchases.length === 0 ? (
          <EmptyState
            icon={<Truck className="h-7 w-7" />}
            title="Sin compras registradas"
            description="Registra tu primera compra para crear lotes y aumentar el inventario."
            action={<Button onClick={openNew}>Registrar compra</Button>}
          />
        ) : (
          <Table
            bare
            data={db.purchases}
            columns={[
              { key: 'date', header: 'Fecha', render: (p: Purchase) => formatDate(p.date) },
              {
                key: 'supplierId',
                header: 'Proveedor',
                render: (p: Purchase) => db.suppliers.find(s => s.id === p.supplierId)?.name ?? '-',
              },
              {
                key: 'invoiceRef',
                header: 'Factura',
                render: (p: Purchase) => p.invoiceRef || <span className="text-slate-400">—</span>,
              },
              { key: 'items', header: 'Productos', render: (p: Purchase) => p.items.length },
              {
                key: 'total',
                header: 'Total',
                render: (p: Purchase) => (
                  <span className="font-semibold text-slate-800">{cop(p.total)}</span>
                ),
              },
            ]}
          />
        )}
      </div>

      <Modal
        open={open}
        title="Nueva compra"
        onClose={() => setOpen(false)}
        size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="purchase-form">
              Registrar compra
            </Button>
          </>
        }
      >
        <form id="purchase-form" className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Select
                label="Proveedor"
                error={errors.supplierId?.message}
                {...register('supplierId')}
              >
                <option value="">Seleccionar proveedor</option>
                {activeSupplierList.map(supplier => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </Select>
              {activeSupplierList.length === 0 && (
                <p className="text-xs font-medium text-amber-600">
                  No hay proveedores activos.{' '}
                  <Link to="/proveedores" className="underline hover:text-amber-700">
                    Crea uno
                  </Link>{' '}
                  para registrar compras.
                </p>
              )}
            </div>
            <Input
              label="Referencia de factura (opcional)"
              placeholder="FAC-0001"
              error={errors.invoiceRef?.message}
              {...register('invoiceRef')}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="section-title">Productos</h3>
                <p className="text-xs text-slate-500">
                  Agrega los productos incluidos en la compra.
                </p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  append({ productId: '', quantity: 1, unitCost: 0, lotCode: '', expiryDate: '' })
                }
              >
                <Plus className="h-4 w-4" />
                Agregar línea
              </Button>
            </div>

            {itemsMessage && (
              <p
                role="alert"
                className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-600"
              >
                {itemsMessage}
              </p>
            )}

            {fields.map((field, index) => (
              <div
                key={field.id}
                className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Línea {index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    disabled={fields.length === 1}
                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:pointer-events-none disabled:opacity-40"
                    aria-label={`Quitar línea ${index + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                  <div className="sm:col-span-6">
                    <Select
                      label="Producto"
                      error={errors.items?.[index]?.productId?.message}
                      {...register(`items.${index}.productId`)}
                    >
                      <option value="">Seleccionar producto</option>
                      {db.products.map(product => (
                        <option key={product.id} value={product.id}>
                          {product.commercialName}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="sm:col-span-2">
                    <Input
                      label="Cantidad"
                      type="number"
                      min={1}
                      step="1"
                      error={errors.items?.[index]?.quantity?.message}
                      {...register(`items.${index}.quantity`, { setValueAs: asNumber })}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Input
                      label="Costo unit."
                      type="number"
                      min={0}
                      step="1"
                      error={errors.items?.[index]?.unitCost?.message}
                      {...register(`items.${index}.unitCost`, { setValueAs: asNumber })}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Input
                      label="Lote"
                      placeholder="Opcional"
                      error={errors.items?.[index]?.lotCode?.message}
                      {...register(`items.${index}.lotCode`)}
                    />
                  </div>
                  <div className="sm:col-span-6">
                    <Input
                      label="Vencimiento"
                      type="date"
                      error={errors.items?.[index]?.expiryDate?.message}
                      {...register(`items.${index}.expiryDate`)}
                    />
                  </div>
                  <div className="sm:col-span-6 sm:self-end">
                    <div className="flex h-10 items-center justify-between rounded-xl border border-slate-200 bg-white px-3 text-sm">
                      <span className="text-slate-500">Subtotal</span>
                      <span className="font-semibold text-slate-800">
                        {cop(
                          (Number(items?.[index]?.quantity) || 0) *
                            (Number(items?.[index]?.unitCost) || 0),
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3">
            <span className="flex items-center gap-2 text-sm font-semibold text-brand-800">
              <ShoppingBag className="h-4 w-4" />
              Total de la compra
            </span>
            <span className="font-display text-xl font-bold text-brand-900">{cop(total)}</span>
          </div>
        </form>
      </Modal>
    </div>
  );
}
