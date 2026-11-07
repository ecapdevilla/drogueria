import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import Products from './Products';
import { useAppStore } from '../store/useAppStore';
import { emptyDB } from '../types/schema';

type User = ReturnType<typeof userEvent.setup>;

beforeEach(() => {
  useAppStore.setState({ db: emptyDB(), toasts: [] });
});

async function fillRequiredFields(user: User) {
  await user.type(screen.getByLabelText('Nombre comercial'), 'Producto de prueba');
  await user.type(screen.getByLabelText('Categoría'), 'Pruebas');

  const cost = screen.getByLabelText('Costo (COP)');
  await user.clear(cost);
  await user.type(cost, '1000');

  const price = screen.getByLabelText('Precio de venta (COP)');
  await user.clear(price);
  await user.type(price, '2000');
}

describe('Products', () => {
  it('muestra mensajes de validación en español y sin errores crudos de Zod', async () => {
    const user = userEvent.setup();
    render(<Products />);

    await user.click(screen.getByRole('button', { name: /nuevo producto/i }));
    await user.click(screen.getByRole('button', { name: /crear producto/i }));

    expect(await screen.findByText('El campo "nombre" es obligatorio')).toBeInTheDocument();
    expect(screen.getByText('El campo "categoría" es obligatorio')).toBeInTheDocument();
    expect(screen.getByText('El precio de venta debe ser mayor a 0')).toBeInTheDocument();
    expect(screen.queryByText(/Invalid input/i)).not.toBeInTheDocument();
  });

  it('crea un producto con los datos del formulario', async () => {
    const user = userEvent.setup();
    render(<Products />);

    await user.click(screen.getByRole('button', { name: /nuevo producto/i }));
    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: /crear producto/i }));

    await waitFor(() => expect(useAppStore.getState().db.products).toHaveLength(1));

    const product = useAppStore.getState().db.products[0];
    expect(product.commercialName).toBe('Producto de prueba');
    expect(product.category).toBe('Pruebas');
    expect(product.purchasePrice).toBe(1000);
    expect(product.salePrice).toBe(2000);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('rechaza un precio de venta menor al costo', async () => {
    const user = userEvent.setup();
    render(<Products />);

    await user.click(screen.getByRole('button', { name: /nuevo producto/i }));
    await user.type(screen.getByLabelText('Nombre comercial'), 'Producto inválido');
    await user.type(screen.getByLabelText('Categoría'), 'Pruebas');

    const cost = screen.getByLabelText('Costo (COP)');
    await user.clear(cost);
    await user.type(cost, '2000');

    const price = screen.getByLabelText('Precio de venta (COP)');
    await user.clear(price);
    await user.type(price, '1000');

    await user.click(screen.getByRole('button', { name: /crear producto/i }));

    expect(
      await screen.findByText('El precio de venta no puede ser menor al costo'),
    ).toBeInTheDocument();
    expect(useAppStore.getState().db.products).toHaveLength(0);
  });
});
