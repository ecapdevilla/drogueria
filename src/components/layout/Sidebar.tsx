import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';

const NAV = [
  { to: '/', label: 'Dashboard', icon: '\uD83D\uDCC4' },
  { to: '/productos', label: 'Productos', icon: '\uD83D\uDCE6' },
  { to: '/inventario', label: 'Inventario', icon: '\uD83D\uDCCB' },
  { to: '/pos', label: 'POS', icon: '\uD83D\uDEC5' },
  { to: '/compras', label: 'Compras', icon: '\uD83D\uDEC5' },
  { to: '/caja', label: 'Caja', icon: '\uD83D\uDCB5' },
  { to: '/gastos', label: 'Gastos', icon: '\uD83D\uDCC4' },
  { to: '/devoluciones', label: 'Devoluciones', icon: '\uD83D\uDCE1' },
  { to: '/clientes', label: 'Clientes', icon: '\uD83D\uDC65' },
  { to: '/reportes', label: 'Reportes', icon: '\uD83D\uDCC4' },
  { to: '/configuracion', label: 'Configuración', icon: '\uD83D\uDD2B\uFE0F' },
];

export function Sidebar() {
  const location = useLocation();
  const resetDemo = useAppStore(s => s.resetDemo);
  const seedDemo = useAppStore(s => s.seedDemo);

  return (
    <aside className="w-64 bg-slate-900 text-slate-100 min-h-screen p-4 flex flex-col">
      <div className="mb-6">
        <h1 className="text-xl font-bold">Droguería</h1>
        <p className="text-xs text-slate-400">Gestión farmacéutica</p>
      </div>
      <nav className="flex-1 space-y-1">
        {NAV.filter(n => !n.label.includes('static')).map(n => {
          const active = location.pathname === n.to;
          return (
            <Link
              key={n.to}
              to={n.to}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm"
            >
              <span>{n.icon}</span>
              <span>{n.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto pt-4 border-t border-slate-800 space-y-2">
        <button
          onClick={seedDemo}
          className="w-full text-xs bg-slate-700 hover:bg-slate-600 py-2 rounded"
        >
          Cargar demo
        </button>
        <button
          onClick={resetDemo}
          className="w-full text-xs bg-red-700 hover:bg-red-600 py-2 rounded"
        >
          Reiniciar demo
        </button>
      </div>
    </aside>
  );
}
