import React, { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { ShortcutsHelp } from '../ShortcutsHelp';
import { PAGE_SHORTCUTS, useHotkeys } from '../../hooks/useHotkeys';
import { ToastContainer } from '../ui/Toast';

const MODULE_ROUTES: Record<string, string> = {
  '1': '/',
  '2': '/productos',
  '3': '/inventario',
  '4': '/pos',
  '5': '/compras',
  '6': '/proveedores',
  '7': '/caja',
  '8': '/gastos',
  '9': '/devoluciones',
  '0': '/clientes',
};

export function Shell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [helpOpen, setHelpOpen] = React.useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useHotkeys([
    {
      key: 'F1',
      allowInInput: true,
      handler: () => setHelpOpen(open => !open),
    },
    ...Object.entries(MODULE_ROUTES).map(([digit, path]) => ({
      key: digit,
      alt: true,
      handler: () => navigate(path),
    })),
    { key: 'r', alt: true, handler: () => navigate('/reportes') },
    { key: 'a', alt: true, handler: () => navigate('/analitica') },
    { key: 'c', alt: true, handler: () => navigate('/configuracion') },
  ]);

  return (
    <div className="min-h-screen bg-slate-50">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-xl focus:bg-slate-900 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Saltar al contenido
      </a>

      <Sidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="lg:pl-72">
        <Topbar onMenuClick={() => setMobileOpen(true)} />
        <main
          id="contenido"
          className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
        >
          <div className="animate-fade-in">{children}</div>
        </main>
      </div>

      <ToastContainer />

      <ShortcutsHelp
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        contextual={PAGE_SHORTCUTS[location.pathname] ?? []}
      />
    </div>
  );
}
