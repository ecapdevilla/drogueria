import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { LogIn, Pill } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { LoginInput, loginSchema } from '../domain/schemas';
import { isAuthEnabled } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const session = useAuthStore(s => s.session);
  const loading = useAuthStore(s => s.loading);
  const error = useAuthStore(s => s.error);
  const login = useAuthStore(s => s.login);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  if (!isAuthEnabled) return <Navigate to="/" replace />;

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/';
  if (session) return <Navigate to={from} replace />;

  const onSubmit = async (values: LoginInput) => {
    const ok = await login(values.email, values.password);
    if (ok) navigate(from, { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-brand-950 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center text-white">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 shadow-glow">
            <Pill className="h-7 w-7" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold tracking-tight">Droguería</h1>
          <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
            Gestión farmacéutica
          </p>
        </div>

        <form
          className="card space-y-5 p-6"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          aria-label="Iniciar sesión"
        >
          <div>
            <h2 className="font-display text-xl font-bold tracking-tight text-slate-900">
              Iniciar sesión
            </h2>
            <p className="mt-1 text-sm text-slate-500">Accede con tu cuenta de la droguería.</p>
          </div>

          <Input
            label="Correo electrónico"
            type="email"
            autoComplete="email"
            placeholder="tu@correo.com"
            error={errors.email?.message}
            {...register('email')}
          />

          <Input
            label="Contraseña"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            error={errors.password?.message}
            {...register('password')}
          />

          {error && (
            <p
              role="alert"
              className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
            >
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            <LogIn className="h-4 w-4" />
            {loading ? 'Ingresando…' : 'Ingresar'}
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-400">
          Acceso restringido al personal autorizado.
        </p>
      </div>
    </div>
  );
}
