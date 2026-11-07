import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  BarChart3,
  Boxes,
  Building2,
  LayoutDashboard,
  Package,
  Pill,
  Receipt,
  RotateCcw,
  Settings,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  Truck,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';
import { canAccessPath, ROLE_LABELS } from '../../auth/permissions';
import { isAuthEnabled } from '../../lib/supabase';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/productos', label: 'Productos', icon: Package },
  { to: '/inventario', label: 'Inventario', icon: Boxes },
  { to: '/pos', label: 'Punto de venta', icon: ShoppingCart },
  { to: '/compras', label: 'Compras', icon: Truck },
  { to: '/proveedores', label: 'Proveedores', icon: Building2 },
  { to: '/caja', label: 'Caja', icon: Wallet },
  { to: '/gastos', label: 'Gastos', icon: Receipt },
  { to: '/devoluciones', label: 'Devoluciones', icon: RotateCcw },
  { to: '/clientes', label: 'Clientes', icon: Users },
  { to: '/reportes', label: 'Reportes', icon: BarChart3 },
  { to: '/analitica', label: 'Analítica', icon: TrendingUp },
  { to: '/configuracion', label: 'Configuración', icon: Settings },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const resetDemo = useAppStore(s => s.resetDemo);
  const seedDemo = useAppStore(s => s.seedDemo);
  const profile = useAuthStore(s => s.profile);

  const navItems =
    isAuthEnabled && profile ? NAV.filter(item => canAccessPath(profile.role, item.to)) : NAV;

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-gradient-to-b from-slate-950 via-slate-950 to-brand-950 text-slate-100 transition-transform duration-300 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Navegación principal"
      >
        <div className="flex items-center gap-3 px-5 py-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-glow">
            <Pill className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-lg font-bold tracking-tight text-white">
              Droguería
            </h1>
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Gestión farmacéutica
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar menú"
            className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          <p className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Operación
          </p>
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={onClose}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-brand-500/20 to-brand-600/10 text-white shadow-sm ring-1 ring-inset ring-brand-400/30'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`h-[18px] w-[18px] transition ${
                        isActive ? 'text-brand-300' : 'text-slate-500 group-hover:text-slate-300'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                    {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand-400" />}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          {isAuthEnabled && profile ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Sesión
              </p>
              <p className="mt-1 truncate text-xs font-semibold text-white">
                {profile.full_name ?? profile.email}
              </p>
              <p className="text-[11px] text-slate-400">{ROLE_LABELS[profile.role]}</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-brand-300" />
                <p className="text-xs font-semibold text-white">Datos de demostración</p>
              </div>
              <p className="mt-1 text-[11px] leading-4 text-slate-400">
                Carga un catálogo de ejemplo para probar todos los flujos.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={seedDemo}
                  className="rounded-lg bg-white/10 px-2 py-1.5 text-[11px] font-semibold text-white transition hover:bg-white/20"
                >
                  Cargar demo
                </button>
                <button
                  type="button"
                  onClick={resetDemo}
                  className="rounded-lg bg-red-500/10 px-2 py-1.5 text-[11px] font-semibold text-red-300 transition hover:bg-red-500/20"
                >
                  Reiniciar
                </button>
              </div>
            </div>
          )}
          <p className="mt-3 text-center text-[10px] font-medium uppercase tracking-wider text-slate-600">
            Software 2026 v2
          </p>
          <p className="mt-0.5 text-center text-[9px] text-slate-600">
            Mg Estiben Rafael Capdevilla Pacheco
          </p>
        </div>
      </aside>
    </>
  );
}
