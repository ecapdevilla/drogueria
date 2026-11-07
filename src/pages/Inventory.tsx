import React, { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useHotkeys } from '../hooks/useHotkeys';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertTriangle,
  Boxes,
  CalendarClock,
  Download,
  PackageCheck,
  PackageSearch,
  PackageX,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { Table } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { PageHeader } from '../components/layout/PageHeader';
import { AdjustmentInput, adjustmentSchema } from '../domain/schemas';
import { AdjustmentReason, Lot } from '../types';
import { downloadCSV, toCSV } from '../utils/csv';
import { formatDate } from '../utils/date';
import {
  EXPIRY_CRITICAL_DAYS,
  EXPIRY_WARNING_DAYS,
  ExpiryStatus,
  daysUntilExpiry,
  expiryStatus,
} from '../services/inventory.service';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'default';
type StatusFilter = 'ALL' | ExpiryStatus;

interface InventoryRow {
  lot: Lot;
  productName: string;
  status: ExpiryStatus;
  days: number;
}

const STATUS_META: Record<ExpiryStatus, { label: string; badge: BadgeVariant }> = {
  EXPIRED: { label: 'Vencido', badge: 'danger' },
  CRITICAL: { label: `≤${EXPIRY_CRITICAL_DAYS} días`, badge: 'warning' },
  WARNING: { label: `≤${EXPIRY_WARNING_DAYS} días`, badge: 'info' },
  OK: { label: 'Vigente', badge: 'success' },
};

const EMPTY_ADJUSTMENT: AdjustmentInput = {
  lotId: '',
  newQuantity: 0,
  reason: 'COUNT',
  note: '',
};

const daysLabel = (days: number): string => {
  if (!Number.isFinite(days)) return '—';
  if (days < 0) return `Vencido hace ${Math.abs(days)} día${Math.abs(days) === 1 ? '' : 's'}`;
  if (days === 0) return 'Vence hoy';
  return `En ${days} día${days === 1 ? '' : 's'}`;
};

export default function Inventory() {
  const db = useAppStore(s => s.db);
  const adjustLot = useAppStore(s => s.adjustLot);

  const [filter, setFilter] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [target, setTarget] = useState<Lot | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  useHotkeys([{ key: 'F2', allowInInput: true, handler: () => searchRef.current?.focus() }]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<AdjustmentInput>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: EMPTY_ADJUSTMENT,
  });

  const now = new Date();
  const term = filter.trim().toLowerCase();

  const allRows: InventoryRow[] = db.lots
    .map(lot => {
      const product = db.products.find(p => p.id === lot.productId);
      return {
        lot,
        productName: product?.commercialName ?? 'Producto eliminado',
        status: expiryStatus(lot.expiryDate, now),
        days: daysUntilExpiry(lot.expiryDate, now),
      };
    })
    .sort((a, b) => a.days - b.days);

  const rows = allRows
    .filter(row => statusFilter === 'ALL' || row.status === statusFilter)
    .filter(
      row =>
        !term ||
        row.lot.code.toLowerCase().includes(term) ||
        row.productName.toLowerCase().includes(term),
    );

  const withStock = allRows.filter(row => row.lot.quantity > 0);
  const counts = {
    active: withStock.filter(row => row.lot.enabled).length,
    expired: withStock.filter(row => row.status === 'EXPIRED').length,
    critical: withStock.filter(row => row.status === 'CRITICAL').length,
    warning: withStock.filter(row => row.status === 'WARNING').length,
    ok: withStock.filter(row => row.status === 'OK').length,
  };
  const expiredUnits = withStock
    .filter(row => row.status === 'EXPIRED')
    .reduce((sum, row) => sum + row.lot.quantity, 0);

  const filterOptions: { value: StatusFilter; label: string; count: number }[] = [
    { value: 'ALL', label: 'Todos', count: allRows.length },
    { value: 'EXPIRED', label: 'Vencidos', count: counts.expired },
    { value: 'CRITICAL', label: `≤${EXPIRY_CRITICAL_DAYS} días`, count: counts.critical },
    { value: 'WARNING', label: `≤${EXPIRY_WARNING_DAYS} días`, count: counts.warning },
    { value: 'OK', label: 'Vigentes', count: counts.ok },
  ];

  const targetProduct = target ? db.products.find(p => p.id === target.productId) : null;
  const watchedQuantity = Number(watch('newQuantity'));
  const delta = target && Number.isFinite(watchedQuantity) ? watchedQuantity - target.quantity : 0;

  const openAdjustment = (lot: Lot, reason: AdjustmentReason = 'COUNT') => {
    setTarget(lot);
    reset({
      lotId: lot.id,
      newQuantity: reason === 'EXPIRED' ? 0 : lot.quantity,
      reason,
      note: '',
    });
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    setTarget(null);
    reset(EMPTY_ADJUSTMENT);
  };

  const onSubmit = (values: AdjustmentInput) => {
    adjustLot(values);
    closeModal();
  };

  const exportCSV = () => {
    downloadCSV(
      'inventario_vencimientos.csv',
      toCSV(
        rows.map(row => ({
          lote: row.lot.code,
          producto: row.productName,
          cantidad: row.lot.quantity,
          vencimiento: formatDate(row.lot.expiryDate),
          dias_para_vencer: Number.isFinite(row.days) ? row.days : '',
          estado: STATUS_META[row.status].label,
        })),
      ),
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventario"
        subtitle="Lotes con trazabilidad FEFO (primero en vencer, primero en salir)"
        actions={
          <Button variant="secondary" onClick={exportCSV}>
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[
          {
            label: 'Lotes activos',
            value: counts.active,
            icon: <PackageCheck className="h-5 w-5" />,
            tone: 'bg-brand-50 text-brand-600',
          },
          {
            label: `Vencen en ≤${EXPIRY_CRITICAL_DAYS} días`,
            value: counts.critical,
            icon: <CalendarClock className="h-5 w-5" />,
            tone: 'bg-amber-50 text-amber-600',
          },
          {
            label: `Vencen en ≤${EXPIRY_WARNING_DAYS} días`,
            value: counts.warning,
            icon: <PackageSearch className="h-5 w-5" />,
            tone: 'bg-sky-50 text-sky-600',
          },
          {
            label: 'Lotes vencidos',
            value: counts.expired,
            icon: <AlertTriangle className="h-5 w-5" />,
            tone: 'bg-rose-50 text-rose-600',
          },
        ].map(card => (
          <div key={card.label} className="card p-5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {card.label}
              </p>
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.tone}`}
              >
                {card.icon}
              </span>
            </div>
            <p className="mt-2 font-display text-2xl font-bold tracking-tight text-slate-900">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {counts.expired > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <p>
            <span className="font-semibold">{counts.expired}</span> lote(s) vencidos con{' '}
            <span className="font-semibold">{expiredUnits}</span> unidades. Descárgalos para que no
            se vendan.
          </p>
        </div>
      )}

      {counts.critical > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <p>
            <span className="font-semibold">{counts.critical}</span> lote(s) vencen en los próximos{' '}
            {EXPIRY_CRITICAL_DAYS} días. Prioriza su rotación en el punto de venta.
          </p>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                ref={searchRef}
                placeholder="Buscar por producto o lote..."
                value={filter}
                onChange={event => setFilter(event.target.value)}
                className="pl-9"
                aria-label="Buscar lotes"
              />
            </div>
            <p className="text-xs font-medium text-slate-500">
              {rows.length} lote{rows.length === 1 ? '' : 's'} mostrado
              {rows.length === 1 ? '' : 's'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por vencimiento">
            {filterOptions.map(option => {
              const active = statusFilter === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setStatusFilter(option.value)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    active
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {option.label} · {option.count}
                </button>
              );
            })}
          </div>
        </div>

        {db.lots.length === 0 ? (
          <EmptyState
            icon={<Boxes className="h-7 w-7" />}
            title="Sin lotes"
            description="Registra compras para crear lotes y controlar vencimientos."
          />
        ) : (
          <Table
            bare
            data={rows}
            emptyMessage="Sin lotes para el filtro seleccionado"
            columns={[
              {
                key: 'code',
                header: 'Lote',
                render: (row: InventoryRow) => (
                  <div>
                    <span className="font-mono text-xs text-slate-600">{row.lot.code}</span>
                    {!row.lot.enabled && (
                      <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Inactivo
                      </span>
                    )}
                  </div>
                ),
              },
              {
                key: 'product',
                header: 'Producto',
                render: (row: InventoryRow) => (
                  <span className="font-medium text-slate-800">{row.productName}</span>
                ),
              },
              { key: 'quantity', header: 'Stock', render: (row: InventoryRow) => row.lot.quantity },
              {
                key: 'expiryDate',
                header: 'Vence',
                render: (row: InventoryRow) => formatDate(row.lot.expiryDate),
              },
              {
                key: 'days',
                header: 'Días',
                render: (row: InventoryRow) => (
                  <span
                    className={
                      row.status === 'EXPIRED'
                        ? 'font-semibold text-red-600'
                        : row.status === 'CRITICAL'
                          ? 'font-semibold text-amber-600'
                          : 'text-slate-600'
                    }
                  >
                    {daysLabel(row.days)}
                  </span>
                ),
              },
              {
                key: 'status',
                header: 'Estado',
                render: (row: InventoryRow) => (
                  <Badge variant={STATUS_META[row.status].badge}>
                    {STATUS_META[row.status].label}
                  </Badge>
                ),
              },
              {
                key: 'actions',
                header: '',
                render: (row: InventoryRow) => (
                  <div className="flex items-center justify-end gap-1">
                    {row.status === 'EXPIRED' && row.lot.quantity > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => openAdjustment(row.lot, 'EXPIRED')}
                        aria-label={`Descargar lote vencido ${row.lot.code}`}
                      >
                        <PackageX className="h-4 w-4" />
                        Descargar
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => openAdjustment(row.lot)}
                      aria-label={`Ajustar lote ${row.lot.code}`}
                    >
                      <SlidersHorizontal className="h-4 w-4" />
                      Ajustar
                    </Button>
                  </div>
                ),
              },
            ]}
          />
        )}
      </div>

      <Modal
        open={open}
        title="Ajustar inventario"
        onClose={closeModal}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>
              Cancelar
            </Button>
            <Button type="submit" form="adjustment-form">
              Registrar ajuste
            </Button>
          </>
        }
      >
        {target && (
          <div className="mb-4 rounded-xl bg-slate-50 p-3 text-sm">
            <p className="font-semibold text-slate-800">
              {targetProduct?.commercialName ?? 'Producto'}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Lote <span className="font-mono">{target.code}</span> · Vence{' '}
              {formatDate(target.expiryDate)} · Stock actual {target.quantity} uds.
            </p>
          </div>
        )}

        <form
          id="adjustment-form"
          className="space-y-4"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          <Input
            label="Cantidad real en el lote"
            type="number"
            min={0}
            step="1"
            error={errors.newQuantity?.message}
            {...register('newQuantity', { valueAsNumber: true })}
          />
          <Select label="Motivo del ajuste" error={errors.reason?.message} {...register('reason')}>
            <option value="COUNT">Conteo físico</option>
            <option value="DAMAGE">Daño o pérdida</option>
            <option value="EXPIRED">Vencimiento</option>
            <option value="OTHER">Otro</option>
          </Select>
          <Textarea
            label="Nota (opcional)"
            placeholder="Detalle del ajuste"
            error={errors.note?.message}
            {...register('note')}
          />

          {delta !== 0 && (
            <div
              className={`rounded-xl px-3 py-2 text-sm font-medium ${
                delta < 0 ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'
              }`}
            >
              {delta < 0
                ? `Se descontarán ${Math.abs(delta)} unidad(es) del stock.`
                : `Se agregarán ${delta} unidad(es) al stock.`}
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}
