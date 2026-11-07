import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import Inventory from './Inventory';
import { useAppStore } from '../store/useAppStore';
import { emptyDB } from '../types/schema';
import { makeLot, makeProduct } from '../test/fixtures';

const DAY = 86400000;
const inDays = (n: number) => new Date(Date.now() + n * DAY).toISOString();

beforeEach(() => {
  useAppStore.setState({ db: emptyDB(), toasts: [] });
});

describe('Inventory', () => {
  it('ajusta la cantidad de un lote y registra el movimiento', async () => {
    const product = makeProduct({ id: 'prod-1', stock: 10 });
    const lot = makeLot('prod-1', {
      id: 'lot-1',
      code: 'L-001',
      quantity: 10,
      expiryDate: inDays(200),
    });
    useAppStore.setState({ db: { ...emptyDB(), products: [product], lots: [lot] } });

    const user = userEvent.setup();
    render(<Inventory />);

    await user.click(screen.getByRole('button', { name: 'Ajustar lote L-001' }));
    const dialog = screen.getByRole('dialog');

    const quantity = within(dialog).getByLabelText('Cantidad real en el lote');
    await user.clear(quantity);
    await user.type(quantity, '7');
    await user.selectOptions(within(dialog).getByLabelText('Motivo del ajuste'), 'DAMAGE');
    await user.type(within(dialog).getByLabelText('Nota (opcional)'), 'Frascos rotos');
    await user.click(within(dialog).getByRole('button', { name: /registrar ajuste/i }));

    await waitFor(() => expect(useAppStore.getState().db.lots[0].quantity).toBe(7));

    const db = useAppStore.getState().db;
    expect(db.products[0].stock).toBe(7);
    expect(db.movements).toHaveLength(1);
    expect(db.movements[0]).toMatchObject({ type: 'ADJUSTMENT', quantity: -3, reason: 'DAMAGE' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('descarga un lote vencido y lo deshabilita', async () => {
    const product = makeProduct({ id: 'prod-1', stock: 5 });
    const lot = makeLot('prod-1', {
      id: 'lot-1',
      code: 'L-VEN',
      quantity: 5,
      expiryDate: inDays(-3),
    });
    useAppStore.setState({ db: { ...emptyDB(), products: [product], lots: [lot] } });

    const user = userEvent.setup();
    render(<Inventory />);

    await user.click(screen.getByRole('button', { name: 'Descargar lote vencido L-VEN' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByLabelText('Motivo del ajuste')).toHaveValue('EXPIRED');

    await user.click(within(dialog).getByRole('button', { name: /registrar ajuste/i }));

    await waitFor(() => expect(useAppStore.getState().db.lots[0].quantity).toBe(0));

    const db = useAppStore.getState().db;
    expect(db.lots[0].enabled).toBe(false);
    expect(db.products[0].stock).toBe(0);
    expect(db.movements[0]).toMatchObject({ type: 'EXPIRED', quantity: -5 });
  });

  it('filtra los lotes por estado de vencimiento', async () => {
    const product = makeProduct({ id: 'prod-1', stock: 10 });
    const expired = makeLot('prod-1', {
      id: 'lot-1',
      code: 'L-VEN',
      quantity: 5,
      expiryDate: inDays(-3),
    });
    const valid = makeLot('prod-1', {
      id: 'lot-2',
      code: 'L-OK',
      quantity: 5,
      expiryDate: inDays(200),
    });
    useAppStore.setState({
      db: { ...emptyDB(), products: [product], lots: [expired, valid] },
    });

    const user = userEvent.setup();
    render(<Inventory />);

    expect(screen.getByText('L-VEN')).toBeInTheDocument();
    expect(screen.getByText('L-OK')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /vencidos/i }));

    expect(screen.getByText('L-VEN')).toBeInTheDocument();
    expect(screen.queryByText('L-OK')).not.toBeInTheDocument();
  });

  it('valida en español la cantidad del ajuste', async () => {
    const product = makeProduct({ id: 'prod-1', stock: 10 });
    const lot = makeLot('prod-1', { id: 'lot-1', code: 'L-001', quantity: 10 });
    useAppStore.setState({ db: { ...emptyDB(), products: [product], lots: [lot] } });

    const user = userEvent.setup();
    render(<Inventory />);

    await user.click(screen.getByRole('button', { name: 'Ajustar lote L-001' }));
    const dialog = screen.getByRole('dialog');
    await user.clear(within(dialog).getByLabelText('Cantidad real en el lote'));
    await user.click(within(dialog).getByRole('button', { name: /registrar ajuste/i }));

    expect(await within(dialog).findByText('Ingresa una cantidad válida')).toBeInTheDocument();
    expect(useAppStore.getState().db.movements).toHaveLength(0);
  });
});
