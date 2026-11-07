import { describe, expect, it } from 'vitest';
import { cop, copInt } from './money';

describe('money utils', () => {
  it('redondea a enteros para reportes', () => {
    expect(copInt(1500.4)).toBe(1500);
    expect(copInt(1500.6)).toBe(1501);
  });

  it('formatea valores en pesos colombianos', () => {
    const formatted = cop(1500);
    expect(formatted).toContain('1.500');
    expect(formatted).toMatch(/\$/);
  });
});
