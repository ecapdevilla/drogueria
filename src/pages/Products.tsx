import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { DataTable } from '../components/ui/DataTable';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { cop } from '../utils/money';
import { useToast } from '../hooks/useToast';

export default function Products() {
  const db = useAppStore(s => s.db);
  const addProduct = useAppStore(s => s.addProduct);
  const updateProduct = useAppStore(s => s.updateProduct);
  const searchProducts = useAppStore(s => s.searchProducts);
  const lowStock = useAppStore(s => s.lowStockProducts);
  const pushToast = useAppStore(s => s.pushToast);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<any>(null);
  const [draft, setDraft] = useState({
    internalCode: '', barcode: '', commercialName: '', category: '',
    purchasePrice: 0, salePrice: 0, minStock: 0,
  });

  const filtered = q ? searchProducts(q) : db.products;

  const openAdd = () => {
    setEditingId(null);
    setDraft({ internalCode: '', barcode: '', commercialName: '', category: '', purchasePrice: 0, salePrice: 0, minStock: 0 });
    setOpen(true);
  };

  const openEdit = (p: any) => {
    setEditingId(p.id);
    setDraft({
      internalCode: p.internalCode, barcode: p.barcode, commercialName: p.commercialName,
      category: p.category, purchasePrice: p.purchasePrice, salePrice: p.salePrice, minStock: p.minStock,
    });
    setOpen(true);
  };

  const handleSave = () => {
    if (!draft.commercialName) return;
    if (editingId) {
      updateProduct(editingId, { ...draft });
      pushToast('Producto actualizado', 'success');
    } else {
      addProduct(draft);
      pushToast('Producto agregado', 'success');
    }
    setOpen(false);
  };

  const columns = [
    { key: 'internalCode', header: 'Código' },
    { key: 'commercialName', header: 'Nombre' },
    { key: 'category', header: 'Categoría' },
    { key: 'purchasePrice', header: 'Costo', render: r => cop(r.purchasePrice) },
    { key: 'salePrice', header: 'Venta', render: r => cop(r.salePrice) },
    { key: 'stock', header: 'Stock' },
    { key: 'minStock', header: 'Mín.' },
    {
      key: 'active', header: 'Estado',
      render: r => r.active ? <Badge variant="success">Activo</Badge> : <Badge variant="default">Inactivo</Badge>,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Productos</h2>
          <p className="text-sm text-slate-500">{db.products.length} productos en catálogo</p>
        </div>
        <Button onClick={openAdd}>+ Nuevo Producto</Button>
      </div>

      <Input
        placeholder="Buscar producto..."
        value={q}
        onChange={e => setQ(e.target.value)}
        className="max-w-md"
      />

      {lowStock.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
          ⚠️ <span className="font-semibold">{lowStock.length}</span> producto(s) con stock bajo el mínimo.
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState title="Sin productos" description="Agrega tu primer producto" />
      ) : (
        <DataTable
          data={filtered}
          columns={columns}
          onRowAction={(action, row) => action === 'edit' ? openEdit(row) : setDeleting(row)}
          emptyMessage="Sin productos"
        />
      )}

      <Modal
        open={open}
        title={editingId ? 'Editar Producto' : 'Nuevo Producto'}
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Guardar</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input label="Nombre comercial" value={draft.commercialName}
            onChange={e => setDraft(d => ({ ...d, commercialName: e.target.value }))} />
          <Input label="Código interno" value={draft.internalCode}
            onChange={e => setDraft(d => ({ ...d, internalCode: e.target.value }))} />
          <Input label="Categoría" value={draft.category}
            onChange={e => setDraft(d => ({ ...d, category: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Costo" type="number" value={draft.purchasePrice}
              onChange={e => setDraft(d => ({ ...d, purchasePrice: +e.target.value }))} />
            <Input label="Venta" type="number" value={draft.salePrice}
              onChange={e => setDraft(d => ({ ...d, salePrice: +e.target.value }))} />
          </div>
          <Input label="Stock mínimo" type="number" value={draft.minStock}
            onChange={e => setDraft(d => ({ ...d, minStock: +e.target.value }))} />
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title="Eliminar producto"
        message={`¿Estás seguro de eliminar "${deleting?.commercialName}"?`}
        confirmLabel="Eliminar"
        onConfirm={() => {
          if (deleting) {
            // Note: deleteProduct needs to be added to store/service
          }
          setDeleting(null);
        }}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
