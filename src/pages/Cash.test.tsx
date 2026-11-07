import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import Cash from './Cash';
import { useAppStore } from '../store/useAppStore';
import { emptyDB } from '../types/schema';
import { makeCashSession, makeExpense, makeSale } from '../test/fixtures';

function auditSection() {
  const heading = screen.getByRole('heading', { name: 'Arqueo por medio de pago' });
  return heading.closest('section') as HTMLElement;
}

beforeEach(() => {
  useAppStore.setState({ db: emptyDB(), toasts: [] });
});

describe('Cash', () => {
  it('muestra el arqueo por medio de pago de la caja abierta', () => {
    const session = makeCashSession({
      id: 'cash-1',
      initialAmount: 10000,
      openedAt: '2026-01-02T08:00:00.000Z',
    });

    useAppStore.setState({
      db: {
        ...emptyDB(),
        cashSessions: [session],
        sales: [
          makeSale({ createdAt: '2026-01-02T09:00:00.000Z', total: 3000, paymentMethod: 'CASH' }),
          makeSale({ createdAt: '2026-01-02T10:00:00.000Z', total: 5000, paymentMethod: 'CARD' }),
        ],
        expenses: [
          makeExpense({
            date: '2026-01-02T11:00:00.000Z',
            amount: 500,
            paymentMethod: 'EFECTIVO',
          }),
        ],
      },
    });

    render(<Cash />);

    const section = auditSection();
    const stats = section.querySelector('div.grid') as HTMLElement;

    expect(within(stats).getByText('Efectivo esperado').parentElement).toHaveTextContent('12.500');
    expect(within(stats).getByText('Ventas').parentElement).toHaveTextContent('8.000');
    expect(within(stats).getByText('Gastos').parentElement).toHaveTextContent('500');

    const cashRow = within(section).getByText('Efectivo').closest('tr') as HTMLElement;
    expect(cashRow).toHaveTextContent('3.000');
    expect(cashRow).toHaveTextContent('2.500');

    const cardRow = within(section).getByText('Tarjeta').closest('tr') as HTMLElement;
    expect(cardRow).toHaveTextContent('5.000');
  });

  it('permite consultar el arqueo de una caja cerrada', async () => {
    const open = makeCashSession({
      id: 'cash-open',
      initialAmount: 10000,
      openedAt: '2026-01-02T08:00:00.000Z',
    });
    const closed = makeCashSession({
      id: 'cash-closed',
      initialAmount: 20000,
      openedAt: '2026-01-03T08:00:00.000Z',
      closedAt: '2026-01-03T20:00:00.000Z',
      status: 'CLOSED',
      expectedAmount: 21000,
      countedAmount: 21500,
      difference: 500,
    });

    useAppStore.setState({
      db: {
        ...emptyDB(),
        cashSessions: [open, closed],
        sales: [
          makeSale({ createdAt: '2026-01-02T09:00:00.000Z', total: 3000, paymentMethod: 'CASH' }),
          makeSale({ createdAt: '2026-01-03T09:00:00.000Z', total: 1000, paymentMethod: 'CASH' }),
        ],
      },
    });

    const user = userEvent.setup();
    render(<Cash />);

    await user.selectOptions(screen.getByLabelText('Sesión'), 'cash-closed');

    const section = auditSection();
    const stats = section.querySelector('div.grid') as HTMLElement;
    expect(within(stats).getByText('Contado').parentElement).toHaveTextContent('21.500');
    expect(within(stats).getByText('Diferencia').parentElement).toHaveTextContent('500');
  });
});
