import { describe, expect, it } from 'vitest';
import {
  activeSuppliers,
  addSupplier,
  isSupplierActive,
  searchSuppliers,
  setSupplierActive,
  updateSupplier,
} from './supplier.service';
import { makeDB, makeSupplier } from '../test/fixtures';

describe('supplier.service', () => {
  it('agrega un proveedor activo por defecto', () => {
    const db = addSupplier(makeDB(), { name: 'Nuevo proveedor' });

    expect(db.suppliers).toHaveLength(1);
    expect(db.suppliers[0].name).toBe('Nuevo proveedor');
    expect(db.suppliers[0].active).toBe(true);
    expect(db.suppliers[0].createdAt).toBeTruthy();
  });

  it('actualiza solo el proveedor indicado', () => {
    const target = makeSupplier({ name: 'Proveedor A' });
    const other = makeSupplier({ name: 'Proveedor B' });
    const db = makeDB({ suppliers: [target, other] });

    const result = updateSupplier(db, target.id, {
      name: 'Proveedor A editado',
      phone: '300 111 2233',
    });

    expect(result.suppliers[0].name).toBe('Proveedor A editado');
    expect(result.suppliers[0].phone).toBe('300 111 2233');
    expect(result.suppliers[1].name).toBe('Proveedor B');
  });

  it('lanza un error al actualizar un proveedor inexistente', () => {
    expect(() => updateSupplier(makeDB(), 'no-existe', { name: 'X' })).toThrow(
      'Proveedor no encontrado',
    );
  });

  it('desactiva y reactiva un proveedor', () => {
    const supplier = makeSupplier();
    const db = makeDB({ suppliers: [supplier] });

    const deactivated = setSupplierActive(db, supplier.id, false);
    expect(deactivated.suppliers[0].active).toBe(false);
    expect(isSupplierActive(deactivated.suppliers[0])).toBe(false);

    const reactivated = setSupplierActive(deactivated, supplier.id, true);
    expect(reactivated.suppliers[0].active).toBe(true);
  });

  it('lanza un error al cambiar el estado de un proveedor inexistente', () => {
    expect(() => setSupplierActive(makeDB(), 'no-existe', false)).toThrow(
      'Proveedor no encontrado',
    );
  });

  it('considera activo un proveedor sin el campo active', () => {
    expect(isSupplierActive(makeSupplier({ active: undefined }))).toBe(true);
  });

  it('busca por nombre, NIT, contacto, teléfono o correo', () => {
    const andinas = makeSupplier({
      name: 'Distribuciones Andinas',
      taxId: '900.123.456-7',
      contact: 'Laura Gómez',
      phone: '310 555 0101',
      email: 'compras@andinas.com',
    });
    const salud = makeSupplier({
      name: 'Salud Total',
      taxId: '901.987.654-3',
      contact: 'Andrés Ramírez',
      phone: '320 444 0202',
      email: 'ventas@saludtotal.com',
    });
    const db = makeDB({ suppliers: [andinas, salud] });

    expect(searchSuppliers(db, 'andinas').map(s => s.name)).toEqual(['Distribuciones Andinas']);
    expect(searchSuppliers(db, '901.987').map(s => s.name)).toEqual(['Salud Total']);
    expect(searchSuppliers(db, 'laura').map(s => s.name)).toEqual(['Distribuciones Andinas']);
    expect(searchSuppliers(db, '320 444').map(s => s.name)).toEqual(['Salud Total']);
    expect(searchSuppliers(db, 'saludtotal.com').map(s => s.name)).toEqual(['Salud Total']);
    expect(searchSuppliers(db, '   ')).toHaveLength(2);
  });

  it('devuelve solo activos, ordenados alfabéticamente', () => {
    const db = makeDB({
      suppliers: [
        makeSupplier({ name: 'Zeta', active: true }),
        makeSupplier({ name: 'Alfa', active: true }),
        makeSupplier({ name: 'Inactivo', active: false }),
        makeSupplier({ name: 'Sin estado', active: undefined }),
      ],
    });

    expect(activeSuppliers(db).map(s => s.name)).toEqual(['Alfa', 'Sin estado', 'Zeta']);
  });
});
