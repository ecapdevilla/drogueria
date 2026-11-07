import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import Expenses from './Expenses';
import { useAppStore } from '../store/useAppStore';
import { emptyDB } from '../types/schema';
import { makeExpense } from '../test/fixtures';

beforeEach(() => {
  useAppStore.setState({
    db: {
      ...emptyDB(),
      expenses: [
        makeExpense({ id: 'e1', category: 'Servicios', description: 'Energía', amount: 500 }),
        makeExpense({ id: 'e2', category: 'Sueldos', description: 'Nómina', amount: 1000 }),
      ],
    },
    toasts: [],
  });
});

describe('Expenses', () => {
  it('enfoca el buscador y filtra los gastos', async () => {
    const user = userEvent.setup();
    render(<Expenses />);

    const search = screen.getByLabelText('Buscar gastos');
    expect(search).toHaveFocus();

    await user.type(search, 'Sueldos');

    expect(screen.getByText('Nómina')).toBeInTheDocument();
    expect(screen.queryByText('Energía')).not.toBeInTheDocument();
  });

  it('muestra un estado vacío cuando no hay coincidencias', async () => {
    const user = userEvent.setup();
    render(<Expenses />);

    await user.type(screen.getByLabelText('Buscar gastos'), 'inexistente');

    expect(screen.getByText('Sin resultados')).toBeInTheDocument();
  });

  it('permite exportar el listado filtrado a CSV', async () => {
    const user = userEvent.setup();
    render(<Expenses />);

    await user.type(screen.getByLabelText('Buscar gastos'), 'Energía');
    expect(screen.getByRole('button', { name: /gastos csv/i })).toBeInTheDocument();
  });
});
