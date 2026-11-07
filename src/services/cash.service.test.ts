import { describe, expect, it } from 'vitest';
import { cashAudit, cashAuditToCSV, closeCash, expectedCash, openCash } from './cash.service';
import { makeCashSession, makeDB, makeExpense, makeSale } from '../test/fixtures';

const session = makeCashSession({ id: 'cash-1', openedAt: '2026-01-02T08:00:00.000Z' });

describe('openCash', () => {
  it('abre una nueva sesión de caja', () => {
    const db = openCash(makeDB(), 50000);
    expect(db.cashSessions).toHaveLength(1);
    expect(db.cashSessions[0].initialAmount).toBe(50000);
    expect(db.cashSessions[0].status).toBe('OPEN');
  });

  it('no permite dos cajas abiertas al mismo tiempo', () => {
    const db = makeDB({ cashSessions: [session] });
    expect(() => openCash(db, 1000)).toThrow(/Ya existe una caja abierta/);
  });

  it('permite abrir caja si la anterior está cerrada', () => {
    const closed = makeCashSession({ status: 'CLOSED' });
    const db = openCash(makeDB({ cashSessions: [closed] }), 1000);
    expect(db.cashSessions).toHaveLength(2);
  });
});

describe('expectedCash', () => {
  it('suma ventas en efectivo y resta gastos en efectivo del turno', () => {
    const db = makeDB({
      cashSessions: [session],
      sales: [
        makeSale({ createdAt: '2026-01-02T09:00:00.000Z', total: 3000, paymentMethod: 'CASH' }),
        makeSale({ createdAt: '2026-01-02T10:00:00.000Z', total: 5000, paymentMethod: 'CARD' }),
        makeSale({ createdAt: '2026-01-02T07:00:00.000Z', total: 9000, paymentMethod: 'CASH' }),
      ],
      expenses: [
        makeExpense({
          date: '2026-01-02T11:00:00.000Z',
          amount: 500,
          paymentMethod: 'EFECTIVO',
        }),
        makeExpense({
          date: '2026-01-02T12:00:00.000Z',
          amount: 1000,
          paymentMethod: 'TRANSFERENCIA',
        }),
      ],
    });

    expect(expectedCash(db, session)).toBe(12500);
  });

  it('suma solo la parte en efectivo de las ventas con pago mixto', () => {
    const db = makeDB({
      cashSessions: [session],
      sales: [
        makeSale({
          createdAt: '2026-01-02T09:00:00.000Z',
          total: 3000,
          paymentMethod: 'CARD',
          payments: [
            { method: 'CASH', amount: 1200 },
            { method: 'CARD', amount: 1800 },
          ],
        }),
      ],
    });

    expect(expectedCash(db, session)).toBe(11200);
  });

  it('retorna el monto inicial cuando no hay movimientos', () => {
    expect(expectedCash(makeDB(), session)).toBe(10000);
  });

  it('no suma movimientos posteriores al cierre de la sesión', () => {
    const closed = makeCashSession({
      status: 'CLOSED',
      openedAt: '2026-01-02T08:00:00.000Z',
      closedAt: '2026-01-02T18:00:00.000Z',
    });
    const db = makeDB({
      cashSessions: [closed],
      sales: [
        makeSale({ createdAt: '2026-01-02T09:00:00.000Z', total: 3000, paymentMethod: 'CASH' }),
        makeSale({ createdAt: '2026-01-02T19:00:00.000Z', total: 5000, paymentMethod: 'CASH' }),
      ],
      expenses: [
        makeExpense({
          date: '2026-01-02T10:00:00.000Z',
          amount: 500,
          paymentMethod: 'EFECTIVO',
        }),
        makeExpense({
          date: '2026-01-02T19:30:00.000Z',
          amount: 900,
          paymentMethod: 'EFECTIVO',
        }),
      ],
    });

    expect(expectedCash(db, closed)).toBe(12500);
  });
});

describe('cashAudit', () => {
  it('desglosa ventas y gastos por medio de pago', () => {
    const db = makeDB({
      cashSessions: [session],
      sales: [
        makeSale({
          createdAt: '2026-01-02T09:00:00.000Z',
          total: 3000,
          paymentMethod: 'CARD',
          payments: [
            { method: 'CASH', amount: 1000 },
            { method: 'CARD', amount: 2000 },
          ],
        }),
        makeSale({ createdAt: '2026-01-02T10:00:00.000Z', total: 4000, paymentMethod: 'CASH' }),
      ],
      expenses: [
        makeExpense({
          date: '2026-01-02T11:00:00.000Z',
          amount: 500,
          paymentMethod: 'EFECTIVO',
        }),
        makeExpense({
          date: '2026-01-02T12:00:00.000Z',
          amount: 700,
          paymentMethod: 'TRANSFERENCIA',
        }),
      ],
    });

    const audit = cashAudit(db, session);

    expect(audit.salesByPayment).toEqual({ CASH: 5000, TRANSFER: 0, CARD: 2000, OTHER: 0 });
    expect(audit.salesTotal).toBe(7000);
    expect(audit.salesCount).toBe(2);
    expect(audit.expensesByPayment).toEqual({
      EFECTIVO: 500,
      TRANSFERENCIA: 700,
      TARJETA: 0,
      OTRO: 0,
    });
    expect(audit.expensesTotal).toBe(1200);
    expect(audit.cashSales).toBe(5000);
    expect(audit.cashExpenses).toBe(500);
    expect(audit.expectedCash).toBe(14500);
  });

  it('devuelve el conteo y la diferencia de una sesión cerrada', () => {
    const closed = makeCashSession({
      status: 'CLOSED',
      closedAt: '2026-01-02T20:00:00.000Z',
      expectedAmount: 14500,
      countedAmount: 14000,
      difference: -500,
    });
    const db = makeDB({
      cashSessions: [closed],
      sales: [
        makeSale({ createdAt: '2026-01-02T09:00:00.000Z', total: 5000, paymentMethod: 'CASH' }),
      ],
      expenses: [
        makeExpense({
          date: '2026-01-02T11:00:00.000Z',
          amount: 500,
          paymentMethod: 'EFECTIVO',
        }),
      ],
    });

    const audit = cashAudit(db, closed);

    expect(audit.expectedCash).toBe(14500);
    expect(audit.countedAmount).toBe(14000);
    expect(audit.difference).toBe(-500);
  });

  it('exporta el arqueo a CSV con sus conceptos', () => {
    const db = makeDB({
      cashSessions: [session],
      sales: [
        makeSale({ createdAt: '2026-01-02T09:00:00.000Z', total: 3000, paymentMethod: 'CASH' }),
      ],
      expenses: [
        makeExpense({
          date: '2026-01-02T11:00:00.000Z',
          amount: 500,
          paymentMethod: 'EFECTIVO',
        }),
      ],
    });

    const csv = cashAuditToCSV(cashAudit(db, session));

    expect(csv).toContain('"Monto inicial"');
    expect(csv).toContain('"Ventas","CASH","3000"');
    expect(csv).toContain('"Gastos","EFECTIVO","500"');
    expect(csv).toContain('"Efectivo esperado"');
  });
});

describe('closeCash', () => {
  it('cierra la sesión y calcula la diferencia', () => {
    const db = makeDB({
      cashSessions: [session],
      sales: [
        makeSale({ createdAt: '2026-01-02T09:00:00.000Z', total: 3000, paymentMethod: 'CASH' }),
      ],
      expenses: [
        makeExpense({
          date: '2026-01-02T11:00:00.000Z',
          amount: 500,
          paymentMethod: 'EFECTIVO',
        }),
      ],
    });

    const result = closeCash(db, 'cash-1', 12000);
    const closed = result.cashSessions[0];

    expect(closed.status).toBe('CLOSED');
    expect(closed.countedAmount).toBe(12000);
    expect(closed.expectedAmount).toBe(12500);
    expect(closed.difference).toBe(-500);
    expect(closed.closedAt).toBeTruthy();
  });

  it('rechaza una sesión inexistente o ya cerrada', () => {
    expect(() => closeCash(makeDB(), 'missing', 1000)).toThrow(/Sesión inválida/);

    const closed = makeCashSession({ status: 'CLOSED' });
    const db = makeDB({ cashSessions: [closed] });
    expect(() => closeCash(db, closed.id, 1000)).toThrow(/Sesión inválida/);
  });
});
