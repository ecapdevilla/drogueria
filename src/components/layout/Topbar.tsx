import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowDownToLine, ArrowUpFromLine, CalendarDays, LogOut, Menu, Wallet } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';
import { ROLE_LABELS } from '../../auth/permissions';
import { isAuthEnabled, isCloudWriteEnabled } from '../../lib/supabase';
import { pendingCount } from '../../services/offline-queue.service';
import { expectedCash } from '../../services/cash.service';
import { cop } from '../../utils/money';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';

const PAGE_LABELS: Record<string, string> = {
  '/': 'Dashboard',
  '/productos': 'Productos',
  '/inventario': 'Inventario',
  '/pos': 'Punto de venta',
  '/compras': 'Compras',
  '/caja': 'Caja',
  '/gastos': 'Gastos',
  '/devoluciones': 'Devoluciones',
  '/clientes': 'Clientes',
  '/reportes': 'Reportes',
  '/analitica': 'Analítica',
  '/configuracion': 'Configuración',
};

interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const location = useLocation();
  const db = useAppStore(s => s.db);
  const openCash = useAppStore(s => s.openCash);
  const closeCash = useAppStore(s => s.closeCash);
  const profile = useAuthStore(s => s.profile);
  const logout = useAuthStore(s => s.logout);

  const activeSession = db.cashSessions.find(session => session.status === 'OPEN');
  const [pending, setPending] = useState(0);
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const refresh = () => setPending(pendingCount());
    refresh();
    const id = window.setInterval(refresh, 5000);
    window.addEventListener('storage', refresh);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  const [cashAction, setCashAction] = useState<'open' | 'close' | null>(null);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  const today = new Date().toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const startOpen = () => {
    setAmount('');
    setError('');
    setCashAction('open');
  };

  const startClose = () => {
    if (!activeSession) return;
    setAmount(String(expectedCash(db, activeSession)));
    setError('');
    setCashAction('close');
  };

  const submit = () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 0) {
      setError('Ingresa un monto válido');
      return;
    }

    if (cashAction === 'open') {
      openCash(value);
    } else if (cashAction === 'close' && activeSession) {
      closeCash(activeSession.id, value);
    }
    setCashAction(null);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1500px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Abrir menú"
          className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Inicio
          </p>
          <p className="truncate font-display text-sm font-bold text-slate-900">
            {PAGE_LABELS[location.pathname] ?? 'Droguería'}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <span className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium capitalize text-slate-500 xl:inline-flex">
            <CalendarDays className="h-3.5 w-3.5" />
            {today}
          </span>

          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ${
              activeSession
                ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                : 'bg-slate-100 text-slate-600 ring-slate-200'
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-current" />
            <span className="hidden sm:inline">
              {activeSession ? 'Caja abierta' : 'Caja cerrada'}
            </span>
          </span>

          {!online && (
            <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-200">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              <span className="hidden sm:inline">Sin conexión — modo offline</span>
            </span>
          )}

          {isCloudWriteEnabled && pending > 0 && (
            <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span className="hidden sm:inline">{pending} venta(s) pendiente(s)</span>
            </span>
          )}

          {activeSession ? (
            <Button variant="secondary" size="sm" onClick={startClose}>
              <ArrowUpFromLine className="h-4 w-4" />
              <span className="hidden sm:inline">Cerrar caja</span>
            </Button>
          ) : (
            <Button size="sm" onClick={startOpen}>
              <ArrowDownToLine className="h-4 w-4" />
              <span className="hidden sm:inline">Abrir caja</span>
            </Button>
          )}

          {isAuthEnabled && profile && (
            <div className="flex items-center gap-2 border-l border-slate-200 pl-2 sm:pl-3">
              <div className="hidden text-right sm:block">
                <p className="max-w-[9rem] truncate text-xs font-semibold text-slate-800">
                  {profile.full_name ?? profile.email}
                </p>
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                  {ROLE_LABELS[profile.role]}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void logout()}
                aria-label="Cerrar sesión"
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      <Modal
        open={cashAction !== null}
        title={cashAction === 'open' ? 'Abrir caja' : 'Cerrar caja'}
        onClose={() => setCashAction(null)}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCashAction(null)}>
              Cancelar
            </Button>
            <Button type="submit" form="cash-form">
              {cashAction === 'open' ? 'Abrir caja' : 'Cerrar caja'}
            </Button>
          </>
        }
      >
        <form
          id="cash-form"
          className="space-y-4"
          onSubmit={event => {
            event.preventDefault();
            submit();
          }}
        >
          <div className="flex items-center gap-3 rounded-2xl bg-brand-50 p-3 text-brand-800">
            <Wallet className="h-5 w-5 shrink-0" />
            <p className="text-xs leading-5">
              {cashAction === 'open'
                ? 'Registra el efectivo con el que inicia el turno.'
                : 'Ingresa el efectivo contado al finalizar el turno.'}
            </p>
          </div>

          {cashAction === 'close' && activeSession && (
            <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm">
              <span className="text-slate-500">Esperado en caja</span>
              <strong className="text-slate-900">{cop(expectedCash(db, activeSession))}</strong>
            </div>
          )}

          <Input
            label={cashAction === 'open' ? 'Monto inicial (COP)' : 'Monto contado (COP)'}
            type="number"
            min={0}
            step="1"
            value={amount}
            error={error}
            onChange={event => {
              setAmount(event.target.value);
              setError('');
            }}
            placeholder="0"
            autoFocus
          />
        </form>
      </Modal>
    </header>
  );
}
