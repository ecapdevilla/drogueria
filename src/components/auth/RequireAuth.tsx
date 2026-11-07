import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { LogOut, ShieldAlert } from 'lucide-react';
import { Button } from '../ui/Button';
import { canAccessPath } from '../../auth/permissions';
import { isAuthEnabled } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';

function AccessMessage({ title, message }: { title: string; message: string }) {
  const logout = useAuthStore(s => s.logout);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="card w-full max-w-md p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h1 className="mt-4 font-display text-lg font-bold text-slate-900">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">{message}</p>
        <Button variant="secondary" className="mt-5 w-full" onClick={() => void logout()}>
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </Button>
      </div>
    </div>
  );
}

/**
 * En modo local/demo deja pasar todo. En modo Supabase exige sesión, perfil
 * activo y permisos de ruta; RLS vuelve a validar en la base de datos.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation();
  const session = useAuthStore(s => s.session);
  const profile = useAuthStore(s => s.profile);
  const initialized = useAuthStore(s => s.initialized);
  const loading = useAuthStore(s => s.loading);

  if (!isAuthEnabled) return <>{children}</>;

  if (!initialized || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">
        Cargando sesión…
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!profile) {
    return (
      <AccessMessage
        title="Perfil no disponible"
        message="Tu usuario no tiene un perfil asignado. Pide al administrador que active tu cuenta."
      />
    );
  }

  if (!profile.active) {
    return (
      <AccessMessage
        title="Usuario inactivo"
        message="Tu cuenta está desactivada. Contacta al administrador para recuperar el acceso."
      />
    );
  }

  if (!canAccessPath(profile.role, location.pathname)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
