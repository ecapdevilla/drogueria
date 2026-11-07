import { describe, expect, it } from 'vitest';
import { searchProducts } from './product.service';
import { makeDB, makeProduct } from '../test/fixtures';

describe('searchProducts', () => {
  const acetaminofen = makeProduct({
    id: 'prod-1',
    internalCode: 'P-001',
    barcode: '7701234567890',
    commercialName: 'Acetaminofén 500 mg',
    category: 'Analgésicos',
  });
  const ibuprofeno = makeProduct({
    id: 'prod-2',
    internalCode: 'P-002',
    barcode: '7709876543210',
    commercialName: 'Ibuprofeno 400 mg',
    category: 'Antiinflamatorios',
  });
  const db = makeDB({ products: [acetaminofen, ibuprofeno] });

  it('busca por código de barras', () => {
    expect(searchProducts(db, '7709876543210')).toEqual([ibuprofeno]);
    expect(searchProducts(db, '7701234')).toEqual([acetaminofen]);
  });

  it('busca por código interno', () => {
    expect(searchProducts(db, 'p-002')).toEqual([ibuprofeno]);
  });

  it('sigue buscando por nombre y categoría', () => {
    expect(searchProducts(db, 'acetaminofén')).toEqual([acetaminofen]);
    expect(searchProducts(db, 'antiinflamatorios')).toEqual([ibuprofeno]);
  });

  it('sin término devuelve solo los productos activos', () => {
    const inactive = makeProduct({ id: 'prod-3', active: false });
    expect(searchProducts(makeDB({ products: [acetaminofen, inactive] }), '   ')).toEqual([
      acetaminofen,
    ]);
  });
});
