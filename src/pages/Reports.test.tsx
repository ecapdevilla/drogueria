import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import Reports from './Reports';
import { useAppStore } from '../store/useAppStore';
import { emptyDB } from '../types/schema';
import { makeProduct, makeSale } from '../test/fixtures';

function saleItem(quantity: number, unitPrice: number) {
  return {
    productId: 'p1',
    productName: 'Producto A',
    quantity,
    unitPrice,
    unitCost: 800,
    lotId: 'lot-1',
  };
}

function seedReportsDB() {
  const product = makeProduct({ id: 'p1', commercialName: 'Producto A', category: 'Analgésicos' });

  useAppStore.setState({
    db: {
      ...emptyDB(),
      products: [product],
      sales: [
        makeSale({
          id: 's1',
          items: [saleItem(2, 1500)],
          subtotal: 3000,
          total: 3000,
          paymentMethod: 'CASH',
          createdAt: '2026-01-02T10:00:00.000Z',
        }),
        makeSale({
          id: 's2',
          items: [saleItem(2, 2500)],
          subtotal: 5000,
          total: 5000,
          paymentMethod: 'CARD',
          createdAt: '2026-02-15T10:00:00.000Z',
        }),
      ],
    },
  });
}

beforeEach(() => {
  useAppStore.setState({ db: emptyDB(), toasts: [] });
});

describe('Reports', () => {
  it('filtra las ventas por rango de fechas', () => {
    seedReportsDB();
    render(<Reports />);

    expect(screen.getByText('2 ventas en el periodo')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-02-01' } });

    expect(screen.getByText('1 venta en el periodo')).toBeInTheDocument();
    expect(screen.getByText(/Mostrando desde/i)).toBeInTheDocument();
  });

  it('limpia el filtro y vuelve a mostrar todo el historial', () => {
    seedReportsDB();
    render(<Reports />);

    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-02-01' } });
    expect(screen.getByText('1 venta en el periodo')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /limpiar filtro/i }));

    expect(screen.getByText('2 ventas en el periodo')).toBeInTheDocument();
    expect(screen.getByText(/Mostrando todo el historial/i)).toBeInTheDocument();
  });

  it('avisa cuando la fecha inicial es posterior a la final', () => {
    seedReportsDB();
    render(<Reports />);

    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-03-01' } });
    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2026-02-01' } });

    expect(
      screen.getByText('La fecha inicial no puede ser posterior a la fecha final.'),
    ).toBeInTheDocument();
  });

  it('muestra el detalle de utilidad por producto y categoría', () => {
    seedReportsDB();
    render(<Reports />);

    expect(screen.getByRole('heading', { name: 'Utilidad por producto' })).toBeInTheDocument();
    expect(screen.getAllByText('Producto A').length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: 'Utilidad por categoría' })).toBeInTheDocument();
    expect(screen.getAllByText('Analgésicos').length).toBeGreaterThan(0);
    expect(screen.getByText('Ticket promedio')).toBeInTheDocument();
  });
});
