import React, { useState } from 'react';
import { History, PackageCheck, RotateCcw } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { Table } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Checkbox } from '../components/ui/Checkbox';
import { Button } from '../components/ui/Button';
import { PageHeader } from '../components/layout/PageHeader';
import { Return } from '../types';
import { cop } from '../utils/money';
import { formatDate } from '../utils/date';

export default function Returns() {
  const db = useAppStore(s => s.db);
  const processReturn = useAppStore(s => s.processReturn);
  const [selectedSale, setSelectedSale] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [restock, setRestock] = useState(true);

  const pendingSales = db.sales.filter(s => !s.returned);
  const sale = selectedSale ? db.sales.find(s => s.id === selectedSale) : undefined;

  const handleProcess = () => {
    if (!selectedSale || !reason.trim()) return;
    const target = db.sales.find(s => s.id === selectedSale);
    if (!target) return;

    processReturn({
      saleId: selectedSale,
      items: target.items.map(item => ({ productId: item.productId, quantity: item.quantity })),
      reason,
      restock,
    });
    setSelectedSale(null);
    setReason('');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Devoluciones"
        subtitle="Gestiona devoluciones de ventas y la reposición de inventario"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <RotateCcw className="h-5 w-5" />
            </span>
            <div>
              <h2 className="section-title">Procesar devolución</h2>
              <p className="text-xs text-slate-500">Selecciona la venta y el motivo.</p>
            </div>
          </div>

          {pendingSales.length === 0 ? (
            <EmptyState
              icon={<PackageCheck className="h-7 w-7" />}
              title="Sin ventas pendientes"
              description="Todas las ventas registradas ya fueron devueltas o no hay ventas aún."
            />
          ) : (
            <div className="mt-4 space-y-4">
              <Select
                label="Venta"
                value={selectedSale ?? ''}
                onChange={event => setSelectedSale(event.target.value || null)}
              >
                <option value="">Seleccionar venta</option>
                {pendingSales.map(pending => (
                  <option key={pending.id} value={pending.id}>
                    {formatDate(pending.createdAt)} · {cop(pending.total)} ·{' '}
                    {pending.items.map(item => item.productName).join(', ')}
                  </option>
                ))}
              </Select>

              {sale && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Productos de la venta
                  </p>
                  <ul className="mt-2 space-y-1">
                    {sale.items.map(item => (
                      <li
                        key={item.productId}
                        className="flex justify-between text-sm text-slate-600"
                      >
                        <span>{item.productName}</span>
                        <span className="font-medium text-slate-800">
                          {item.quantity} × {cop(item.unitPrice)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <Input
                label="Razón de la devolución"
                placeholder="Ej. Producto vencido o defectuoso"
                value={reason}
                onChange={event => setReason(event.target.value)}
              />

              <Checkbox
                label="Reinsertar stock"
                description="Si se marca, las unidades vuelven al inventario."
                checked={restock}
                onChange={event => setRestock(event.target.checked)}
              />

              <Button onClick={handleProcess} disabled={!selectedSale || !reason.trim()}>
                Procesar devolución
              </Button>
            </div>
          )}
        </section>

        <section className="card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
            <History className="h-4 w-4 text-slate-400" />
            <h2 className="section-title">Devoluciones registradas</h2>
          </div>

          {db.returns.length === 0 ? (
            <EmptyState
              icon={<History className="h-7 w-7" />}
              title="Sin devoluciones"
              description="Aún no se han registrado devoluciones."
            />
          ) : (
            <Table
              bare
              data={db.returns}
              columns={[
                {
                  key: 'createdAt',
                  header: 'Fecha',
                  render: (r: Return) => formatDate(r.createdAt),
                },
                {
                  key: 'reason',
                  header: 'Razón',
                  render: (r: Return) => (
                    <span className="block max-w-[220px] truncate" title={r.reason}>
                      {r.reason}
                    </span>
                  ),
                },
                {
                  key: 'restock',
                  header: 'Reposición',
                  render: (r: Return) =>
                    r.restock ? (
                      <Badge variant="success">Sí</Badge>
                    ) : (
                      <Badge variant="default">No</Badge>
                    ),
                },
                {
                  key: 'saleId',
                  header: 'Venta',
                  render: (r: Return) => {
                    const related = db.sales.find(s => s.id === r.saleId);
                    const label = related?.items.map(item => item.productName).join(', ');
                    return <span className="text-xs text-slate-500">{label ?? '-'}</span>;
                  },
                },
              ]}
            />
          )}
        </section>
      </div>
    </div>
  );
}
