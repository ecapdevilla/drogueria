import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Pill, LogIn, Mail, Lock, Sparkles } from 'lucide-react';
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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 p-4">
      {/* Orbes de luz animados */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-brand-500/30 blur-3xl animate-pulse" />
        <div className="absolute -right-20 top-1/3 h-80 w-80 rounded-full bg-indigo-400/20 blur-3xl animate-pulse [animation-delay:1.2s]" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-brand-700/25 blur-3xl animate-pulse [animation-delay:2.4s]" />
      </div>
      {/* Malla sutil */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.7) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <div className="relative w-full max-w-md">
        <div className="mb-7 text-center text-white">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 via-brand-500 to-brand-700 shadow-glow ring-1 ring-white/20 transition-transform duration-300 hover:scale-110 hover:rotate-3">
            <Pill className="h-8 w-8 drop-shadow-sm" />
          </div>
          <h1 className="mt-5 font-display text-3xl font-bold tracking-tight">Droguería</h1>
          <p className="mt-1 text-xs font-medium uppercase tracking-[0.22em] text-slate-400">
            Gestión farmacéutica
          </p>
        </div>

        <form
          className="rounded-2xl border border-white/10 bg-white/95 p-6 shadow-card backdrop-blur-xl space-y-5"
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
            icon={<Mail className="h-4 w-4" />}
            error={errors.email?.message}
            {...register('email')}
          />

          <Input
            label="Contraseña"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            icon={<Lock className="h-4 w-4" />}
            error={errors.password?.message}
            {...register('password')}
          />

          {error && (
            <p
              role="alert"
              className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-100"
            >
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            <LogIn className="h-4 w-4" />
            {loading ? 'Ingresando…' : 'Ingresar'}
          </Button>

          <div className="flex items-center gap-2 pt-1">
            <Sparkles className="h-3.5 w-3.5 text-brand-500" />
            <p className="text-[11px] text-slate-500">Plataforma segura para tu droguería.</p>
          </div>
        </form>

        <p className="mt-5 text-center text-xs text-slate-400">
          Acceso restringido al personal autorizado.
        </p>
        <p className="mt-3 text-center text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">
          Software 2026 v2 · Desarrollado por Mg Estiben Rafael Capdevilla Pacheco
        </p>
      </div>
    </main>
  );
}
