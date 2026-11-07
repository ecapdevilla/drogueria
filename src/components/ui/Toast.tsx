import React from 'react';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

const COLORS = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  error: 'border-red-200 bg-red-50 text-red-900',
  info: 'border-slate-200 bg-white text-slate-900',
};

const ICON_COLORS = {
  success: 'text-emerald-600',
  error: 'text-red-600',
  info: 'text-brand-600',
};

export function ToastContainer() {
  const toasts = useAppStore(s => s.toasts);
  const popToast = useAppStore(s => s.popToast);

  React.useEffect(() => {
    const timers = toasts.map(t => setTimeout(() => popToast(t.id), 4000));
    return () => timers.forEach(clearTimeout);
  }, [toasts, popToast]);

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2"
      role="status"
      aria-live="polite"
    >
      {toasts.map(t => {
        const Icon = ICONS[t.type];
        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex animate-slide-up items-start gap-3 rounded-2xl border p-3.5 shadow-card ${COLORS[t.type]}`}
          >
            <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${ICON_COLORS[t.type]}`} />
            <p className="flex-1 text-sm font-medium leading-5">{t.message}</p>
            <button
              type="button"
              onClick={() => popToast(t.id)}
              aria-label="Cerrar notificación"
              className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
