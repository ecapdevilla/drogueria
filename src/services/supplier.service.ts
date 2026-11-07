import { DBShape, Supplier } from '../types';
import { id } from '../utils/id';

export interface SupplierDraft {
  name: string;
  taxId?: string;
  contact?: string;
  phone?: string;
  email?: string;
  address?: string;
  active?: boolean;
}

/** Un proveedor sin `active` explícito se considera activo. */
export const isSupplierActive = (supplier: Supplier): boolean => supplier.active !== false;

export function addSupplier(db: DBShape, draft: SupplierDraft): DBShape {
  const supplier: Supplier = {
    id: id(),
    name: draft.name,
    taxId: draft.taxId,
    contact: draft.contact,
    phone: draft.phone,
    email: draft.email,
    address: draft.address,
    active: draft.active ?? true,
    createdAt: new Date().toISOString(),
  };

  return { ...db, suppliers: [...db.suppliers, supplier] };
}

export function updateSupplier(
  db: DBShape,
  supplierId: string,
  patch: Partial<SupplierDraft>,
): DBShape {
  if (!db.suppliers.some(s => s.id === supplierId)) {
    throw new Error('Proveedor no encontrado');
  }

  return {
    ...db,
    suppliers: db.suppliers.map(s => (s.id === supplierId ? { ...s, ...patch } : s)),
  };
}

export function setSupplierActive(db: DBShape, supplierId: string, active: boolean): DBShape {
  if (!db.suppliers.some(s => s.id === supplierId)) {
    throw new Error('Proveedor no encontrado');
  }

  return {
    ...db,
    suppliers: db.suppliers.map(s => (s.id === supplierId ? { ...s, active } : s)),
  };
}

export function searchSuppliers(db: DBShape, query: string): Supplier[] {
  const term = query.trim().toLowerCase();
  if (!term) return db.suppliers;

  return db.suppliers.filter(supplier =>
    [supplier.name, supplier.taxId, supplier.contact, supplier.phone, supplier.email].some(value =>
      value?.toLowerCase().includes(term),
    ),
  );
}

/** Proveedores activos, ordenados alfabéticamente para los selectores. */
export function activeSuppliers(db: DBShape): Supplier[] {
  return db.suppliers.filter(isSupplierActive).sort((a, b) => a.name.localeCompare(b.name, 'es'));
}
