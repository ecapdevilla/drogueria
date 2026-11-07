import { CashSession, DBShape, Expense, PaymentMethod } from '../types';
import { id } from '../utils/id';
import { salePayments } from '../utils/payments';
import { toCSV } from '../utils/csv';

const emptySalesByPayment = (): Record<PaymentMethod, number> => ({
  CASH: 0,
  TRANSFER: 0,
  CARD: 0,
  OTHER: 0,
});

const emptyExpensesByPayment = (): Record<Expense['paymentMethod'], number> => ({
  EFECTIVO: 0,
  TRANSFERENCIA: 0,
  TARJETA: 0,
  OTRO: 0,
});

export interface CashAudit {
  sessionId: string;
  initialAmount: number;
  openedAt: string;
  closedAt?: string;
  salesCount: number;
  salesByPayment: Record<PaymentMethod, number>;
  salesTotal: number;
  expensesByPayment: Record<Expense['paymentMethod'], number>;
  expensesTotal: number;
  cashSales: number;
  cashExpenses: number;
  expectedCash: number;
  countedAmount?: number;
  difference?: number;
}

/** Una fecha pertenece a la sesión si está entre la apertura y el cierre. */
function withinSession(value: string, session: CashSession): boolean {
  if (value < session.openedAt) return false;
  if (session.closedAt && value > session.closedAt) return false;
  return true;
}

/**
 * Arqueo detallado de una sesión: ventas y gastos desglosados por medio de pago.
 * El efectivo esperado solo considera la porción en efectivo de cada venta.
 */
export function cashAudit(db: DBShape, session: CashSession): CashAudit {
  const sales = db.sales.filter(sale => withinSession(sale.createdAt, session));
  const expenses = db.expenses.filter(expense => withinSession(expense.date, session));

  const salesByPayment = emptySalesByPayment();
  let salesTotal = 0;
  for (const sale of sales) {
    salesTotal += sale.total;
    for (const payment of salePayments(sale)) {
      salesByPayment[payment.method] += payment.amount;
    }
  }

  const expensesByPayment = emptyExpensesByPayment();
  let expensesTotal = 0;
  for (const expense of expenses) {
    expensesByPayment[expense.paymentMethod] += expense.amount;
    expensesTotal += expense.amount;
  }

  const cashSales = salesByPayment.CASH;
  const cashExpenses = expensesByPayment.EFECTIVO;
  const expected = session.initialAmount + cashSales - cashExpenses;

  return {
    sessionId: session.id,
    initialAmount: session.initialAmount,
    openedAt: session.openedAt,
    closedAt: session.closedAt,
    salesCount: sales.length,
    salesByPayment,
    salesTotal,
    expensesByPayment,
    expensesTotal,
    cashSales,
    cashExpenses,
    expectedCash: expected,
    countedAmount: session.countedAmount,
    difference: session.difference,
  };
}

export function openCash(db: DBShape, initialAmount: number): DBShape {
  if (db.cashSessions.some(s => s.status === 'OPEN')) throw new Error('Ya existe una caja abierta');
  const session: CashSession = {
    id: id(),
    openedAt: new Date().toISOString(),
    initialAmount,
    status: 'OPEN',
  };
  return { ...db, cashSessions: [...db.cashSessions, session] };
}

export function expectedCash(db: DBShape, session: CashSession): number {
  return cashAudit(db, session).expectedCash;
}

export function closeCash(db: DBShape, sessionId: string, counted: number): DBShape {
  const session = db.cashSessions.find(s => s.id === sessionId);
  if (!session || session.status !== 'OPEN') throw new Error('Sesión inválida');
  const expected = expectedCash(db, session);
  return {
    ...db,
    cashSessions: db.cashSessions.map(s =>
      s.id === sessionId
        ? {
            ...s,
            status: 'CLOSED',
            closedAt: new Date().toISOString(),
            countedAmount: counted,
            expectedAmount: expected,
            difference: counted - expected,
          }
        : s,
    ),
  };
}

export function cashAuditToCSV(audit: CashAudit): string {
  const rows: { concepto: string; metodo: string; valor: number }[] = [
    { concepto: 'Monto inicial', metodo: '', valor: audit.initialAmount },
  ];

  for (const [method, value] of Object.entries(audit.salesByPayment)) {
    if (value > 0) rows.push({ concepto: 'Ventas', metodo: method, valor: value });
  }
  for (const [method, value] of Object.entries(audit.expensesByPayment)) {
    if (value > 0) rows.push({ concepto: 'Gastos', metodo: method, valor: value });
  }

  rows.push({ concepto: 'Efectivo esperado', metodo: 'CASH', valor: audit.expectedCash });
  if (audit.countedAmount !== undefined) {
    rows.push({ concepto: 'Efectivo contado', metodo: 'CASH', valor: audit.countedAmount });
  }
  if (audit.difference !== undefined) {
    rows.push({ concepto: 'Diferencia', metodo: 'CASH', valor: audit.difference });
  }

  return toCSV(rows);
}
