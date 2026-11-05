import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Table } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { formatDate, isExpired } from '../utils/date';

export default function Inventory() {
  const db = useAppStore(s => s.db);
  const [filter, setFilter] = useState('');

  const lots = db.lots.filter(l => {
    if (!filter) return true;
    const p = db.products.find(pp => pp.id === l.productId);
    return p?.commercialName.toLowerCase().includes(filter.toLowerCase()) ||
      l.code.toLowerCase().includes(filter.toLowerCase());
  });

  const expiringSoon = lots.filter(l => {
    const d = new Date(l.expiryDate);
    const now = new Date();
    const diff = (d.getTime() - now.getTime()) / 86400000;
    return diff > 0 && diff <= 30;
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Inventario</h2>
        <p className="text-sm text-slate-500">Lotes con trazabilidad FEFO</p>
      </div>

      {expiringSoon.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded p-3 text-sm text-orange-800">
          ⚠️ {expiringSoon.length} lote(s) vencen en ≤ 30 días.
        </div>
      )}

      {lots.length === 0 ? (
        <EmptyState title="Sin lotes" description="Agrega compras para crear lotes" />
      ) : (
        <Table
          data={lots}
          columns={[
            { key: 'code', header: 'Lote' },
            {
              key: 'productId', header: 'Producto',
              render: l => db.products.find(p => p.id === l.productId)?.commercialName ?? '-',
            },
            { key: 'quantity', header: 'Stock' },
            { key: 'expiryDate', header: 'Vence', render: l => formatDate(l.expiryDate) },
            {
              key: 'expiryDate', header: 'Estado',
              render: l => isExpired(l.expiryDate)
                ? <Badge variant="danger">Vencido</Badge>
                : <Badge variant="success">OK</Badge>,
            },
            {
              key: 'enabled', header: 'Habilitado',
              render: l => l.enabled ? <Badge variant="success">Sí</Badge> : <Badge variant="default">No</Badge>,
            },
          ]}
        />
      )}
    </div>
  );
}