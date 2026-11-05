import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Table } from '../components/ui/Table';
import { EmptyState } from '../components/ui/EmptyState';
import { cop } from '../utils/money';

interface PurchaseLine {
  productId: string;
  quantity: number;
  unitCost: number;
  lotCode: string;
  expiryDate: string;
}

export default function Purchases() {
  const db = useAppStore(s => s.db);
  const addPurchase = useAppStore(s => s.addPurchase);
  const [open, setOpen] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [invoiceRef, setInvoiceRef] = useState('');
  const [lines, setLines] = useState<PurchaseLine[]>([]);

  const addLine = () => {
    setLines(l => [...l, { productId: '', quantity: 1, unitCost: 0, lotCode: '', expiryDate: '' }]);
  };

  const updateLine = (i: number, patch: Partial<PurchaseLine>) => {
    setLines(l => l.map((x, idx) => idx === i ? { ...x, ...patch } : x));
  };

  const removeLine = (i: number) => {
    setLines(l => l.filter((_, idx) => idx !== i));
  };

  const total = lines.reduce((s, l) => s + l.quantity * l.unitCost, 0);

  const handleSubmit = () => {
    if (!supplierId || !lines.length) return;
    addPurchase({ supplierId, invoiceRef, items: lines });
    setOpen(false);
    setSupplierId('');
    setInvoiceRef('');
    setLines([]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">Compras</h2>
        <Button onClick={() => { addLine(); setOpen(true); }}>+ Nueva compra</Button>
      </div>

      {db.purchases.length === 0 ? (
        <EmptyState title="Sin compras" description="Registra tus compras a proveedores" />
      ) : (
        <Table
          data={db.purchases}
          columns={[
            { key: 'date', header: 'Fecha' },
            {
              key: 'supplierId', header: 'Proveedor',
              render: p => db.suppliers.find(s => s.id === p.supplierId)?.name ?? '-',
            },
            { key: 'invoiceRef', header: 'Factura' },
            { key: 'total', header: 'Total', render: p => cop(p.total) },
          ]}
        />
      )}

      <Modal
        open={open}
        title="Nueva Compra"
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!supplierId || !lines.length}>Guardar</Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-600">Prog. </label>
            <select
              value={supplierId}
              onChange={e => setSupplierId(e.target.value)}
              className="w-full mt-1 px-3 py-2 text-sm border border-slate-300 rounded"
            >
              <option value="">Seleccionar</option>
              {db.suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <Input label="Referencia de facturación" value={invoiceRef}
            onChange={e => setInvoiceRef(e.target.value)} />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Cantidad</span>
              <Button size="sm" variant="secondary" onClick={addLine}>+ Agregar</Button>
            </div>
            {lines.map((line, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-end bg-slate-50 p-2 rounded">
                <div className="col-span-4">
                  <select
                    value={line.productId}
                    onChange={e => updateLine(i, { productId: e.target.value })}
                    className="w-full text-xs px-2 py-1.5 border border-slate-300 rounded"
                  >
                    <option value="">Producto</option>
                    {db.products.map(p => <option key={p.id} value={p.id}>{p.commercialName}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <Input type="number" placeholder="Cant." value={line.quantity}
                    onChange={e => updateLine(i, { quantity: +e.target.value })} />
                </div>
                <div className="col-span-2">
                  <Input type="number" placeholder="Costo" value={line.unitCost}
                    onChange={e => updateLine(i, { unitCost: +e.target.value })} />
                </div>
                <div className="col-span-3">
                  <Input type="date" value={line.expiryDate}
                    onChange={e => updateLine(i, { expiryDate: e.target.value })} />
                </div>
                <div className="col-span-1">
                  <Button size="sm" variant="danger" onClick={() => removeLine(i)}>×</Button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between text-sm font-semibold">
            <span>Total:</span><span>{cop(total)}</span>
          </div>
        </div>
      </Modal>
    </div>
  );
}