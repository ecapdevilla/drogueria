import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Input } from './Input';
import { Select } from './Select';

describe('Input', () => {
  it('asocia la etiqueta con el campo', () => {
    render(<Input label="Nombre comercial" defaultValue="Acetaminofén" />);
    expect(screen.getByLabelText('Nombre comercial')).toHaveValue('Acetaminofén');
  });

  it('expone el error de validación de forma accesible', () => {
    render(<Input label="Precio" error="El precio es obligatorio" />);

    const input = screen.getByLabelText('Precio');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('El precio es obligatorio');
    expect(screen.getByRole('alert')).toHaveTextContent('El precio es obligatorio');
  });
});

describe('Select', () => {
  it('renderiza sus opciones y la etiqueta', () => {
    render(
      <Select label="Método de pago" defaultValue="CASH">
        <option value="CASH">Efectivo</option>
        <option value="CARD">Tarjeta</option>
      </Select>,
    );

    expect(screen.getByLabelText('Método de pago')).toHaveValue('CASH');
    expect(screen.getByRole('option', { name: 'Efectivo' })).toBeInTheDocument();
  });
});
