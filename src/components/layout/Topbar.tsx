import React from 'react';
import { useAppStore } from '../../store/useAppStore';

export function Topbar() {
  const db = useAppStore(s => s.db);
  const openCash = useAppStore(s => s.openCash);
  const closeCash = useAppStore(s => s.closeCash);
  const pushToast = useAppStore(s => s.pushToast);

  const activeSession = db.cashSessions.find(s => s.status === 'OPEN');

  const handleOpen = () => {
    const amount = prompt('Monto inicial en caja (COP):', '100000');
    if (!amount) return;
    const n = parseInt(amount, 10);
    if (isNaN(n) || n < 0) return pushToast('Monto inválido', 'error');
    openCash(n);
  };

  const handleClose = () => {
    if (!activeSession) return;
    const counted = prompt('Counted amount:', String(activeSession.initialAmount));
    if (!counted) return;
    const n = parseInt(counted, 10);
    if (isNaN(n)) return;
    closeCash(activeSession.id, n);
  };

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Panel de control</h2>
      </div>
      <div className="flex items-center gap-3">
        <span className={`text-xs px-3 py-1 rounded-full ${
          activeSession ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {activeSession ? 'Caja abierta' : 'Caja cerrada'}
        </span>
        {activeSession ? (
          <button
            onClick={handleClose}
            className="text-sm bg-red-600 text-white px-3 py-1.5 rounded hover:bg-red-700"
          >
            Cerrar caja
          </button>
        ) : (
          <button
            onClick={handleOpen}
            className="text-sm bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700"
          >
            Abrir caja
          </button>
        )}
      </div>
    </header>
  );
}