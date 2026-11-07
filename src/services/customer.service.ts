import { Customer, DBShape } from '../types';
import { id } from '../utils/id';

export interface CustomerDraft {
  name: string;
  phone?: string;
  identification?: string;
}

export function addCustomer(db: DBShape, draft: CustomerDraft): DBShape {
  const customer: Customer = {
    id: id(),
    name: draft.name,
    phone: draft.phone,
    identification: draft.identification,
    createdAt: new Date().toISOString(),
  };
  return { ...db, customers: [...db.customers, customer] };
}

export function searchCustomers(db: DBShape, query: string): Customer[] {
  const q = query.trim().toLowerCase();
  if (!q) return db.customers;
  return db.customers.filter(
    c =>
      c.name.toLowerCase().includes(q) ||
      (c.identification?.toLowerCase().includes(q) ?? false) ||
      (c.phone?.includes(q) ?? false),
  );
}
