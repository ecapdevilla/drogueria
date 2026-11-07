import { AppRole } from './types';

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: 'Administrador',
  cashier: 'Cajero',
  inventory: 'Inventario',
};

/** Rutas adicionales permitidas por rol (Dashboard y Reportes son comunes). */
const ROLE_PATHS: Record<AppRole, string[]> = {
  admin: [],
  cashier: ['/pos', '/caja', '/gastos', '/devoluciones', '/clientes'],
  inventory: ['/productos', '/inventario', '/compras', '/proveedores'],
};

export function isAdmin(role: AppRole | null | undefined): boolean {
  return role === 'admin';
}

export function canManageInventory(role: AppRole | null | undefined): boolean {
  return role === 'admin' || role === 'inventory';
}

export function canSell(role: AppRole | null | undefined): boolean {
  return role === 'admin' || role === 'cashier';
}

/** El backend (RLS) vuelve a validar; esto solo evita mostrar rutas sin permiso. */
export function canAccessPath(role: AppRole | null | undefined, path: string): boolean {
  if (!role) return false;
  if (role === 'admin') return true;
  if (path === '/' || path === '/reportes') return true;
  return ROLE_PATHS[role].some(allowed => path === allowed || path.startsWith(`${allowed}/`));
}
