import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Table } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { cop } from '../utils/money';
import { formatDate } from '../utils/date';

export default function Cash() {
  const db = useAppStore(s => s.db);
  const openCash = useAppStore(s => s.openCash);
  const closeCash = useAppStore(s => s.closeCash);
  const [openAmount, setOpenAmount] = useState('');
  const [closeId, setCloseId] = useState('');
  const [counted, setCounted] = useState('');

  const sessions = db.cashSessions;
  const activeSession = sessions.find(s => s.status === 'OPEN');

  const handleOpen = () => {
    const n = parseInt(openAmount, 10);
    if (isNaN(n) || n < 0) return;
    openCash(n);
    setOpenAmount('');
  };

  const handleClose = () => {
    if (!activeSession) return;
    const n = parseInt(counted, 10);
    if (isNaN(n)) return;
    closeCash(activeSession.id, n);
    setCounted('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Caja</h2>
        <p className="text-sm text-slate-500">Abre y cierra tu caja diaria</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-4 border border-slate-200">
          <h3 className="font-semibold text-slate-700 mb-3">Abrir caja</h3>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Monto inicial"
              value={openAmount}
              onChange={e => setOpenAmount(e.target.value)}
            />
            <Button onClick={handleOpen} disabled={!openAmount}>Abrir</Button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border border-slate-200">
          <h3 className="font-semibold text-slate-700 mb-3">Cerrar caja</h3>
          {activeSession ? (
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Dinero contado"
                value={counted}
                onChange={e => setCounted(e.target.value)}
              />
              <Button variant="danger" onClick={handleClose} disabled={!counted}>Cerrar</Button>
            </div>
          ) : (
            <p className="text-sm text-slate-400">No hay caja abierta</p>
          )}
        </div>
      </div>

      {activeSession && (
        <div className="bg-green-50 border border-green-200 rounded p-4 text-sm">
          <p><strong>Caja abierta:</strong> {formatDate(activeSession.openedAt)}</p>
          <p><strong>Monto inicial:</strong> {cop(activeSession.initialAmount)}</p>
          <p><strong>Esperado:</strong> {cop(activeSession.initialAmount + db.sales.filter(s => s.paymentMethod === 'CASH' && s.createdAt >= activeSession.openedAt).reduce((a, s) => a + s.total, 0))}</p>
        </div>
      )}

      {sessions.length === 0 ? (
        <EmptyState title="Sin sesiones" description="Abre una caja para comenzar" />
      ) : (
        <Table
          data={sessions}
          columns={[
            { key: 'openedAt', header: 'Apertura', render: s => formatDate(s.openedAt) },
            { key: 'closedAt', header: 'Cierre', render: s => s.closedAt ? formatDate(s.closedAt) : '-' },
            { key: 'initialAmount', header: ' inicial', render: s => cop(s.initialAmount) },
            {
              key: 'status', header: 'Estado',
              render: s => s.status === 'OPEN'
                ? <Badge variant="success">Abierta</Badge>
                : <Badge variant="default">Cerrada</Badge>,
            },
            {
              key: 'difference', header: 'Diferencia',
              render: s => s.difference !== undefined ? cop(s.difference) : '-',
            },
          ]}
        />
      )}
    </div>
  );
}