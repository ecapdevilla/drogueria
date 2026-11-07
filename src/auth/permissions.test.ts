import { describe, expect, it } from 'vitest';
import { canAccessPath, canManageInventory, canSell, isAdmin, ROLE_LABELS } from './permissions';

describe('permisos por rol', () => {
  it('el administrador puede acceder a todo', () => {
    expect(isAdmin('admin')).toBe(true);
    expect(canManageInventory('admin')).toBe(true);
    expect(canSell('admin')).toBe(true);
    expect(canAccessPath('admin', '/configuracion')).toBe(true);
    expect(canAccessPath('admin', '/pos')).toBe(true);
  });

  it('el cajero vende y maneja caja, pero no inventario ni configuración', () => {
    expect(canSell('cashier')).toBe(true);
    expect(canManageInventory('cashier')).toBe(false);

    expect(canAccessPath('cashier', '/pos')).toBe(true);
    expect(canAccessPath('cashier', '/caja')).toBe(true);
    expect(canAccessPath('cashier', '/clientes')).toBe(true);
    expect(canAccessPath('cashier', '/productos')).toBe(false);
    expect(canAccessPath('cashier', '/configuracion')).toBe(false);
  });

  it('el rol de inventario gestiona catálogo y compras, pero no vende', () => {
    expect(canManageInventory('inventory')).toBe(true);
    expect(canSell('inventory')).toBe(false);

    expect(canAccessPath('inventory', '/productos')).toBe(true);
    expect(canAccessPath('inventory', '/compras')).toBe(true);
    expect(canAccessPath('inventory', '/pos')).toBe(false);
    expect(canAccessPath('inventory', '/caja')).toBe(false);
  });

  it('todos ven Dashboard y Reportes', () => {
    expect(canAccessPath('cashier', '/')).toBe(true);
    expect(canAccessPath('cashier', '/reportes')).toBe(true);
    expect(canAccessPath('inventory', '/')).toBe(true);
    expect(canAccessPath('inventory', '/reportes')).toBe(true);
  });

  it('sin rol no hay acceso', () => {
    expect(canAccessPath(null, '/')).toBe(false);
    expect(canAccessPath(undefined, '/pos')).toBe(false);
  });

  it('expone etiquetas en español', () => {
    expect(ROLE_LABELS).toEqual({
      admin: 'Administrador',
      cashier: 'Cajero',
      inventory: 'Inventario',
    });
  });
});
