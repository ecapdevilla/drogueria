import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Table } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { formatDate } from '../utils/date';

export default function Returns() {
  const db = useAppStore(s => s.db);
  const processReturn = useAppStore(s => s.processReturn);
  const [selectedSale, setSelectedSale] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [restock, setRestock] = useState(true);

  const pendingSales = db.sales.filter(s => !s.returned);

  const handleProcess = () => {
    if (!selectedSale || !reason) return;
    const sale = db.sales.find(s => s.id === selectedSale)!;
    processReturn({
      saleId: selectedSale,
      items: sale.items.map(i => ({ productId: i.productId, quantity: i.quantity })),
      reason,
      restock,
    });
    setSelectedSale(null);
    setReason('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Devoluciones</h2>
        <p className="text-sm text-slate-500">Gestiona devoluciones de ventas</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-4 border border-slate-200">
          <h3 className="font-semibold text-slate-700 mb-3">Procesar devolución</h3>
          {pendingSales.length === 0 ? (
            <EmptyState title="Sin ventas pendientes" description="Todas las ventas están completas" />
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-600">Seleccionar venta</label>
                <select
                  value={selectedSale ?? ''}
                  onChange={e => setSelectedSale(e.target.value || null)}
                  className="w-full mt-1 px-3 py-2 text-sm border border-slate-300 rounded"
                >
                  <option value="">Seleccionar</option>
                  {pendingSales.map(s => (
                    <option key={s.id} value={s.id}>
                      {formatDate(s.createdAt)} - {s.items.map(i => i.productName).join(', ')}
                    </option>
                  ))}
                </select>
              </div>
              <Input label="Razón" value={reason}
                onChange={e => setReason(e.target.value)} />
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="restock"
                  checked={restock}
                  onChange={e => setRestock(e.target.checked)}
                />
                <label htmlFor="restock" className="text-sm text-slate-600">Reinsertar stock</label>
              </div>
              <Button onClick={handleProcess} disabled={!selectedSale || !reason}>Procesar</Button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-4 border border-slate-200">
          <h3 className="font-semibold text-slate-700 mb-3">Devoluciones registradas</h3>
          {db.returns.length === 0 ? (
            <EmptyState title="Sin devoluciones" description="Aún no hay devoluciones" />
          ) : (
            <Table
              data={db.returns}
              columns={[
                { key: 'createdAt', header: 'Fecha', render: r => formatDate(r.createdAt) },
                { key: 'reason', header: 'Razón' },
                { key: 'restock', header: 'Reposición', render: r => r.restock ? <Badge variant="success">Sí</Badge> : <Badge variant="default">No</Badge> },
                {
                  key: 'saleId', header: 'Venta',
                  render: r => db.sales.find(s => s.id === r.saleId)?.items.map(i => i.productName).join(', ') ?? '-',
                },
              ]}
            />
          )}
        </div>
      </div>
    </div>
  );
}