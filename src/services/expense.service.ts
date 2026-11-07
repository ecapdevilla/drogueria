import { Expense, DBShape } from '../types';
import { id } from '../utils/id';

export interface ExpenseDraft {
  category: string;
  description: string;
  amount: number;
  date?: string;
  paymentMethod: 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA' | 'OTRO';
  notes?: string;
}

export function addExpense(db: DBShape, draft: ExpenseDraft): DBShape {
  const expense: Expense = {
    id: id(),
    category: draft.category,
    description: draft.description,
    amount: Math.round(draft.amount),
    date: draft.date ?? new Date().toISOString(),
    paymentMethod: draft.paymentMethod,
    notes: draft.notes,
    createdAt: new Date().toISOString(),
  };
  return { ...db, expenses: [...db.expenses, expense] };
}

export function deleteExpense(db: DBShape, expenseId: string): DBShape {
  return { ...db, expenses: db.expenses.filter(e => e.id !== expenseId) };
}

export function expensesByCategory(db: DBShape): Record<string, number> {
  return db.expenses.reduce(
    (acc, e) => {
      acc[e.category] = (acc[e.category] ?? 0) + e.amount;
      return acc;
    },
    {} as Record<string, number>,
  );
}
