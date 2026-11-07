import { describe, expect, it } from 'vitest';
import { toCSV } from './csv';

describe('toCSV', () => {
  it('genera cabecera y filas', () => {
    const csv = toCSV([
      { nombre: 'Ana', total: 10 },
      { nombre: 'Luis', total: 20 },
    ]);
    expect(csv).toBe('nombre,total\n"Ana","10"\n"Luis","20"');
  });

  it('escapa comillas dobles', () => {
    const csv = toCSV([{ texto: 'Dijo "hola"' }]);
    expect(csv).toBe('texto\n"Dijo ""hola"""');
  });

  it('retorna cadena vacía sin filas', () => {
    expect(toCSV([])).toBe('');
  });
});
