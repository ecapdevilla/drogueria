import React, { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useHotkeys } from '../hooks/useHotkeys';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, Package, PackagePlus, Search } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Checkbox } from '../components/ui/Checkbox';
import { Modal } from '../components/ui/Modal';
import { DataTable } from '../components/ui/DataTable';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { PageHeader } from '../components/layout/PageHeader';
import { ProductInput, productSchema } from '../domain/schemas';
import { Product } from '../types';
import { cop } from '../utils/money';

const EMPTY_PRODUCT: ProductInput = {
  internalCode: '',
  barcode: '',
  commercialName: '',
  category: '',
  purchasePrice: 0,
  salePrice: 0,
  minStock: 0,
  active: true,
};

const asNumber = (value: unknown) => (value === '' || value === null ? 0 : Number(value));

export default function Products() {
  const db = useAppStore(s => s.db);
  const addProduct = useAppStore(s => s.addProduct);
  const updateProduct = useAppStore(s => s.updateProduct);
  const deleteProduct = useAppStore(s => s.deleteProduct);
  const searchProducts = useAppStore(s => s.searchProducts);
  const lowStock = useAppStore(s => s.lowStockProducts)();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues: EMPTY_PRODUCT,
  });

  const filtered = q ? searchProducts(q) : db.products;

  const openAdd = (defaults: Partial<ProductInput> = {}) => {
    setEditingId(null);
    reset({ ...EMPTY_PRODUCT, ...defaults });
    setOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditingId(product.id);
    reset({
      internalCode: product.internalCode,
      barcode: product.barcode,
      commercialName: product.commercialName,
      category: product.category,
      purchasePrice: product.purchasePrice,
      salePrice: product.salePrice,
      minStock: product.minStock,
      active: product.active,
    });
    setOpen(true);
  };

  const onSubmit = (values: ProductInput) => {
    if (editingId) updateProduct(editingId, values);
    else addProduct(values);
    setOpen(false);
    reset(EMPTY_PRODUCT);
  };

  const trimmedQuery = q.trim();
  const isCode = /^\d{6,}$/.test(trimmedQuery);
  const exactExists = db.products.some(
    product =>
      product.barcode === trimmedQuery ||
      product.internalCode.toLowerCase() === trimmedQuery.toLowerCase(),
  );
  const showCreateFromSearch = Boolean(trimmedQuery && !exactExists);
  const createFromSearch = () => {
    if (isCode) openAdd({ barcode: trimmedQuery, internalCode: trimmedQuery });
    else openAdd({ commercialName: trimmedQuery });
  };

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  useHotkeys(
    [
      { key: 'F2', allowInInput: true, handler: () => searchRef.current?.focus() },
      { key: 'n', handler: () => openAdd() },
      { key: 'n', alt: true, allowInInput: true, handler: () => openAdd() },
      {
        key: 'Enter',
        ctrl: true,
        allowInInput: true,
        handler: () => {
          if (open) void handleSubmit(onSubmit)();
        },
      },
    ],
    [openAdd, open, handleSubmit, onSubmit],
  );

  const columns = [
    { key: 'internalCode', header: 'Código' },
    {
      key: 'commercialName',
      header: 'Nombre',
      render: (p: Product) => (
        <span className="font-medium text-slate-800">{p.commercialName}</span>
      ),
    },
    { key: 'category', header: 'Categoría' },
    { key: 'purchasePrice', header: 'Costo', render: (p: Product) => cop(p.purchasePrice) },
    { key: 'salePrice', header: 'Venta', render: (p: Product) => cop(p.salePrice) },
    {
      key: 'stock',
      header: 'Stock',
      render: (p: Product) => (
        <span
          className={p.stock <= p.minStock && p.minStock > 0 ? 'font-semibold text-amber-600' : ''}
        >
          {p.stock}
        </span>
      ),
    },
    { key: 'minStock', header: 'Mín.' },
    {
      key: 'active',
      header: 'Estado',
      render: (p: Product) =>
        p.active ? (
          <Badge variant="success">Activo</Badge>
        ) : (
          <Badge variant="default">Inactivo</Badge>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Productos"
        subtitle={`${db.products.length} productos en catálogo`}
        actions={
          <Button onClick={() => openAdd()}>
            <PackagePlus className="h-4 w-4" />
            Nuevo producto
          </Button>
        }
      />

      {lowStock.length > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <p>
            <span className="font-semibold">{lowStock.length}</span> producto(s) con stock por
            debajo del mínimo. Revisa el inventario para reabastecer.
          </p>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              ref={searchRef}
              placeholder="Buscar por nombre, código o categoría..."
              value={q}
              onChange={event => setQ(event.target.value)}
              className="pl-9"
              aria-label="Buscar productos"
            />
          </div>
          <p className="text-xs font-medium text-slate-500">
            {filtered.length} resultado{filtered.length === 1 ? '' : 's'}
          </p>
        </div>

        {showCreateFromSearch && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-brand-50/50 px-4 py-2.5">
            <p className="text-xs text-slate-600">«{trimmedQuery}» no está en el catálogo.</p>
            <Button variant="secondary" size="sm" onClick={createFromSearch}>
              <PackagePlus className="h-3.5 w-3.5" />
              Crear producto
            </Button>
          </div>
        )}

        {filtered.length === 0 ? (
          <EmptyState
            icon={<Package className="h-7 w-7" />}
            title="Sin productos"
            description="Agrega tu primer producto para comenzar a vender."
            action={<Button onClick={() => openAdd()}>Agregar producto</Button>}
          />
        ) : (
          <DataTable
            data={filtered}
            columns={columns}
            onRowAction={(action, row) => (action === 'edit' ? openEdit(row) : setDeleting(row))}
            emptyMessage="Sin productos"
          />
        )}
      </div>

      <Modal
        open={open}
        title={editingId ? 'Editar producto' : 'Nuevo producto'}
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="product-form">
              {editingId ? 'Guardar cambios' : 'Crear producto'}
            </Button>
          </>
        }
      >
        <form id="product-form" className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Input
            label="Nombre comercial"
            placeholder="Ej. Acetaminofén 500 mg"
            error={errors.commercialName?.message}
            {...register('commercialName')}
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Código interno"
              placeholder="P001"
              error={errors.internalCode?.message}
              {...register('internalCode')}
            />
            <Input
              label="Código de barras"
              placeholder="7701234567890"
              error={errors.barcode?.message}
              {...register('barcode')}
            />
          </div>

          <Input
            label="Categoría"
            placeholder="Analgésicos"
            error={errors.category?.message}
            {...register('category')}
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Costo (COP)"
              type="number"
              min={0}
              step="1"
              error={errors.purchasePrice?.message}
              {...register('purchasePrice', { setValueAs: asNumber })}
            />
            <Input
              label="Precio de venta (COP)"
              type="number"
              min={0}
              step="1"
              error={errors.salePrice?.message}
              {...register('salePrice', { setValueAs: asNumber })}
            />
          </div>

          <Input
            label="Stock mínimo"
            type="number"
            min={0}
            step="1"
            error={errors.minStock?.message}
            {...register('minStock', { setValueAs: asNumber })}
          />

          <Checkbox
            label="Producto activo"
            description="Los productos inactivos no aparecen en el punto de venta."
            {...register('active')}
          />
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title="Eliminar producto"
        message={`¿Estás seguro de eliminar "${deleting?.commercialName}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={() => {
          if (deleting) deleteProduct(deleting.id);
          setDeleting(null);
        }}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
