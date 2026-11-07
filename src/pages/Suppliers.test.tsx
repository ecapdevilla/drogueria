import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import Suppliers from './Suppliers';
import { useAppStore } from '../store/useAppStore';
import { emptyDB } from '../types/schema';
import { makeSupplier } from '../test/fixtures';

beforeEach(() => {
  useAppStore.setState({ db: emptyDB(), toasts: [] });
});

describe('Suppliers', () => {
  it('muestra un mensaje en español cuando falta el nombre', async () => {
    const user = userEvent.setup();
    render(<Suppliers />);

    await user.click(screen.getByRole('button', { name: /nuevo proveedor/i }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /agregar proveedor/i }));

    expect(await screen.findByText('El campo "nombre" es obligatorio')).toBeInTheDocument();
    expect(useAppStore.getState().db.suppliers).toHaveLength(0);
  });

  it('crea un proveedor con los datos del formulario', async () => {
    const user = userEvent.setup();
    render(<Suppliers />);

    await user.click(screen.getByRole('button', { name: /nuevo proveedor/i }));
    await user.type(screen.getByLabelText('Nombre o razón social'), 'Distribuciones Andinas SAS');
    await user.type(screen.getByLabelText('NIT / identificación (opcional)'), '900.123.456-7');
    await user.type(screen.getByLabelText('Correo (opcional)'), 'compras@andinas.com');
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /agregar proveedor/i }));

    await waitFor(() => expect(useAppStore.getState().db.suppliers).toHaveLength(1));

    const supplier = useAppStore.getState().db.suppliers[0];
    expect(supplier.name).toBe('Distribuciones Andinas SAS');
    expect(supplier.taxId).toBe('900.123.456-7');
    expect(supplier.email).toBe('compras@andinas.com');
    expect(supplier.active).toBe(true);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('edita un proveedor existente', async () => {
    const supplier = makeSupplier({ name: 'Proveedor original' });
    useAppStore.setState({ db: { ...emptyDB(), suppliers: [supplier] } });

    const user = userEvent.setup();
    render(<Suppliers />);

    await user.click(screen.getByRole('button', { name: `Editar ${supplier.name}` }));

    const name = screen.getByLabelText('Nombre o razón social');
    await user.clear(name);
    await user.type(name, 'Proveedor actualizado');
    await user.click(screen.getByRole('button', { name: /guardar cambios/i }));

    await waitFor(() =>
      expect(useAppStore.getState().db.suppliers[0].name).toBe('Proveedor actualizado'),
    );
  });

  it('desactiva y reactiva un proveedor', async () => {
    const supplier = makeSupplier();
    useAppStore.setState({ db: { ...emptyDB(), suppliers: [supplier] } });

    const user = userEvent.setup();
    render(<Suppliers />);

    await user.click(screen.getByRole('button', { name: `Desactivar ${supplier.name}` }));
    await user.click(screen.getByRole('button', { name: /^desactivar$/i }));

    await waitFor(() => expect(useAppStore.getState().db.suppliers[0].active).toBe(false));

    await user.click(screen.getByRole('button', { name: `Activar ${supplier.name}` }));
    await waitFor(() => expect(useAppStore.getState().db.suppliers[0].active).toBe(true));
  });
});
