import { CashSession, DBShape } from '../types';
import { id } from '../utils/id';

export function openCash(db: DBShape, initialAmount: number): DBShape {
  if (db.cashSessions.some(s => s.status === 'OPEN'))
    throw new Error('Ya existe una caja abierta');
  const session: CashSession = {
    id: id(), openedAt: new Date().toISOString(),
    initialAmount, status: 'OPEN',
  };
  return { ...db, cashSessions: [...db.cashSessions, session] };
}

export function closeCash(db: DBShape, sessionId: string, counted: number): DBShape {
  const session = db.cashSessions.find(s => s.id === sessionId);
  if (!session || session.status !== 'OPEN') throw new Error('Sesión inválida');
  const salesCash = db.sales
    .filter(s => s.paymentMethod === 'CASH' && s.createdAt >= session.openedAt)
    .reduce((a, s) => a + s.total, 0);
  const expected = session.initialAmount + salesCash;
  return {
    ...db,
    cashSessions: db.cashSessions.map(s => s.id === sessionId ? {
      ...s, status: 'CLOSED', closedAt: new Date().toISOString(),
      countedAmount: counted, expectedAmount: expected, difference: counted - expected,
    } : s),
  };
}