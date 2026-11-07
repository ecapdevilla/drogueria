import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import POS from './POS';
import { useAppStore } from '../store/useAppStore';
import { emptyDB } from '../types/schema';
import { makeLot, makeProduct } from '../test/fixtures';

const DAY = 86400000;
const inDays = (n: number) => new Date(Date.now() + n * DAY).toISOString();

function setupProduct() {
  const product = makeProduct({
    id: 'prod-1',
    barcode: '7701234567890',
    commercialName: 'Acetaminofén 500 mg',
    salePrice: 1500,
    stock: 10,
  });
  const lot = makeLot('prod-1', { quantity: 10, expiryDate: inDays(200) });
  useAppStore.setState({ db: { ...emptyDB(), products: [product], lots: [lot] }, toasts: [] });
}

beforeEach(() => {
  useAppStore.setState({ db: emptyDB(), toasts: [] });
});

describe('POS', () => {
  it('agrega al carrito el código de barras escaneado con Enter', async () => {
    setupProduct();
    const user = userEvent.setup();
    render(<POS />);

    const search = screen.getByLabelText('Buscar productos para vender');
    await user.type(search, '7701234567890{Enter}');

    expect(screen.getByText('1 uds.')).toBeInTheDocument();
    expect(screen.getByText('Acetaminofén 500 mg')).toBeInTheDocument();
    expect(search).toHaveValue('');
  });

  it('usa F2 para enfocar la búsqueda y F3 para abrir el cobro', async () => {
    setupProduct();
    const user = userEvent.setup();
    render(<POS />);

    const search = screen.getByLabelText('Buscar productos para vender');
    await user.type(search, '7701234567890{Enter}');

    fireEvent.keyDown(window, { key: 'F3' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(within(screen.getByRole('dialog')).getByText('Cobrar venta')).toBeInTheDocument();

    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }));
    fireEvent.keyDown(window, { key: 'F2' });
    expect(search).toHaveFocus();
  });

  it('cobra con pago mixto, calcula vueltas y muestra el recibo', async () => {
    setupProduct();
    const user = userEvent.setup();
    render(<POS />);

    const search = screen.getByLabelText('Buscar productos para vender');
    await user.type(search, '7701234567890{Enter}');
    await user.click(screen.getByRole('button', { name: 'Aumentar cantidad' }));

    const lineDiscount = screen.getByLabelText('Descuento de Acetaminofén 500 mg');
    await user.clear(lineDiscount);
    await user.type(lineDiscount, '200');

    await user.click(screen.getByRole('button', { name: /^Cobrar/ }));

    const dialog = screen.getByRole('dialog');
    const amountOne = within(dialog).getByLabelText('Monto 1');
    await user.clear(amountOne);
    await user.type(amountOne, '1000');
    await user.click(within(dialog).getByRole('button', { name: /agregar pago/i }));

    const amountTwo = within(dialog).getByLabelText('Monto 2');
    expect(amountTwo).toHaveValue(1800);
    await user.selectOptions(within(dialog).getByLabelText('Método 2'), 'CARD');

    const cashReceived = within(dialog).getByLabelText('Efectivo recibido');
    await user.clear(cashReceived);
    await user.type(cashReceived, '5000');

    await user.click(within(dialog).getByRole('button', { name: /confirmar cobro/i }));

    await waitFor(() => expect(useAppStore.getState().db.sales).toHaveLength(1));

    const state = useAppStore.getState().db;
    const sale = state.sales[0];
    expect(sale.subtotal).toBe(3000);
    expect(sale.items[0].discount).toBe(200);
    expect(sale.total).toBe(2800);
    expect(sale.paymentMethod).toBe('CARD');
    expect(sale.payments).toEqual([
      { method: 'CASH', amount: 1000 },
      { method: 'CARD', amount: 1800 },
    ]);
    expect(sale.cashReceived).toBe(5000);
    expect(sale.change).toBe(4000);
    expect(state.products[0].stock).toBe(8);

    expect(screen.getByText('Recibo de venta')).toBeInTheDocument();
    expect(screen.getByText(/Efectivo recibido/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /imprimir recibo/i })).toBeInTheDocument();
  });
});
