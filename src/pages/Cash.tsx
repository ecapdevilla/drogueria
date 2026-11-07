import React, { useState } from 'react';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CalendarDays,
  Clock,
  Download,
  Lock,
  Scale,
  Wallet,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { Table } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { PageHeader } from '../components/layout/PageHeader';
import { cop } from '../utils/money';
import { formatDate } from '../utils/date';
import { downloadCSV } from '../utils/csv';
import { cashAudit, cashAuditToCSV, expectedCash } from '../services/cash.service';

const AUDIT_METHODS = [
  { method: 'CASH', expenseMethod: 'EFECTIVO', label: 'Efectivo' },
  { method: 'TRANSFER', expenseMethod: 'TRANSFERENCIA', label: 'Transferencia' },
  { method: 'CARD', expenseMethod: 'TARJETA', label: 'Tarjeta' },
  { method: 'OTHER', expenseMethod: 'OTRO', label: 'Otro' },
] as const;

function AuditStat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 font-display text-sm font-bold text-slate-900">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}

export default function Cash() {
  const db = useAppStore(s => s.db);
  const openCash = useAppStore(s => s.openCash);
  const closeCash = useAppStore(s => s.closeCash);
  const [openAmount, setOpenAmount] = useState('');
  const [counted, setCounted] = useState('');
  const [auditSessionId, setAuditSessionId] = useState('');

  const sessions = db.cashSessions;
  const activeSession = sessions.find(s => s.status === 'OPEN');
  const auditSession =
    sessions.find(s => s.id === auditSessionId) ??
    activeSession ??
    sessions[sessions.length - 1] ??
    null;
  const audit = auditSession ? cashAudit(db, auditSession) : null;
  const auditRows = audit
    ? AUDIT_METHODS.map(row => {
        const sales = audit.salesByPayment[row.method];
        const expenses = audit.expensesByPayment[row.expenseMethod];
        return { ...row, sales, expenses, net: sales - expenses };
      })
    : [];

  const handleOpen = () => {
    const value = Number(openAmount);
    if (!Number.isFinite(value) || value < 0) return;
    openCash(value);
    setOpenAmount('');
  };

  const handleClose = () => {
    if (!activeSession) return;
    const value = Number(counted);
    if (!Number.isFinite(value) || value < 0) return;
    closeCash(activeSession.id, value);
    setCounted('');
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Caja" subtitle="Abre y cierra tu caja diaria con control de diferencias" />

      {activeSession ? (
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-brand-950 p-6 text-white shadow-card">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-brand-300">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">
                  Caja abierta
                </span>
              </div>
              <p className="mt-3 font-display text-3xl font-bold tracking-tight">
                {cop(expectedCash(db, activeSession))}
              </p>
              <p className="mt-1 text-xs text-slate-400">Efectivo esperado en caja</p>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:gap-6">
              <div className="rounded-2xl bg-white/5 px-4 py-3 ring-1 ring-inset ring-white/10">
                <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  <Wallet className="h-3 w-3" />
                  Monto inicial
                </p>
                <p className="mt-1 font-display text-lg font-bold">
                  {cop(activeSession.initialAmount)}
                </p>
              </div>
              <div className="rounded-2xl bg-white/5 px-4 py-3 ring-1 ring-inset ring-white/10">
                <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  <Clock className="h-3 w-3" />
                  Apertura
                </p>
                <p className="mt-1 text-sm font-semibold">{formatDate(activeSession.openedAt)}</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-soft">
          <Lock className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
          <p>
            No hay una caja abierta. Abre una sesión para empezar a registrar el efectivo del turno.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <ArrowDownToLine className="h-5 w-5" />
            </span>
            <div>
              <h2 className="section-title">Abrir caja</h2>
              <p className="text-xs text-slate-500">Registra el efectivo inicial del turno.</p>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Input
              type="number"
              min={0}
              step="1"
              placeholder="Monto inicial (COP)"
              value={openAmount}
              onChange={event => setOpenAmount(event.target.value)}
              disabled={!!activeSession}
              aria-label="Monto inicial de caja"
            />
            <Button onClick={handleOpen} disabled={!openAmount || !!activeSession}>
              Abrir caja
            </Button>
          </div>
          {activeSession && <p className="mt-2 text-xs text-slate-400">Ya hay una caja abierta.</p>}
        </section>

        <section className="card p-5">
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <ArrowUpFromLine className="h-5 w-5" />
            </span>
            <div>
              <h2 className="section-title">Cerrar caja</h2>
              <p className="text-xs text-slate-500">Ingresa el efectivo contado al finalizar.</p>
            </div>
          </div>

          {activeSession ? (
            <>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Input
                  type="number"
                  min={0}
                  step="1"
                  placeholder="Dinero contado (COP)"
                  value={counted}
                  onChange={event => setCounted(event.target.value)}
                  aria-label="Dinero contado en caja"
                />
                <Button variant="danger" onClick={handleClose} disabled={!counted}>
                  Cerrar caja
                </Button>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Esperado:{' '}
                <strong className="text-slate-700">{cop(expectedCash(db, activeSession))}</strong>
              </p>
            </>
          ) : (
            <p className="mt-4 text-sm text-slate-400">No hay caja abierta.</p>
          )}
        </section>
      </div>

      <section className="card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="section-title">Arqueo por medio de pago</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Ventas y gastos de la sesión desglosados por método.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            {sessions.length > 0 && (
              <Select
                label="Sesión"
                value={auditSession?.id ?? ''}
                onChange={event => setAuditSessionId(event.target.value)}
                className="w-full sm:w-64"
              >
                {sessions.map(session => (
                  <option key={session.id} value={session.id}>
                    {formatDate(session.openedAt)} ·{' '}
                    {session.status === 'OPEN' ? 'Abierta' : 'Cerrada'}
                  </option>
                ))}
              </Select>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                audit && downloadCSV(`arqueo-${audit.sessionId}.csv`, cashAuditToCSV(audit))
              }
              disabled={!audit}
            >
              <Download className="h-4 w-4" />
              Arqueo CSV
            </Button>
          </div>
        </div>

        {!audit ? (
          <EmptyState
            icon={<Scale className="h-7 w-7" />}
            title="Sin sesiones"
            description="Abre una caja para poder ver el arqueo por medio de pago."
          />
        ) : (
          <div className="space-y-4 p-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <AuditStat label="Monto inicial" value={cop(audit.initialAmount)} />
              <AuditStat
                label="Ventas"
                value={cop(audit.salesTotal)}
                hint={`${audit.salesCount} venta${audit.salesCount === 1 ? '' : 's'}`}
              />
              <AuditStat label="Gastos" value={cop(audit.expensesTotal)} />
              <AuditStat
                label="Efectivo esperado"
                value={cop(audit.expectedCash)}
                hint="Inicial + efectivo - gastos"
              />
              <AuditStat
                label="Contado"
                value={audit.countedAmount !== undefined ? cop(audit.countedAmount) : '—'}
              />
              <AuditStat
                label="Diferencia"
                value={
                  audit.difference !== undefined
                    ? `${audit.difference >= 0 ? '+' : ''}${cop(audit.difference)}`
                    : '—'
                }
                hint={
                  audit.difference === undefined
                    ? 'Sesión abierta'
                    : audit.difference === 0
                      ? 'Cuadra'
                      : 'Revisar'
                }
              />
            </div>

            <Table
              bare
              data={auditRows}
              columns={[
                { key: 'label', header: 'Método' },
                {
                  key: 'sales',
                  header: 'Ventas',
                  render: row => (
                    <span className="font-semibold text-slate-800">{cop(row.sales)}</span>
                  ),
                },
                {
                  key: 'expenses',
                  header: 'Gastos',
                  render: row => <span className="text-rose-600">{cop(row.expenses)}</span>,
                },
                {
                  key: 'net',
                  header: 'Neto',
                  render: row => (
                    <span
                      className={`font-semibold ${
                        row.net >= 0 ? 'text-emerald-600' : 'text-red-600'
                      }`}
                    >
                      {cop(row.net)}
                    </span>
                  ),
                },
              ]}
            />
          </div>
        )}
      </section>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="section-title">Historial de cajas</h2>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <CalendarDays className="h-3.5 w-3.5" />
            {sessions.length} sesión{sessions.length === 1 ? '' : 'es'}
          </span>
        </div>

        {sessions.length === 0 ? (
          <EmptyState
            icon={<Wallet className="h-7 w-7" />}
            title="Sin sesiones"
            description="Abre una caja para comenzar a llevar el control diario."
          />
        ) : (
          <Table
            bare
            data={sessions}
            columns={[
              { key: 'openedAt', header: 'Apertura', render: s => formatDate(s.openedAt) },
              {
                key: 'closedAt',
                header: 'Cierre',
                render: s =>
                  s.closedAt ? formatDate(s.closedAt) : <span className="text-slate-400">—</span>,
              },
              { key: 'initialAmount', header: 'Monto inicial', render: s => cop(s.initialAmount) },
              {
                key: 'expectedAmount',
                header: 'Esperado',
                render: s =>
                  s.expectedAmount !== undefined ? (
                    cop(s.expectedAmount)
                  ) : (
                    <span className="text-slate-400">—</span>
                  ),
              },
              {
                key: 'countedAmount',
                header: 'Contado',
                render: s =>
                  s.countedAmount !== undefined ? (
                    cop(s.countedAmount)
                  ) : (
                    <span className="text-slate-400">—</span>
                  ),
              },
              {
                key: 'status',
                header: 'Estado',
                render: s =>
                  s.status === 'OPEN' ? (
                    <Badge variant="success">Abierta</Badge>
                  ) : (
                    <Badge variant="default">Cerrada</Badge>
                  ),
              },
              {
                key: 'difference',
                header: 'Diferencia',
                render: s => {
                  if (s.difference === undefined) return <span className="text-slate-400">—</span>;
                  const positive = s.difference >= 0;
                  return (
                    <span
                      className={`font-semibold ${positive ? 'text-emerald-600' : 'text-red-600'}`}
                    >
                      {positive ? '+' : ''}
                      {cop(s.difference)}
                    </span>
                  );
                },
              },
            ]}
          />
        )}
      </div>
    </div>
  );
}
