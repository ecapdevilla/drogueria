import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Settings from './Settings';
import { useAppStore } from '../store/useAppStore';
import { emptyDB } from '../types/schema';
import { StorageService } from '../services/storage.service';
import { makeDB, makeProduct } from '../test/fixtures';

function makeFile(content: string) {
  const file = new File([content], 'respaldo.json', { type: 'application/json' });
  Object.defineProperty(file, 'text', { value: async () => content });
  return file;
}

beforeEach(() => {
  useAppStore.setState({ db: emptyDB(), toasts: [] });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn(() => 'blob:respaldo'),
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: vi.fn(),
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

function renderSettings() {
  return render(
    <MemoryRouter>
      <Settings />
    </MemoryRouter>,
  );
}

describe('Settings', () => {
  it('muestra el recordatorio y registra la descarga del respaldo', async () => {
    const user = userEvent.setup();
    renderSettings();

    expect(screen.getByText('Aún no has descargado un respaldo')).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: /descargar respaldo/i })[0]);

    expect(useAppStore.getState().db.settings.lastBackupAt).toBeTruthy();
    expect(screen.queryByText('Aún no has descargado un respaldo')).not.toBeInTheDocument();
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
  });

  it('pide confirmación antes de restaurar un respaldo', async () => {
    const imported = makeDB({
      products: [makeProduct({ commercialName: 'Producto restaurado' })],
    });
    const json = StorageService.backup(imported);
    const user = userEvent.setup();

    renderSettings();

    await user.upload(screen.getByLabelText('Archivo de respaldo'), makeFile(json));

    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByText(/Se reemplazarán todos los datos actuales/i),
    ).toBeInTheDocument();
    expect(useAppStore.getState().db.products).toHaveLength(0);

    await user.click(within(dialog).getByRole('button', { name: 'Restaurar datos' }));

    await waitFor(() => expect(useAppStore.getState().db.products).toHaveLength(1));
    expect(useAppStore.getState().db.products[0].commercialName).toBe('Producto restaurado');
  });

  it('rechaza un archivo que no es un respaldo válido', async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.upload(screen.getByLabelText('Archivo de respaldo'), makeFile('{no-es-json'));

    await waitFor(() => {
      expect(useAppStore.getState().toasts[0]?.message).toMatch(/Error al leer el respaldo/i);
    });
    expect(useAppStore.getState().db.products).toHaveLength(0);
  });

  it('pide confirmación antes de reiniciar los datos', async () => {
    useAppStore.setState({
      db: makeDB({ products: [makeProduct({ commercialName: 'Producto demo' })] }),
    });
    const user = userEvent.setup();
    renderSettings();

    await user.click(screen.getByRole('button', { name: /reiniciar datos/i }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/Se borrarán todos los datos guardados/i)).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Reiniciar' }));

    await waitFor(() => expect(useAppStore.getState().db.products).toHaveLength(0));
  });
});
