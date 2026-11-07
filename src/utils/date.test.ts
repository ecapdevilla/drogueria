import { describe, expect, it, vi } from 'vitest';
import { daysUntil, formatDate, formatDateOnly, isExpired } from './date';

describe('date utils', () => {
  it('formatea una fecha ISO', () => {
    const formatted = formatDate('2026-03-15T12:00:00.000Z');
    expect(formatted).toContain('2026');
    expect(formatted).toContain('15');
  });

  it('retorna cadena vacía para fechas inválidas', () => {
    expect(formatDate('no-es-fecha')).toBe('');
    expect(formatDateOnly('no-es-fecha')).toBe('');
  });

  it('formatea una fecha sin hora sin desplazarla de día', () => {
    const formatted = formatDateOnly('2026-11-05');
    expect(formatted).toContain('2026');
    expect(formatted).toContain('05');
    expect(formatted).not.toContain('04');
  });

  it('calcula días restantes', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    expect(daysUntil('2026-01-11T00:00:00.000Z')).toBe(10);
    vi.useRealTimers();
  });

  it('detecta fechas vencidas', () => {
    expect(isExpired('2020-01-01T00:00:00.000Z')).toBe(true);
    expect(isExpired('2999-01-01T00:00:00.000Z')).toBe(false);
  });
});
