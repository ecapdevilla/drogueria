import { describe, expect, it } from 'vitest';
import {
  adjustLot,
  applySaleToLots,
  availableStock,
  daysUntilExpiry,
  expiredStock,
  expiryStatus,
  isLotExpired,
  makeMovement,
  pickFEFO,
} from './inventory.service';
import { makeDB, makeLot, makeProduct } from '../test/fixtures';

const NOW = new Date('2026-06-01T12:00:00.000Z');
const inDays = (days: number) => new Date(NOW.getTime() + days * 86400000).toISOString();

describe('pickFEFO', () => {
  it('elige primero los lotes que vencen antes', () => {
    const later = makeLot('prod-1', {
      id: 'later',
      quantity: 5,
      expiryDate: inDays(300),
    });
    const sooner = makeLot('prod-1', {
      id: 'sooner',
      quantity: 5,
      expiryDate: inDays(60),
    });

    const picked = pickFEFO([later, sooner], 'prod-1', 7, { now: NOW });

    expect(picked).toHaveLength(2);
    expect(picked[0].lot.id).toBe('sooner');
    expect(picked[0].take).toBe(5);
    expect(picked[1].lot.id).toBe('later');
    expect(picked[1].take).toBe(2);
  });

  it('ignora lotes deshabilitados, de otro producto o vencidos', () => {
    const disabled = makeLot('prod-1', {
      id: 'disabled',
      enabled: false,
      quantity: 20,
      expiryDate: inDays(10),
    });
    const other = makeLot('prod-2', { id: 'other', quantity: 20, expiryDate: inDays(10) });
    const expired = makeLot('prod-1', {
      id: 'expired',
      quantity: 20,
      expiryDate: inDays(-2),
    });
    const valid = makeLot('prod-1', { id: 'valid', quantity: 4, expiryDate: inDays(10) });

    const picked = pickFEFO([disabled, other, expired, valid], 'prod-1', 4, { now: NOW });

    expect(picked).toHaveLength(1);
    expect(picked[0].lot.id).toBe('valid');
  });

  it('lanza error cuando no hay stock vigente suficiente', () => {
    const vigente = makeLot('prod-1', { id: 'vigente', quantity: 2, expiryDate: inDays(10) });
    const vencido = makeLot('prod-1', { id: 'vencido', quantity: 10, expiryDate: inDays(-10) });

    expect(() => pickFEFO([vigente, vencido], 'prod-1', 3, { now: NOW })).toThrow(
      /Stock insuficiente/,
    );
  });
});

describe('applySaleToLots', () => {
  it('descuenta las cantidades sin mutar los lotes originales', () => {
    const lot = makeLot('prod-1', { id: 'lot-1', quantity: 10 });
    const picked = pickFEFO([lot], 'prod-1', 4, { now: NOW });

    const result = applySaleToLots([lot], picked);

    expect(result.find(item => item.id === 'lot-1')?.quantity).toBe(6);
    expect(lot.quantity).toBe(10);
  });

  it('bloquea inventario negativo', () => {
    const lot = makeLot('prod-1', { id: 'lot-1', quantity: 1 });
    expect(() => applySaleToLots([lot], [{ lot, take: 2 }])).toThrow(/negativo/);
  });
});

describe('makeMovement', () => {
  it('crea un movimiento con id y fecha', () => {
    const movement = makeMovement({ productId: 'prod-1', type: 'SALE', quantity: -2 });
    expect(movement.id).toBeTruthy();
    expect(movement.createdAt).toBeTruthy();
    expect(movement.type).toBe('SALE');
  });
});

describe('semáforo de vencimientos', () => {
  it('clasifica vencido, crítico, próximo y vigente', () => {
    expect(expiryStatus(inDays(-1), NOW)).toBe('EXPIRED');
    expect(expiryStatus(inDays(0), NOW)).toBe('EXPIRED');
    expect(expiryStatus(inDays(15), NOW)).toBe('CRITICAL');
    expect(expiryStatus(inDays(30), NOW)).toBe('CRITICAL');
    expect(expiryStatus(inDays(60), NOW)).toBe('WARNING');
    expect(expiryStatus(inDays(90), NOW)).toBe('WARNING');
    expect(expiryStatus(inDays(120), NOW)).toBe('OK');
  });

  it('calcula los días restantes', () => {
    expect(daysUntilExpiry(inDays(10), NOW)).toBe(10);
    expect(daysUntilExpiry(inDays(-3), NOW)).toBe(-3);
  });

  it('trata una fecha inválida como vigente sin días', () => {
    expect(expiryStatus('no-es-fecha', NOW)).toBe('OK');
    expect(daysUntilExpiry('no-es-fecha', NOW)).toBe(Number.POSITIVE_INFINITY);
  });

  it('detecta lotes vencidos', () => {
    expect(isLotExpired(makeLot('prod-1', { expiryDate: inDays(-1) }), NOW)).toBe(true);
    expect(isLotExpired(makeLot('prod-1', { expiryDate: inDays(5) }), NOW)).toBe(false);
  });

  it('suma solo lotes habilitados, con stock y vigentes', () => {
    const lots = [
      makeLot('p1', { id: 'ok', quantity: 5, expiryDate: inDays(10) }),
      makeLot('p1', { id: 'vencido', quantity: 7, expiryDate: inDays(-1) }),
      makeLot('p1', { id: 'disabled', quantity: 3, enabled: false, expiryDate: inDays(10) }),
      makeLot('p1', { id: 'zero', quantity: 0, expiryDate: inDays(10) }),
      makeLot('p2', { id: 'other', quantity: 9, expiryDate: inDays(10) }),
    ];

    expect(availableStock(lots, 'p1', NOW)).toBe(5);
    expect(expiredStock(lots, 'p1', NOW)).toBe(7);
  });
});

describe('adjustLot', () => {
  const makeCase = () => {
    const product = makeProduct({ id: 'prod-1', stock: 10 });
    const lot = makeLot('prod-1', {
      id: 'lot-1',
      quantity: 10,
      expiryDate: inDays(-1),
    });
    return { product, lot, db: makeDB({ products: [product], lots: [lot] }) };
  };

  it('descuenta unidades y crea un movimiento ADJUSTMENT trazable', () => {
    const { db } = makeCase();

    const result = adjustLot(db, {
      lotId: 'lot-1',
      newQuantity: 6,
      reason: 'DAMAGE',
      note: 'Frascos rotos',
    });

    expect(result.lots[0].quantity).toBe(6);
    expect(result.products[0].stock).toBe(6);
    expect(result.movements).toHaveLength(1);
    expect(result.movements[0]).toMatchObject({
      productId: 'prod-1',
      lotId: 'lot-1',
      type: 'ADJUSTMENT',
      quantity: -4,
      reason: 'DAMAGE',
      note: 'Frascos rotos',
    });
  });

  it('agrega unidades cuando el conteo físico es mayor', () => {
    const { db } = makeCase();

    const result = adjustLot(db, { lotId: 'lot-1', newQuantity: 12, reason: 'COUNT' });

    expect(result.lots[0].quantity).toBe(12);
    expect(result.products[0].stock).toBe(12);
    expect(result.movements[0]).toMatchObject({ type: 'ADJUSTMENT', quantity: 2 });
  });

  it('descarga un lote vencido, genera EXPIRED y lo deshabilita', () => {
    const { db } = makeCase();

    const result = adjustLot(db, { lotId: 'lot-1', newQuantity: 0, reason: 'EXPIRED' });

    expect(result.lots[0].quantity).toBe(0);
    expect(result.lots[0].enabled).toBe(false);
    expect(result.products[0].stock).toBe(0);
    expect(result.movements[0]).toMatchObject({
      type: 'EXPIRED',
      quantity: -10,
      reason: 'EXPIRED',
    });
  });

  it('rechaza ajustes que dejen el inventario en negativo', () => {
    const { db } = makeCase();
    const inconsistent = { ...db, products: [{ ...db.products[0], stock: 3 }] };

    expect(() =>
      adjustLot(inconsistent, { lotId: 'lot-1', newQuantity: 0, reason: 'COUNT' }),
    ).toThrow(/negativo/);
  });

  it('rechaza cantidades inválidas o sin cambios', () => {
    const { db } = makeCase();

    expect(() => adjustLot(db, { lotId: 'lot-1', newQuantity: -1, reason: 'COUNT' })).toThrow(
      /entero/,
    );
    expect(() => adjustLot(db, { lotId: 'lot-1', newQuantity: 1.5, reason: 'COUNT' })).toThrow(
      /entero/,
    );
    expect(() => adjustLot(db, { lotId: 'lot-1', newQuantity: 10, reason: 'COUNT' })).toThrow(
      /no cambió/,
    );
  });

  it('rechaza lotes inexistentes', () => {
    const { db } = makeCase();
    expect(() => adjustLot(db, { lotId: 'missing', newQuantity: 1, reason: 'COUNT' })).toThrow(
      /Lote no encontrado/,
    );
  });
});
